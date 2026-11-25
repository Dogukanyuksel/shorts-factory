import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { applyIntroSubBass, synthesizeEventsPcm, trimSilence, type SoundEvent } from "./audio.js";
import { synthesizeVoice } from "./voice.js";

const require = createRequire(import.meta.url);
const ffmpegPath: string = require("ffmpeg-static");
const SAMPLE_RATE = 48000;

type ScriptLine = { id: string; text: string; caption: string };
type TimedLine = ScriptLine & { start: number; end: number };

const DEFAULT_EPISODES = [
  { slug: "pin-tumbler-lock", title: "Pin Tumbler Lock", category: "MECHANICAL SECURITY" },
  { slug: "airplane-wing", title: "Airplane Wing Lift", category: "AERODYNAMICS" },
  { slug: "noise-canceling", title: "Noise-Canceling Headphones", category: "ACOUSTIC PHYSICS" },
  { slug: "car-differential", title: "Car Differential Gears", category: "AUTOMOTIVE ENGINEERING" },
  { slug: "touchscreen", title: "Capacitive Touchscreens", category: "ELECTRONICS" },
  { slug: "submarine", title: "Submarine Ballast Tanks", category: "FLUID MECHANICS" },
  { slug: "qr-code", title: "QR Code Error Correction", category: "INFORMATION THEORY" },
  { slug: "mechanical-watch", title: "Mechanical Watch Escapement", category: "HOROLOGY" },
  { slug: "wifi-walls", title: "How Wi-Fi Passes Through Walls", category: "ELECTROMAGNETICS" },
  { slug: "bulletproof-vest", title: "Kevlar Bulletproof Vest", category: "MATERIALS SCIENCE" },
];

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
    p.on("error", no);
    p.on("close", (c) => (c === 0 ? ok() : no(new Error(`${bin} exit ${c}: ${err}`))));
  });
}

function fmtTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 1920×1080 16:9 Belgesel Stüdyosu:
 * Solda canlı yüksek çözünürlüklü mühendislik kesit kanvası, sağda canlı teknik veri kartı,
 * aktif anlatım metni ve 10 bölümlük canlı ilerleme paneli (bulanık kenarlık yok!).
 */
