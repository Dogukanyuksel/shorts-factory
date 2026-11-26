import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ChannelId as ChannelKind } from "./catalog.js";
import { hoursSinceLastPublish, resolveMinGapHours } from "./devops.js";
import { runVideoQc } from "./qc.js";
import { renderLongformVideo } from "./render-longform.js";
import { syncPublishedStateFromRemote } from "./state-sync.js";
import {
  activeBlock,
  formatTrTime,
  loadQuotaState,
  quotaKey,
  recordQuotaBlock,
  resolveYouTubeClient,
  writeLastError,
  writePublishNotice,
  YouTubeQuotaError,
} from "./youtube-quota.js";
import { uploadVideoToYouTube } from "./youtube.js";

interface PublishedRecord {
  id: string;
  channel: ChannelKind;
  title: string;
  videoId: string;
  url: string;
  instagramMediaId?: string;
  publishedAt: string;
}

interface PublishedState {
  published: PublishedRecord[];
}

const STATE_PATH = resolve("state", "published.json");

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

async function loadState(): Promise<PublishedState> {
  if (!existsSync(STATE_PATH)) return { published: [] };
  const raw = await readFile(STATE_PATH, "utf8");
  return JSON.parse(raw) as PublishedState;
}

async function saveState(state: PublishedState): Promise<void> {
  await mkdir(resolve("state"), { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function resolveRefreshToken(channel: ChannelKind): string {
  const direct = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
  if (direct) return direct;
  return channel === "explainer"
    ? process.env.YOUTUBE_REFRESH_TOKEN_EXPLAINER?.trim() || ""
    : process.env.YOUTUBE_REFRESH_TOKEN_PHYSICS?.trim() || "";
}

/** Aynı kanaldaki son 6 gerçek YouTube Shorts linkini uzun video açıklamasına ekler. */
function buildLinkedShortsSection(state: PublishedState, channel: ChannelKind): string {
  const shorts = state.published
    .filter((r) => r.channel === channel && r.url && r.url.includes("/shorts/"))
    .slice(-6)
    .reverse();

  if (shorts.length === 0) return "";
  const lines = shorts.map((s) => `• ${s.title.replace(/#shorts/gi, "").trim()}: ${s.url}`);
  return `\n\n🔥 Watch the Viral Shorts Versions:\n${lines.join("\n")}`;
}

async function main() {
  const channel = (parseArg("channel", "explainer") === "physics" ? "physics" : "explainer") as ChannelKind;
  const dryRun = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
  const privacy = (process.env.YOUTUBE_PRIVACY || parseArg("privacy", "public")) as "public" | "unlisted" | "private";

  // Başka bir run bu arada yayın yaptıysa bölüm numarası ve aralık kontrolü için onu da gör
  syncPublishedStateFromRemote(STATE_PATH);
  const state = await loadState();

  // Yayın aralığı koruması: watchdog yeniden denemesi + cron aynı gün 2 uzun video yayınlamasın
  const minGapHours = resolveMinGapHours();
  const sinceLast = hoursSinceLastPublish(state.published, channel, "longform");
  if (!dryRun && minGapHours > 0 && sinceLast < minGapHours) {
    console.log(
      `[publish-longform] "${channel}" kanalında son uzun video ${sinceLast.toFixed(1)} saat önce yayınlandı (< ${minGapHours} saat). ` +
        "Çift yayını önlemek için atlanıyor (zorlamak için FORCE_PUBLISH=true).",
    );
    return;
  }

  // Kota bloğu: 30 dk render'ı boşa harcamadan atla
  const ytClient = resolveYouTubeClient(channel);
  if (!dryRun && ytClient.clientId) {
    const block = activeBlock(await loadQuotaState(), quotaKey(ytClient.clientId));
    if (block) {
      await writePublishNotice(
        `⏸️ ${channel} uzun video atlandı: YouTube kotası dolu (${block.reason}). Kota ${formatTrTime(block.until)} (TR saati) sonra sıfırlanır.`,
      );
      return;
    }
  }

  const prevLongformCount = state.published.filter(
    (r) => r.channel === channel && r.id.startsWith(`longform-${channel}-`),
  ).length;
  const nextEp = prevLongformCount + 1;

  console.log(`\n[publish-longform] Kanal=${channel} | Bölüm=#${nextEp} | Privacy=${privacy}`);
  const rendered = await renderLongformVideo({
    channel,
    episodeNumber: nextEp,
    fps: 30,
    maxChapters: channel === "physics" ? 6 : 8,
  });

  console.log("[qc] 16:9 uzun video kalite kontrolü çalışıyor...");
  const qc = await runVideoQc(rendered.mp4Path, { width: 1920, height: 1080, minSec: 60, maxSec: 4 * 3600 });
  if (!qc.ok) {
    throw new Error(`QC Gate REDDETTİ (yayın durduruldu): ${qc.errors.join(" | ")}`);
  }
  console.log(`✅ [qc] GEÇTİ: ${qc.width}x${qc.height}, ${qc.durationSec.toFixed(1)}s, ${(qc.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`);

  const shortsLinks = buildLinkedShortsSection(state, channel);
  const fullDescription =
    `${rendered.descriptionBase}${shortsLinks}\n\n` +
    `🔔 Subscribe for a new 16:9 deep dive every single day!\n` +
    `#${rendered.tags.map((t) => t.replace(/\s+/g, "")).join(" #")}`;

  if (dryRun) {
    console.log(`\n[publish-longform] DRY-RUN tamamlandı (YouTube'a yüklenmedi).`);
    console.log(`  MP4: ${rendered.mp4Path}`);
    console.log(`  Başlık: ${rendered.title}`);
    console.log(`  Açıklama:\n${fullDescription}`);
    return;
  }

  const { clientId, clientSecret } = ytClient;
  const refreshToken = resolveRefreshToken(channel);
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(`YouTube API secret'ları eksik (${channel})!`);
  }

  console.log(`[publish-longform] YouTube'a yükleniyor (${privacy})...`);
  let uploaded: Awaited<ReturnType<typeof uploadVideoToYouTube>>;
  try {
    uploaded = await uploadVideoToYouTube(
      rendered.mp4Path,
      {
        title: rendered.title,
        description: fullDescription,
        tags: rendered.tags,
        categoryId: "28",
        privacyStatus: privacy,
      },
      { clientId, clientSecret, refreshToken },
    );
  } catch (err) {
    if (err instanceof YouTubeQuotaError) {
      const block = await recordQuotaBlock(quotaKey(clientId), err.reason, channel);
      await writePublishNotice(
        `⏸️ ${channel} uzun video: YouTube kotası doldu (${err.reason}). Yarın yeniden denenecek; kota ${formatTrTime(block.until)} (TR saati) sonra sıfırlanır.`,
      );
      return;
    }
    throw err;
  }

  const watchUrl = `https://www.youtube.com/watch?v=${uploaded.videoId}`;
  console.log(`\n✅ [publish-longform] YOUTUBE 16:9 UZUN VİDEO YAYINLANDI: ${watchUrl}`);

  state.published.push({
    id: rendered.episodeId,
    channel,
    title: rendered.title,
    videoId: uploaded.videoId,
    url: watchUrl,
    publishedAt: new Date().toISOString(),
  });
  await saveState(state);
}

main().catch(async (err) => {
  console.error("[publish-longform] HATA:", err);
  await writeLastError(err);
  process.exit(1);
});
