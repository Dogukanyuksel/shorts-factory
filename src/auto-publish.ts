import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pickNextJob, type ChannelId, type PublishJob } from "./catalog.js";
import { buildInstagramCaption, uploadReelToInstagram } from "./instagram.js";
import { uploadVideoToYouTube, type PrivacyStatus } from "./youtube.js";

export type PublishedRecord = {
  id: string;
  channel: ChannelId;
  title: string;
  videoId: string;
  url: string;
  instagramMediaId?: string;
  publishedAt: string;
};

export type PublishState = {
  published: PublishedRecord[];
};

const STATE_PATH = resolve("state", "published.json");

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function runTsx(args: string[]): Promise<void> {
  return new Promise((ok, no) => {
    const p = spawn("npx", ["tsx", ...args], { stdio: "inherit" });
    p.on("error", no);
    p.on("close", (c) => (c === 0 ? ok() : no(new Error(`tsx ${args[0]} exit ${c}`))));
  });
}

export async function loadState(statePath = STATE_PATH): Promise<PublishState> {
  if (!existsSync(statePath)) return { published: [] };
  const raw = await readFile(statePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<PublishState>;
  return { published: Array.isArray(parsed.published) ? parsed.published : [] };
}

export async function saveState(state: PublishState, statePath = STATE_PATH): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function renderJob(job: PublishJob): Promise<string> {
  if (job.channel === "physics") {
    await runTsx([
      "src/render.ts",
      "--niche", job.niche,
      "--seed", String(job.seed),
      "--seconds", String(job.seconds),
      "--fps", "60",
      "--hook", job.hook,
      "--narration", job.narration,
    ]);
    return resolve("out", `${job.niche}-seed${job.seed}.mp4`);
  }

  await runTsx([
    "src/render-explainer.ts",
    "--episode", job.episode,
    "--fps", "60",
  ]);
  return resolve("out", `how-it-works-${job.episode}.mp4`);
}

function resolveRefreshToken(channel: ChannelId): string {
  const direct = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
  if (direct) return direct;
  const specific =
    channel === "explainer"
      ? process.env.YOUTUBE_REFRESH_TOKEN_EXPLAINER?.trim()
      : process.env.YOUTUBE_REFRESH_TOKEN_PHYSICS?.trim();
  return specific || "";
}

async function main() {
  const rawChannel = parseArg("channel", "physics");
  if (rawChannel !== "physics" && rawChannel !== "explainer") {
    throw new Error(`Geçersiz --channel değeri: ${rawChannel} (physics veya explainer olmalı)`);
  }
  const channel: ChannelId = rawChannel;
  const dryRun = hasFlag("dry-run") || process.env.DRY_RUN === "true";
  const privacyRaw = parseArg("privacy", process.env.YOUTUBE_PRIVACY || "public");
  const privacyStatus: PrivacyStatus =
    privacyRaw === "private" || privacyRaw === "unlisted" ? privacyRaw : "public";

  const state = await loadState();
  const publishedIds = new Set(state.published.map((r) => r.id));
  const job = pickNextJob(channel, publishedIds);

  if (!job) {
    console.log(`[auto-publish] "${channel}" kanalı için bekleyen yeni video kalmadı.`);
    return;
  }

  console.log(`\n[auto-publish] Kanal=${channel} | Video=${job.id}`);
  console.log(`[auto-publish] Başlık: ${job.title}`);
  const mp4Path = await renderJob(job);

  if (!existsSync(mp4Path)) {
    throw new Error(`Render sonrası MP4 bulunamadı: ${mp4Path}`);
  }

  if (dryRun) {
    console.log(`\n[auto-publish] DRY-RUN tamamlandı (YouTube'a yüklenmedi).`);
    console.log(`  Dosya    : ${mp4Path}`);
    console.log(`  Başlık   : ${job.title}`);
    console.log(`  Gizlilik : ${privacyStatus}`);
    console.log(`  Etiketler: ${job.tags.join(", ")}`);
    return;
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim() || "";
  const refreshToken = resolveRefreshToken(channel);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      `YouTube API kimlik bilgileri eksik! Gerekli secret'lar: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET ve ${
        channel === "explainer" ? "YOUTUBE_REFRESH_TOKEN_EXPLAINER" : "YOUTUBE_REFRESH_TOKEN_PHYSICS"
      }`,
    );
  }

  console.log(`[auto-publish] YouTube'a yükleniyor (${privacyStatus})...`);
  const result = await uploadVideoToYouTube(
    mp4Path,
    {
      title: job.title,
      description: job.description,
      tags: job.tags,
      categoryId: job.categoryId,
      privacyStatus,
    },
    { clientId, clientSecret, refreshToken },
  );

  console.log(`\n✅ [auto-publish] YOUTUBE YAYINLANDI: ${result.url}`);

  // İsteğe bağlı: Meta API secret'ları tanımlıysa aynı MP4'ü Instagram Reels'e de yayınla
  const igUserId =
    process.env.IG_USER_ID?.trim() ||
    (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
    "";
  const metaToken = process.env.META_ACCESS_TOKEN?.trim() || "";
  let instagramMediaId: string | undefined;

  if (igUserId && metaToken) {
    try {
      console.log("[auto-publish] Instagram Reels'e yükleniyor...");
      const igCaption = buildInstagramCaption(job.title, job.description);
      const igRes = await uploadReelToInstagram(mp4Path, igCaption, {
        igUserId,
        accessToken: metaToken,
      });
      instagramMediaId = igRes.mediaId;
      console.log(`✅ [auto-publish] INSTAGRAM REELS YAYINLANDI: mediaId=${igRes.mediaId}`);
    } catch (igErr) {
      // Instagram hatası YouTube yayın kaydını engellemesin
      console.error("[auto-publish] Instagram Reels uyarısı (YouTube başarılı):", igErr);
    }
  }

  state.published.push({
    id: job.id,
    channel,
    title: job.title,
    videoId: result.videoId,
    url: result.url,
    ...(instagramMediaId ? { instagramMediaId } : {}),
    publishedAt: new Date().toISOString(),
  });
  await saveState(state);
}

const isDirectRun = process.argv[1]?.endsWith("auto-publish.ts") || process.argv[1]?.endsWith("auto-publish.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[auto-publish] HATA:", e);
    process.exit(1);
  });
}
