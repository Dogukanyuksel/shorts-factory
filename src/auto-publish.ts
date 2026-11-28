import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  PHYSICS_LABELS,
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
import { uploadReelToFacebook } from "./facebook.js";
import { hoursSinceLastPublish, resolveMetaToken, resolveMinGapHours } from "./devops.js";
import {
  buildDmShareTrigger,
  buildInstagramSisterTagLine,
  buildInstagramYouTubeCallout,
  buildYouTubeNetworkFooter,
} from "./network-links.js";
import { assertUploadChannel, ChannelMismatchError } from "./channel-guard.js";
import {
  buildFunnelMetadata,
  loadDerivedShortsQueue,
  pickNextDerivedShort,
  saveDerivedShortsQueue,
} from "./derive-shorts.js";
import { getNarrativeLongformBySlug } from "./longform-narrative.js";
import { runPolicyGuard } from "./policy-guard.js";
import { runVideoQc } from "./qc.js";
import { assertThreeJsScene, isLegacy2DAllowed, isThreeJsSceneFile, isThreeJsSceneFileSync } from "./webgl-helper.js";
import { renderDerivedShortVideo } from "./render-narrative.js";
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
import {
  addVideoToPlaylist,
  ensureYouTubePlaylist,
  fetchYouTubeComments,
  postYouTubeTopLevelComment,
  refreshAccessToken,
  uploadVideoToYouTube,
  YouTubeScopeError,
  type PrivacyStatus,
} from "./youtube.js";

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
  /** Silinenler listesi (tombstone) — bkz. devops.mergePublishedFiles */
  removedVideoIds?: string[];
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
  const removed = Array.isArray(parsed.removedVideoIds) ? parsed.removedVideoIds : [];
  const removedSet = new Set(removed);
  const published = (Array.isArray(parsed.published) ? parsed.published : []).filter((r) => !removedSet.has(r.videoId));
  return { published, ...(removed.length ? { removedVideoIds: removed } : {}) };
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
      // Sessiz formatlarda robotik anlatım eklenmez (render.ts boş anlatımı atlar)
      ...(job.silent ? [] : ["--narration", job.narration]),
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

/** Seri oynatma listesi adı: aynı formattaki videolar tek listede → izleyici seriyi izler ve abone olur. */
export function playlistForJob(job: PublishJob): { title: string; description: string } {
  if (job.channel === "physics") {
    const label = PHYSICS_LABELS[job.niche];
    return {
      title: `${label} | Kinetic Lab`,
      description: `Every ${label} simulation from Kinetic Lab in one place. New physics & brain-teaser shorts every day.`,
    };
  }
  return {
    title: "How It Actually Works | Clear Mechanics",
    description: "Every animated engineering breakdown from Clear Mechanics. A new machine explained every day.",
  };
}