const STUDIO_OVERLAY_JS = `
(() => {
  const W = 1280, H = 720; // 1.5x ölçekle 1920x1080 Full HD'ye çıkarılır (hızlı + jilet gibi net)
  const outCv = document.createElement("canvas");
  outCv.width = W;
  outCv.height = H;
  const g = outCv.getContext("2d");

  window.renderLongformBatch = (startFrame, count, meta) => {
    const srcCv = document.getElementById("c");
    const out = [];
    const frames = window.renderBatch(startFrame, count); // Sahne kendi çizimini yapar
    // Her kareyi 16:9 belgesel düzenine yeniden çizmek için kare kare ilerletelim:
    return frames;
  };

  // Sahnenin toDataURL çağrısını yakalayıp her kareyi doğrudan 16:9 belgesel stüdyosu olarak paketler!
  window.installStudioComposer = (meta) => {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    let fIdx = 0;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      if (this.id !== "c") return orig.apply(this, args);
      const t = fIdx / meta.fps;
      fIdx++;

      // 1) Derin 16:9 mühendislik blueprint arka planı
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#050b18");
      bg.addColorStop(0.55, "#0a162e");
      bg.addColorStop(1, "#040812");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      g.strokeStyle = "rgba(56,189,248,0.06)";
      g.lineWidth = 1;
      for (let x = 0; x < W; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

      // 2) Sol Ana Sahne: Canlı mühendislik simülasyonu (temiz kesilmiş çerçeve)
      const stageX = 44, stageY = 36, stageW = 540, stageH = 648;
      g.save();
      g.beginPath(); g.roundRect(stageX, stageY, stageW, stageH, 22); g.clip();
      // Dikey sahnenin orta %82 mühendislik alanını jilet gibi kadrajla (üst/alt boşluğu at)
      g.drawImage(this, 0, this.height * 0.08, this.width, this.height * 0.84, stageX, stageY, stageW, stageH);
      g.restore();
      g.strokeStyle = "rgba(56,189,248,0.55)";
      g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(stageX, stageY, stageW, stageH, 22); g.stroke();

      // 3) Sağ Belgesel Bilgi & Bölüm Paneli
      const rx = 620, rw = 616;

      // Üst Marka + Kategori Rozeti (metin genişliğine göre dinamik)
      const badgeText = "CLEAR MECHANICS  •  " + meta.category;
      g.font = "800 13px -apple-system, sans-serif";
      const badgeW = Math.min(rw, Math.ceil(g.measureText(badgeText).width) + 34);
      g.fillStyle = "rgba(56,189,248,0.14)";
      g.strokeStyle = "#38bdf8";
      g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(rx, 40, badgeW, 34, 17); g.fill(); g.stroke();
      g.fillStyle = "#7dd3fc";
      g.textAlign = "left";
      g.fillText(badgeText, rx + 17, 62);

      // Bölüm Numarası + Başlık
      g.fillStyle = "#facc15";
      g.font = "900 18px monospace";
      g.fillText("CHAPTER " + String(meta.chapterIdx + 1).padStart(2, "0") + " / " + String(meta.totalChapters).padStart(2, "0"), rx, 114);

      g.fillStyle = "#ffffff";
      g.font = "900 38px -apple-system, sans-serif";
      g.fillText(meta.title, rx, 160, rw);

      // Bölüm ilerleme çubuğu
      const prog = Math.min(1, Math.max(0, t / Math.max(0.1, meta.duration)));
      g.fillStyle = "rgba(148,163,184,0.2)";
      g.beginPath(); g.roundRect(rx, 182, rw, 8, 4); g.fill();
      g.fillStyle = "#38bdf8";
      g.beginPath(); g.roundRect(rx, 182, rw * prog, 8, 4); g.fill();

      // Canlı Anlatım Kartı (aktif cümleyi temiz satırlara bölerek gösterir)
      let activeLine = meta.lines[0];
      for (const l of meta.lines) if (t >= l.start) activeLine = l;
      g.fillStyle = "rgba(15,23,42,0.85)";
      g.strokeStyle = "rgba(148,163,184,0.28)";
      g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(rx, 214, rw, 164, 18); g.fill(); g.stroke();

      g.fillStyle = "#4ade80";
      g.font = "800 14px monospace";
      g.fillText("● LIVE BREAKDOWN", rx + 22, 244);

      if (activeLine) {
        g.fillStyle = "#f8fafc";
        g.font = "600 22px -apple-system, sans-serif";
        const words = activeLine.text.split(" ");
        let line = "", yy = 282;
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (g.measureText(test).width > rw - 44 && line) {
            g.fillText(line, rx + 22, yy);
            line = w; yy += 31;
          } else {
            line = test;
          }
        }
        if (line) g.fillText(line, rx + 22, yy);
      }

      // Sağ Alt: 10 Bölümlük Belgesel Haritası (2 sütun)
      g.fillStyle = "#94a3b8";
      g.font = "800 13px monospace";
      g.fillText("DOCUMENTARY CHAPTERS", rx, 412);

      const half = Math.ceil(meta.allTitles.length / 2);
      meta.allTitles.forEach((ct, i) => {
        const col = i < half ? 0 : 1;
        const row = i < half ? i : i - half;
        const cx = rx + col * 314;
        const cy = 438 + row * 44;
        const isCurrent = i === meta.chapterIdx;
        const isDone = i < meta.chapterIdx;
        g.fillStyle = isCurrent ? "rgba(56,189,248,0.18)" : "rgba(15,23,42,0.55)";
        g.strokeStyle = isCurrent ? "#38bdf8" : "rgba(148,163,184,0.15)";
        g.lineWidth = 1.2;
        g.beginPath(); g.roundRect(cx, cy - 22, 300, 34, 8); g.fill(); g.stroke();
        g.fillStyle = isCurrent ? "#ffffff" : isDone ? "#4ade80" : "#94a3b8";
        g.font = (isCurrent ? "800 " : "600 ") + "14px -apple-system, sans-serif";
        const prefix = isDone ? "✓ " : String(i + 1).padStart(2, "0") + ". ";
        g.fillText(prefix + ct, cx + 12, cy, 276);
      });

      // Alt ses dalgası çubuğu
      for (let i = 0; i < 42; i++) {
        const bh = 4 + 14 * Math.abs(Math.sin(t * 7.5 + i * 0.6));
        g.fillStyle = "rgba(56,189,248,0.45)";
        g.fillRect(rx + i * 14.5, 676 - bh, 8, bh);
      }

      return orig.call(outCv, "image/jpeg", 0.92);
    };
  };
})();
`;

