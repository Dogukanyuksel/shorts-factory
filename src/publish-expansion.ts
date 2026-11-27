import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { applyIntroSubBass, synthesizeBackgroundMusicPcm, synthesizeEventsPcm, trimSilence, type SoundEvent } from "./audio.js";
import {
  EXPANSION_CHANNEL_META,
  pickNextExpansionJob,
  type ExpansionChannelId,
  type ExpansionJob,
} from "./catalog-expansion.js";
import { uploadReelToFacebook } from "./facebook.js";
import { buildInstagramCaption, postInstagramComment, uploadReelToInstagram } from "./instagram.js";
import {
  buildDmShareTrigger,
  buildInstagramSisterTagLine,
  buildInstagramYouTubeCallout,
  buildScrollStopHook,
  buildYouTubeNetworkFooter,
} from "./network-links.js";
import { runVideoQc } from "./qc.js";
import { synthesizeVoice } from "./voice.js";
import { attachLocalEngines, CHROMIUM_RENDER_ARGS } from "./webgl-helper.js";
import { buildWordCaptionCanvasSnippet } from "./word-captions.js";
import {
  addVideoToPlaylist,
  ensureYouTubePlaylist,
  getMyChannel,
  postYouTubeTopLevelComment,
  refreshAccessToken,
  uploadVideoToYouTube,
} from "./youtube.js";

const require = createRequire(import.meta.url);
const ffmpegPath: string = require("ffmpeg-static");
const SAMPLE_RATE = 48000;
const STATE_PATH = resolve("state", "published-expansion.json");

type ScriptLine = { id: string; text: string; caption: string };
type TimedLine = ScriptLine & { start: number; end: number };

interface ExpansionPublishedRecord {
  id: string;
  channel: ExpansionChannelId;
  title: string;
  videoId: string;
  url: string;
  instagramMediaId?: string;
  publishedAt: string;
}

const DEFAULT_CHROME_CANDIDATES = [
  process.env.CHROMIUM_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter((x): x is string => Boolean(x));

const findChrome = () => DEFAULT_CHROME_CANDIDATES.find((p) => existsSync(p));

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function runCmd(bin: string, args: string[]): Promise<void> {
  return new Promise((ok, no) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err = (err + String(d)).slice(-800); });
    p.on("close", (c) => (c === 0 ? ok() : no(new Error(`${bin} exit ${c}: ${err}`))));
  });
}

