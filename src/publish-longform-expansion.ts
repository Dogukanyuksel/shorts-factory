import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hoursSinceLastPublish, resolveMinGapHours } from "./devops.js";
import { syncPublishedStateFromRemote } from "./state-sync.js";
import { EXPANSION_CHANNEL_META, type ExpansionChannelId } from "./catalog-expansion.js";
import { pickNarrativeLongform } from "./longform-narrative.js";
import { buildYouTubeNetworkFooter } from "./network-links.js";
import { runVideoQc } from "./qc.js";
import { renderNarrativeLongformVideo } from "./render-narrative.js";
import {
  addVideoToPlaylist,
  ensureYouTubePlaylist,
  getMyChannel,
  postYouTubeTopLevelComment,
  refreshAccessToken,
  uploadVideoToYouTube,
  uploadYouTubeThumbnail,
  type PrivacyStatus,
} from "./youtube.js";

interface ExpansionPublishedRecord {
  id: string;
  channel: ExpansionChannelId;
  title: string;
  videoId: string;
  url: string;
  publishedAt: string;
}

const STATE_PATH = resolve("state", "published-expansion.json");

function parseChannelArg(): ExpansionChannelId {
  const idx = process.argv.indexOf("--channel");
  const val = (idx >= 0 ? process.argv[idx + 1] : process.env.CHANNEL_ID || "wealth")?.trim().toLowerCase();
  return val === "bio" ? "bio" : "wealth";
}

async function loadExpansionState(): Promise<ExpansionPublishedRecord[]> {
  if (!existsSync(STATE_PATH)) return [];
  try {
    const raw = JSON.parse(await readFile(STATE_PATH, "utf8")) as { published?: ExpansionPublishedRecord[] };
    return Array.isArray(raw.published) ? raw.published : [];
  } catch {
    return [];
  }
}

