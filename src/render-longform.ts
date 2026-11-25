import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { applyIntroSubBass, synthesizeEventsPcm, trimSilence, type SoundEvent } from "./audio.js";
import { EXPLAINER_JOBS, PHYSICS_LABELS, PHYSICS_ROTATION, type ChannelId as ChannelKind, type PhysicsNiche } from "./catalog.js";
import { synthesizeVoice } from "./voice.js";

const require = createRequire(import.meta.url);
const ffmpegPath: string = require("ffmpeg-static");
const SAMPLE_RATE = 48000;

type ScriptLine = { id: string; text: string; caption: string };
type TimedLine = ScriptLine & { start: number; end: number };

export interface LongformChapter {
  slug: string;
  title: string;
  category: string;
  hook?: string;
  seed?: number;
  seconds?: number;
}

export interface LongformEpisodePlan {
  id: string;
  channel: ChannelKind;
  brandName: string;
  brandTagline: string;
  accentHex: string;
  title: string;
  teaserHeadline: string;
  introVoice: string;
  outroVoice: string;
  descriptionLead: string;
  tags: string[];
  chapters: LongformChapter[];
}

export interface LongformRenderResult {
  episodeId: string;
  channel: ChannelKind;
  mp4Path: string;
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

/** Günlük temalı Clear Mechanics (Explainer) uzun video paketleri (sonrasında 38 bölümden sonsuz rotasyon). */
const EXPLAINER_THEMES: Array<{
  slug: string;
  title: string;
  teaser: string;
  intro: string;
  lead: string;
  slugs: string[];
}> = [
  {
    slug: "everyday-machines",
    title: "How 10 Everyday Machines Actually Work (Animated Engineering Deep Dive)",
    teaser: "WAIT UNTIL #7 — THIS TRICK BREAKS INTUITION",
    intro: "Ever wondered what happens inside the machines you touch every single day? Wait until chapter seven — it will completely change how you see everyday engineering.",
    lead: "In this animated engineering deep dive, we cut open 10 everyday inventions with clean visual breakdowns.",
    slugs: [
      "pin-tumbler-lock", "airplane-wing", "noise-canceling", "car-differential", "touchscreen",
      "submarine", "qr-code", "mechanical-watch", "wifi-walls", "bulletproof-vest",
    ],
  },
  {
    slug: "space-and-extreme-physics",
    title: "Space, Black Holes & Extreme Physics Explained (Animated Science Documentary)",
    teaser: "WHAT IF EARTH BECAME A BLACK HOLE?",
    intro: "Squeeze Earth into a glass marble and space itself tears open. Today we dive into black holes, light speed, and the wildest physics in the universe.",
    lead: "From black holes and light speed to extreme engineering, explore 8 mind-bending science breakdowns in full 16:9.",
    slugs: [
      "earth-to-marble", "sun-black-hole", "light-speed-mars", "space-suit",
      "nuclear-reactor", "maglev-train", "gps-relativity", "laser-beam",
    ],
  },
  {
    slug: "hidden-engineering",
    title: "8 Genius Engineering Tricks Hidden in Plain Sight (Animated Breakdown)",
    teaser: "YOU USED THESE TODAY WITHOUT NOTICING",
    intro: "Why is every tape measure hook deliberately loose? And how does a giant steel ball stop a skyscraper from falling? Let us uncover eight genius tricks hiding in plain sight.",
    lead: "Discover 8 hidden mechanical secrets engineered into everyday objects and mega-structures.",
    slugs: [
      "tape-measure-hook", "airplane-vacuum-toilet", "tuned-mass-damper", "abs-brakes",
      "car-airbag", "escalator-comb", "elevator-brakes", "zipper-teeth",
    ],
  },
  {
    slug: "modern-tech-inside",
    title: "Inside Modern Technology: Batteries, Fiber Optics & Microchips Explained",
    teaser: "HOW LIGHT CARRIES THE ENTIRE INTERNET",
    intro: "Every second, beams of light bounce inside glass hairs thinner than your hair to carry the entire internet. Here is how eight modern technologies actually work under the hood.",
    lead: "An animated visual tour inside the modern electronics and physics powering our connected world.",
    slugs: [
      "fiber-optic", "lithium-battery", "microwave-oven", "induction-cooktop",
      "bluetooth-hopping", "transistor-switch", "solar-panel", "radar-speed-gun",
    ],
  },
];

function prettySlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Kanal + bölüm indeksine göre günlük benzersiz uzun video planı üretir (asla tükenmez). */
export function buildLongformPlan(channel: ChannelKind, episodeNumber: number, maxChapters = 8): LongformEpisodePlan {
  const epIdx = Math.max(1, episodeNumber);

  if (channel === "explainer") {
    const existingSlugs = EXPLAINER_JOBS
      .map((j) => j.episode || "")
      .filter((s) => s && existsSync(resolve("niches", "how-it-works", "episodes", `${s}.html`)));

    const theme = EXPLAINER_THEMES[(epIdx - 1) % EXPLAINER_THEMES.length];
    let chosenSlugs = theme.slugs.filter((s) => existingSlugs.includes(s));
    if (epIdx > EXPLAINER_THEMES.length || chosenSlugs.length < 6) {
      // Sonsuz rotasyon: tüm mevcut bölümlerden deterministik kaydırmalı 8 bölüm seç
      const offset = ((epIdx - 1) * 5) % Math.max(1, existingSlugs.length);
      chosenSlugs = [];
      for (let i = 0; i < Math.min(maxChapters, existingSlugs.length); i++) {
        chosenSlugs.push(existingSlugs[(offset + i) % existingSlugs.length]);
      }
    } else {
      chosenSlugs = chosenSlugs.slice(0, maxChapters);
    }

    const volSuffix = epIdx > EXPLAINER_THEMES.length ? ` (Vol. ${epIdx})` : "";
    return {
      id: `longform-explainer-ep${epIdx}`,
      channel: "explainer",
      brandName: "CLEAR MECHANICS",
      brandTagline: "ANIMATED ENGINEERING DEEP DIVE",
      accentHex: "#38bdf8",
      title: `${theme.title}${volSuffix}`,
      teaserHeadline: theme.teaser,
      introVoice: theme.intro,
      outroVoice: "Subscribe to Clear Mechanics and click the next engineering breakdown on screen to keep exploring how the world works.",
      descriptionLead: theme.lead,
      tags: ["engineering", "how it works", "science", "documentary", "animation", "clear mechanics"],
      chapters: chosenSlugs.map((slug) => ({
        slug,
        title: prettySlug(slug),
        category: "ENGINEERING BREAKDOWN",
      })),
    };
  }

  // KINETIC LAB (Physics): Sonsuz günlük 6 rauntluk 16:9 fizik turnuvası!
  const roundCount = Math.max(4, Math.min(8, maxChapters));
  const chapters: LongformChapter[] = [];
  const startOffset = ((epIdx - 1) * 3) % PHYSICS_ROTATION.length;
  for (let i = 0; i < roundCount; i++) {
    const niche: PhysicsNiche = PHYSICS_ROTATION[(startOffset + i) % PHYSICS_ROTATION.length];
    const seed = 5000 + epIdx * 31 + i * 7;
    chapters.push({
      slug: niche,
      title: `Round ${i + 1}: ${PHYSICS_LABELS[niche]}`,
      category: "LIVE PHYSICS ARENA",
      seed,
      seconds: 32,
      hook: `ROUND ${i + 1}: ${PHYSICS_LABELS[niche].toUpperCase()}`,
    });
  }

  return {
    id: `longform-physics-ep${epIdx}`,
    channel: "physics",
    brandName: "KINETIC LAB",
    brandTagline: "60FPS PHYSICS ARENA TOURNAMENT",
    accentHex: "#f472b6",
    title: `Satisfying Physics Arena Tournament #${epIdx} (${roundCount} Wild Simulations)`,
    teaserHeadline: `WHO SURVIVES ROUND ${roundCount}? WATCH TO THE END`,
    introVoice: `Welcome to Kinetic Lab Tournament number ${epIdx}. Six wild physics simulations, zero mercy, and a final round nobody predicted. Pick your winner before the timer runs out.`,
    outroVoice: "Did your prediction win? Subscribe to Kinetic Lab and click the next tournament on screen for more satisfying physics simulations.",
    descriptionLead: `Watch ${roundCount} back-to-back satisfying physics simulations with live telemetry, custom sound design, and unpredictable endings.`,
    tags: ["physics simulation", "satisfying", "kinetic lab", "oddly satisfying", "animation", "chaos theory"],
    chapters,
  };
}

/** 1280×720 Canvas'ta jilet gibi Intro (Cold-Open + Logo Sting) veya 8 sn Outro (Subscribe + Watch Next) üretir. */
async function renderBrandCardSegment(
  browser: Browser,
  mode: "intro" | "outro",
  plan: LongformEpisodePlan,
  fps: number,
  tmpDir: string,
  previewOutPath?: string,
): Promise<{ mp4Path: string; durationSec: number }> {
  const voiceText = mode === "intro" ? plan.introVoice : plan.outroVoice;
  const voiceFile = await synthesizeVoice(voiceText, join(tmpDir, `${mode}_voice.mp3`));
  const rawMono = join(tmpDir, `${mode}_voice.raw`);
  await runCmd(ffmpegPath, ["-y", "-i", voiceFile, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
  const buf = await readFile(rawMono);
  const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);

  const padBefore = mode === "intro" ? 0.35 : 0.45;
  const padAfter = mode === "intro" ? 1.45 : 2.1;
  const minDur = mode === "intro" ? 5.5 : 8.0;
  const dur = Math.max(minDur, padBefore + pcm.length / SAMPLE_RATE + padAfter);
  const totalSamples = Math.ceil(dur * SAMPLE_RATE);
  const stereo = new Int16Array(totalSamples * 2);

  // Arka plan ambient + logo sting / kapanış akoru sentezle
  const padStart = Math.floor(padBefore * SAMPLE_RATE);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const v = i >= padStart && i - padStart < pcm.length ? pcm[i - padStart] / 32768 : 0;
    let music = 0;
    if (mode === "intro") {
      // İlk 0.4s yükselen gerilim + logo sting anında (dur - 1.6s) parlak akor
      const stingT = t - (dur - 1.65);
      if (stingT >= 0 && stingT < 1.5) {
        const env = Math.exp(-stingT * 2.8) * Math.min(1, stingT * 30);
        music += (Math.sin(2 * Math.PI * 220 * stingT) * 0.4 + Math.sin(2 * Math.PI * 330 * stingT) * 0.3 + Math.sin(2 * Math.PI * 440 * stingT) * 0.3) * env * 0.28;
      }
      music += Math.sin(2 * Math.PI * (55 + t * 8) * t) * 0.06 * Math.exp(-t * 0.4);
    } else {
      // Outro: sıcak modern belgesel akoru
      const fade = Math.min(1, t * 2) * Math.min(1, (dur - t) * 1.5);
      music += (Math.sin(2 * Math.PI * 196 * t) * 0.35 + Math.sin(2 * Math.PI * 246.94 * t) * 0.3 + Math.sin(2 * Math.PI * 293.66 * t) * 0.25) * 0.12 * fade;
    }
    const sample = Math.round(Math.tanh(v * 0.95 + music) * 32000);
    stereo[i * 2] = sample;
    stereo[i * 2 + 1] = sample;
  }
  applyIntroSubBass(stereo, SAMPLE_RATE, mode === "intro" ? 0.38 : 0.22);

  const pcmPath = join(tmpDir, `${mode}.pcm`);
  await writeFile(pcmPath, Buffer.from(stereo.buffer, stereo.byteOffset, stereo.byteLength));

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const html = `<!doctype html><html><body style="margin:0;background:#050b18"><canvas id="card" width="1280" height="720"></canvas>
  <script>
    const cv = document.getElementById("card");
    const g = cv.getContext("2d");
    const W = 1280, H = 720;
    const cfg = ${JSON.stringify({
      mode,
      brand: plan.brandName,
      tagline: plan.brandTagline,
      accent: plan.accentHex,
      teaser: plan.teaserHeadline,
      title: plan.title,
      chapters: plan.chapters.map((c) => c.title),
      dur,
      fps,
      isPhysics: plan.channel === "physics",
    })};

    function drawBg(t) {
      const bg = g.createRadialGradient(W * 0.5, H * 0.45, 40, W * 0.5, H * 0.5, 820);
      bg.addColorStop(0, cfg.isPhysics ? "#190c2b" : "#0c1d3d");
      bg.addColorStop(1, "#040812");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = cfg.isPhysics ? "rgba(244,114,182,0.07)" : "rgba(56,189,248,0.07)";
      g.lineWidth = 1;
      const shift = (t * 24) % 40;
      for (let x = -40; x < W + 40; x += 40) { g.beginPath(); g.moveTo(x + shift, 0); g.lineTo(x + shift, H); g.stroke(); }
      for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }

    function drawLogo(cx, cy, r, t) {
      g.save();
      g.translate(cx, cy);
      g.strokeStyle = cfg.accent;
      g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
      g.rotate(t * 1.4);
      g.strokeStyle = "rgba(255,255,255,0.65)";
      g.lineWidth = 3;
      g.setLineDash([14, 10]);
      g.beginPath(); g.arc(0, 0, r * 0.78, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      if (cfg.isPhysics) {
        g.fillStyle = "#38bdf8"; g.beginPath(); g.arc(r * 0.42, 0, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f472b6"; g.beginPath(); g.arc(-r * 0.42, 0, 10, 0, Math.PI * 2); g.fill();
      } else {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle = cfg.accent;
          g.fillRect(Math.cos(a) * (r * 0.45) - 5, Math.sin(a) * (r * 0.45) - 5, 10, 10);
        }
      }
      g.restore();
    }

    window.renderFrame = (f) => {
      const t = f / cfg.fps;
      drawBg(t);

      if (cfg.mode === "intro") {
        const stingStart = cfg.dur - 1.75;
        if (t < stingStart) {
          // Cold-Open Teaser: heyecan verici kanca + bölüm önizleme şeridi
          const pulse = 0.85 + 0.15 * Math.sin(t * 10);
          g.fillStyle = "rgba(250,204,21,0.16)";
          g.strokeStyle = "#facc15";
          g.lineWidth = 2;
          g.beginPath(); g.roundRect(W * 0.5 - 230, 110, 460, 44, 22); g.fill(); g.stroke();
          g.fillStyle = "#fde047";
          g.font = "900 18px monospace";
          g.textAlign = "center";
          g.fillText("⚡  COLD OPEN  •  DON'T BLINK", W * 0.5, 138);

          g.fillStyle = "#ffffff";
          g.font = "900 50px -apple-system, sans-serif";
          g.fillText(cfg.teaser, W * 0.5, 255, 1120);

          // Hareketli bölüm rozetleri
          const visible = Math.min(cfg.chapters.length, Math.floor((t / Math.max(0.5, stingStart - 0.3)) * cfg.chapters.length) + 2);
          for (let i = 0; i < Math.min(6, cfg.chapters.length); i++) {
            const col = i % 2, row = Math.floor(i / 2);
            const bx = 210 + col * 440, by = 330 + row * 72;
            const active = i < visible;
            g.fillStyle = active ? "rgba(56,189,248,0.18)" : "rgba(15,23,42,0.5)";
            g.strokeStyle = active ? cfg.accent : "rgba(148,163,184,0.2)";
            g.lineWidth = 1.8;
            g.beginPath(); g.roundRect(bx, by, 410, 54, 12); g.fill(); g.stroke();
            g.fillStyle = active ? "#ffffff" : "#64748b";
            g.font = "700 18px -apple-system, sans-serif";
            g.textAlign = "left";
            g.fillText(String(i + 1).padStart(2, "0") + ". " + cfg.chapters[i], bx + 18, by + 33, 374);
          }

          // Alt yükleme barı
          const p = Math.min(1, t / stingStart);
          g.fillStyle = "rgba(148,163,184,0.2)";
          g.beginPath(); g.roundRect(240, 610, 800, 10, 5); g.fill();
          g.fillStyle = cfg.accent;
          g.globalAlpha = pulse;
          g.beginPath(); g.roundRect(240, 610, 800 * p, 10, 5); g.fill();
          g.globalAlpha = 1;
        } else {
          // 1.75s Animasyonlu Logo Intro Sting
          const st = t - stingStart;
          const scale = Math.min(1, 0.72 + st * 0.9);
          g.save();
          g.translate(W * 0.5, H * 0.5);
          g.scale(scale, scale);
          g.translate(-W * 0.5, -H * 0.5);
          drawLogo(W * 0.5, 250, 74, t * 2.2);
          g.textAlign = "center";
          g.fillStyle = "#ffffff";
          g.font = "900 72px -apple-system, sans-serif";
          g.fillText(cfg.brand, W * 0.5, 415);
          g.fillStyle = cfg.accent;
          g.font = "800 22px monospace";
          g.fillText(cfg.tagline, W * 0.5, 468);
          g.restore();
        }
      } else {
        // 8 sn YouTube End-Screen Outro: Sol Subscribe Dairesi + Sağ Watch Next 16:9 Kartı
        g.textAlign = "center";
        g.fillStyle = "#facc15";
        g.font = "900 22px monospace";
        g.fillText("THANKS FOR WATCHING  •  " + cfg.brand, W * 0.5, 84);

        // Sol: YouTube End-Screen Subscribe Dairesi
        const pulse = 1 + 0.04 * Math.sin(t * 6);
        g.save();
        g.translate(330, 355);
        g.scale(pulse, pulse);
        g.fillStyle = "rgba(239,68,68,0.16)";
        g.strokeStyle = "#ef4444";
        g.lineWidth = 4;
        g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill(); g.stroke();
        drawLogo(0, -18, 44, t);
        g.fillStyle = "#ffffff";
        g.font = "900 24px -apple-system, sans-serif";
        g.fillText("SUBSCRIBE 🔔", 0, 72);
        g.restore();

        // Kırmızı CTA hapı
        g.fillStyle = "#ef4444";
        g.beginPath(); g.roundRect(195, 520, 270, 50, 25); g.fill();
        g.fillStyle = "#ffffff";
        g.font = "900 20px -apple-system, sans-serif";
        g.fillText("JOIN FOR DAILY VIDEOS", 330, 552);

        // Sağ: YouTube End-Screen Watch Next 16:9 Çerçevesi
        g.fillStyle = "rgba(15,23,42,0.75)";
        g.strokeStyle = cfg.accent;
        g.lineWidth = 3.5;
        g.beginPath(); g.roundRect(620, 200, 530, 300, 20); g.fill(); g.stroke();
        g.fillStyle = cfg.accent;
        g.font = "900 22px monospace";
        g.fillText("▶  WATCH NEXT DEEP DIVE", 885, 345);
        g.fillStyle = "#94a3b8";
        g.font = "600 18px -apple-system, sans-serif";
        g.fillText("New 16:9 episode every single day", 885, 385);
      }

      return cv.toDataURL("image/jpeg", 0.92).slice(23);
    };
  </script></body></html>`;

  await page.setContent(html);
  const rawVid = join(tmpDir, `${mode}.raw.mp4`);
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
    ff.on("close", (c) => (c === 0 ? ok() : no(new Error(`ffmpeg ${mode} ${c}: ${ffErr}`)))),
  );