async function postYouTubeGrowthExtras(
  job: PublishJob,
  videoId: string,
  commentText: string,
  creds: { clientId: string; clientSecret: string; refreshToken: string },
): Promise<void> {
  try {
    const token = await refreshAccessToken(creds);
    const commentId = await postYouTubeTopLevelComment(videoId, commentText, token);
    console.log(`💬 [growth] YouTube ilk yorum atıldı: ${commentId}`);
    const pl = playlistForJob(job);
    const playlistId = await ensureYouTubePlaylist(pl.title, pl.description, token);
    if (playlistId) {
      // YouTube yeni yüklenen videoyu birkaç saniye "işleniyor" tutabilir → geçici 409/5xx için 3 deneme
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await addVideoToPlaylist(playlistId, videoId, token);
          console.log(`📂 [growth] Oynatma listesine eklendi: ${pl.title}`);
          break;
        } catch (e) {
          if (attempt === 3 || !/\((409|5\d\d)\)/.test(e instanceof Error ? e.message : "")) throw e;
          await new Promise((r) => setTimeout(r, 8000 * attempt));
        }
      }
    }
  } catch (err) {
    if (err instanceof YouTubeScopeError) {
      console.warn("[growth] YouTube ilk yorum/oynatma listesi atlandı: token'da yorum izni yok (youtube:auth ile yeniden yetkilendirin).");
    } else {
      console.warn("[growth] YouTube ilk yorum/oynatma listesi uyarısı (yayın başarılı):", err instanceof Error ? err.message : err);
    }
  }
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
    const metaToken = resolveMetaToken(channel);
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

  // Kota bloğu: bu kanalın Google projesinin kotası doluysa render bile yapmadan atla (run "failed" olmaz)
  const ytClient = resolveYouTubeClient(channel);
  if (!dryRun && ytClient.clientId) {
    const block = activeBlock(await loadQuotaState(), quotaKey(ytClient.clientId));
    if (block) {
      await writePublishNotice(
        `⏸️ ${channel} yayını atlandı: YouTube kotası dolu (${block.reason}). ` +
          `Kota ${formatTrTime(block.until)} (TR saati) sonra sıfırlanır, sistem kendiliğinden devam eder.`,
      );
      return;
    }
  }

  // Kanal kilidi: token yanlış kanala aitse render bile yapmadan dur (yanlış kanala video gitmez)
  if (!dryRun && ytClient.clientId && ytClient.clientSecret && resolveRefreshToken(channel)) {
    try {
      await assertUploadChannel(channel, {
        clientId: ytClient.clientId,
        clientSecret: ytClient.clientSecret,
        refreshToken: resolveRefreshToken(channel),
      });
    } catch (err) {
      if (err instanceof ChannelMismatchError) {
        // Hata değil bilgilendirme: token düzeltilene kadar bu kanal güvenle bekler (gereksiz retry / 🚨 yok)
        await writePublishNotice(`🔒 ${err.message}`);
        return;
      }
      throw err;
    }
  }

  const publishedIds = new Set(state.published.map((r) => r.id));

  // ÖNCELİK 1: Yayınlanmış 4-perdeli uzun videodan türetilmiş Vitrin Short huni kuyruğu
  const derivedQueue = await loadDerivedShortsQueue();
  const derivedItem = pickNextDerivedShort(derivedQueue, channel, publishedIds);
  if (derivedItem) {
    const parentSpec = getNarrativeLongformBySlug(derivedItem.parentSlug);
    const parentHtmlPath = parentSpec ? resolve("niches", "longform-deep-dive", `${parentSpec.slug}.html`) : "";
    const parentIs3D = parentHtmlPath ? await isThreeJsSceneFile(parentHtmlPath) : false;
    if (parentSpec && !parentIs3D && !isLegacy2DAllowed()) {
      console.log(`⏭️ [3D-GATE] Huni Vitrin Short (${derivedItem.id}) ana sahnesi henüz 3D PBR değil — 3D'ye çevrilmeden yayınlanmayacak, sıradaki 3D sahneye geçiliyor.`);
    } else if (parentSpec) {
      console.log(`\n🎯 [auto-publish] Huni Vitrin Short seçildi: ${derivedItem.id} (ana video: ${derivedItem.parentVideoId})`);
      const mp4Path = await renderDerivedShortVideo(parentSpec, derivedItem, { fps: 60 });
      const qc = await runVideoQc(mp4Path);
      if (!qc.ok) {
        throw new Error(`QC Gate REDDETTİ (türetilmiş short): ${qc.errors.join(" | ")}`);
      }
      console.log(`✅ [qc] GEÇTİ: ${qc.width}x${qc.height}, ${qc.durationSec.toFixed(1)}s, ${(qc.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`);
      const funnel = buildFunnelMetadata(derivedItem);
      if (dryRun) {
        console.log(`[auto-publish] DRY-RUN Vitrin Short tamamlandı: ${mp4Path}`);
        console.log(`  Açıklama:\n${funnel.description}`);
        return;
      }
      const { clientId, clientSecret } = ytClient;
      const refreshToken = resolveRefreshToken(channel);
      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error(`YouTube API kimlik bilgileri eksik (${channel})`);
      }
      let result: Awaited<ReturnType<typeof uploadVideoToYouTube>>;
      try {
        result = await uploadVideoToYouTube(
          mp4Path,
          {
            title: derivedItem.title,
            description: `${funnel.description}\n\n${buildYouTubeNetworkFooter(channel)}`,
            tags: derivedItem.tags,
            categoryId: parentSpec.categoryId,
            privacyStatus,
          },
          { clientId, clientSecret, refreshToken },
        );
      } catch (err) {
        if (err instanceof YouTubeQuotaError) {
          const block = await recordQuotaBlock(quotaKey(clientId), err.reason, channel);
          await writePublishNotice(
            `⏸️ ${channel} Vitrin Short atlandı: YouTube kotası dolu (${err.reason}). Kota ${formatTrTime(block.until)} sonra sıfırlanır.`,
          );
          return;
        }
        throw err;
      }
      console.log(`✅ [auto-publish] VİTRİN SHORT YAYINLANDI: ${result.url}`);
      derivedItem.publishedAt = new Date().toISOString();
      derivedItem.shortVideoId = result.videoId;
      derivedItem.shortUrl = result.url;
      await saveDerivedShortsQueue(derivedQueue);

      const record: PublishedRecord = {
        id: derivedItem.id,
        channel,
        title: derivedItem.title,
        videoId: result.videoId,
        url: result.url,
        publishedAt: derivedItem.publishedAt,
      };
      state.published.push(record);
      await saveState(state);

      // İlk yorum olarak ana 4 dakikalık videoya huni linki at
      try {
        const token = await refreshAccessToken({ clientId, clientSecret, refreshToken });
        await postYouTubeTopLevelComment(result.videoId, funnel.pinnedComment, token);
      } catch (cErr) {
        console.warn("[auto-publish] Vitrin Short ilk yorum uyarısı:", cErr);
      }

      // Telegram: 5 saniyede yerel Related Video rozetini bağlamak için tek tık Studio linki
      const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      const tgChat = process.env.TELEGRAM_CHAT_ID?.trim();
      if (tgToken && tgChat) {
        try {
          const updatedFunnel = buildFunnelMetadata(derivedItem);
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: tgChat,
              text: updatedFunnel.studioRelatedVideoAlert,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
            signal: AbortSignal.timeout(15_000),
          });
        } catch (tgErr) {
          console.warn("[auto-publish] Telegram Related Video uyarısı gönderilemedi:", tgErr);
        }
      }

      // Instagram Reels'e de paralel yayınla
      const igUserId =
        process.env.IG_USER_ID?.trim() ||
        (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
        "";
      const metaToken = resolveMetaToken(channel);
      if (igUserId && metaToken) {
        try {
          const igCallout = buildInstagramYouTubeCallout(channel, true);
          const igSisters = buildInstagramSisterTagLine(channel);
          const dmTrigger = buildDmShareTrigger(channel, derivedItem.title);
          const igCaption = buildInstagramCaption(derivedItem.title, `${dmTrigger}\n${igCallout}\n${igSisters}\n\n${funnel.description}`);
          const igRes = await uploadReelToInstagram(mp4Path, igCaption, { igUserId, accessToken: metaToken });
          record.instagramMediaId = igRes.mediaId;
          await saveState(state);
          const igComment = `${funnel.pinnedComment}\n${dmTrigger}\n${igCallout}\n${igSisters}`;
          await postInstagramComment(igRes.mediaId, igComment, { igUserId, accessToken: metaToken }).catch(() => {});
          await uploadReelToFacebook(mp4Path, igCaption, { igUserId, accessToken: metaToken }).catch((fbErr) => {
            console.warn("[auto-publish] Vitrin Short FB Reels uyarısı:", fbErr);
          });
        } catch (igErr) {
          console.warn("[auto-publish] Vitrin Short IG uyarısı:", igErr);
        }
      }
      return;
    }
  }

  // Önceki videonun hem YouTube Shorts hem Instagram Reels yorumlarındaki A/B oylarını birleştirip kazananı öne al
  let votedJob: PublishJob | null = null;
  const igUserIdPre =
    process.env.IG_USER_ID?.trim() ||
    (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
    "";
  const metaTokenPre = resolveMetaToken(channel);
  const ytApiKeyPre = process.env.YOUTUBE_API_KEY?.trim() || "";
  const { clientId: ytClientIdPre, clientSecret: ytClientSecretPre } = resolveYouTubeClient(channel);
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

  const recentChannelTitles = state.published.filter((r) => r.channel === channel).slice(-60).map((r) => r.title);
  const isJobEligible = (cand: PublishJob): boolean => {
    const p =
      cand.channel === "physics"
        ? resolve("niches", cand.niche, "scene.html")
        : resolve("niches", "how-it-works", "episodes", `${cand.episode}.html`);
    if (!isLegacy2DAllowed() && !isThreeJsSceneFileSync(p)) return false;
    const pol = runPolicyGuard({
      channel: cand.channel,
      title: cand.title,
      description: cand.description,
      recentTitles: recentChannelTitles,
    });
    return pol.ok;
  };

  if (votedJob && !isJobEligible(votedJob)) {
    console.log(`⏭️ [3D/POLICY-GATE] Oylanan iş (${votedJob.id}) 3D veya politika kapısından geçmedi — atlanıyor.`);
    votedJob = null;
  }

  // Dinamik büyüme döngüsü: Kanal Müdürü'nün YT+IG birleşik skorla seçtiği 10K+ viral lideri her 2 slotta bir öne al!
  let directorBoostedJob: PublishJob | null = null;
  if (!votedJob && channel === "physics" && state.published.filter((r) => r.channel === "physics").length % 2 === 1) {
    const stratPath = resolve("state", "director-strategy.json");
    if (existsSync(stratPath)) {
      try {
        const strat = JSON.parse(await readFile(stratPath, "utf8")) as { physics?: { boostedNiches?: string[] } };
        const lastPhysId = [...state.published].reverse().find((r) => r.channel === "physics")?.id || "";
        for (const niche of strat.physics?.boostedNiches || []) {
          if (lastPhysId.startsWith(`${niche}-`)) continue;
          const candidate = pickJobByKey("physics", niche, publishedIds);
          if (candidate && isJobEligible(candidate)) {
            directorBoostedJob = candidate;
            console.log(`🚀 [director-loop] YT+IG viral lideri (${niche}) dinamik olarak öne alındı!`);
            break;
          }
        }
      } catch {
        // Strateji dosyası okunamazsa normal sıradan devam et
      }
    }
  }

  const job = votedJob ?? directorBoostedJob ?? pickNextJob(channel, publishedIds, isJobEligible);

  if (!job) {
    console.log(`[auto-publish] ⏸️ "${channel}" kanalı için uygun (3D PBR + politika uyumlu) yeni video kalmadı — yeni 3D sahne eklenene kadar bekleniyor.`);
    return;
  }

  const jobScenePath =
    job.channel === "physics"
      ? resolve("niches", job.niche, "scene.html")
      : resolve("niches", "how-it-works", "episodes", `${job.episode}.html`);
  await assertThreeJsScene(jobScenePath, job.id);

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

  const { clientId, clientSecret } = ytClient;
  const refreshToken = resolveRefreshToken(channel);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      `YouTube API kimlik bilgileri eksik! Gerekli secret'lar: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET ve ${
        channel === "explainer" ? "YOUTUBE_REFRESH_TOKEN_EXPLAINER" : "YOUTUBE_REFRESH_TOKEN_PHYSICS"
      }`,
    );
  }

  const kit = getEngagementKit(job);
  const fullDesc = `${kit.enrichedDescription}\n\n${buildYouTubeNetworkFooter(channel)}`;
  const policy = runPolicyGuard({
    channel,
    title: job.title,
    description: fullDesc,
    recentTitles: state.published.slice(-60).map((p) => p.title),
  });
  for (const w of policy.warnings) console.warn(`[policy-guard] ⚠️ ${w}`);
  if (!policy.ok) {
    throw new Error(`[policy-guard] Yayın engellendi: ${policy.errors.join(" | ")}`);
  }

  console.log(`[auto-publish] YouTube'a yükleniyor (${privacyStatus})...`);
  let result: Awaited<ReturnType<typeof uploadVideoToYouTube>>;
  try {
    result = await uploadVideoToYouTube(
      mp4Path,
      {
        title: job.title,
        description: fullDesc,
        tags: job.tags,
        categoryId: job.categoryId,
        privacyStatus,
      },
      { clientId, clientSecret, refreshToken },
    );
  } catch (err) {
    if (err instanceof YouTubeQuotaError) {
      const block = await recordQuotaBlock(quotaKey(clientId), err.reason, channel);
      await writePublishNotice(
        `⏸️ ${channel}: YouTube kotası doldu (${err.reason}). Video kaybolmadı, bir sonraki slotta yeniden denenecek. ` +
          `Kota ${formatTrTime(block.until)} (TR saati) sonra sıfırlanır.`,
      );
      return; // başarılı çıkış: watchdog gereksiz yeniden deneme yapmaz, Telegram'a "HATA" gitmez
    }
    throw err;
  }

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

  // Organik büyüme: ilk yorum (görev/anket sorusu) + seri oynatma listesi. Hata yayını ETKİLEMEZ.
  await postYouTubeGrowthExtras(job, result.videoId, kit.commentPrompt, { clientId, clientSecret, refreshToken });

  // İsteğe bağlı: Meta API secret'ları tanımlıysa aynı MP4'ü Instagram Reels'e de yayınla + A/B ilk yorum at
  const igUserId =
    process.env.IG_USER_ID?.trim() ||
    (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER?.trim() : process.env.IG_USER_ID_PHYSICS?.trim()) ||
    "";
  const metaToken = resolveMetaToken(channel);
  let instagramMediaId: string | undefined;

  if (igUserId && metaToken) {
    try {
      console.log("[auto-publish] Instagram Reels'e yükleniyor...");
      const igCallout = buildInstagramYouTubeCallout(channel, true);
      const igSisters = buildInstagramSisterTagLine(channel);
      const dmTrigger = buildDmShareTrigger(channel, job.title);
      const igAnchor = `${dmTrigger}\n${igCallout}\n${igSisters}\n\n`;
      const igCaption = buildInstagramCaption(job.title, `${igAnchor}${kit.enrichedDescription}`);
      const igCreds = { igUserId, accessToken: metaToken };
      const igRes = await uploadReelToInstagram(mp4Path, igCaption, igCreds);
      instagramMediaId = igRes.mediaId;
      console.log(`✅ [auto-publish] INSTAGRAM REELS YAYINLANDI: mediaId=${igRes.mediaId}`);
      try {
        const igComment = `🔥 Want to see what breaks when we push this 10x further? ${igCallout}\n${dmTrigger}\n${igSisters}\n\n${kit.commentPrompt}`;
        const commentId = await postInstagramComment(igRes.mediaId, igComment, igCreds);
        console.log(`💬 [auto-publish] INSTAGRAM A/B + YOUTUBE ÇAPA YORUMU ATILDI: ${commentId}`);
      } catch (cErr) {
        console.warn("[auto-publish] Instagram otomatik yorum uyarısı:", cErr);
      }
      await uploadReelToFacebook(mp4Path, igCaption, igCreds).catch((fbErr) => {
        console.warn("[auto-publish] Facebook Reels uyarısı (YT+IG başarılı):", fbErr);
      });
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
  main().catch(async (e) => {
    console.error("[auto-publish] HATA:", e);
    await writeLastError(e);
    process.exit(1);
  });
}