async function renderExpansionEpisode(job: ExpansionJob, epNumber: number): Promise<string> {
  const scenePath = resolve("niches", "expansion", `${job.episode}.html`);
  if (!existsSync(scenePath)) throw new Error(`Expansion bölümü bulunamadı: ${scenePath}`);

  const meta = EXPANSION_CHANNEL_META[job.channel];
  const fps = 60, width = 720, height = 1280;
  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), `shorts-exp2-${job.episode}-`));

  const browser = await chromium.launch({ executablePath: findChrome(), args: CHROMIUM_RENDER_ARGS });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await attachLocalEngines(page);
    await page.setContent(await readFile(scenePath, "utf8"));
    await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);

    const script: ScriptLine[] = await page.evaluate(
      () => (globalThis as unknown as { getScript: () => ScriptLine[] }).getScript(),
    );
    const chunks: Int16Array[] = [new Int16Array(Math.round(0.12 * SAMPLE_RATE))];
    const timed: TimedLine[] = [];
    let t = 0.12;
    for (let i = 0; i < script.length; i++) {
      const audioIn = await synthesizeVoice(script[i].text, join(tmpDir, `v${i}.mp3`));
      const rawMono = join(tmpDir, `v${i}.raw`);
      await runCmd(ffmpegPath, ["-y", "-i", audioIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
      const buf = await readFile(rawMono);
      const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);
      const dur = pcm.length / SAMPLE_RATE;
      timed.push({ ...script[i], start: t, end: t + dur });
      chunks.push(pcm);
      const gap = i + 1 < script.length ? 0.12 : 0.45;
      chunks.push(new Int16Array(Math.round(gap * SAMPLE_RATE)));
      t += dur + gap;
    }

    const totalSec = t;
    const totalSamples = chunks.reduce((a, c) => a + c.length, 0);
    const voiceMono = new Int16Array(totalSamples);
    let offset = 0;
    for (const c of chunks) { voiceMono.set(c, offset); offset += c.length; }

    await page.evaluate(
      (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
      { width, height, fps, duration: totalSec, lines: timed },
    );

    const epBadge = `EP. ${String(epNumber).padStart(2, "0")}`;
    const hookBanner = buildScrollStopHook(job.title);
    const wordCapAccent = job.channel === "wealth" ? "#FFD60A" : "#34C759";
    const wordCapSnippet = buildWordCaptionCanvasSnippet(timed, wordCapAccent);
    await page.addScriptTag({
      content: `(() => {
        const fpsVal = ${JSON.stringify(fps)};
        const durVal = ${JSON.stringify(totalSec)};
        const badgeText = ${JSON.stringify(epBadge)};
        const hookText = ${JSON.stringify(hookBanner)};
        const handleText = ${JSON.stringify(`🔔 ${meta.brandName.toUpperCase()} • FOLLOW FOR DAILY 60FPS`)};
        const accent = ${JSON.stringify(meta.accentHex)};
        ${wordCapSnippet}
        let frameIdx = 0;
        const orig = HTMLCanvasElement.prototype.toDataURL;
        function fitText(ctx, text, maxW, maxPx, minPx, S, weight) {
          let px = Math.round(maxPx * S);
          const minS = Math.round(minPx * S);
          while (px > minS) {
            ctx.font = weight + " " + px + "px -apple-system, sans-serif";
            if (ctx.measureText(text).width <= maxW) break;
            px -= 1;
          }
          ctx.font = weight + " " + px + "px -apple-system, sans-serif";
        }
        HTMLCanvasElement.prototype.toDataURL = function (...args) {
          if (this.id === "c") {
            const tSec = frameIdx / fpsVal;
            frameIdx++;
            const ctx = this.getContext("2d");
            if (ctx) {
              const W = this.width, H = this.height, S = W / 720;
              ctx.save();
              const bw = 118 * S, bh = 40 * S, bx = 36 * S, by = H * 0.068;
              ctx.fillStyle = "rgba(8, 15, 34, 0.86)";
              ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 20 * S); ctx.fill();
              ctx.strokeStyle = accent; ctx.lineWidth = 2.2 * S; ctx.stroke();
              ctx.textAlign = "center";
              fitText(ctx, badgeText, bw - 18 * S, 20, 13, S, 900);
              ctx.fillStyle = "#ffffff";
              ctx.fillText(badgeText, bx + bw * 0.5, by + 27 * S);

              // 2026 Viewed-vs-Swiped-Away Kancası: ilk 1.75 sn yüksek kontrastlı sessiz kanca pill'i
              if (tSec <= 1.75 && hookText) {
                const enter = Math.min(1, tSec / 0.16);
                const exit = tSec > 1.45 ? Math.max(0, 1 - (tSec - 1.45) / 0.30) : 1;
                const alpha = enter * exit;
                const scale = 0.88 + 0.12 * (1 - Math.pow(1 - enter, 3));
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                const hw = W * 0.66, hh = 46 * S, hx = bx + bw + 14 * S, hy = by - 3 * S;
                ctx.translate(hx + hw * 0.5, hy + hh * 0.5);
                ctx.scale(scale, scale);
                ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
                ctx.beginPath(); ctx.roundRect(-hw * 0.5, -hh * 0.5, hw, hh, 23 * S); ctx.fill();
                ctx.strokeStyle = "#fde047"; ctx.lineWidth = 2.6 * S; ctx.stroke();
                fitText(ctx, hookText, hw - 26 * S, 21, 13, S, 900);
                ctx.fillStyle = "#fef08a";
                ctx.fillText(hookText, 0, 7 * S);
                ctx.restore();
              }

              // 2-3 Kelimelik Aktif Vurgulu Yaylı Dinamik Altyazı (60fps Word-Pop)
              drawWordPopCaption(ctx, tSec, W, H, S);

              // Kesintisiz Loop Dostu Yüzer Rozet (son 2.4 sn — animasyonu kesmeden hafif cam pill)
              if (tSec >= durVal - 2.4) {
                const alpha = Math.min(1, (tSec - (durVal - 2.4)) / 0.28);
                ctx.globalAlpha = Math.max(0, alpha * 0.92);
                const cw = W * 0.78, ch = 44 * S, cx = (W - cw) * 0.5, cy = H * 0.715;
                ctx.fillStyle = "rgba(8, 15, 34, 0.86)";
                ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 22 * S); ctx.fill();
                ctx.strokeStyle = accent; ctx.lineWidth = 2.2 * S; ctx.stroke();
                fitText(ctx, handleText, cw - 28 * S, 16, 11, S, 900);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(handleText, W * 0.5, cy + 28 * S);
              }
              ctx.restore();
            }
          }
          return orig.apply(this, args);
        };
      })();`,
    });

    const totalFrames = Math.ceil(totalSec * fps);
    const rawMp4 = join(tmpDir, "raw.mp4");
    const ff = spawn(
      ffmpegPath,
      ["-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", rawMp4],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let ffErr = "";
    ff.stderr.on("data", (d) => { ffErr = (ffErr + String(d)).slice(-600); });
    const ffDone = new Promise<void>((ok, no) => ff.on("close", (c) => (c === 0 ? ok() : no(new Error(`ffmpeg ${c}: ${ffErr}`)))));

    for (let f = 0; f < totalFrames; f += 30) {
      const n = Math.min(30, totalFrames - f);
      const frames: string[] = await page.evaluate(
        ([s, c]) => (globalThis as unknown as { renderBatch: (a: number, b: number) => string[] }).renderBatch(s, c),
        [f, n] as const,
      );
      for (const fr of frames) {
        const b = Buffer.from(fr, "base64");
        if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
      }
    }
    ff.stdin.end();
    await ffDone;

    const events: SoundEvent[] = await page.evaluate(
      () => (globalThis as unknown as { getEvents: () => SoundEvent[] }).getEvents(),
    );
    const sfxStereo = synthesizeEventsPcm(events, totalSec, SAMPLE_RATE);
    let epSeed = 31;
    for (let k = 0; k < job.episode.length; k++) epSeed = (epSeed * 31 + job.episode.charCodeAt(k)) | 0;
    const bgmStereo = synthesizeBackgroundMusicPcm(totalSec, Math.abs(epSeed) + 1, SAMPLE_RATE);

    const mixed = new Int16Array(Math.max(totalSamples, sfxStereo.length / 2) * 2);
    for (let i = 0; i < totalSamples; i++) {
      const v = voiceMono[i] / 32768;
      const sl = (sfxStereo[i * 2] ?? 0) / 32768;
      const sr = (sfxStereo[i * 2 + 1] ?? 0) / 32768;
      const ml = (bgmStereo[i * 2] ?? 0) / 32768;
      const mr = (bgmStereo[i * 2 + 1] ?? 0) / 32768;
      const duck = Math.abs(v) > 0.015 ? 0.14 : 0.25;
      mixed[i * 2] = Math.round(Math.tanh(v * 0.94 + sl * 0.40 + ml * duck) * 32000);
      mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.94 + sr * 0.40 + mr * duck) * 32000);
    }
    applyIntroSubBass(mixed, SAMPLE_RATE, 0.30);
    const mixPath = join(tmpDir, "mix.pcm");
    await writeFile(mixPath, Buffer.from(mixed.buffer, mixed.byteOffset, mixed.byteLength));

    const finalMp4 = join(outDir, `${job.id}.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-i", rawMp4,
      "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", mixPath,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "main", "-level", "4.1", "-preset", "medium", "-crf", "20",
      "-maxrate", "6M", "-bufsize", "12M", "-g", String(fps * 2), "-keyint_min", String(fps),
      "-sc_threshold", "0", "-bf", "2", "-r", String(fps),
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
      "-t", totalSec.toFixed(2), "-movflags", "+faststart",
      finalMp4,
    ]);
    return finalMp4;
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  const channel = (parseArg("channel", "wealth") === "bio" ? "bio" : "wealth") as ExpansionChannelId;
  const dryRun = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
  const privacy = (process.env.YOUTUBE_PRIVACY || "public") as "public" | "unlisted" | "private";
  const meta = EXPANSION_CHANNEL_META[channel];

  let published: ExpansionPublishedRecord[] = [];
  if (existsSync(STATE_PATH)) {
    const parsed = JSON.parse(await readFile(STATE_PATH, "utf8")) as { published?: ExpansionPublishedRecord[] };
    published = parsed.published ?? [];
  }
  const publishedIds = new Set(published.map((r) => r.id));
  const job = pickNextExpansionJob(channel, publishedIds);
  if (!job) {
    console.log(`[expansion] "${channel}" için bekleyen yeni bölüm kalmadı.`);
    return;
  }

  const clientId = (
    channel === "wealth"
      ? process.env.YOUTUBE_CLIENT_ID_WEALTH || process.env.YOUTUBE_CLIENT_ID_EXPANSION
      : process.env.YOUTUBE_CLIENT_ID_BIO || process.env.YOUTUBE_CLIENT_ID_EXPANSION
  )?.trim() || "";
  const clientSecret = (
    channel === "wealth"
      ? process.env.YOUTUBE_CLIENT_SECRET_WEALTH || process.env.YOUTUBE_CLIENT_SECRET_EXPANSION
      : process.env.YOUTUBE_CLIENT_SECRET_BIO || process.env.YOUTUBE_CLIENT_SECRET_EXPANSION
  )?.trim() || "";
  const refreshToken = (
    channel === "wealth" ? process.env.YOUTUBE_REFRESH_TOKEN_WEALTH : process.env.YOUTUBE_REFRESH_TOKEN_BIO
  )?.trim() || "";

  if (!dryRun && (!clientId || !clientSecret || !refreshToken)) {
    console.log(
      `[expansion] ⏸️ "${meta.brandName}" henüz API token bekliyor (YOUTUBE_CLIENT_ID_EXPANSION + YOUTUBE_REFRESH_TOKEN_${channel.toUpperCase()}). Hazır olunca otomatik başlayacak.`,
    );
    return;
  }

  // Kanal kilidi: yanlış kanala yüklemeyi önle
  if (!dryRun) {
    const token = await refreshAccessToken({ clientId, clientSecret, refreshToken });
    const me = await getMyChannel(token);
    if (!me.title.toLowerCase().includes(meta.guardNeedle)) {
      throw new Error(`Kanal kilidi REDDETTİ: beklenen "${meta.brandName}", token "${me.title}" kanalına ait!`);
    }
  }

  const epNum = published.filter((r) => r.channel === channel).length + 1;
  const mp4Path = await renderExpansionEpisode(job, epNum);
  const qc = await runVideoQc(mp4Path);
  if (!qc.ok) throw new Error(`QC Gate REDDETTİ: ${qc.errors.join(" | ")}`);
  console.log(`✅ [expansion-qc] ${job.id}: ${qc.width}x${qc.height}, ${qc.durationSec.toFixed(1)}s`);

  if (dryRun) {
    console.log(`[expansion] DRY-RUN tamamlandı: ${mp4Path}`);
    return;
  }

  const ytDescription = `${job.description}\n\n${buildYouTubeNetworkFooter(channel)}`;
  const uploaded = await uploadVideoToYouTube(
    mp4Path,
    { title: job.title, description: ytDescription, tags: job.tags, categoryId: job.categoryId, privacyStatus: privacy },
    { clientId, clientSecret, refreshToken },
  );
  console.log(`✅ [expansion] ${meta.brandName} YAYINLANDI: ${uploaded.url}`);

  const record: ExpansionPublishedRecord = {
    id: job.id,
    channel,
    title: job.title,
    videoId: uploaded.videoId,
    url: uploaded.url,
    publishedAt: new Date().toISOString(),
  };
  published.push(record);
  await mkdir(resolve("state"), { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify({ published }, null, 2)}\n`, "utf8");

  try {
    const token = await refreshAccessToken({ clientId, clientSecret, refreshToken });
    const comment = `🔔 Subscribe to ${meta.brandName} for a new 60fps breakdown every day! What topic should we animate next?`;
    await postYouTubeTopLevelComment(uploaded.videoId, comment, token);
    const plId = await ensureYouTubePlaylist(meta.playlistTitle, `${meta.brandName} — Daily 60fps Visual Breakdowns`, token);
    if (plId) await addVideoToPlaylist(plId, uploaded.videoId, token);
  } catch (e) {
    console.warn("[expansion] YouTube ilk yorum/playlist uyarısı:", e);
  }

  // İsteğe bağlı Instagram Reels + Facebook Reels (sıfır ek secret — aynı Meta token ile!)
  const igUserId = (channel === "wealth" ? process.env.IG_USER_ID_WEALTH : process.env.IG_USER_ID_BIO)?.trim() || "";
  const igToken = (channel === "wealth" ? process.env.META_ACCESS_TOKEN_WEALTH : process.env.META_ACCESS_TOKEN_BIO)?.trim() || "";
  if (igUserId && igToken) {
    try {
      const igCallout = buildInstagramYouTubeCallout(channel, false);
      const igSisters = buildInstagramSisterTagLine(channel);
      const dmTrigger = buildDmShareTrigger(channel, job.title);
      const cap = buildInstagramCaption(job.title, `${dmTrigger}\n${igCallout}\n${igSisters}\n\n${job.description}`);
      const igRes = await uploadReelToInstagram(mp4Path, cap, { igUserId, accessToken: igToken });
      record.instagramMediaId = igRes.mediaId;
      await writeFile(STATE_PATH, `${JSON.stringify({ published }, null, 2)}\n`, "utf8");
      await postInstagramComment(igRes.mediaId, `${dmTrigger}\n${igCallout}\n${igSisters}`, { igUserId, accessToken: igToken }).catch(() => {});
      await uploadReelToFacebook(mp4Path, cap, { igUserId, accessToken: igToken }).catch((fbErr) => {
        console.warn("[expansion] Facebook Reels uyarısı:", fbErr);
      });
    } catch (e) {
      console.warn("[expansion] Instagram Reels uyarısı:", e);
    }
  }
}

main().catch((err) => {
  console.error("[expansion] HATA:", err);
  process.exit(1);
});
