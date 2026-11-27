import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchYouTubeStatistics } from "./analytics.js";
import { loadState, type ChannelId } from "./auto-publish.js";
import { CURATED_PHYSICS_JOBS, EXPLAINER_JOBS } from "./catalog.js";
import { loadDerivedShortsQueue } from "./derive-shorts.js";
import { hoursSinceLastPublish } from "./devops.js";
import { NARRATIVE_LONGFORM_SPECS } from "./longform-narrative.js";

export interface DirectorChannelAudit {
  channel: ChannelId;
  totalPublished: number;
  shortsCount: number;
  longformCount: number;
  hoursSinceLastShort: number;
  hoursSinceLastLongform: number;
  pendingDerivedShorts: number;
  missingInstagramCount: number;
  topPerformer?: { title: string; views: number; viewsPerHour: number; engagementRatePct: number; url: string };
  issues: string[];
  recommendations: string[];
}

export interface DirectorReport {
  generatedAt: string;
  healthy: boolean;
  missingSceneFiles: string[];
  channels: Record<ChannelId, DirectorChannelAudit>;
  criticalAlerts: string[];
  breakoutAlerts: string[];
}

const REPORT_PATH = resolve("state", "director-report.json");

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
  const queue = await loadDerivedShortsQueue();
  const missingSceneFiles = auditSceneAssets();

  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || "";
  const validIds = state.published.map((r) => r.videoId).filter(Boolean);
  const statsMap = apiKey && validIds.length > 0 ? await fetchYouTubeStatistics(validIds, apiKey) : new Map();

  const nowMs = Date.now();
  const criticalAlerts: string[] = [];
  const breakoutAlerts: string[] = [];

  if (missingSceneFiles.length > 0) {
    criticalAlerts.push(`Eksik sahne dosyası tespit edildi (${missingSceneFiles.length} adet)`);
  }

  const auditChannel = (ch: ChannelId): DirectorChannelAudit => {
    const recs = state.published.filter((r) => r.channel === ch);
    const shorts = recs.filter((r) => r.url.includes("/shorts/"));
    const longforms = recs.filter((r) => r.url.includes("/watch?v="));
    const hoursShort = Number(hoursSinceLastPublish(state.published, ch, "short").toFixed(1));
    const hoursLong = Number(hoursSinceLastPublish(state.published, ch, "longform").toFixed(1));
    const pendingDerived = queue.items.filter((i) => i.channel === ch && !i.publishedAt && !i.shortVideoId).length;
    const missingIg = shorts.filter((r) => !r.instagramMediaId).length;

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (hoursShort > 14 && Number.isFinite(hoursShort)) {
      issues.push(`Son Short yayını ${hoursShort} saat önce (14s eşiği aşıldı)`);
      criticalAlerts.push(`${ch}: Son Short ${hoursShort} saat önce yayınlandı — yayın aksamış olabilir.`);
    }
    if (hoursLong > 36 && Number.isFinite(hoursLong)) {
      issues.push(`Son 16:9 uzun video ${hoursLong} saat önce (36s eşiği aşıldı)`);
    }
    if (missingIg >= 2) {
      recommendations.push(`${missingIg} Short Instagram'da eksik — sync-instagram çalıştırılabilir.`);
    }
    if (pendingDerived === 0) {
      recommendations.push("Huni kuyruğu boş — bir sonraki 4-perdeli uzun video yeni 3 Vitrin Short üretecek.");
    }

    let topPerformer: DirectorChannelAudit["topPerformer"];
    for (const r of recs) {
      if (!r.videoId) continue;
      const st = statsMap.get(r.videoId);
      if (!st) continue;
      const ageH = Math.max(1, (nowMs - Date.parse(r.publishedAt)) / 3_600_000);
      const vph = Number((st.views / ageH).toFixed(1));
      const eng = st.views > 0 ? Number((((st.likes + st.comments * 3) / st.views) * 100).toFixed(2)) : 0;
      if (!topPerformer || st.views > topPerformer.views) {
        topPerformer = { title: r.title, views: st.views, viewsPerHour: vph, engagementRatePct: eng, url: r.url };
      }
      if (st.views >= 10_000 && ageH <= 72) {
        breakoutAlerts.push(
          `🔥 <b>PATLAMA TESPİTİ (${ch === "explainer" ? "Clear Mechanics" : "Kinetic Lab"}):</b> ` +
            `${st.views.toLocaleString("tr-TR")} izlenme (${vph}/saat) — ${r.title}\n${r.url}`,
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
      topPerformer,
      issues,
      recommendations,
    };
  };

  const physics = auditChannel("physics");
  const explainer = auditChannel("explainer");
  const healthy = criticalAlerts.length === 0;

  const report: DirectorReport = {
    generatedAt: new Date().toISOString(),
    healthy,
    missingSceneFiles,
    channels: { physics, explainer },
    criticalAlerts,
    breakoutAlerts,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`[director] Denetim tamamlandı | Sağlıklı=${healthy} | Kritik=${criticalAlerts.length} | Patlama=${breakoutAlerts.length}`);
  console.log(`  Kinetic Lab    : ${physics.shortsCount} Short, ${physics.longformCount} Uzun, ${physics.pendingDerivedShorts} huni bekleyen`);
  console.log(`  Clear Mechanics: ${explainer.shortsCount} Short, ${explainer.longformCount} Uzun, ${explainer.pendingDerivedShorts} huni bekleyen`);

  // Patron kuralı: Gereksiz spam yok — yalnızca gerçek kritik arıza veya 10K+ viral patlamada Telegram'a bildir
  if (criticalAlerts.length > 0) {
    await sendTelegramAlert(`🚨 <b>Kanal Müdürü Kritik Uyarı</b>\n• ${criticalAlerts.join("\n• ")}`);
  }
  if (breakoutAlerts.length > 0) {
    await sendTelegramAlert(breakoutAlerts.slice(0, 2).join("\n\n"));
  }
}

main().catch((err) => {
  console.error("[director] HATA:", err);
  process.exit(1);
});
