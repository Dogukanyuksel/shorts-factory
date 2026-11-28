/**
 * Y-LABS OS v2.3 — Otomatik 4 Kanal YouTube Analytics API KPI Motoru.
 *
 * 4 kanalın tamamından (Kinetic Lab, Clear Mechanics, Wealth Mechanics, Bio Mechanics):
 *  - Son 28 gün & 365 gün izlenme saati (4.000 saat / 8.000 saat YPP ilerlemesi)
 *  - Ortalama izlenme süresi (AVD), ortalama izlenme yüzdesi (AVP), abone kazanımı, paylaşım
 *  - En çok izlenme saati getiren ilk 5 video (watch-hour driver'ları)
 *
 * Gereken OAuth scope: `https://www.googleapis.com/auth/yt-analytics.readonly`
 * Eğer bir kanalın token'ında bu izin henüz yoksa iş akışını bozmaz; `scopeStatus: "missing_yt_analytics_readonly"`
 * yazar ve izin eklendiği an otomatik devreye girer.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { refreshAccessToken } from "./youtube.js";
import { resolveYouTubeClient } from "./youtube-quota.js";

export type KpiChannelId = "physics" | "explainer" | "wealth" | "bio";

export interface TopWatchHourVideo {
  videoId: string;
  watchHours: number;
  views: number;
  avgViewDurationSec: number;
  avgViewPercentage: number;
}

export interface ChannelKpiSnapshot {
  channel: KpiChannelId;
  label: string;
  scopeStatus: "ok" | "missing_credentials" | "missing_yt_analytics_readonly" | "error";
  error?: string;
  last28d?: {
    views: number;
    watchHours: number;
    avgViewDurationSec: number;
    avgViewPercentage: number;
    subscribersGained: number;
    shares: number;
  };
  last365d?: {
    watchHours: number;
    views: number;
    ypp4kProgressPct: number;
    ypp8kProgressPct: number;
  };
  topWatchHourVideos: TopWatchHourVideo[];
}

export interface NetworkKpiReport {
  generatedAt: string;
  daysUntilFeb1_2027: number;
  channels: Record<KpiChannelId, ChannelKpiSnapshot>;
}

const CHANNEL_LABELS: Record<KpiChannelId, string> = {
  physics: "Kinetic Lab HQ",
  explainer: "Clear Mechanics",
  wealth: "Wealth Mechanics",
  bio: "Bio Mechanics",
};

export function daysUntilYppDouble(now = new Date()): number {
  const cutoff = Date.UTC(2027, 1, 1, 0, 0, 0); // 2027-02-01T00:00:00Z
  return Math.max(0, Math.ceil((cutoff - now.getTime()) / 86_400_000));
}

export function calcYppProgressPct(watchHours: number, threshold: 4000 | 8000): number {
  if (!Number.isFinite(watchHours) || watchHours <= 0) return 0;
  return Number(Math.min(100, (watchHours / threshold) * 100).toFixed(2));
}

function resolveChannelCreds(channel: KpiChannelId): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} | null {
  if (channel === "physics" || channel === "explainer") {
    const client = resolveYouTubeClient(channel);
    const refreshToken =
      (channel === "physics"
        ? process.env.YOUTUBE_REFRESH_TOKEN_PHYSICS || process.env.YOUTUBE_REFRESH_TOKEN
        : process.env.YOUTUBE_REFRESH_TOKEN_EXPLAINER) || "";
    if (!client || !refreshToken.trim()) return null;
    return { clientId: client.clientId, clientSecret: client.clientSecret, refreshToken: refreshToken.trim() };
  }

  const upper = channel.toUpperCase();
  const clientId = (process.env[`YOUTUBE_CLIENT_ID_${upper}`] || process.env.YOUTUBE_CLIENT_ID_EXPANSION || "").trim();
  const clientSecret = (
    process.env[`YOUTUBE_CLIENT_SECRET_${upper}`] ||
    process.env.YOUTUBE_CLIENT_SECRET_EXPANSION ||
    ""
  ).trim();
  const refreshToken = (process.env[`YOUTUBE_REFRESH_TOKEN_${upper}`] || "").trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

function isoDateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function queryAnalyticsReport(
  accessToken: string,
  params: Record<string, string>,
): Promise<{ rows?: Array<Array<string | number>> }> {
  const qs = new URLSearchParams({ ids: "channel==MINE", ...params });
  const r = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    const err = new Error(`YT Analytics HTTP ${r.status}: ${body.slice(0, 240)}`);
    (err as Error & { status?: number }).status = r.status;
    throw err;
  }
  return (await r.json()) as { rows?: Array<Array<string | number>> };
}

export async function fetchChannelKpi(channel: KpiChannelId): Promise<ChannelKpiSnapshot> {
  const label = CHANNEL_LABELS[channel];
  const creds = resolveChannelCreds(channel);
  if (!creds) {
    return { channel, label, scopeStatus: "missing_credentials", topWatchHourVideos: [] };
  }

  try {
    const accessToken = await refreshAccessToken(creds);
    const today = isoDateDaysAgo(0);
    const start28 = isoDateDaysAgo(28);
    const start365 = isoDateDaysAgo(365);

    const [rep28, rep365, topVids] = await Promise.all([
      queryAnalyticsReport(accessToken, {
        startDate: start28,
        endDate: today,
        metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,shares",
      }),
      queryAnalyticsReport(accessToken, {
        startDate: start365,
        endDate: today,
        metrics: "views,estimatedMinutesWatched",
      }),
      queryAnalyticsReport(accessToken, {
        startDate: start28,
        endDate: today,
        dimensions: "video",
        metrics: "estimatedMinutesWatched,views,averageViewDuration,averageViewPercentage",
        sort: "-estimatedMinutesWatched",
        maxResults: "5",
      }),
    ]);

    const r28 = rep28.rows?.[0] ?? [0, 0, 0, 0, 0, 0];
    const r365 = rep365.rows?.[0] ?? [0, 0];
    const watchHours28 = Number((Number(r28[1] ?? 0) / 60).toFixed(2));
    const watchHours365 = Number((Number(r365[1] ?? 0) / 60).toFixed(2));

    const topWatchHourVideos: TopWatchHourVideo[] = (topVids.rows ?? []).map((row) => ({
      videoId: String(row[0] ?? ""),
      watchHours: Number((Number(row[1] ?? 0) / 60).toFixed(2)),
      views: Number(row[2] ?? 0),
      avgViewDurationSec: Number(Number(row[3] ?? 0).toFixed(1)),
      avgViewPercentage: Number(Number(row[4] ?? 0).toFixed(1)),
    }));

    return {
      channel,
      label,
      scopeStatus: "ok",
      last28d: {
        views: Number(r28[0] ?? 0),
        watchHours: watchHours28,
        avgViewDurationSec: Number(Number(r28[2] ?? 0).toFixed(1)),
        avgViewPercentage: Number(Number(r28[3] ?? 0).toFixed(1)),
        subscribersGained: Number(r28[4] ?? 0),
        shares: Number(r28[5] ?? 0),
      },
      last365d: {
        views: Number(r365[0] ?? 0),
        watchHours: watchHours365,
        ypp4kProgressPct: calcYppProgressPct(watchHours365, 4000),
        ypp8kProgressPct: calcYppProgressPct(watchHours365, 8000),
      },
      topWatchHourVideos,
    };
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    const msg = err instanceof Error ? err.message : String(err);
    if (status === 403 || /insufficient|forbidden|scope/i.test(msg)) {
      return {
        channel,
        label,
        scopeStatus: "missing_yt_analytics_readonly",
        error: "Token'a yt-analytics.readonly izni eklenmeli",
        topWatchHourVideos: [],
      };
    }
    return { channel, label, scopeStatus: "error", error: msg, topWatchHourVideos: [] };
  }
}

export async function runNetworkKpiAudit(): Promise<NetworkKpiReport> {
  const order: KpiChannelId[] = ["physics", "explainer", "wealth", "bio"];
  const results = await Promise.all(order.map((ch) => fetchChannelKpi(ch)));
  const channels = Object.fromEntries(results.map((r) => [r.channel, r])) as Record<KpiChannelId, ChannelKpiSnapshot>;

  const report: NetworkKpiReport = {
    generatedAt: new Date().toISOString(),
    daysUntilFeb1_2027: daysUntilYppDouble(),
    channels,
  };

  const outPath = resolve("state", "kpi-weekly.json");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2));

  console.log(`\n📊 [Y-LABS OS KPI] 4-Kanal YouTube Analytics Raporu (1 Şubat 2027'ye ${report.daysUntilFeb1_2027} gün):`);
  for (const ch of order) {
    const snap = channels[ch];
    if (snap.scopeStatus === "ok" && snap.last28d && snap.last365d) {
      console.log(
        `  ✅ ${snap.label}: 365g=${snap.last365d.watchHours}h (%${snap.last365d.ypp4kProgressPct} of 4K) | ` +
          `28g=${snap.last28d.views} izlenme, AVD=${snap.last28d.avgViewDurationSec}s, AVP=%${snap.last28d.avgViewPercentage}, +${snap.last28d.subscribersGained} abone`,
      );
    } else {
      console.log(`  ⏳ ${snap.label}: ${snap.scopeStatus}${snap.error ? ` (${snap.error})` : ""}`);
    }
  }
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runNetworkKpiAudit().catch((err) => {
    console.error("[analytics-kpi] Kritik hata:", err);
    process.exit(1);
  });
}
