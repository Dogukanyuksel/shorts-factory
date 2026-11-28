import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { applyIntroSubBass, synthesizeBackgroundMusicPcm, synthesizeEventsPcm, trimSilence, type SoundEvent } from "./audio.js";
import { synthesizeVoice } from "./voice.js";
import { attachLocalEngines, CHROMIUM_RENDER_ARGS } from "./webgl-helper.js";
import { buildWordCaptionCanvasSnippet } from "./word-captions.js";

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
  const width = Number(parseArg("width", "1080")) || 1080;
  const height = Number(parseArg("height", "1920")) || 1920;
  const epBadge = parseArg("ep-badge", "").trim();
  const pollLine = parseArg("poll", "").trim();

  const scenePath = resolve("niches", "how-it-works", "episodes", `${episode}.html`);
  if (!existsSync(scenePath)) throw new Error(`Bölüm bulunamadı: ${scenePath}`);

  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), `shorts-exp-${episode}-`));

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: CHROMIUM_RENDER_ARGS,
  });

  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await attachLocalEngines(page);
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
      const audioIn = await synthesizeVoice(line.text, join(tmpDir, `v${i}.mp3`), "explainer");
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

    const wordCapSnippet = buildWordCaptionCanvasSnippet(timed, "#FF9500");
    if (epBadge || pollLine || timed.length > 0) {
      await page.addScriptTag({
        content: `(() => {
          const fpsVal = ${JSON.stringify(fps)};
          const durVal = ${JSON.stringify(totalSec)};
          const badgeText = ${JSON.stringify(epBadge)};
          const pollText = ${JSON.stringify(pollLine)};
          ${wordCapSnippet}
          let frameIdx = 0;
          const orig = HTMLCanvasElement.prototype.toDataURL;
          function fitText(ctx, text, maxW, maxPx, minPx, S, weight) {
            let px = Math.round(maxPx * S);
            const minScaled = Math.round(minPx * S);
            while (px > minScaled) {
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
                if (badgeText) {
                  const bw = 118 * S, bh = 40 * S, bx = 36 * S, by = H * 0.068;
                  ctx.fillStyle = "rgba(8, 15, 34, 0.86)";
                  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 20 * S); ctx.fill();
                  ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.2 * S; ctx.stroke();
                  ctx.textAlign = "center";
                  fitText(ctx, badgeText, bw - 18 * S, 20, 13, S, 900);
                  ctx.fillStyle = "#fde68a";
                  ctx.fillText(badgeText, bx + bw * 0.5, by + 27 * S);
                }
                if (pollText && tSec >= durVal * 0.68 && tSec <= durVal * 0.85) {
                  const winStart = durVal * 0.68, winEnd = durVal * 0.85;
                  const alpha = tSec < winStart + 0.3 ? (tSec - winStart) / 0.3 : tSec > winEnd - 0.3 ? (winEnd - tSec) / 0.3 : 1;
                  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                  const boxW = W * 0.78, boxH = 102 * S, bx = (W - boxW) * 0.5, by = H * 0.695;
                  ctx.fillStyle = "rgba(5, 10, 24, 0.90)";
                  ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 18 * S); ctx.fill();
                  ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.5 * S; ctx.stroke();
                  ctx.textAlign = "center";
                  fitText(ctx, "NEXT EPISODE? VOTE IN COMMENTS", boxW - 26 * S, 18, 12, S, 900);
                  ctx.fillStyle = "#fde047";
                  ctx.fillText("NEXT EPISODE? VOTE IN COMMENTS", W * 0.5, by + 29 * S);
                  fitText(ctx, pollText, boxW - 26 * S, 20, 12, S, 800);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(pollText, W * 0.5, by + 60 * S);
                  fitText(ctx, "SUBSCRIBE TO SEE THE WINNER 🔔", boxW - 26 * S, 15, 11, S, 800);
                  ctx.fillStyle = "#38bdf8";
                  ctx.fillText("SUBSCRIBE TO SEE THE WINNER 🔔", W * 0.5, by + 86 * S);
                }
                // 2026 Viewed-vs-Swiped-Away Kancası: ilk 1.75 sn sessiz kanca pill'i
                if (tSec <= 1.75) {
                  const enter = Math.min(1, tSec / 0.16);
                  const exit = tSec > 1.45 ? Math.max(0, 1 - (tSec - 1.45) / 0.30) : 1;
                  const alpha = enter * exit;
                  const scale = 0.88 + 0.12 * (1 - Math.pow(1 - enter, 3));
                  ctx.save();
                  ctx.globalAlpha = Math.max(0, alpha);
                  const hw = W * 0.58, hh = 44 * S, hx = W * 0.25, hy = H * 0.068;
                  ctx.translate(hx + hw * 0.5, hy + hh * 0.5);
                  ctx.scale(scale, scale);
                  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
                  ctx.beginPath(); ctx.roundRect(-hw * 0.5, -hh * 0.5, hw, hh, 22 * S); ctx.fill();
                  ctx.strokeStyle = "#fde047"; ctx.lineWidth = 2.4 * S; ctx.stroke();
                  ctx.textAlign = "center";
                  fitText(ctx, "HOW IT ACTUALLY WORKS 👀", hw - 24 * S, 18, 12, S, 900);
                  ctx.fillStyle = "#fef08a";
                  ctx.fillText("HOW IT ACTUALLY WORKS 👀", 0, 7 * S);
                  ctx.restore();
                }
                // 2-3 Kelimelik Aktif Vurgulu Yaylı Dinamik Altyazı (Clear Mechanics #FF9500 Turuncu)
                drawWordPopCaption(ctx, tSec, W, H, S);
                // Kesintisiz Loop Dostu Yüzer Cam Rozet (son 2.4 sn)
                if (tSec >= durVal - 2.4) {
                  const alpha = Math.min(1, (tSec - (durVal - 2.4)) / 0.28);
                  ctx.globalAlpha = Math.max(0, alpha * 0.92);
                  const boxW = W * 0.80, boxH = 44 * S, bx = (W - boxW) * 0.5, by = H * 0.715;
                  ctx.fillStyle = "rgba(8, 15, 34, 0.86)";
                  ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 22 * S); ctx.fill();
                  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.2 * S; ctx.stroke();
                  ctx.textAlign = "center";
                  fitText(ctx, "🔔 CLEAR MECHANICS • FULL 4-MIN ON YOUTUBE →", boxW - 26 * S, 15, 10, S, 900);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText("🔔 CLEAR MECHANICS • FULL 4-MIN ON YOUTUBE →", W * 0.5, by + 28 * S);
                }
                ctx.restore();
              }
            }
            return orig.apply(this, args);
          };
        })();`,
      });
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
    let epSeed = 17;
    for (let k = 0; k < episode.length; k++) epSeed = (epSeed * 31 + episode.charCodeAt(k)) | 0;
    const bgmStereo = synthesizeBackgroundMusicPcm(totalSec, Math.abs(epSeed) + 1, SAMPLE_RATE);

    // Seslendirme (mono→stereo) + mekanik SFX + hafif telifsiz arka plan synth müziği
    const mixed = new Int16Array(Math.max(totalSamples, sfxStereo.length / 2) * 2);
    for (let i = 0; i < totalSamples; i++) {
      const v = voiceMono[i] / 32768;
      const sl = (sfxStereo[i * 2] ?? 0) / 32768;
      const sr = (sfxStereo[i * 2 + 1] ?? 0) / 32768;
      const ml = (bgmStereo[i * 2] ?? 0) / 32768;
      const mr = (bgmStereo[i * 2 + 1] ?? 0) / 32768;
      // Anlatım sırasında müziği hafifçe kıs, aralarda sinematik atmosfer korunsun
      const duck = Math.abs(v) > 0.015 ? 0.14 : 0.24;
      mixed[i * 2] = Math.round(Math.tanh(v * 0.94 + sl * 0.40 + ml * duck) * 32000);
      mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.94 + sr * 0.40 + mr * duck) * 32000);
    }
    applyIntroSubBass(mixed, SAMPLE_RATE, 0.30);
    const mixPath = join(tmpDir, "mix.pcm");
    await writeFile(mixPath, Buffer.from(mixed.buffer, mixed.byteOffset, mixed.byteLength));

    const finalMp4 = join(outDir, `how-it-works-${episode}.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-i", rawMp4,
      "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", mixPath,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "medium", "-crf", "15",
      "-maxrate", "16M", "-bufsize", "32M", "-g", String(fps * 2), "-keyint_min", String(fps),
      "-sc_threshold", "0", "-bf", "2", "-r", String(fps),
      // Ses yüksekliği platform standardına (-14 LUFS) normalize
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-t", totalSec.toFixed(2), "-movflags", "+faststart",
      finalMp4,
    ]);
    console.log(`[explainer] TAMAM: ${finalMp4} (${totalSec.toFixed(1)}s)`);
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