  const totalFrames = Math.ceil(dur * fps);
  const previewFrame = mode === "intro" ? Math.floor(totalFrames * 0.85) : Math.floor(totalFrames * 0.5);
  for (let f = 0; f < totalFrames; f++) {
    const b64: string = await page.evaluate((idx) => (globalThis as unknown as { renderFrame: (n: number) => string }).renderFrame(idx), f);
    const b = Buffer.from(b64, "base64");
    if (previewOutPath && f === previewFrame) await writeFile(previewOutPath, b);
    if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
  }
  ff.stdin.end();
  await ffDone;
  await page.close();

  const outMp4 = join(tmpDir, `${mode}.mp4`);
  await runCmd(ffmpegPath, [
    "-y", "-i", rawVid,
    "-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "2", "-i", pcmPath,
    "-vf", "scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", String(fps),
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", dur.toFixed(2),
    outMp4,
  ]);
  return { mp4Path: outMp4, durationSec: dur };
}

/** 16:9 Belgesel & Fizik Turnuvası Stüdyo Kompozitörü (+ Bölüm 3'te orta-video Subscribe hapı). */
const STUDIO_OVERLAY_JS = `
(() => {
  const W = 1280, H = 720;
  const outCv = document.createElement("canvas");
  outCv.width = W;
  outCv.height = H;
  const g = outCv.getContext("2d");

  window.installStudioComposer = (meta) => {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    let fIdx = 0;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      if (this.id !== "c") return orig.apply(this, args);
      const t = fIdx / meta.fps;
      fIdx++;

      // 1) 16:9 arka plan
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, meta.isPhysics ? "#0b0718" : "#050b18");
      bg.addColorStop(0.55, meta.isPhysics ? "#160d2d" : "#0a162e");
      bg.addColorStop(1, "#040812");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      g.strokeStyle = meta.isPhysics ? "rgba(244,114,182,0.06)" : "rgba(56,189,248,0.06)";
      g.lineWidth = 1;
      for (let x = 0; x < W; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

      // 2) Sol Ana Sahne (temiz kadraj)
      const stageX = 44, stageY = 36, stageW = 540, stageH = 648;
      g.save();
      g.beginPath(); g.roundRect(stageX, stageY, stageW, stageH, 22); g.clip();
      const cropTop = meta.isPhysics ? 0.06 : 0.08;
      const cropH = meta.isPhysics ? 0.88 : 0.84;
      g.drawImage(this, 0, this.height * cropTop, this.width, this.height * cropH, stageX, stageY, stageW, stageH);
      g.restore();
      g.strokeStyle = meta.accent;
      g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(stageX, stageY, stageW, stageH, 22); g.stroke();

      // 3) Sağ Belgesel / Turnuva Paneli
      const rx = 620, rw = 616;
      const badgeText = meta.brand + "  •  " + meta.category;
      g.font = "800 13px -apple-system, sans-serif";
      const badgeW = Math.min(rw, Math.ceil(g.measureText(badgeText).width) + 34);
      g.fillStyle = meta.isPhysics ? "rgba(244,114,182,0.16)" : "rgba(56,189,248,0.14)";
      g.strokeStyle = meta.accent;
      g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(rx, 40, badgeW, 34, 17); g.fill(); g.stroke();
      g.fillStyle = meta.isPhysics ? "#fbcfe8" : "#7dd3fc";
      g.textAlign = "left";
      g.fillText(badgeText, rx + 17, 62);

      g.fillStyle = "#facc15";
      g.font = "900 18px monospace";
      const chLabel = meta.isPhysics ? "MATCH " : "CHAPTER ";
      g.fillText(chLabel + String(meta.chapterIdx + 1).padStart(2, "0") + " / " + String(meta.totalChapters).padStart(2, "0"), rx, 114);

      g.fillStyle = "#ffffff";
      g.font = "900 36px -apple-system, sans-serif";
      g.fillText(meta.title, rx, 158, rw);

      const prog = Math.min(1, Math.max(0, t / Math.max(0.1, meta.duration)));
      g.fillStyle = "rgba(148,163,184,0.2)";
      g.beginPath(); g.roundRect(rx, 180, rw, 8, 4); g.fill();
      g.fillStyle = meta.accent;
      g.beginPath(); g.roundRect(rx, 180, rw * prog, 8, 4); g.fill();

      // Canlı Anlatım / Arena Durum Kartı
      g.fillStyle = "rgba(15,23,42,0.85)";
      g.strokeStyle = "rgba(148,163,184,0.28)";
      g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(rx, 212, rw, 162, 18); g.fill(); g.stroke();
      g.fillStyle = "#4ade80";
      g.font = "800 14px monospace";
      g.fillText(meta.isPhysics ? "● LIVE ARENA TELEMETRY" : "● LIVE BREAKDOWN", rx + 22, 242);

      let activeText = meta.fallbackText || "";
      if (meta.lines && meta.lines.length) {
        let activeLine = meta.lines[0];
        for (const l of meta.lines) if (t >= l.start) activeLine = l;
        activeText = activeLine ? activeLine.text : activeText;
      }
      if (activeText) {
        g.fillStyle = "#f8fafc";
        g.font = "600 22px -apple-system, sans-serif";
        const words = activeText.split(" ");
        let line = "", yy = 280;
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

      // Sağ Alt: Bölüm / Raunt Haritası
      g.fillStyle = "#94a3b8";
      g.font = "800 13px monospace";
      g.fillText(meta.isPhysics ? "TOURNAMENT ROUNDS" : "DOCUMENTARY CHAPTERS", rx, 408);

      const half = Math.ceil(meta.allTitles.length / 2);
      meta.allTitles.forEach((ct, i) => {
        const col = i < half ? 0 : 1;
        const row = i < half ? i : i - half;
        const cx = rx + col * 314;
        const cy = 434 + row * 44;
        const isCurrent = i === meta.chapterIdx;
        const isDone = i < meta.chapterIdx;
        g.fillStyle = isCurrent ? (meta.isPhysics ? "rgba(244,114,182,0.22)" : "rgba(56,189,248,0.18)") : "rgba(15,23,42,0.55)";
        g.strokeStyle = isCurrent ? meta.accent : "rgba(148,163,184,0.15)";
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
        g.fillStyle = meta.isPhysics ? "rgba(244,114,182,0.45)" : "rgba(56,189,248,0.45)";
        g.fillRect(rx + i * 14.5, 676 - bh, 8, bh);
      }

      // 4) Orta-Video Zarif Subscribe Hapı (3. bölümde 2.5s - 7.5s arası sağ altta belirir)
      if (meta.chapterIdx === 2 && t >= 2.5 && t <= 7.5) {
        const a = t < 3.0 ? (t - 2.5) / 0.5 : t > 7.0 ? (7.5 - t) / 0.5 : 1;
        g.save();
        g.globalAlpha = Math.max(0, Math.min(1, a));
        g.fillStyle = "#ef4444";
        g.beginPath(); g.roundRect(W - 320, H - 78, 276, 48, 24); g.fill();
        g.fillStyle = "#ffffff";
        g.font = "900 18px -apple-system, sans-serif";
        g.textAlign = "center";
        g.fillText("🔔  SUBSCRIBE TO " + meta.brand, W - 182, H - 48, 250);
        g.restore();
      }

      return orig.call(outCv, "image/jpeg", 0.92);
    };
  };
})();
`;

