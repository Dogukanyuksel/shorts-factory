import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { synthesizeEventsPcm, type SoundEvent } from "./audio.js";

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
    const pcm = synthesizeEventsPcm(events, seconds, 48000);
    await writeFile(pcmPath, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));

    console.log("[shorts-factory] 1080×1920 60fps MP4 birleştiriliyor...");
    await runFfmpeg([
      "-y",
      "-i", rawMp4,
      "-f", "s16le", "-ar", "48000", "-ac", "2", "-i", pcmPath,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", String(fps),
      "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
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
