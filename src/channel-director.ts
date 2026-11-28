import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchYouTubeStatistics } from "./analytics.js";
import { loadState, type ChannelId } from "./auto-publish.js";
import { CURATED_PHYSICS_JOBS, EXPLAINER_JOBS, type PhysicsNiche } from "./catalog.js";
import { EXPANSION_JOBS, type ExpansionChannelId } from "./catalog-expansion.js";
import { loadDerivedShortsQueue } from "./derive-shorts.js";
import { hoursSinceLastPublish, resolveMetaToken } from "./devops.js";
import { NARRATIVE_LONGFORM_SPECS } from "./longform-narrative.js";

export interface IgMediaMetrics {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

export interface VideoPerformanceRow {
  id: string;
  channel: ChannelId;
  nicheOrEpisode: string;
  title: string;
  url: string;
  publishedAt: string;
  ageHours: number;
  ytViews: number;
  ytLikes: number;
  ytComments: number;
  igViews: number;
  igLikes: number;
  igComments: number;
  igSaves: number;
  igShares: number;
  totalViews: number;
  viewsPerHour: number;
  /** Birleşik viral skor: izlenme hızı + kaydetme/paylaşma ağırlığı (algoritma sinyali). */
  viralScore: number;
}

export interface DirectorStrategy {
  updatedAt: string;
  physics: {
    boostedNiches: PhysicsNiche[];
    cooledNiches: PhysicsNiche[];
    topWinningTitles: string[];
  };
  explainer: {
    topWinningTitles: string[];
    highSaveTopics: string[];
  };
}

export interface DirectorChannelAudit {
  channel: ChannelId;
  totalPublished: number;
  shortsCount: number;
  longformCount: number;
  hoursSinceLastShort: number;
  hoursSinceLastLongform: number;
  pendingDerivedShorts: number;
  missingInstagramCount: number;
  totalYtViews: number;
  totalIgViews: number;
  topPerformers: VideoPerformanceRow[];
  issues: string[];
  recommendations: string[];
}

export interface ExpansionChannelAudit {
  channel: ExpansionChannelId;
  totalPublished: number;
  remainingStock: number;
  totalYtViews: number;
  totalIgViews: number;
  topTitle?: string;
  topViews: number;
}

export interface DirectorReport {
  generatedAt: string;
  healthy: boolean;
  missingSceneFiles: string[];
  channels: Record<ChannelId, DirectorChannelAudit>;
  expansion: Record<ExpansionChannelId, ExpansionChannelAudit>;
  strategy: DirectorStrategy;
  criticalAlerts: string[];
  breakoutAlerts: string[];
}

interface ExpansionPublishedRecord {
  id: string;
  channel: ExpansionChannelId;
  title: string;
  videoId: string;
  url: string;
  publishedAt: string;
  instagramMediaId?: string;
}

const REPORT_PATH = resolve("state", "director-report.json");
const STRATEGY_PATH = resolve("state", "director-strategy.json");
const EXPANSION_STATE_PATH = resolve("state", "published-expansion.json");
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function loadExpansionPublished(): Promise<ExpansionPublishedRecord[]> {
  try {
    const raw = await readFile(EXPANSION_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as { published?: ExpansionPublishedRecord[] };
    return Array.isArray(parsed.published) ? parsed.published : [];
  } catch {
    return [];
  }
}

function extractNicheOrEpisode(id: string, channel: ChannelId): string {
  if (channel === "physics") {
    const m = id.match(/^([a-z0-9-]+)-seed\d+$/);
    if (m) return m[1];
  }
  return id.replace(/^explainer-/, "");
}

async function fetchIgMetrics(mediaId: string, token: string): Promise<IgMediaMetrics> {
  const out: IgMediaMetrics = { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 };
  if (!mediaId || !/^\d{10,}$/.test(mediaId) || !token) return out;
  try {
    const baseRes = await fetch(
      `${GRAPH_BASE}/${encodeURIComponent(mediaId)}?fields=like_count,comments_count`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12_000) },
    );
    if (baseRes.ok) {
      const j = (await baseRes.json()) as { like_count?: number; comments_count?: number };
      out.likes = Number(j.like_count || 0);
      out.comments = Number(j.comments_count || 0);
    }
    const insRes = await fetch(
      `${GRAPH_BASE}/${encodeURIComponent(mediaId)}/insights?metric=views,saved,shares`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12_000) },
    );
    if (insRes.ok) {
      const ins = (await insRes.json()) as {
        data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
      };
      for (const m of ins.data || []) {
        const val = Number(m.values?.[0]?.value || 0);
        if (m.name === "views") out.views = val;
        else if (m.name === "saved") out.saves = val;
        else if (m.name === "shares") out.shares = val;
      }
    }
  } catch {
    // IG geçici erişim hatası tüm denetimi durdurmasın
  }
  return out;
}

