import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { synthesizeEventsPcm, trimSilence, type SoundEvent } from "./audio.js";
import { synthesizeVoice } from "./voice.js";

const require = createRequire(import.meta.url);
const ffmpegPath: string = require("ffmpeg-static");

const DEFAULT_CHROME_CANDIDATES = [
  process.env.CHROMIUM_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter((x): x is string => Boolean(x));

function findChrome(): string | undefined {
  return DEFAULT_CHROME_CANDIDATES.find((p) => existsSync(p));
}

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((ok, no) => {
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err = (err + String(d)).slice(-800); });
    p.on("close", (c) => (c === 0 ? ok() : no(new Error(`ffmpeg exit ${c}: ${err}`))));
  });
}

async function main() {
  const niche = parseArg("niche", "physics-ring");
  const seed = Number(parseArg("seed", "1")) || 1;
  const seconds = Math.max(5, Math.min(60, Number(parseArg("seconds", "32")) || 32));
  const fps = Math.max(30, Math.min(60, Number(parseArg("fps", "60")) || 60));
  const width = Number(parseArg("width", "720")) || 720;
  const height = Number(parseArg("height", "1280")) || 1280;
  const hook = parseArg("hook", "CAN IT ESCAPE ALL 7 RINGS?");
  const narration = parseArg("narration", "").trim();
  const introCta = parseArg("cta", "").trim();
  const pollLine = parseArg("poll", "").trim();

  const scenePath = resolve("niches", niche, "scene.html");
  if (!existsSync(scenePath)) {
    throw new Error(`Niş sahnesi bulunamadı: ${scenePath}`);
  }

  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const baseName = `${niche}-seed${seed}`;
  const rawMp4 = join(outDir, `${baseName}.raw.mp4`);
  const pcmPath = join(outDir, `${baseName}.pcm`);
  const finalMp4 = join(outDir, `${baseName}.mp4`);
  const previewJpg = join(outDir, `${baseName}-preview.jpg`);

  console.log(`[shorts-factory] Niş=${niche}, seed=${seed}, ${seconds}s @ ${fps}fps`);
  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(await readFile(scenePath, "utf8"));
    await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);
    await page.evaluate(
      (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
      { width, height, fps, seconds, seed, hook },
    );

    if (introCta || pollLine) {
      await page.evaluate(
        ({ fpsVal, durVal, ctaText, pollText }) => {
          let frameIdx = 0;
          const orig = HTMLCanvasElement.prototype.toDataURL;
          HTMLCanvasElement.prototype.toDataURL = function (...args: Parameters<typeof orig>) {
            if (this.id === "c") {
              const t = frameIdx / fpsVal;
              frameIdx++;
              const ctx = this.getContext("2d");
              if (ctx) {
                const W = this.width;
                const H = this.height;
                const S = W / 720;
                ctx.save();
                ctx.textAlign = "center";
                // İlk 3.5 sn: tahmin/yorum tetikleyici rozet
                if (ctaText && t <= 3.5) {
                  const alpha = t < 0.3 ? t / 0.3 : t > 3.0 ? (3.5 - t) / 0.5 : 1;
                  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                  const boxW = Math.min(W * 0.88, Math.max(420 * S, ctaText.length * 16.5 * S + 44 * S));
                  const boxH = 54 * S;
                  const bx = (W - boxW) * 0.5;
                  const by = H * 0.162;
                  ctx.fillStyle = "rgba(8, 15, 34, 0.86)";
                  ctx.beginPath();
                  ctx.roundRect(bx, by, boxW, boxH, 27 * S);
                  ctx.fill();
                  ctx.strokeStyle = "#38bdf8";
                  ctx.lineWidth = 2.5 * S;
                  ctx.stroke();
                  ctx.font = `800 ${Math.round(23 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#e0f2fe";
                  ctx.fillText(ctaText, W * 0.5, by + 35 * S);
                }
                // Son 3.4 sn: A) / B) sonraki video oylama + abone ol kartı
                if (pollText && t >= durVal - 3.4) {
                  const alpha = Math.min(1, (t - (durVal - 3.4)) / 0.35);
                  ctx.globalAlpha = Math.max(0, alpha);
                  const boxW = W * 0.9;
                  const boxH = 138 * S;
                  const bx = (W - boxW) * 0.5;
                  const by = H * 0.818;
                  ctx.fillStyle = "rgba(5, 10, 24, 0.93)";
                  ctx.beginPath();
                  ctx.roundRect(bx, by, boxW, boxH, 22 * S);
                  ctx.fill();
                  ctx.strokeStyle = "#facc15";
                  ctx.lineWidth = 3 * S;
                  ctx.stroke();
                  ctx.font = `900 ${Math.round(21 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#fde047";
                  ctx.fillText("VOTE NEXT VIDEO IN COMMENTS", W * 0.5, by + 36 * S);
                  ctx.font = `800 ${Math.round(23 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(pollText, W * 0.5, by + 76 * S);
                  ctx.font = `800 ${Math.round(18 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#38bdf8";
                  ctx.fillText("SUBSCRIBE TO SEE THE WINNER", W * 0.5, by + 114 * S);
                }
                ctx.restore();
              }
            }
            return orig.apply(this, args);
          };
        },
        { fpsVal: fps, durVal: seconds, ctaText: introCta, pollText: pollLine },
      );
    }

    const totalFrames = Math.ceil(seconds * fps);
    const ff = spawn(
      ffmpegPath,
      [
        "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", rawMp4,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let ffErr = "";
    ff.stderr.on("data", (d) => { ffErr = (ffErr + String(d)).slice(-600); });
    const ffDone = new Promise<void>((ok, no) =>
      ff.on("close", (c) => (c === 0 ? ok() : no(new Error(`ffmpeg pipe ${c}: ${ffErr}`)))),
    );

    const previewFrame = Math.floor(totalFrames * 0.94);
    const batch = 30;
    const t0 = Date.now();
    for (let f = 0; f < totalFrames; f += batch) {
      const count = Math.min(batch, totalFrames - f);
      const frames: string[] = await page.evaluate(
        ([start, n]) => (globalThis as unknown as { renderBatch: (s: number, c: number) => string[] }).renderBatch(start, n),
        [f, count] as const,
      );
      for (let i = 0; i < frames.length; i++) {
        const buf = Buffer.from(frames[i], "base64");
        if (f + i === previewFrame) await writeFile(previewJpg, buf);
        if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
      }
      if (f % 180 === 0) {
        console.log(`  çizim %${Math.round(((f + count) / totalFrames) * 100)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      }
    }
    ff.stdin.end();
    await ffDone;

    const events: SoundEvent[] = await page.evaluate(
      () => (globalThis as unknown as { getEvents: () => SoundEvent[] }).getEvents(),
    );
    console.log(`[shorts-factory] ${events.length} ses olayı sentezleniyor...`);
    const SAMPLE_RATE = 48000;
    const pcm = synthesizeEventsPcm(events, seconds, SAMPLE_RATE);

    if (narration) {
      const voiceTmp = await mkdtemp(join(tmpdir(), `shorts-voice-${niche}-`));
      try {
        console.log("[shorts-factory] İngilizce sesli anlatım ekleniyor (YPP özgünlük katmanı)...");
        const voiceIn = await synthesizeVoice(narration, join(voiceTmp, "narration.mp3"));
        const voiceRaw = join(voiceTmp, "narration.raw");
        await runFfmpeg(["-y", "-i", voiceIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", voiceRaw]);
        const vBuf = await readFile(voiceRaw);
        const vPcm = trimSilence(new Int16Array(vBuf.buffer, vBuf.byteOffset, Math.floor(vBuf.length / 2)), SAMPLE_RATE);
        const startSample = Math.round(0.25 * SAMPLE_RATE);
        const totalStereoFrames = Math.floor(pcm.length / 2);
        for (let i = 0; i < vPcm.length && startSample + i < totalStereoFrames; i++) {
          const idx = (startSample + i) * 2;
          const v = vPcm[i] / 32768;
          const sl = pcm[idx] / 32768;
          const sr = pcm[idx + 1] / 32768;
          // Anlatım sırasında SFX'i hafifçe kıs (ducking), ses net duyulsun
          pcm[idx] = Math.round(Math.tanh(v * 0.92 + sl * 0.45) * 32000);
          pcm[idx + 1] = Math.round(Math.tanh(v * 0.92 + sr * 0.45) * 32000);
        }
      } catch (err) {
        console.warn(`[shorts-factory] Sesli anlatım üretilemedi, sadece SFX ile devam ediliyor: ${String(err)}`);
      } finally {
        await rm(voiceTmp, { recursive: true, force: true }).catch(() => {});
      }
    }

    await writeFile(pcmPath, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));

    console.log("[shorts-factory] 1080×1920 60fps MP4 birleştiriliyor...");
    await runFfmpeg([
      "-y",
      "-i", rawMp4,
      "-f", "s16le", "-ar", "48000", "-ac", "2", "-i", pcmPath,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "main", "-level", "4.1", "-preset", "medium", "-crf", "20",
      "-maxrate", "6M", "-bufsize", "12M", "-g", String(fps * 2), "-keyint_min", String(fps),
      "-sc_threshold", "0", "-bf", "2", "-r", String(fps),
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart",
      finalMp4,
    ]);
    console.log(`[shorts-factory] TAMAM: ${finalMp4}`);
    console.log(`[shorts-factory] Önizleme: ${previewJpg}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