async function main() {
  const channel = parseChannelArg();
  const meta = EXPANSION_CHANNEL_META[channel];
  const dryRun = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
  const privacy = ((process.env.YOUTUBE_PRIVACY || "public").trim() || "public") as PrivacyStatus;

  const clientId = (
    (channel === "wealth" ? process.env.YOUTUBE_CLIENT_ID_WEALTH : process.env.YOUTUBE_CLIENT_ID_BIO) ||
    process.env.YOUTUBE_CLIENT_ID_EXPANSION ||
    process.env.YOUTUBE_CLIENT_ID ||
    ""
  ).trim();
  const clientSecret = (
    (channel === "wealth" ? process.env.YOUTUBE_CLIENT_SECRET_WEALTH : process.env.YOUTUBE_CLIENT_SECRET_BIO) ||
    process.env.YOUTUBE_CLIENT_SECRET_EXPANSION ||
    process.env.YOUTUBE_CLIENT_SECRET ||
    ""
  ).trim();
  const refreshToken = (
    channel === "wealth" ? process.env.YOUTUBE_REFRESH_TOKEN_WEALTH : process.env.YOUTUBE_REFRESH_TOKEN_BIO
  )?.trim() || "";

  if (!dryRun && (!clientId || !clientSecret || !refreshToken)) {
    throw new Error(`Eksik YouTube OAuth kimlik bilgileri (${channel})`);
  }

  // Channel Guard — yanlış kanala yüklemeyi engeller
  if (!dryRun) {
    const accessToken = await refreshAccessToken({ clientId, clientSecret, refreshToken });
    const my = await getMyChannel(accessToken);
    if (!my.title.toLowerCase().includes(meta.guardNeedle)) {
      throw new Error(`KANAL KORUMASI: Beklenen "${meta.brandName}", bağlı kanal "${my.title}" (${my.id})`);
    }
    console.log(`🛡️ [longform-expansion] Kanal doğrulandı: "${my.title}" (${my.id})`);
  }

  syncPublishedStateFromRemote(STATE_PATH);
  const published = await loadExpansionState();
  // Çift uzun video koruması (MIN_PUBLISH_GAP_HOURS, ör. 40 saat)
  const minGapHours = resolveMinGapHours();
  const sinceLast = hoursSinceLastPublish(published, channel, "longform");
  if (!dryRun && minGapHours > 0 && sinceLast < minGapHours) {
    console.log(`[longform-expansion] "${channel}" son uzun video ${sinceLast.toFixed(1)} saat önce (< ${minGapHours}); atlanıyor.`);
    return;
  }
  const publishedIds = new Set(published.map((r) => r.id));
  const spec = pickNarrativeLongform(channel, publishedIds);
  if (!spec) {
    console.log(`[longform-expansion] ${meta.brandName} için tüm 4-perdeli 16:9 bölümler yayınlandı.`);
    return;
  }

  console.log(`\n🎬 [longform-expansion] 4-Perdeli 16:9 Deep Dive hazırlanıyor: ${spec.id}`);
  const rendered = await renderNarrativeLongformVideo(spec);
  const qc = await runVideoQc(rendered.mp4Path, { width: 1920, height: 1080, minSec: 60, maxSec: 4 * 3600 });
  if (!qc.ok) {
    throw new Error(`QC Gate REDDETTİ: ${qc.errors.join(" | ")}`);
  }
  console.log(`✅ [longform-expansion-qc] ${spec.id}: ${qc.width}x${qc.height}, ${qc.durationSec.toFixed(1)}s`);

  if (dryRun) {
    console.log(`[longform-expansion] DRY-RUN tamamlandı: ${rendered.mp4Path}`);
    return;
  }

  const recentShorts = published
    .filter((r) => r.channel === channel && r.url.includes("/shorts/"))
    .slice(-5)
    .reverse();
  const shortsLinks =
    recentShorts.length > 0
      ? `\n\n🔥 Watch the 60-Second Shorts Breakdowns:\n${recentShorts.map((s) => `• ${s.title.replace(/#shorts/gi, "").trim()}: ${s.url}`).join("\n")}`
      : "";

  const ytDescription = `${rendered.descriptionBase}${shortsLinks}\n\n${buildYouTubeNetworkFooter(channel)}`;
  const uploaded = await uploadVideoToYouTube(
    rendered.mp4Path,
    {
      title: rendered.title,
      description: ytDescription,
      tags: rendered.tags,
      categoryId: spec.categoryId,
      privacyStatus: privacy,
    },
    { clientId, clientSecret, refreshToken },
  );
  const watchUrl = `https://www.youtube.com/watch?v=${uploaded.videoId}`;
  console.log(`✅ [longform-expansion] 16:9 DEEP DIVE YAYINLANDI: ${watchUrl}`);

  published.push({
    id: spec.id,
    channel,
    title: rendered.title,
    videoId: uploaded.videoId,
    url: watchUrl,
    publishedAt: new Date().toISOString(),
  });
  await mkdir(resolve("state"), { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify({ published }, null, 2)}\n`, "utf8");

  try {
    const token = await refreshAccessToken({ clientId, clientSecret, refreshToken });
    if (rendered.thumbnailPath && existsSync(rendered.thumbnailPath)) {
      await uploadYouTubeThumbnail(uploaded.videoId, rendered.thumbnailPath, token).catch((thErr) => {
        console.warn("[longform-expansion] Kapak görseli uyarısı:", thErr);
      });
    }
    const comment = `🎬 Which act blew your mind the most? Drop the timestamp below! Subscribe to ${meta.brandName} for our next 4-act 60fps deep dive.`;
    await postYouTubeTopLevelComment(uploaded.videoId, comment, token);
    const plId = await ensureYouTubePlaylist(`${meta.brandName} — 4-Act Deep Dives`, `Full 16:9 60fps visual deep dives by ${meta.brandName}.`, token);
    if (plId) await addVideoToPlaylist(plId, uploaded.videoId, token);
  } catch (e) {
    console.warn("[longform-expansion] İlk yorum/playlist uyarısı:", e);
  }
}

main().catch((err) => {
  console.error("[longform-expansion] HATA:", err);
  process.exit(1);
});