function auditSceneAssets(): string[] {
  const missing: string[] = [];
  for (const job of CURATED_PHYSICS_JOBS) {
    const p = resolve("niches", job.niche, "scene.html");
    if (!existsSync(p)) missing.push(p);
  }
  for (const job of EXPLAINER_JOBS) {
    const p = resolve("niches", "how-it-works", "episodes", `${job.episode}.html`);
    if (!existsSync(p)) missing.push(p);
  }
  for (const spec of NARRATIVE_LONGFORM_SPECS) {
    const p = resolve("niches", "longform-deep-dive", `${spec.slug}.html`);
    if (!existsSync(p)) missing.push(p);
  }
  for (const job of EXPANSION_JOBS) {
    const p = resolve("niches", "expansion", `${job.episode}.html`);
    if (!existsSync(p)) missing.push(p);
  }
  return [...new Set(missing)];
}

async function sendTelegramAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID_YOUTUBE || "").trim();
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });
}

async function main() {
  const state = await loadState();
  const expansionPublished = await loadExpansionPublished();
  const queue = await loadDerivedShortsQueue();
  const missingSceneFiles = auditSceneAssets();

  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || "";
  const validIds = [
    ...state.published.map((r) => r.videoId),
    ...expansionPublished.map((r) => r.videoId),
  ].filter(Boolean);
  const ytStatsMap = apiKey && validIds.length > 0 ? await fetchYouTubeStatistics(validIds, apiKey) : new Map();

  // Instagram metriklerini son 20 Reels + expansion Reels için çek (hızlı + rate-limit güvenli)
  const igMetricsMap = new Map<string, IgMediaMetrics>();
  const recentWithIg: Array<{ channel: "physics" | "explainer" | "wealth" | "bio"; instagramMediaId?: string }> = [
    ...state.published.filter((r) => r.instagramMediaId && /^\d{10,}$/.test(r.instagramMediaId)).slice(-20),
    ...expansionPublished.filter((r) => r.instagramMediaId && /^\d{10,}$/.test(r.instagramMediaId)).slice(-12),
  ];
  for (const rec of recentWithIg) {
    const token = resolveMetaToken(rec.channel);
    if (!token || !rec.instagramMediaId) continue;
    const m = await fetchIgMetrics(rec.instagramMediaId, token);
    igMetricsMap.set(rec.instagramMediaId, m);
  }

  const nowMs = Date.now();
  const criticalAlerts: string[] = [];
  const breakoutAlerts: string[] = [];

  if (missingSceneFiles.length > 0) {
    criticalAlerts.push(`Eksik sahne dosyası tespit edildi (${missingSceneFiles.length} adet)`);
  }

  const allPerf: VideoPerformanceRow[] = [];
  for (const r of state.published) {
    const yt = r.videoId ? ytStatsMap.get(r.videoId) : undefined;
    const ig = r.instagramMediaId ? igMetricsMap.get(r.instagramMediaId) : undefined;
    const ytViews = yt?.views ?? 0;
    const ytLikes = yt?.likes ?? 0;
    const ytComments = yt?.comments ?? 0;
    const igViews = ig?.views ?? 0;
    const igLikes = ig?.likes ?? 0;
    const igComments = ig?.comments ?? 0;
    const igSaves = ig?.saves ?? 0;
    const igShares = ig?.shares ?? 0;
    const totalViews = ytViews + igViews;
    const ageHours = Math.max(1, Number(((nowMs - Date.parse(r.publishedAt)) / 3_600_000).toFixed(1)));
    const viewsPerHour = Number((totalViews / Math.max(6, ageHours)).toFixed(1));
    const viralScore = Number(
      (
        totalViews * 0.12 +
        viewsPerHour * 1.5 +
        (ytLikes + igLikes) * 1.5 +
        (ytComments + igComments) * 4 +
        (igSaves + igShares) * 6
      ).toFixed(1),
    );
    allPerf.push({
      id: r.id,
      channel: r.channel,
      nicheOrEpisode: extractNicheOrEpisode(r.id, r.channel),
      title: r.title,
      url: r.url,
      publishedAt: r.publishedAt,
      ageHours,
      ytViews,
      ytLikes,
      ytComments,
      igViews,
      igLikes,
      igComments,
      igSaves,
      igShares,
      totalViews,
      viewsPerHour,
      viralScore,
    });
  }

  const auditChannel = (ch: ChannelId): DirectorChannelAudit => {
    const recs = state.published.filter((r) => r.channel === ch);
    const perfs = allPerf.filter((p) => p.channel === ch).sort((a, b) => b.viralScore - a.viralScore);
    const shorts = recs.filter((r) => r.url.includes("/shorts/"));
    const longforms = recs.filter((r) => r.url.includes("/watch?v="));
    const hoursShort = Number(hoursSinceLastPublish(state.published, ch, "short").toFixed(1));
    const hoursLong = Number(hoursSinceLastPublish(state.published, ch, "longform").toFixed(1));
    const pendingDerived = queue.items.filter((i) => i.channel === ch && !i.publishedAt && !i.shortVideoId).length;
    const missingIg = shorts.filter((r) => !r.instagramMediaId).length;

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (hoursShort > 12 && Number.isFinite(hoursShort)) {
      issues.push(`Son Short yayını ${hoursShort} saat önce (12s eşiği aşıldı)`);
      criticalAlerts.push(`${ch}: Son Short ${hoursShort} saat önce yayınlandı — yayın aksamış olabilir.`);
    }
    if (hoursLong > 36 && Number.isFinite(hoursLong)) {
      issues.push(`Son 16:9 uzun video ${hoursLong} saat önce (36s eşiği aşıldı)`);
    }
    if (missingIg >= 2) {
      recommendations.push(`${missingIg} Short Instagram'da eksik — sync-instagram çalıştırılabilir.`);
    }

    for (const p of perfs.slice(0, 3)) {
      if (p.totalViews >= 10_000 && p.ageHours <= 72) {
        breakoutAlerts.push(
          `🔥 <b>PATLAMA TESPİTİ (${ch === "explainer" ? "Clear Mechanics" : "Kinetic Lab"}):</b> ` +
            `${p.totalViews.toLocaleString("tr-TR")} toplam izlenme (YT: ${p.ytViews.toLocaleString("tr-TR")} | IG: ${p.igViews.toLocaleString("tr-TR")}) — ${p.title}\n${p.url}`,
        );
      }
    }

    return {
      channel: ch,
      totalPublished: recs.length,
      shortsCount: shorts.length,
      longformCount: longforms.length,
      hoursSinceLastShort: Number.isFinite(hoursShort) ? hoursShort : -1,
      hoursSinceLastLongform: Number.isFinite(hoursLong) ? hoursLong : -1,
      pendingDerivedShorts: pendingDerived,
      missingInstagramCount: missingIg,
      totalYtViews: perfs.reduce((a, p) => a + p.ytViews, 0),
      totalIgViews: perfs.reduce((a, p) => a + p.igViews, 0),
      topPerformers: perfs.slice(0, 5),
      issues,
      recommendations,
    };
  };

  const physics = auditChannel("physics");
  const explainer = auditChannel("explainer");

  const auditExpansion = (ch: ExpansionChannelId): ExpansionChannelAudit => {
    const recs = expansionPublished.filter((r) => r.channel === ch);
    const publishedIds = new Set(recs.map((r) => r.id));
    const remainingStock = EXPANSION_JOBS.filter((j) => j.channel === ch && !publishedIds.has(j.id)).length;
    let totalYtViews = 0;
    let totalIgViews = 0;
    let topTitle: string | undefined;
    let topViews = 0;
    for (const r of recs) {
      const yt = r.videoId ? ytStatsMap.get(r.videoId) : undefined;
      const ig = r.instagramMediaId ? igMetricsMap.get(r.instagramMediaId) : undefined;
      const yv = yt?.views ?? 0;
      const iv = ig?.views ?? 0;
      totalYtViews += yv;
      totalIgViews += iv;
      if (yv + iv >= topViews) {
        topViews = yv + iv;
        topTitle = r.title;
      }
    }
    if (remainingStock <= 2) {
      const label = ch === "wealth" ? "Wealth Mechanics" : "Bio Mechanics";
      criticalAlerts.push(`${label}: Katalog stoku azaldı (kalan ${remainingStock} bölüm) — yeni bölüm eklenmeli.`);
    }
    return {
      channel: ch,
      totalPublished: recs.length,
      remainingStock,
      totalYtViews,
      totalIgViews,
      topTitle,
      topViews,
    };
  };

  const wealth = auditExpansion("wealth");
  const bio = auditExpansion("bio");

  // Dinamik büyüme stratejisi: YT+IG birleşik skoru en yüksek nişleri otomatik öne al!
  const validPhysicsNiches = new Set(CURATED_PHYSICS_JOBS.map((j) => j.niche));
  const physicsPerfByNiche = allPerf
    .filter((p) => p.channel === "physics" && validPhysicsNiches.has(p.nicheOrEpisode as PhysicsNiche) && p.totalViews > 0)
    .sort((a, b) => b.viralScore - a.viralScore);

  const boostedNiches = [...new Set(physicsPerfByNiche.slice(0, 3).map((p) => p.nicheOrEpisode as PhysicsNiche))];
  const cooledNiches = [...new Set(physicsPerfByNiche.slice(-2).map((p) => p.nicheOrEpisode as PhysicsNiche))].filter(
    (n) => !boostedNiches.includes(n),
  );

  const strategy: DirectorStrategy = {
    updatedAt: new Date().toISOString(),
    physics: {
      boostedNiches,
      cooledNiches,
      topWinningTitles: physics.topPerformers.slice(0, 3).map((p) => p.title),
    },
    explainer: {
      topWinningTitles: explainer.topPerformers.slice(0, 3).map((p) => p.title),
      highSaveTopics: explainer.topPerformers
        .filter((p) => p.igSaves + p.igShares > 0)
        .slice(0, 3)
        .map((p) => p.nicheOrEpisode),
    },
  };

  const healthy = criticalAlerts.length === 0;
  const report: DirectorReport = {
    generatedAt: strategy.updatedAt,
    healthy,
    missingSceneFiles,
    channels: { physics, explainer },
    expansion: { wealth, bio },
    strategy,
    criticalAlerts,
    breakoutAlerts,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(STRATEGY_PATH, `${JSON.stringify(strategy, null, 2)}\n`, "utf8");

  console.log(
    `[director] 6h Denetim TAMAM | Sağlıklı=${healthy} | YT+IG Toplam: Physics=${physics.totalYtViews + physics.totalIgViews}, Explainer=${explainer.totalYtViews + explainer.totalIgViews}, Wealth=${wealth.totalYtViews + wealth.totalIgViews}, Bio=${bio.totalYtViews + bio.totalIgViews}`,
  );
  console.log(`  Öne Alınan Kazanan Nişler: ${boostedNiches.join(", ") || "(veri birikiyor)"}`);

  if (criticalAlerts.length > 0) {
    await sendTelegramAlert(`🚨 <b>Kanal Müdürü Kritik Uyarı</b>\n• ${criticalAlerts.join("\n• ")}`);
  }
  if (breakoutAlerts.length > 0) {
    await sendTelegramAlert(breakoutAlerts.slice(0, 2).join("\n\n"));
  }

  // BigBoss isteği: Güncellenen strateji özetini (4 kanal + kazananlar + stok) tek kısa kartta Telegram'a ilet
  const remNarrExp = NARRATIVE_LONGFORM_SPECS.filter(
    (s) => s.channel === "explainer" && !state.published.some((p) => p.id === s.id),
  ).length;
  const remNarrPhys = NARRATIVE_LONGFORM_SPECS.filter(
    (s) => s.channel === "physics" && !state.published.some((p) => p.id === s.id),
  ).length;
  const topPhys = physics.topPerformers[0];
  const topExp = explainer.topPerformers[0];
  const stratMsg = [
    `🧠 <b>LITTLE BOSS STRATEJİ RAPORU (4 KANAL)</b>`,
    `• <b>Kinetic Lab:</b> YT ${(physics.totalYtViews).toLocaleString("tr-TR")} | IG ${(physics.totalIgViews).toLocaleString("tr-TR")} | Huni: ${physics.pendingDerivedShorts} | 16:9 Stok: ${remNarrPhys}`,
    topPhys ? `  ↳ Lider: ${topPhys.title.slice(0, 48)} (${topPhys.totalViews.toLocaleString("tr-TR")})` : "",
    `• <b>Clear Mechanics:</b> YT ${(explainer.totalYtViews).toLocaleString("tr-TR")} | IG ${(explainer.totalIgViews).toLocaleString("tr-TR")} | Huni: ${explainer.pendingDerivedShorts} | 16:9 Stok: ${remNarrExp}`,
    topExp ? `  ↳ Lider: ${topExp.title.slice(0, 48)} (${topExp.totalViews.toLocaleString("tr-TR")})` : "",
    `• <b>Wealth Mechanics:</b> YT ${(wealth.totalYtViews).toLocaleString("tr-TR")} | IG ${(wealth.totalIgViews).toLocaleString("tr-TR")} | Yayın: ${wealth.totalPublished} | Stok: ${wealth.remainingStock}`,
    `• <b>Bio Mechanics:</b> YT ${(bio.totalYtViews).toLocaleString("tr-TR")} | IG ${(bio.totalIgViews).toLocaleString("tr-TR")} | Yayın: ${bio.totalPublished} | Stok: ${bio.remainingStock}`,
    `• <b>Otomatik Öne Alınan Kazananlar:</b> ${boostedNiches.length > 0 ? boostedNiches.join(", ") : "Veri toplanıyor"}`,
  ]
    .filter(Boolean)
    .join("\n");
  await sendTelegramAlert(stratMsg);
}

main().catch((err) => {
  console.error("[director] HATA:", err);
  process.exit(1);
});