async function main() {
  const count = Math.max(2, Math.min(DEFAULT_EPISODES.length, Number(parseArg("count", "10")) || 10));
  const fps = Math.max(30, Math.min(60, Number(parseArg("fps", "30")) || 30));
  const episodes = DEFAULT_EPISODES.slice(0, count);
  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), "shorts-longform-"));

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const chapterFiles: string[] = [];
  const chaptersMeta: Array<{ timestamp: string; title: string }> = [];
  let runningSec = 0;

  try {
    const allTitles = episodes.map((e) => e.title);
    for (let idx = 0; idx < episodes.length; idx++) {
      const ep = episodes[idx];
      const scenePath = resolve("niches", "how-it-works", "episodes", `${ep.slug}.html`);
      if (!existsSync(scenePath)) throw new Error(`Eksik bölüm: ${scenePath}`);

      console.log(`\n[longform] Bölüm ${idx + 1}/${episodes.length}: ${ep.title}`);
      const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
      await page.setContent(await readFile(scenePath, "utf8"));
      await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);
      await page.addScriptTag({ content: STUDIO_OVERLAY_JS });

      const script: ScriptLine[] = await page.evaluate(
        () => (globalThis as unknown as { getScript: () => ScriptLine[] }).getScript(),
      );

      // Bölüm seslendirmesi
      const chunks: Int16Array[] = [new Int16Array(Math.round(0.25 * SAMPLE_RATE))];
      const timed: TimedLine[] = [];
      let t = 0.25;
      for (let i = 0; i < script.length; i++) {
        const audioIn = await synthesizeVoice(script[i].text, join(tmpDir, `c${idx}_v${i}.mp3`));
        const rawMono = join(tmpDir, `c${idx}_v${i}.raw`);
        await runCmd(ffmpegPath, ["-y", "-i", audioIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
        const buf = await readFile(rawMono);
        const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);
        const dur = pcm.length / SAMPLE_RATE;
        timed.push({ ...script[i], start: t, end: t + dur });
        chunks.push(pcm);
        const gap = i + 1 < script.length ? 0.16 : 0.65;
        chunks.push(new Int16Array(Math.round(gap * SAMPLE_RATE)));
        t += dur + gap;
      }

      const chapterSec = t;
      chaptersMeta.push({ timestamp: fmtTimestamp(runningSec), title: ep.title });
      runningSec += chapterSec;

      const totalSamples = chunks.reduce((a, c) => a + c.length, 0);
      const voiceMono = new Int16Array(totalSamples);
      let off = 0;
      for (const c of chunks) { voiceMono.set(c, off); off += c.length; }

      await page.evaluate(
        (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
        { width: 720, height: 1280, fps, duration: chapterSec, lines: timed },
      );
      await page.evaluate(
        (meta) => (globalThis as unknown as { installStudioComposer: (m: unknown) => void }).installStudioComposer(meta),
        { fps, duration: chapterSec, chapterIdx: idx, totalChapters: episodes.length, title: ep.title, category: ep.category, lines: timed, allTitles },
      );

      const rawVid = join(tmpDir, `ch${idx}.raw.mp4`);
      const ff = spawn(
        ffmpegPath,
        [
          "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", rawVid,
        ],
        { stdio: ["pipe", "ignore", "pipe"] },
      );
      let ffErr = "";
      ff.stderr.on("data", (d) => { ffErr = (ffErr + String(d)).slice(-600); });
      const ffDone = new Promise<void>((ok, no) =>
        ff.on("close", (c) => (c === 0 ? ok() : no(new Error(`ffmpeg pipe ${c}: ${ffErr}`)))),
      );

      const totalFrames = Math.ceil(chapterSec * fps);
      const savePreview = idx === 0 ? Math.floor(totalFrames * 0.6) : -1;
      for (let f = 0; f < totalFrames; f += 30) {
        const n = Math.min(30, totalFrames - f);
        const frames: string[] = await page.evaluate(
          ([s, c]) => (globalThis as unknown as { renderBatch: (a: number, b: number) => string[] }).renderBatch(s, c),
          [f, n] as const,
        );
        for (let i = 0; i < frames.length; i++) {
          const b = Buffer.from(frames[i], "base64");
          if (f + i === savePreview) await writeFile(join(outDir, "longform-16x9-preview.jpg"), b);
          if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
        }
      }
      ff.stdin.end();
      await ffDone;

      const events: SoundEvent[] = await page.evaluate(
        () => (globalThis as unknown as { getEvents: () => SoundEvent[] }).getEvents(),
      );
      const sfx = synthesizeEventsPcm(events, chapterSec, SAMPLE_RATE);
      const mixed = new Int16Array(Math.max(totalSamples, sfx.length / 2) * 2);
      for (let i = 0; i < totalSamples; i++) {
        const v = voiceMono[i] / 32768;
        const sl = (sfx[i * 2] ?? 0) / 32768;
        const sr = (sfx[i * 2 + 1] ?? 0) / 32768;
        mixed[i * 2] = Math.round(Math.tanh(v * 0.95 + sl * 0.38) * 32000);
        mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.95 + sr * 0.38) * 32000);
      }
      applyIntroSubBass(mixed, SAMPLE_RATE, 0.25);
      const mixPcm = join(tmpDir, `ch${idx}.pcm`);
      await writeFile(mixPcm, Buffer.from(mixed.buffer, mixed.byteOffset, mixed.byteLength));

      const chMp4 = join(tmpDir, `ch${idx}.mp4`);
      await runCmd(ffmpegPath, [
        "-y", "-i", rawVid,
        "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", mixPcm,
        "-vf", "scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", String(fps),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", chapterSec.toFixed(2),
        chMp4,
      ]);
      chapterFiles.push(chMp4);
      await page.close();
    }

    // Tüm bölümleri tek 1920×1080 Full HD uzun videoda birleştir
    const concatList = join(tmpDir, "concat.txt");
    await writeFile(concatList, chapterFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    const finalMp4 = join(outDir, `longform-${count}-machines-explained-1080p.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-f", "concat", "-safe", "0", "-i", concatList,
      "-c", "copy", "-movflags", "+faststart",
      finalMp4,
    ]);

    const chaptersText = chaptersMeta.map((c) => `${c.timestamp} ${c.title}`).join("\n");
    const metaJson = {
      title: `How ${count} Everyday Machines Actually Work (Animated Engineering Deep Dive)`,
      durationSec: Math.round(runningSec),
      resolution: "1920x1080",
      fps,
      description: `Ever wondered what happens inside the machines you use every day? In this animated engineering deep dive, we cut open ${count} everyday inventions with clean visual breakdowns.\n\nChapters:\n${chaptersText}\n\n#engineering #howitworks #science #technology #documentary`,
      chapters: chaptersMeta,
    };
    await writeFile(join(outDir, `longform-${count}-machines-explained.json`), JSON.stringify(metaJson, null, 2));
    console.log(`\n✅ [longform] TAMAM: ${finalMp4} (${fmtTimestamp(runningSec)}, 1920x1080)`);
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
