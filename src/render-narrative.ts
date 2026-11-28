import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { applyIntroSubBass, synthesizeBackgroundMusicPcm, synthesizeEventsPcm, trimSilence, type SoundEvent } from "./audio.js";
import type { DerivedShortQueueItem } from "./derive-shorts.js";
import type { NarrativeBeat, NarrativeLongformSpec } from "./longform-narrative.js";
import { synthesizeVoice } from "./voice.js";
import { attachLocalEngines, CHROMIUM_RENDER_ARGS } from "./webgl-helper.js";

const require = createRequire(import.meta.url);
const ffmpegPath: string = require("ffmpeg-static");
const SAMPLE_RATE = 48000;

export interface TimedNarrativeBeat extends NarrativeBeat {
  start: number;
  end: number;
}

export interface NarrativeLongformRenderResult {
  episodeId: string;
  slug: string;
  channel: NarrativeLongformSpec["channel"];
  mp4Path: string;
  thumbnailPath: string;
  jsonPath: string;
  title: string;
  durationSec: number;
  chapters: Array<{ timestamp: string; title: string }>;
  descriptionBase: string;
  tags: string[];
}

const DEFAULT_CHROME_CANDIDATES = [
  process.env.CHROMIUM_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter((x): x is string => Boolean(x));

const findChrome = () => DEFAULT_CHROME_CANDIDATES.find((p) => existsSync(p));

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

function hashSlug(slug: string): number {
  let h = 23;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

async function synthesizeTimedBeats(
  beats: NarrativeBeat[],
  tmpDir: string,
  interBeatGapSec: number,
  bridgeGapSec: number,
  channel: "physics" | "explainer" | "wealth" | "bio",
  enableCoHost = false,
): Promise<{ timed: TimedNarrativeBeat[]; voiceMono: Int16Array; totalSec: number }> {
  const chunks: Int16Array[] = [new Int16Array(Math.round(0.25 * SAMPLE_RATE))];
  const timed: TimedNarrativeBeat[] = [];
  let t = 0.25;

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const role = enableCoHost && b.actIndex === 1 ? "cohost" : "primary";
    const audioIn = await synthesizeVoice(b.text, join(tmpDir, `b${i}.mp3`), channel, { role });
    const rawMono = join(tmpDir, `b${i}.raw`);
    await runCmd(ffmpegPath, ["-y", "-i", audioIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
    const buf = await readFile(rawMono);
    const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);
    const dur = pcm.length / SAMPLE_RATE;
    timed.push({ ...b, start: t, end: t + dur });
    chunks.push(pcm);
    const isLast = i + 1 === beats.length;
    const nextIsBridge = !isLast && Boolean(beats[i + 1]?.isBridge);
    const gap = isLast ? 0.85 : nextIsBridge ? bridgeGapSec : interBeatGapSec;
    chunks.push(new Int16Array(Math.round(gap * SAMPLE_RATE)));
    t += dur + gap;
  }

  const totalSamples = chunks.reduce((a, c) => a + c.length, 0);
  const voiceMono = new Int16Array(totalSamples);
  let off = 0;
  for (const c of chunks) {
    voiceMono.set(c, off);
    off += c.length;
  }
  return { timed, voiceMono, totalSec: t };
}

/**
 * 4 Katmanlı Bütüncül Tek Konu 16:9 (1920x1080) Uzun Video Render Motoru.
 */
export async function renderNarrativeLongformVideo(
  spec: NarrativeLongformSpec,
  opts?: { fps?: number },
): Promise<NarrativeLongformRenderResult> {
  const fps = Math.max(24, Math.min(60, opts?.fps ?? 30));
  const scenePath = resolve("niches", "longform-deep-dive", `${spec.slug}.html`);
  if (!existsSync(scenePath)) throw new Error(`4-perdeli uzun sahne bulunamadı: ${scenePath}`);

  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), `shorts-narrative-${spec.slug}-`));

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: CHROMIUM_RENDER_ARGS,
  });

  try {
    console.log(`\n[narrative-longform] ${spec.title} (${spec.beats.length} beat, 4 perde, Perde 2 Co-Host ses) seslendiriliyor...`);
    // İzleyiciyi aralıksız sesle boğmadan, her beat arasında 2.6 sn ve perde geçişlerinde 4.2 sn görsel+müzik nefes payı
    const { timed, voiceMono, totalSec } = await synthesizeTimedBeats(spec.beats, tmpDir, 2.6, 4.2, spec.channel, true);

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await attachLocalEngines(page);
    await page.setContent(await readFile(scenePath, "utf8"));
    await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);

    await page.evaluate(
      (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
      {
        width: 1280,
        height: 720,
        fps,
        aspect: "16:9",
        duration: totalSec,
        beats: timed,
        title: spec.title,
        brand: spec.brandName,
        accent: spec.accentHex,
      },
    );

    const totalFrames = Math.ceil(totalSec * fps);
    console.log(`[narrative-longform] ${totalSec.toFixed(1)}s @ ${fps}fps (${totalFrames} kare, doğal 16:9) çiziliyor...`);

    const rawVid = join(tmpDir, "raw.mp4");
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

    const previewFrames = new Map<number, string>([
      [Math.floor(totalFrames * 0.12), join(outDir, `${spec.slug}-act1.jpg`)],
      [Math.floor(totalFrames * 0.42), join(outDir, `${spec.slug}-act2.jpg`)],
      [Math.floor(totalFrames * 0.72), join(outDir, `${spec.slug}-act3.jpg`)],
      [Math.floor(totalFrames * 0.90), join(outDir, `${spec.slug}-act4.jpg`)],
    ]);

    for (let f = 0; f < totalFrames; f += 30) {
      const n = Math.min(30, totalFrames - f);
      const frames: string[] = await page.evaluate(
        ([s, c]) => (globalThis as unknown as { renderBatch: (a: number, b: number) => string[] }).renderBatch(s, c),
        [f, n] as const,
      );
      for (let i = 0; i < frames.length; i++) {
        const b = Buffer.from(frames[i], "base64");
        const saveTo = previewFrames.get(f + i);
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
    const bgmStereo = synthesizeBackgroundMusicPcm(totalSec, hashSlug(spec.slug), SAMPLE_RATE);

    const totalSamples = voiceMono.length;
    const mixed = new Int16Array(Math.max(totalSamples, sfxStereo.length / 2) * 2);
    const sfxGain = spec.channel === "physics" ? 0.58 : 0.38;
    // Yumuşak envelope takipçisi: anlatım durduğunda müzik sinematik olarak yükselir, konuşma başlayınca nazikçe kısılır
    let smoothDuck = 0.28;
    for (let i = 0; i < totalSamples; i++) {
      const v = voiceMono[i] / 32768;
      const sl = (sfxStereo[i * 2] ?? 0) / 32768;
      const sr = (sfxStereo[i * 2 + 1] ?? 0) / 32768;
      const ml = (bgmStereo[i * 2] ?? 0) / 32768;
      const mr = (bgmStereo[i * 2 + 1] ?? 0) / 32768;
      const targetDuck = Math.abs(v) > 0.014 ? 0.13 : 0.34;
      smoothDuck += (targetDuck - smoothDuck) * 0.0008;
      mixed[i * 2] = Math.round(Math.tanh(v * 0.94 + sl * sfxGain + ml * smoothDuck) * 32000);
      mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.94 + sr * sfxGain + mr * smoothDuck) * 32000);
    }
    applyIntroSubBass(mixed, SAMPLE_RATE, 0.28);
    const mixPcm = join(tmpDir, "mix.pcm");
    await writeFile(mixPcm, Buffer.from(mixed.buffer, mixed.byteOffset, mixed.byteLength));

    const mp4Path = join(outDir, `${spec.id}-1080p.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-i", rawVid,
      "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", mixPcm,
      "-vf", "scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", String(fps),
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-t", totalSec.toFixed(2), "-movflags", "+faststart",
      mp4Path,
    ]);

    // 1280×720 Yüksek-CTR Kapak Görseli (Thumbnail) — doruk anından otomatik üretilir
    const thumbnailPath = join(outDir, `${spec.id}-thumb.jpg`);
    try {
      const climaxT = Number((totalSec * 0.56).toFixed(2));
      const thumbHeadline = (spec.derivedShorts[0]?.hook || spec.title.replace(/\(.*?\)/g, "").trim()).toUpperCase();
      const thumbB64: string = await page.evaluate(
        (cfg) => {
          const g = globalThis as unknown as { renderFrame: (t: number) => void };
          g.renderFrame(cfg.t);
          const src = document.getElementById("c") as HTMLCanvasElement;
          const th = document.createElement("canvas");
          th.width = 1280;
          th.height = 720;
          const tc = th.getContext("2d")!;
          tc.drawImage(src, 0, 0, 1280, 720);

          // Yüksek kontrastlı sol-alt sinematik koyulaştırma
          const grad = tc.createLinearGradient(0, 720, 0, 260);
          grad.addColorStop(0, "rgba(2, 6, 23, 0.92)");
          grad.addColorStop(0.55, "rgba(2, 6, 23, 0.42)");
          grad.addColorStop(1, "rgba(2, 6, 23, 0.0)");
          tc.fillStyle = grad;
          tc.fillRect(0, 0, 1280, 720);

          // Üst-sol parlak rozet
          tc.save();
          tc.fillStyle = "rgba(8, 15, 34, 0.90)";
          tc.beginPath();
          tc.roundRect(48, 42, 310, 56, 28);
          tc.fill();
          tc.strokeStyle = cfg.accent;
          tc.lineWidth = 3.5;
          tc.stroke();
          tc.font = "900 24px -apple-system, BlinkMacSystemFont, sans-serif";
          tc.fillStyle = "#ffffff";
          tc.textAlign = "center";
          tc.fillText("⚡ 60FPS DEEP DIVE", 203, 79);
          tc.restore();

          // Alt-sol dev CTR başlığı (max 2 satır — tsx __name hatasını önlemek için iç içe fonksiyon yok)
          tc.save();
          const words = cfg.headline.split(/\s+/).filter(Boolean);
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(" ");
          const line2 = words.slice(mid).join(" ");
          const rows = line2
            ? [
                { txt: line1, y: 572, color: "#ffffff" },
                { txt: line2, y: 662, color: "#fde047" },
              ]
            : [{ txt: line1, y: 648, color: "#ffffff" }];
          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row.txt) continue;
            let px = 86;
            while (px > 42) {
              tc.font = `900 ${px}px -apple-system, BlinkMacSystemFont, sans-serif`;
              if (tc.measureText(row.txt).width <= 1160) break;
              px -= 3;
            }
            tc.textAlign = "left";
            tc.lineJoin = "round";
            tc.lineWidth = 14;
            tc.strokeStyle = "rgba(2, 6, 23, 0.96)";
            tc.strokeText(row.txt, 54, row.y);
            tc.fillStyle = row.color;
            tc.fillText(row.txt, 54, row.y);
          }
          tc.restore();

          return th.toDataURL("image/jpeg", 0.92).slice("data:image/jpeg;base64,".length);
        },
        { t: climaxT, headline: thumbHeadline, accent: spec.accentHex },
      );
      await writeFile(thumbnailPath, Buffer.from(thumbB64, "base64"));
      // Studio Test & Compare için 2 ek kapak varyantı (B: Act 1 Kanca, C: Act 4 Karşılaştırma)
      const extraVariants = [
        { suffix: "-thumb-B.jpg", t: Number((totalSec * 0.14).toFixed(2)), headline: (spec.derivedShorts[1]?.hook || spec.beats[0]?.caption || thumbHeadline).toUpperCase() },
        { suffix: "-thumb-C.jpg", t: Number((totalSec * 0.84).toFixed(2)), headline: (spec.derivedShorts[2]?.hook || spec.beats[spec.beats.length - 2]?.caption || thumbHeadline).toUpperCase() },
      ];
      for (const v of extraVariants) {
        const vB64: string = await page.evaluate(
          (cfg) => {
            const g = globalThis as unknown as { renderFrame: (t: number) => void };
            g.renderFrame(cfg.t);
            const src = document.getElementById("c") as HTMLCanvasElement;
            const th = document.createElement("canvas");
            th.width = 1280;
            th.height = 720;
            const tc = th.getContext("2d")!;
            tc.drawImage(src, 0, 0, 1280, 720);
            const grad = tc.createLinearGradient(0, 720, 0, 260);
            grad.addColorStop(0, "rgba(2, 6, 23, 0.92)");
            grad.addColorStop(0.55, "rgba(2, 6, 23, 0.42)");
            grad.addColorStop(1, "rgba(2, 6, 23, 0.0)");
            tc.fillStyle = grad;
            tc.fillRect(0, 0, 1280, 720);
            let px = 84;
            while (px > 42) {
              tc.font = `900 ${px}px -apple-system, BlinkMacSystemFont, sans-serif`;
              if (tc.measureText(cfg.headline).width <= 1160) break;
              px -= 3;
            }
            tc.textAlign = "left";
            tc.lineJoin = "round";
            tc.lineWidth = 14;
            tc.strokeStyle = "rgba(2, 6, 23, 0.96)";
            tc.strokeText(cfg.headline, 54, 646);
            tc.fillStyle = "#fde047";
            tc.fillText(cfg.headline, 54, 646);
            return th.toDataURL("image/jpeg", 0.92).slice("data:image/jpeg;base64,".length);
          },
          { t: v.t, headline: v.headline },
        );
        await writeFile(join(outDir, `${spec.id}${v.suffix}`), Buffer.from(vB64, "base64"));
      }
      console.log(`🖼️ [narrative-longform] 3 kapak varyantı üretildi (A+B+C — Test & Compare hazır): ${thumbnailPath}`);
    } catch (thErr) {
      console.warn("[narrative-longform] Kapak görseli üretim uyarısı:", thErr);
    }

    // Kapalı Altyazı (CC — .srt) dosyası (toplam milisaniyeden kesin hesaplanır; ,1000 taşması olmaz)
    const srtLines = timed.map((b, i) => {
      const fmtSrt = (sec: number) => {
        const totalMs = Math.round(Math.max(0, sec) * 1000);
        const h = Math.floor(totalMs / 3_600_000);
        const m = Math.floor((totalMs % 3_600_000) / 60_000);
        const s = Math.floor((totalMs % 60_000) / 1000);
        const ms = totalMs % 1000;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      return `${i + 1}\n${fmtSrt(b.start)} --> ${fmtSrt(b.end)}\n${b.text}\n`;
    });
    const srtPath = join(outDir, `${spec.id}.srt`);
    await writeFile(srtPath, srtLines.join("\n"), "utf8");

    // 4 Perde YouTube chapter zaman damgaları
    const chapters: Array<{ timestamp: string; title: string }> = [];
    const seenActs = new Set<number>();
    for (const b of timed) {
      if (!seenActs.has(b.actIndex)) {
        seenActs.add(b.actIndex);
        chapters.push({ timestamp: seenActs.size === 1 ? "00:00" : fmtTimestamp(b.start), title: b.actTitle });
      }
    }
    const chaptersText = chapters.map((c) => `${c.timestamp} ${c.title}`).join("\n");
    const descriptionBase = `${spec.descriptionLead}\n\nChapters:\n${chaptersText}\n\n${spec.nextEpisodeTeaser}`;

    const jsonPath = join(outDir, `${spec.id}.json`);
    await writeFile(
      jsonPath,
      JSON.stringify(
        {
          id: spec.id,
          slug: spec.slug,
          channel: spec.channel,
          title: spec.title,
          durationSec: Math.round(totalSec),
          resolution: "1920x1080",
          fps,
          chapters,
          srtPath,
          derivedShortsCount: spec.derivedShorts.length,
        },
        null,
        2,
      ),
    );
    console.log(`✅ [narrative-longform] TAMAM: ${mp4Path} (${fmtTimestamp(totalSec)}, 1920x1080, CC: ${srtPath})`);

    return {
      episodeId: spec.id,
      slug: spec.slug,
      channel: spec.channel,
      mp4Path,
      thumbnailPath,
      jsonPath,
      title: spec.title,
      durationSec: Math.round(totalSec),
      chapters,
      descriptionBase,
      tags: spec.tags,
    };
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 4-Perdeli uzun videonun içinden doğal 9:16 (1080x1920) Vitrin Short kesitini render eder.
 */
export async function renderDerivedShortVideo(
  spec: NarrativeLongformSpec,
  item: DerivedShortQueueItem,
  opts?: { fps?: number },
): Promise<string> {
  const fps = Math.max(30, Math.min(60, opts?.fps ?? 60));
  const scenePath = resolve("niches", "longform-deep-dive", `${spec.slug}.html`);
  if (!existsSync(scenePath)) throw new Error(`Türetilmiş Short sahnesi bulunamadı: ${scenePath}`);

  const selectedBeats = item.beatIds
    .map((id) => spec.beats.find((b) => b.id === id))
    .filter((b): b is NarrativeBeat => Boolean(b));
  if (selectedBeats.length === 0) {
    throw new Error(`Türetilmiş Short için geçerli beat bulunamadı: ${item.id}`);
  }

  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), `shorts-derived-${item.id}-`));

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: CHROMIUM_RENDER_ARGS,
  });

  try {
    console.log(`\n[derived-short] ${item.title} (${selectedBeats.length} beat, doğal 9:16) seslendiriliyor...`);
    const { timed, voiceMono, totalSec } = await synthesizeTimedBeats(selectedBeats, tmpDir, 0.14, 0.18, spec.channel);

    const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
    await attachLocalEngines(page);
    await page.setContent(await readFile(scenePath, "utf8"));
    await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);

    await page.evaluate(
      (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
      {
        width: 720,
        height: 1280,
        fps,
        aspect: "9:16",
        duration: totalSec,
        beats: timed,
        title: item.title,
        brand: spec.brandName,
        accent: spec.accentHex,
        shortMeta: {
          hook: item.hook,
          partLabel: item.partLabel,
          ctaText: item.ctaText,
        },
      },
    );

    const totalFrames = Math.ceil(totalSec * fps);
    const rawVid = join(tmpDir, "raw.mp4");
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

    for (let f = 0; f < totalFrames; f += 30) {
      const n = Math.min(30, totalFrames - f);
      const frames: string[] = await page.evaluate(
        ([s, c]) => (globalThis as unknown as { renderBatch: (a: number, b: number) => string[] }).renderBatch(s, c),
        [f, n] as const,
      );
      for (let i = 0; i < frames.length; i++) {
        const b = Buffer.from(frames[i], "base64");
        if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
      }
    }
    ff.stdin.end();
    await ffDone;

    const events: SoundEvent[] = await page.evaluate(
      () => (globalThis as unknown as { getEvents: () => SoundEvent[] }).getEvents(),
    );
    const sfxStereo = synthesizeEventsPcm(events, totalSec, SAMPLE_RATE);
    const bgmStereo = synthesizeBackgroundMusicPcm(totalSec, hashSlug(item.id), SAMPLE_RATE);

    const totalSamples = voiceMono.length;
    const mixed = new Int16Array(Math.max(totalSamples, sfxStereo.length / 2) * 2);
    const sfxGain = spec.channel === "physics" ? 0.55 : 0.38;
    for (let i = 0; i < totalSamples; i++) {
      const v = voiceMono[i] / 32768;
      const sl = (sfxStereo[i * 2] ?? 0) / 32768;
      const sr = (sfxStereo[i * 2 + 1] ?? 0) / 32768;
      const ml = (bgmStereo[i * 2] ?? 0) / 32768;
      const mr = (bgmStereo[i * 2 + 1] ?? 0) / 32768;
      const duck = Math.abs(v) > 0.015 ? 0.14 : 0.25;
      mixed[i * 2] = Math.round(Math.tanh(v * 0.94 + sl * sfxGain + ml * duck) * 32000);
      mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.94 + sr * sfxGain + mr * duck) * 32000);
    }
    applyIntroSubBass(mixed, SAMPLE_RATE, 0.32);
    const mixPcm = join(tmpDir, "mix.pcm");
    await writeFile(mixPcm, Buffer.from(mixed.buffer, mixed.byteOffset, mixed.byteLength));

    const finalMp4 = join(outDir, `${item.id}.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-i", rawVid,
      "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", mixPcm,
      "-vf", "scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "main", "-level", "4.1", "-preset", "medium", "-crf", "20",
      "-maxrate", "6M", "-bufsize", "12M", "-g", String(fps * 2), "-keyint_min", String(fps),
      "-sc_threshold", "0", "-bf", "2", "-r", String(fps),
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
      "-t", totalSec.toFixed(2), "-movflags", "+faststart",
      finalMp4,
    ]);
    console.log(`✅ [derived-short] TAMAM: ${finalMp4} (${totalSec.toFixed(1)}s, 1080x1920)`);
    return finalMp4;
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
