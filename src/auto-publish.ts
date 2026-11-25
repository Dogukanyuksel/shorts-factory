import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  CURATED_PHYSICS_JOBS,
  EXPLAINER_JOBS,
  getEngagementKit,
  pickJobByKey,
  pickNextJob,
  type ChannelId,
  type PublishJob,
} from "./catalog.js";
export type { ChannelId };
import {
  buildInstagramCaption,
  fetchInstagramComments,
  postInstagramComment,
  tallyABVotes,
  uploadReelToInstagram,
} from "./instagram.js";
import { hoursSinceLastPublish, resolveMinGapHours } from "./devops.js";
import { runVideoQc } from "./qc.js";
import { syncPublishedStateFromRemote } from "./state-sync.js";
import { fetchYouTubeComments, uploadVideoToYouTube, type PrivacyStatus } from "./youtube.js";

export type PublishedRecord = {
  id: string;
  channel: ChannelId;
  title: string;
  videoId: string;
  url: string;
  instagramMediaId?: string;
  poll?: {
    optionAKey: string;
    optionBKey: string;
    optionA: string;
    optionB: string;
  };
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
  const kit = getEngagementKit(job);
  if (job.channel === "physics") {
    await runTsx([
      "src/render.ts",
      "--niche", job.niche,
      "--seed", String(job.seed),
      "--seconds", String(job.seconds),
      "--fps", "60",
      "--hook", job.hook,
      "--narration", job.narration,
      "--cta", kit.introCta,
      "--poll", kit.pollLine,
    ]);
    return resolve("out", `${job.niche}-seed${job.seed}.mp4`);
  }

  await runTsx([
    "src/render-explainer.ts",
    "--episode", job.episode,
    "--fps", "60",
    "--ep-badge", kit.introCta,
    "--poll", kit.pollLine,
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
  const syncIgOnly = hasFlag("sync-instagram") || process.env.SYNC_INSTAGRAM_ONLY === "true";
  const privacyRaw = parseArg("privacy", process.env.YOUTUBE_PRIVACY || "public");
  const privacyStatus: PrivacyStatus =
    privacyRaw === "private" || privacyRaw === "unlisted" ? privacyRaw : "public";

  // Başka bir run (ör. watchdog yeniden denemesi) bu arada yayın yaptıysa onu da gör
  syncPublishedStateFromRemote(STATE_PATH);
  const state = await loadState();

  if (syncIgOnly) {
    const igUserId =
      process.env.IG_USER_ID?.trim() ||
      (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
      "";
    const metaToken = process.env.META_ACCESS_TOKEN?.trim() || "";
    if (!igUserId || !metaToken) {
      throw new Error("Instagram senkronizasyonu için IG_USER_ID ve META_ACCESS_TOKEN gerekli.");
    }
    const missing = state.published.filter((r) => r.channel === channel && !r.instagramMediaId);
    if (missing.length === 0) {
      console.log(`[auto-publish] "${channel}" kanalında Instagram'da eksik video yok.`);
      return;
    }
    const allJobs: PublishJob[] = [...CURATED_PHYSICS_JOBS, ...EXPLAINER_JOBS];
    for (const rec of missing) {
      const job = allJobs.find((j) => j.id === rec.id);
      if (!job) continue;
      console.log(`\n[sync-instagram] Eksik Reels render & yükleme: ${job.id}`);
      const mp4Path = await renderJob(job);
      const igCaption = buildInstagramCaption(job.title, job.description);
      const igRes = await uploadReelToInstagram(mp4Path, igCaption, { igUserId, accessToken: metaToken });
      rec.instagramMediaId = igRes.mediaId;
      await saveState(state);
      console.log(`✅ [sync-instagram] YÜKLENDİ: ${job.id} → mediaId=${igRes.mediaId}`);
    }
    return;
  }

  // Yayın aralığı koruması: gecikmiş cron + watchdog tetiklemesi aynı slotta 2 video yayınlamasın
  const minGapHours = resolveMinGapHours();
  const sinceLast = hoursSinceLastPublish(state.published, channel, "short");
  if (!dryRun && minGapHours > 0 && sinceLast < minGapHours) {
    console.log(
      `[auto-publish] "${channel}" kanalında son short ${sinceLast.toFixed(1)} saat önce yayınlandı (< ${minGapHours} saat). ` +
        "Çift yayını önlemek için atlanıyor (zorlamak için FORCE_PUBLISH=true).",
    );
    return;
  }

  const publishedIds = new Set(state.published.map((r) => r.id));

  // Önceki videonun hem YouTube Shorts hem Instagram Reels yorumlarındaki A/B oylarını birleştirip kazananı öne al
  let votedJob: PublishJob | null = null;
  const igUserIdPre =
    process.env.IG_USER_ID?.trim() ||
    (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
    "";
  const metaTokenPre = process.env.META_ACCESS_TOKEN?.trim() || "";
  const ytApiKeyPre = process.env.YOUTUBE_API_KEY?.trim() || "";
  const ytClientIdPre = process.env.YOUTUBE_CLIENT_ID?.trim() || "";
  const ytClientSecretPre = process.env.YOUTUBE_CLIENT_SECRET?.trim() || "";
  const ytRefreshPre = resolveRefreshToken(channel);

  const lastWithPoll = [...state.published]
    .reverse()
    .find((r) => r.channel === channel && r.poll && (r.instagramMediaId || r.videoId));

  if (lastWithPoll?.poll) {
    const allComments: string[] = [];

    if (lastWithPoll.instagramMediaId && igUserIdPre && metaTokenPre) {
      try {
        const igComments = await fetchInstagramComments(lastWithPoll.instagramMediaId, {
          igUserId: igUserIdPre,
          accessToken: metaTokenPre,
        });
        allComments.push(...igComments);
      } catch (igErr) {
        console.warn("[auto-publish] Instagram anket yorumları okunamadı:", igErr);
      }
    }

    if (lastWithPoll.videoId && (ytApiKeyPre || (ytClientIdPre && ytClientSecretPre && ytRefreshPre))) {
      try {
        const ytComments = await fetchYouTubeComments(lastWithPoll.videoId, {
          apiKey: ytApiKeyPre || undefined,
          creds:
            ytClientIdPre && ytClientSecretPre && ytRefreshPre
              ? { clientId: ytClientIdPre, clientSecret: ytClientSecretPre, refreshToken: ytRefreshPre }
              : undefined,
        });
        allComments.push(...ytComments);
      } catch (ytErr) {
        console.warn("[auto-publish] YouTube anket yorumları okunamadı:", ytErr);
      }
    }

    if (allComments.length > 0) {
      const tally = tallyABVotes(allComments, lastWithPoll.poll.optionA, lastWithPoll.poll.optionB);
      if (tally.winner) {
        const winningKey =
          tally.winner === "A" ? lastWithPoll.poll.optionAKey : lastWithPoll.poll.optionBKey;
        const winningLabel =
          tally.winner === "A" ? lastWithPoll.poll.optionA : lastWithPoll.poll.optionB;
        votedJob = pickJobByKey(channel, winningKey, publishedIds);
        if (votedJob) {
          console.log(
            `🗳️ [auto-publish] YT+IG ortak anket kazananı: ${tally.winner} (${winningLabel}) [A=${tally.votesA}, B=${tally.votesB}] → öne alındı!`,
          );
        }
      } else {
        console.log("[auto-publish] Yorum anketinde henüz A/B oyu yok, normal sıradan devam ediliyor.");
      }
    }
  }

  const job = votedJob ?? pickNextJob(channel, publishedIds);

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

  console.log("[qc] Yayın öncesi kalite kontrolü çalışıyor...");
  const qc = await runVideoQc(mp4Path);
  if (!qc.ok) {
    throw new Error(`QC Gate REDDETTİ (yayın durduruldu): ${qc.errors.join(" | ")}`);
  }
  console.log(
    `✅ [qc] GEÇTİ: ${qc.width}x${qc.height}, ${qc.durationSec.toFixed(1)}s, ${(qc.fileSizeBytes / 1024 / 1024).toFixed(1)} MB, H.264+AAC`,
  );

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

  const kit = getEngagementKit(job);

  console.log(`[auto-publish] YouTube'a yükleniyor (${privacyStatus})...`);
  const result = await uploadVideoToYouTube(
    mp4Path,
    {
      title: job.title,
      description: kit.enrichedDescription,
      tags: job.tags,
      categoryId: job.categoryId,
      privacyStatus,
    },
    { clientId, clientSecret, refreshToken },
  );

  console.log(`\n✅ [auto-publish] YOUTUBE YAYINLANDI: ${result.url}`);

  // Kaydı HEMEN yaz: sonraki adımlarda (Instagram, push) hata olsa bile aynı video tekrar yüklenmesin
  const record: PublishedRecord = {
    id: job.id,
    channel,
    title: job.title,
    videoId: result.videoId,
    url: result.url,
    poll: {
      optionAKey: kit.optionAKey,
      optionBKey: kit.optionBKey,
      optionA: kit.optionA,
      optionB: kit.optionB,
    },
    publishedAt: new Date().toISOString(),
  };
  state.published.push(record);
  await saveState(state);

  // İsteğe bağlı: Meta API secret'ları tanımlıysa aynı MP4'ü Instagram Reels'e de yayınla + A/B ilk yorum at
  const igUserId =
    process.env.IG_USER_ID?.trim() ||
    (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
    "";
  const metaToken = process.env.META_ACCESS_TOKEN?.trim() || "";
  let instagramMediaId: string | undefined;

  if (igUserId && metaToken) {
    try {
      console.log("[auto-publish] Instagram Reels'e yükleniyor...");
      const igCaption = buildInstagramCaption(job.title, kit.enrichedDescription);
      const igCreds = { igUserId, accessToken: metaToken };
      const igRes = await uploadReelToInstagram(mp4Path, igCaption, igCreds);
      instagramMediaId = igRes.mediaId;
      console.log(`✅ [auto-publish] INSTAGRAM REELS YAYINLANDI: mediaId=${igRes.mediaId}`);
      try {
        const commentId = await postInstagramComment(igRes.mediaId, kit.commentPrompt, igCreds);
        console.log(`💬 [auto-publish] INSTAGRAM A/B ANKET YORUMU ATILDI: ${commentId}`);
      } catch (cErr) {
        console.warn("[auto-publish] Instagram otomatik yorum uyarısı:", cErr);
      }
    } catch (igErr) {
      // Instagram hatası YouTube yayın kaydını engellemesin
      console.error("[auto-publish] Instagram Reels uyarısı (YouTube başarılı):", igErr);
    }
  }

  if (instagramMediaId) {
    record.instagramMediaId = instagramMediaId;
    await saveState(state);
  }
}

const isDirectRun = process.argv[1]?.endsWith("auto-publish.ts") || process.argv[1]?.endsWith("auto-publish.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[auto-publish] HATA:", e);
    process.exit(1);
  });
}
