import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadState, type ChannelId } from "./auto-publish.js";
import { fetchYouTubeComments } from "./youtube.js";

export type VideoMetrics = {
  id: string;
  channel: ChannelId;
  title: string;
  videoId: string;
  url: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  engagementRatePct: number;
  recentComments: string[];
};

export type AnalyticsReport = {
  updatedAt: string;
  totals: {
    videos: number;
    views: number;
    likes: number;
    comments: number;
  };
  topByChannel: {
    physics: VideoMetrics[];
    explainer: VideoMetrics[];
  };
  videos: VideoMetrics[];
};

const ANALYTICS_PATH = resolve("state", "analytics.json");

export async function fetchYouTubeStatistics(
  videoIds: string[],
  apiKey: string,
): Promise<Map<string, { views: number; likes: number; comments: number }>> {
  const out = new Map<string, { views: number; likes: number; comments: number }>();
  if (videoIds.length === 0) return out;

  // YouTube Data API videos.list tek seferde en fazla 50 video ID kabul eder
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: "statistics",
      id: batch.join(","),
      key: apiKey,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`, {
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`YouTube statistics hatası (${res.status}): ${text.slice(0, 400)}`);
    }
    const json = JSON.parse(text) as {
      items?: Array<{
        id?: string;
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      }>;
    };
    for (const item of json.items || []) {
      if (!item.id) continue;
      out.set(item.id, {
        views: Number(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
      });
    }
  }
  return out;
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || "";
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY ortam değişkeni gerekli.");
  }

  const state = await loadState();
  const valid = state.published.filter((r) => Boolean(r.videoId));
  const statsMap = await fetchYouTubeStatistics(
    valid.map((r) => r.videoId),
    apiKey,
  );

  const videos: VideoMetrics[] = [];
  for (const rec of valid) {
    const s = statsMap.get(rec.videoId) || { views: 0, likes: 0, comments: 0 };
    const eng = s.views > 0 ? Number((((s.likes + s.comments * 3) / s.views) * 100).toFixed(2)) : 0;
    let recentComments: string[] = [];
    if (s.comments > 0) {
      try {
        recentComments = await fetchYouTubeComments(rec.videoId, { apiKey }, 20);
      } catch {
        recentComments = [];
      }
    }
    videos.push({
      id: rec.id,
      channel: rec.channel,
      title: rec.title,
      videoId: rec.videoId,
      url: rec.url,
      publishedAt: rec.publishedAt,
      views: s.views,
      likes: s.likes,
      comments: s.comments,
      engagementRatePct: eng,
      recentComments,
    });
  }

  const byViewsDesc = (a: VideoMetrics, b: VideoMetrics) => b.views - a.views;
  const report: AnalyticsReport = {
    updatedAt: new Date().toISOString(),
    totals: {
      videos: videos.length,
      views: videos.reduce((acc, v) => acc + v.views, 0),
      likes: videos.reduce((acc, v) => acc + v.likes, 0),
      comments: videos.reduce((acc, v) => acc + v.comments, 0),
    },
    topByChannel: {
      physics: videos.filter((v) => v.channel === "physics").sort(byViewsDesc).slice(0, 5),
      explainer: videos.filter((v) => v.channel === "explainer").sort(byViewsDesc).slice(0, 5),
    },
    videos,
  };

  await mkdir(dirname(ANALYTICS_PATH), { recursive: true });
  await writeFile(ANALYTICS_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `[analytics] Güncellendi: ${report.totals.videos} video | ${report.totals.views} izlenme | ${report.totals.likes} beğeni | ${report.totals.comments} yorum`,
  );
}

const isDirectRun = process.argv[1]?.endsWith("analytics.ts") || process.argv[1]?.endsWith("analytics.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[analytics] HATA:", e);
    process.exit(1);
  });
}