export async function renderLongformVideo(opts: {
  channel: ChannelKind;
  episodeNumber: number;
  fps?: number;
  maxChapters?: number;
}): Promise<LongformRenderResult> {
  const fps = Math.max(24, Math.min(60, opts.fps ?? 30));
  const plan = buildLongformPlan(opts.channel, opts.episodeNumber, opts.maxChapters ?? (opts.channel === "physics" ? 6 : 8));
  const outDir = resolve("out");
  await mkdir(outDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), "shorts-longform-"));

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const segmentFiles: string[] = [];
  const chaptersMeta: Array<{ timestamp: string; title: string }> = [];
  let runningSec = 0;

  try {
    // 1) COLD-OPEN + ANİMASYONLU LOGO INTRO
    console.log(`\n[longform] 1/3 Intro (Cold-Open + ${plan.brandName} Logo Sting)...`);
    const introSeg = await renderBrandCardSegment(
      browser,
      "intro",
      plan,
      fps,
      tmpDir,
      join(outDir, `longform-${plan.channel}-intro-preview.jpg`),
    );
    segmentFiles.push(introSeg.mp4Path);
    chaptersMeta.push({ timestamp: "00:00", title: "Intro & Cold Open" });
    runningSec += introSeg.durationSec;

    // 2) ANA BÖLÜMLER
    const allTitles = plan.chapters.map((c) => c.title);
    for (let idx = 0; idx < plan.chapters.length; idx++) {
      const ch = plan.chapters[idx];
      console.log(`[longform] 2/3 Bölüm ${idx + 1}/${plan.chapters.length}: ${ch.title}`);

      const scenePath = plan.channel === "explainer"
        ? resolve("niches", "how-it-works", "episodes", `${ch.slug}.html`)
        : resolve("niches", ch.slug, "scene.html");
      if (!existsSync(scenePath)) throw new Error(`Eksik sahne: ${scenePath}`);

      const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
      await page.setContent(await readFile(scenePath, "utf8"));
      await page.waitForFunction(() => (globalThis as unknown as { ready?: boolean }).ready === true);
      await page.addScriptTag({ content: STUDIO_OVERLAY_JS });

      let chapterSec = ch.seconds ?? 30;
      let voiceMono = new Int16Array(Math.ceil(chapterSec * SAMPLE_RATE));
      let timed: TimedLine[] = [];
      let fallbackText = "";

      if (plan.channel === "explainer") {
        const script: ScriptLine[] = await page.evaluate(
          () => (globalThis as unknown as { getScript: () => ScriptLine[] }).getScript(),
        );
        const chunks: Int16Array[] = [new Int16Array(Math.round(0.2 * SAMPLE_RATE))];
        let t = 0.2;
        for (let i = 0; i < script.length; i++) {
          const audioIn = await synthesizeVoice(script[i].text, join(tmpDir, `c${idx}_v${i}.mp3`));
          const rawMono = join(tmpDir, `c${idx}_v${i}.raw`);
          await runCmd(ffmpegPath, ["-y", "-i", audioIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
          const buf = await readFile(rawMono);
          const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);
          const dur = pcm.length / SAMPLE_RATE;
          timed.push({ ...script[i], start: t, end: t + dur });
          chunks.push(pcm);
          const gap = i + 1 < script.length ? 0.15 : 0.55;
          chunks.push(new Int16Array(Math.round(gap * SAMPLE_RATE)));
          t += dur + gap;
        }
        chapterSec = t;
        const totalSamples = chunks.reduce((a, c) => a + c.length, 0);
        voiceMono = new Int16Array(totalSamples);
        let off = 0;
        for (const c of chunks) { voiceMono.set(c, off); off += c.length; }

        await page.evaluate(
          (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
          { width: 720, height: 1280, fps, duration: chapterSec, lines: timed },
        );
      } else {
        // Physics: kısa dinamik spiker girişi + 32 sn tam simülasyon
        fallbackText = `Round ${idx + 1} live! Watch the momentum build — who escapes or survives before the clock hits zero?`;
        const voiceIn = await synthesizeVoice(
          `Round ${idx + 1}: ${ch.title.replace(/^Round \d+:\s*/, "")}. Watch closely — the physics escalates fast.`,
          join(tmpDir, `p${idx}_v.mp3`),
        );
        const rawMono = join(tmpDir, `p${idx}_v.raw`);
        await runCmd(ffmpegPath, ["-y", "-i", voiceIn, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", rawMono]);
        const buf = await readFile(rawMono);
        const pcm = trimSilence(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)), SAMPLE_RATE);
        voiceMono = new Int16Array(Math.ceil(chapterSec * SAMPLE_RATE));
        const startOff = Math.floor(0.25 * SAMPLE_RATE);
        voiceMono.set(pcm.subarray(0, Math.min(pcm.length, voiceMono.length - startOff)), startOff);

        await page.evaluate(
          (cfg) => (globalThis as unknown as { init: (c: unknown) => void }).init(cfg),
          { width: 720, height: 1280, fps, seconds: chapterSec, seed: ch.seed ?? 5001, hook: ch.hook ?? ch.title },
        );
      }

      chaptersMeta.push({ timestamp: fmtTimestamp(runningSec), title: ch.title });
      runningSec += chapterSec;

      await page.evaluate(
        (meta) => (globalThis as unknown as { installStudioComposer: (m: unknown) => void }).installStudioComposer(meta),
        {
          fps,
          duration: chapterSec,
          chapterIdx: idx,
          totalChapters: plan.chapters.length,
          title: ch.title,
          category: ch.category,
          brand: plan.brandName,
          accent: plan.accentHex,
          isPhysics: plan.channel === "physics",
          lines: timed,
          fallbackText,
          allTitles,
        },
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
      const savePreview = idx === 2 ? Math.floor(4.5 * fps) : -1;
      for (let f = 0; f < totalFrames; f += 30) {
        const n = Math.min(30, totalFrames - f);
        const frames: string[] = await page.evaluate(
          ([s, c]) => (globalThis as unknown as { renderBatch: (a: number, b: number) => string[] }).renderBatch(s, c),
          [f, n] as const,
        );
        for (let i = 0; i < frames.length; i++) {
          const b = Buffer.from(frames[i], "base64");
          if (f + i === savePreview) await writeFile(join(outDir, `longform-${plan.channel}-main-preview.jpg`), b);
          if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once("drain", ok));
        }
      }
      ff.stdin.end();
      await ffDone;

      const events: SoundEvent[] = await page.evaluate(
        () => (globalThis as unknown as { getEvents: () => SoundEvent[] }).getEvents(),
      );
      const sfx = synthesizeEventsPcm(events, chapterSec, SAMPLE_RATE);
      const totalSamples = voiceMono.length;
      const mixed = new Int16Array(Math.max(totalSamples, sfx.length / 2) * 2);
      const sfxGain = plan.channel === "physics" ? 0.78 : 0.38;
      for (let i = 0; i < totalSamples; i++) {
        const v = voiceMono[i] / 32768;
        const sl = (sfx[i * 2] ?? 0) / 32768;
        const sr = (sfx[i * 2 + 1] ?? 0) / 32768;
        mixed[i * 2] = Math.round(Math.tanh(v * 0.95 + sl * sfxGain) * 32000);
        mixed[i * 2 + 1] = Math.round(Math.tanh(v * 0.95 + sr * sfxGain) * 32000);
      }
      applyIntroSubBass(mixed, SAMPLE_RATE, 0.22);
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
      segmentFiles.push(chMp4);
      await page.close();
    }

    // 3) 8 SN YOUTUBE END-SCREEN OUTRO (Subscribe + Watch Next)
    console.log(`[longform] 3/3 Outro (8s Subscribe + Watch Next End-Screen)...`);
    const outroSeg = await renderBrandCardSegment(
      browser,
      "outro",
      plan,
      fps,
      tmpDir,
      join(outDir, `longform-${plan.channel}-outro-preview.jpg`),
    );
    segmentFiles.push(outroSeg.mp4Path);
    runningSec += outroSeg.durationSec;

    const concatList = join(tmpDir, "concat.txt");
    await writeFile(concatList, segmentFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    const mp4Path = join(outDir, `${plan.id}-1080p.mp4`);
    await runCmd(ffmpegPath, [
      "-y", "-f", "concat", "-safe", "0", "-i", concatList,
      "-c", "copy", "-movflags", "+faststart",
      mp4Path,
    ]);

    const chaptersText = chaptersMeta.map((c) => `${c.timestamp} ${c.title}`).join("\n");
    const descriptionBase = `${plan.descriptionLead}\n\nChapters:\n${chaptersText}`;
    const jsonPath = join(outDir, `${plan.id}.json`);
    const metaJson = {
      id: plan.id,
      channel: plan.channel,
      title: plan.title,
      durationSec: Math.round(runningSec),
      resolution: "1920x1080",
      fps,
      description: descriptionBase,
      tags: plan.tags,
      chapters: chaptersMeta,
    };
    await writeFile(jsonPath, JSON.stringify(metaJson, null, 2));
    console.log(`\n✅ [longform] TAMAM: ${mp4Path} (${fmtTimestamp(runningSec)}, 1920x1080)`);

    return {
      episodeId: plan.id,
      channel: plan.channel,
      mp4Path,
      jsonPath,
      title: plan.title,
      durationSec: Math.round(runningSec),
      chapters: chaptersMeta,
      descriptionBase,
      tags: plan.tags,
    };
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

const isDirectRun = process.argv[1]?.endsWith("render-longform.ts") || process.argv[1]?.endsWith("render-longform.js");
if (isDirectRun) {
  const ch = (parseArg("channel", "explainer") === "physics" ? "physics" : "explainer") as ChannelKind;
  const ep = Number(parseArg("episode", "1")) || 1;
  const fps = Number(parseArg("fps", "30")) || 30;
  const count = Number(parseArg("count", ch === "physics" ? "6" : "8")) || 8;
  renderLongformVideo({ channel: ch, episodeNumber: ep, fps, maxChapters: count }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
