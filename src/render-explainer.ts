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
const SAMPLE_RATE = 48000;

export type ScriptLine = {
  id: string;
  text: string;
  caption: string;
};

type TimedLine = ScriptLine & { start: number; end: number };

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

async function main() {
  const episode = parseArg("episode", "pin-tumbler-lock");
  const fps = Math.max(30, Math.min(60, Number(parseArg("fps", "60")) || 60));
  const width = Number(parseArg("width", "720")) || 720;
  const height = Number(parseArg("height", "1280")) || 1280;
  const epBadge = parseArg("ep-badge", "").trim();
  const pollLine = parseArg("poll", "").trim();

  const scenePath = resolve("niches", "how-it-works", "episodes", `${episode}.html`);
  if (!existsSync(scenePath)) throw new Error(`Bölüm bulunamadı: ${scenePath}`);

  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), `shorts-exp-${episode}-`));

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(await readFile(scenePath, "utf8"));
    await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);

    const script: ScriptLine[] = await page.evaluate(
      () => (globalThis as unknown as { getScript: () => ScriptLine[] }).getScript(),
    );
    console.log(`[explainer] ${episode}: ${script.length} replik seslendiriliyor...`);

    const chunks: Int16Array[] = [new Int16Array(Math.round(0.12 * SAMPLE_RATE))];
    const timed: TimedLine[] = [];
    let t = 0.12;

    for (let i = 0; i < script.length; i++) {
      const line = script[i];
      const audioIn = await synthesizeVoice(line.text, join(tmpDir, `v${i}.mp3`));
      const rawMono = join(tmpDir, `v${i}.raw`);
      await runCmd(ffmpegPath, ["-y", "-i", audioIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
      const buf = await readFile(rawMono);
      const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);
      const dur = pcm.length / SAMPLE_RATE;
      timed.push({ ...line, start: t, end: t + dur });
      chunks.push(pcm);
      const gap = i + 1 < script.length ? 0.12 : 0.35;
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

    if (epBadge || pollLine) {
      await page.evaluate(
        ({ fpsVal, durVal, badgeText, pollText }) => {
          let frameIdx = 0;
          const orig = HTMLCanvasElement.prototype.toDataURL;
          HTMLCanvasElement.prototype.toDataURL = function (...args: Parameters<typeof orig>) {
            if (this.id === "c") {
              const tSec = frameIdx / fpsVal;
              frameIdx++;
              const ctx = this.getContext("2d");
              if (ctx) {
                const W = this.width;
                const H = this.height;
                const S = W / 720;
                ctx.save();
                // Sol üst seri rozeti (EP. 03 — profil binge-watch için)
                if (badgeText) {
                  const bw = 122 * S;
                  const bh = 42 * S;
                  const bx = 28 * S;
                  const by = H * 0.055;
                  ctx.fillStyle = "rgba(8, 15, 34, 0.84)";
                  ctx.beginPath();
                  ctx.roundRect(bx, by, bw, bh, 21 * S);
                  ctx.fill();
                  ctx.strokeStyle = "#fbbf24";
                  ctx.lineWidth = 2.2 * S;
                  ctx.stroke();
                  ctx.textAlign = "center";
                  ctx.font = `900 ${Math.round(21 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#fde68a";
                  ctx.fillText(badgeText, bx + bw * 0.5, by + 28 * S);
                }
                // Son 3.0 sn: A) / B) sonraki bölüm oylama + abone ol kartı
                if (pollText && tSec >= durVal - 3.0) {
                  const alpha = Math.min(1, (tSec - (durVal - 3.0)) / 0.35);
                  ctx.globalAlpha = Math.max(0, alpha);
                  const boxW = W * 0.9;
                  const boxH = 122 * S;
                  const bx = (W - boxW) * 0.5;
                  const by = H * 0.708;
                  ctx.fillStyle = "rgba(5, 10, 24, 0.93)";
                  ctx.beginPath();
                  ctx.roundRect(bx, by, boxW, boxH, 20 * S);
                  ctx.fill();
                  ctx.strokeStyle = "#fbbf24";
                  ctx.lineWidth = 3 * S;
                  ctx.stroke();
                  ctx.textAlign = "center";
                  ctx.font = `900 ${Math.round(19 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#fde047";
                  ctx.fillText("VOTE NEXT EPISODE IN COMMENTS", W * 0.5, by + 32 * S);
                  ctx.font = `800 ${Math.round(21 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(pollText, W * 0.5, by + 68 * S);
                  ctx.font = `800 ${Math.round(17 * S)}px -apple-system, sans-serif`;
                  ctx.fillStyle = "#38bdf8";
                  ctx.fillText("SUBSCRIBE TO SEE THE WINNER", W * 0.5, by + 102 * S);
                }
                ctx.restore();
              }
            }
            return orig.apply(this, args);
          };
        },
        { fpsVal: fps, durVal: totalSec, badgeText: epBadge, pollText: pollLine },
      );
    }

    const totalFrames = Math.ceil(totalSec * fps);
    console.log(`[explainer] ${totalSec.toFixed(1)}s @ ${fps}fps (${totalFrames} kare) çiziliyor...`);

    const rawMp4 = join(tmpDir, "raw.mp4");
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

    const sampleFrames = new Map<number, string>([
      [Math.floor(totalFrames * 0.18), join(outDir, `${episode}-1-wrong.jpg`)],
      [Math.floor(totalFrames * 0.62), join(outDir, `${episode}-2-align.jpg`)],
      [Math.floor(totalFrames * 0.88), join(outDir, `${episode}-3-unlock.jpg`)],
    ]);

    for (let f = 0; f < totalFrames; f += 30) {
      const n = Math.min(30, totalFrames - f);
      const frames: string[] = await page.evaluate(
        ([s, c]) => (globalThis as unknown as { renderBatch: (a: number, b: number) => string[] }).renderBatch(s, c),
        [f, n] as const,
      );
      for (let i = 0; i < frames.length; i++) {
        const b = Buffer.from(frames[i], "base64");
        const saveTo = sampleFrames.get(f + i);
        if (saveTo) await writeFile(saveTo, b);
        if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
      }
    }
    ff.stdin.end();
    await ffDone;

    const events: SoundEvent[] = await page.evaluate(
      () => (globalThis as unknown as { getEvents: () => SoundEvent[] }).getEvents(),
    );
    const sfxStereo = synthesizeEventsPcm(events, totalSec, SAMPLE_RATE);

    // Seslendirme (mono→stereo) + mekanik SFX karışımı
    const mixed = new Int16Array(Math.max(totalSamples, sfxStereo.length / 2) * 2);
    for (let i = 0; i < totalSamples; i++) {
      const v = voiceMono[i] / 32768;
      const sl = (sfxStereo[i * 2] ?? 0) / 32768;
      const sr = (sfxStereo[i * 2 + 1] ?? 0) / 32768;
      mixed[i * 2] = Math.round(Math.tanh(v * 0.95 + sl * 0.42) * 32000);
      mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.95 + sr * 0.42) * 32000);
    }
    const mixPath = join(tmpDir, "mix.pcm");
    await writeFile(mixPath, Buffer.from(mixed.buffer, mixed.byteOffset, mixed.byteLength));

    const finalMp4 = join(outDir, `how-it-works-${episode}.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-i", rawMp4,
      "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", mixPath,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "main", "-level", "4.1", "-preset", "medium", "-crf", "20",
      "-maxrate", "6M", "-bufsize", "12M", "-g", String(fps * 2), "-keyint_min", String(fps),
      "-sc_threshold", "0", "-bf", "2", "-r", String(fps),
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-t", totalSec.toFixed(2), "-movflags", "+faststart",
      finalMp4,
    ]);
    console.log(`[explainer] TAMAM: ${finalMp4} (${totalSec.toFixed(1)}s)`);
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
