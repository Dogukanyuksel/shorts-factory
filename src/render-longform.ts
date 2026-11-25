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
  const padAfter = mode === "intro" ? 2.25 : 2.1;
  const minDur = mode === "intro" ? 6.4 : 8.0;
  const dur = Math.max(minDur, padBefore + pcm.length / SAMPLE_RATE + padAfter);
  const totalSamples = Math.ceil(dur * SAMPLE_RATE);
  const stereo = new Int16Array(totalSamples * 2);

  // Gerçek kanal logo + banner görsellerini base64 olarak yükle (assets/branding/)
  const brandSlug = plan.channel === "physics" ? "kinetic-lab" : "clear-mechanics";
  const logoFile = resolve("assets", "branding", `${brandSlug}-logo-800x800.jpg`);
  const bannerFile = resolve("assets", "branding", `${brandSlug}-banner-2560x1440.jpg`);
  const logoDataUri = existsSync(logoFile)
    ? `data:image/jpeg;base64,${(await readFile(logoFile)).toString("base64")}`
    : "";
  const bannerDataUri = existsSync(bannerFile)
    ? `data:image/jpeg;base64,${(await readFile(bannerFile)).toString("base64")}`
    : "";

  // Arka plan sinematik synth + parçalanıp birleşme kilitlenme darbesi (tam lock anında!)
  const stingStartSec = dur - 2.45;
  const lockSec = stingStartSec + 1.02;
  const padStart = Math.floor(padBefore * SAMPLE_RATE);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const v = i >= padStart && i - padStart < pcm.length ? pcm[i - padStart] / 32768 : 0;
    let music = 0;
    if (mode === "intro") {
      // Cold-open alt nabız
      music += Math.sin(2 * Math.PI * (52 + t * 9) * t) * 0.065 * Math.exp(-t * 0.25);
      // Parçalar toplanırken yükselen whoosh (stingStart -> lockSec)
      if (t >= stingStartSec && t < lockSec) {
        const p = (t - stingStartSec) / Math.max(0.01, lockSec - stingStartSec);
        const freq = 90 + p * p * 520;
        music += Math.sin(2 * Math.PI * freq * t) * p * 0.16;
      }
      // Tam birleşme (lock) anında sinematik sub-bass + parlak akor darbesi!
      const lt = t - lockSec;
      if (lt >= 0 && lt < 1.6) {
        const subEnv = Math.exp(-lt * 4.5);
        const sub = Math.sin(2 * Math.PI * (110 * Math.exp(-lt * 5) + 42) * lt) * subEnv * 0.42;
        const chordEnv = Math.exp(-lt * 2.2) * Math.min(1, lt * 40);
        const chord = (Math.sin(2 * Math.PI * 220 * lt) * 0.36 + Math.sin(2 * Math.PI * 329.63 * lt) * 0.32 + Math.sin(2 * Math.PI * 440 * lt) * 0.28 + Math.sin(2 * Math.PI * 659.25 * lt) * 0.18) * chordEnv * 0.3;
        music += sub + chord;
      }
    } else {
      // Outro: sıcak modern belgesel akoru + hafif ritmik nabız
      const fade = Math.min(1, t * 2) * Math.min(1, (dur - t) * 1.5);
      const pulse = 0.85 + 0.15 * Math.sin(2 * Math.PI * 2 * t);
      music += (Math.sin(2 * Math.PI * 196 * t) * 0.34 + Math.sin(2 * Math.PI * 246.94 * t) * 0.28 + Math.sin(2 * Math.PI * 293.66 * t) * 0.24 + Math.sin(2 * Math.PI * 392 * t) * 0.14) * 0.13 * fade * pulse;
    }
    const sample = Math.round(Math.tanh(v * 0.94 + music) * 32000);
    stereo[i * 2] = sample;
    stereo[i * 2 + 1] = sample;
  }
  applyIntroSubBass(stereo, SAMPLE_RATE, mode === "intro" ? 0.4 : 0.22);

  const pcmPath = join(tmpDir, `${mode}.pcm`);
  await writeFile(pcmPath, Buffer.from(stereo.buffer, stereo.byteOffset, stereo.byteLength));

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const html = `<!doctype html><html><body style="margin:0;background:#040812"><canvas id="card" width="1280" height="720"></canvas>
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
      stingStartSec,
      lockSec,
      isPhysics: plan.channel === "physics",
      logoDataUri,
      bannerDataUri,
    })};

    let logoImg = null, bannerImg = null;
    window.__brandAssetsReady = false;
    function loadImg(src) {
      return new Promise((ok) => {
        if (!src) return ok(null);
        const im = new Image();
        im.onload = () => ok(im);
        im.onerror = () => ok(null);
        im.src = src;
      });
    }
    Promise.all([loadImg(cfg.logoDataUri), loadImg(cfg.bannerDataUri)]).then(([l, b]) => {
      logoImg = l; bannerImg = b;
      window.__brandAssetsReady = true;
    });

    // Deterministik 144 parçalık (12x12) logo kırılma & manyetik birleşme tablosu
    const GRID = 12;
    const shards = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const idx = r * GRID + c;
        const hash = Math.sin(idx * 12.9898 + 78.233) * 43758.5453;
        const rnd = hash - Math.floor(hash);
        const ang = (idx / (GRID * GRID)) * Math.PI * 6 + rnd * 2.2;
        const dist = 240 + rnd * 520;
        shards.push({
          r, c,
          sx0: Math.cos(ang) * dist,
          sy0: Math.sin(ang) * dist * 0.72,
          rot0: (rnd - 0.5) * Math.PI * 5,
          delay: (1 - Math.hypot(c - 5.5, r - 5.5) / 8.5) * 0.22 + rnd * 0.12,
        });
      }
    }

    // 60 adet parlayan arka plan enerji parçacığı
    const sparks = Array.from({ length: 60 }, (_, i) => {
      const s1 = Math.abs(Math.sin(i * 91.7));
      const s2 = Math.abs(Math.cos(i * 47.3));
      return { x: s1 * W, y: s2 * H, vx: (s1 - 0.5) * 48, vy: -18 - s2 * 45, r: 1.4 + (i % 4) * 0.8, ph: i * 0.7 };
    });

    function drawCinemaBackdrop(t) {
      g.fillStyle = "#040812";
      g.fillRect(0, 0, W, H);

      // Gerçek kanal banner'ı sinematik Ken Burns hareketiyle arka planda akar
      if (bannerImg) {
        const zoom = 1.04 + 0.06 * (t / Math.max(1, cfg.dur));
        const dx = Math.sin(t * 0.45) * 26;
        g.save();
        g.globalAlpha = 0.28;
        g.translate(W * 0.5 + dx, H * 0.5);
        g.scale(zoom, zoom);
        g.drawImage(bannerImg, -W * 0.5, -H * 0.5, W, H);
        g.restore();
      }

      // Derin radyal karartma (yazılar ve logo jilet gibi öne çıksın)
      const vig = g.createRadialGradient(W * 0.5, H * 0.46, 80, W * 0.5, H * 0.5, 860);
      vig.addColorStop(0, cfg.isPhysics ? "rgba(22,10,40,0.45)" : "rgba(8,22,48,0.45)");
      vig.addColorStop(1, "rgba(3,7,18,0.92)");
      g.fillStyle = vig;
      g.fillRect(0, 0, W, H);

      // 3D perspektif zemin ızgarası (alt bölümde akan dinamik derinlik)
      g.save();
      g.strokeStyle = cfg.isPhysics ? "rgba(244,114,182,0.12)" : "rgba(56,189,248,0.12)";
      g.lineWidth = 1;
      const horizonY = H * 0.62;
      for (let i = -10; i <= 10; i++) {
        g.beginPath();
        g.moveTo(W * 0.5 + i * 38, horizonY);
        g.lineTo(W * 0.5 + i * 210, H);
        g.stroke();
      }
      for (let j = 0; j < 7; j++) {
        const p = ((j / 7) + (t * 0.45)) % 1;
        const yy = horizonY + p * p * (H - horizonY);
        g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke();
      }
      g.restore();

      // Yüzen neon enerji kıvılcımları
      for (const sp of sparks) {
        const x = ((sp.x + sp.vx * t) % W + W) % W;
        const y = ((sp.y + sp.vy * t) % H + H) % H;
        const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 3 + sp.ph));
        g.fillStyle = cfg.isPhysics ? "rgba(244,114,182," + a.toFixed(2) + ")" : "rgba(56,189,248," + a.toFixed(2) + ")";
        g.beginPath(); g.arc(x, y, sp.r, 0, Math.PI * 2); g.fill();
      }
    }

    function drawRealLogoCircle(cx, cy, radius, spinRad, sheenProg) {
      g.save();
      g.translate(cx, cy);

      // Dış hologram çift dönen halkalar
      g.save();
      g.rotate(spinRad * 1.6);
      g.strokeStyle = cfg.accent;
      g.lineWidth = 3.5;
      g.setLineDash([28, 14, 8, 14]);
      g.beginPath(); g.arc(0, 0, radius + 16, 0, Math.PI * 2); g.stroke();
      g.restore();

      g.save();
      g.rotate(-spinRad * 1.1);
      g.strokeStyle = "rgba(255,255,255,0.45)";
      g.lineWidth = 2;
      g.setLineDash([10, 18]);
      g.beginPath(); g.arc(0, 0, radius + 28, 0, Math.PI * 2); g.stroke();
      // Yörüngede dönen 2 enerji küresi
      g.fillStyle = "#facc15";
      g.beginPath(); g.arc(radius + 28, 0, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = cfg.accent;
      g.beginPath(); g.arc(-(radius + 28), 0, 5, 0, Math.PI * 2); g.fill();
      g.restore();

      // Gerçek yüksek çözünürlüklü logo (dairesel maskeli + yumuşak dönüş)
      g.save();
      g.beginPath(); g.arc(0, 0, radius, 0, Math.PI * 2); g.clip();
      g.rotate(cfg.isPhysics ? Math.sin(spinRad * 1.5) * 0.08 : spinRad * 0.35);
      if (logoImg) {
        g.drawImage(logoImg, -radius, -radius, radius * 2, radius * 2);
      } else {
        g.fillStyle = "#0f172a"; g.fillRect(-radius, -radius, radius * 2, radius * 2);
      }
      // Çapraz parlak ışık geçişi (light sweep sheen)
      if (sheenProg >= 0 && sheenProg <= 1) {
        const sx = -radius * 2.2 + sheenProg * radius * 4.4;
        const sheen = g.createLinearGradient(sx - 45, -radius, sx + 45, radius);
        sheen.addColorStop(0, "rgba(255,255,255,0)");
        sheen.addColorStop(0.5, "rgba(255,255,255,0.48)");
        sheen.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = sheen;
        g.fillRect(-radius, -radius, radius * 2, radius * 2);
      }
      g.restore();

      // Parlak dış çerçeve
      g.strokeStyle = cfg.accent;
      g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, radius, 0, Math.PI * 2); g.stroke();
      g.restore();
    }

    function drawShatterLogoAssembly(cx, cy, radius, prog) {
      // prog: 0 -> 1 (144 gerçek logo parçası havadan dönerek manyetik olarak birleşir!)
      const size = radius * 2;
      const cell = size / GRID;
      for (const sh of shards) {
        const localP = Math.max(0, Math.min(1, (prog - sh.delay) / Math.max(0.15, 1 - sh.delay)));
        const ease = 1 - Math.pow(1 - localP, 3);
        const inv = 1 - ease;
        const tx = cx - radius + sh.c * cell + cell * 0.5;
        const ty = cy - radius + sh.r * cell + cell * 0.5;
        // Daire dışındaki köşe parçalarını atla ki dairesel logo jilet gibi birleşsin
        if (Math.hypot(tx - cx, ty - cy) > radius + cell * 0.35) continue;

        const curX = tx + sh.sx0 * inv;
        const curY = ty + sh.sy0 * inv;
        const curRot = sh.rot0 * inv;
        const curScale = 0.35 + 0.65 * ease;

        // Uçuş izi (enerji çizgisi)
        if (inv > 0.06) {
          g.strokeStyle = cfg.isPhysics ? "rgba(244,114,182," + (inv * 0.45).toFixed(2) + ")" : "rgba(56,189,248," + (inv * 0.45).toFixed(2) + ")";
          g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(curX, curY); g.lineTo(curX + sh.sx0 * 0.08 * inv, curY + sh.sy0 * 0.08 * inv); g.stroke();
        }

        g.save();
        g.translate(curX, curY);
        g.rotate(curRot);
        g.scale(curScale, curScale);
        g.globalAlpha = Math.min(1, localP * 1.8);
        if (logoImg) {
          const sw = logoImg.width / GRID, shH = logoImg.height / GRID;
          g.drawImage(logoImg, sh.c * sw, sh.r * shH, sw, shH, -cell * 0.52, -cell * 0.52, cell * 1.04, cell * 1.04);
        }
        g.restore();
      }
    }

    window.renderFrame = (f) => {
      const t = f / cfg.fps;
      drawCinemaBackdrop(t);

      if (cfg.mode === "intro") {
        if (t < cfg.stingStartSec) {
          // COLD-OPEN TEASER: Gerçek mini logo + heyecan verici kanca + kayan bölüm önizlemesi
          const pulse = 0.85 + 0.15 * Math.sin(t * 10);
          g.fillStyle = "rgba(250,204,21,0.16)";
          g.strokeStyle = "#facc15";
          g.lineWidth = 2;
          g.beginPath(); g.roundRect(W * 0.5 - 230, 88, 460, 44, 22); g.fill(); g.stroke();
          g.fillStyle = "#fde047";
          g.font = "900 18px monospace";
          g.textAlign = "center";
          g.fillText("⚡  COLD OPEN  •  DON'T BLINK", W * 0.5, 116);

          g.fillStyle = "#ffffff";
          g.font = "900 50px -apple-system, sans-serif";
          g.fillText(cfg.teaser, W * 0.5, 225, 1140);

          const visible = Math.min(cfg.chapters.length, Math.floor((t / Math.max(0.5, cfg.stingStartSec - 0.3)) * cfg.chapters.length) + 2);
          for (let i = 0; i < Math.min(6, cfg.chapters.length); i++) {
            const col = i % 2, row = Math.floor(i / 2);
            const bx = 210 + col * 440, by = 295 + row * 72;
            const active = i < visible;
            g.fillStyle = active ? "rgba(15,23,42,0.82)" : "rgba(15,23,42,0.45)";
            g.strokeStyle = active ? cfg.accent : "rgba(148,163,184,0.2)";
            g.lineWidth = 2;
            g.beginPath(); g.roundRect(bx, by, 410, 54, 12); g.fill(); g.stroke();
            g.fillStyle = active ? "#ffffff" : "#64748b";
            g.font = "700 18px -apple-system, sans-serif";
            g.textAlign = "left";
            g.fillText(String(i + 1).padStart(2, "0") + ". " + cfg.chapters[i], bx + 18, by + 33, 374);
          }

          const p = Math.min(1, t / cfg.stingStartSec);
          g.fillStyle = "rgba(148,163,184,0.2)";
          g.beginPath(); g.roundRect(240, 595, 800, 10, 5); g.fill();
          g.fillStyle = cfg.accent;
          g.globalAlpha = pulse;
          g.beginPath(); g.roundRect(240, 595, 800 * p, 10, 5); g.fill();
          g.globalAlpha = 1;
        } else {
          // PARÇALANIP BİRLEŞEN + DÖNEN GERÇEK LOGO STING (2.45 sn)
          const st = t - cfg.stingStartSec;
          const lockDur = cfg.lockSec - cfg.stingStartSec;
          const logoCx = W * 0.5, logoCy = 265, logoR = 132;

          if (st < lockDur) {
            const prog = st / lockDur;
            drawShatterLogoAssembly(logoCx, logoCy, logoR, prog);
          } else {
            const post = st - lockDur;
            // Kilitlenme şok dalgası (expanding neon shockwave rings)
            if (post < 0.85) {
              const rp = post / 0.85;
              g.strokeStyle = cfg.accent;
              g.globalAlpha = (1 - rp) * 0.85;
              g.lineWidth = 6 * (1 - rp) + 1;
              g.beginPath(); g.arc(logoCx, logoCy, logoR + rp * 340, 0, Math.PI * 2); g.stroke();
              g.strokeStyle = "#ffffff";
              g.globalAlpha = (1 - rp) * 0.55;
              g.lineWidth = 3 * (1 - rp);
              g.beginPath(); g.arc(logoCx, logoCy, logoR + rp * 220, 0, Math.PI * 2); g.stroke();
              g.globalAlpha = 1;
            }

            // Birleşmiş gerçek dönen logo + çapraz ışık geçişi
            drawRealLogoCircle(logoCx, logoCy, logoR, post * 1.4, (post - 0.1) / 0.75);

            // Kanal adı + neon alt çizgi
            const titleAlpha = Math.min(1, post * 4.5);
            g.save();
            g.globalAlpha = titleAlpha;
            g.textAlign = "center";
            g.shadowColor = cfg.accent;
            g.shadowBlur = 22;
            g.fillStyle = "#ffffff";
            g.font = "900 72px -apple-system, sans-serif";
            g.fillText(cfg.brand, W * 0.5, 502);
            g.shadowBlur = 0;

            const barW = Math.min(520, post * 950);
            g.fillStyle = cfg.accent;
            g.fillRect(W * 0.5 - barW * 0.5, 522, barW, 4);

            g.fillStyle = cfg.isPhysics ? "#fbcfe8" : "#7dd3fc";
            g.font = "800 22px monospace";
            g.fillText(cfg.tagline, W * 0.5, 566);
            g.restore();
          }
        }
      } else {
        // 8 SN YOUTUBE END-SCREEN OUTRO (Gerçek Dönen Logo + Sonar Subscribe + Holografik Watch Next)
        g.textAlign = "center";
        g.fillStyle = "#facc15";
        g.font = "900 22px monospace";
        g.fillText("THANKS FOR WATCHING  •  " + cfg.brand, W * 0.5, 78);

        // Sol: Sonar halkalı + gerçek logolu SUBSCRIBE dairesi
        const subX = 330, subY = 340;
        const wave = (t * 0.8) % 1;
        g.strokeStyle = "rgba(239,68,68," + ((1 - wave) * 0.7).toFixed(2) + ")";
        g.lineWidth = 3;
        g.beginPath(); g.arc(subX, subY, 128 + wave * 65, 0, Math.PI * 2); g.stroke();

        const pulse = 1 + 0.03 * Math.sin(t * 6);
        g.save();
        g.translate(subX, subY);
        g.scale(pulse, pulse);
        drawRealLogoCircle(0, 0, 108, t * 0.9, ((t * 0.5) % 2) - 0.5);
        g.restore();

        // Kırmızı CTA hapı
        g.fillStyle = "#ef4444";
        g.shadowColor = "rgba(239,68,68,0.65)";
        g.shadowBlur = 18;
        g.beginPath(); g.roundRect(185, 505, 290, 56, 28); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "#ffffff";
        g.font = "900 22px -apple-system, sans-serif";
        g.fillText("🔔  SUBSCRIBE NOW", 330, 541);

        // Sağ: Holografik YouTube End-Screen Watch Next 16:9 Çerçevesi
        g.fillStyle = "rgba(8,15,32,0.82)";
        g.strokeStyle = cfg.accent;
        g.lineWidth = 3.5;
        g.beginPath(); g.roundRect(620, 195, 540, 304, 20); g.fill(); g.stroke();
        g.fillStyle = cfg.accent;
        g.font = "900 24px monospace";
        g.fillText("▶  WATCH NEXT DEEP DIVE", 890, 340);
        g.fillStyle = "#cbd5e1";
        g.font = "600 18px -apple-system, sans-serif";
        g.fillText("New 16:9 episode every single day", 890, 382);
      }

      return cv.toDataURL("image/jpeg", 0.92).slice(23);
    };
  </script></body></html>`;

  await page.setContent(html);
  await page.waitForFunction(() => (globalThis as unknown as { __brandAssetsReady?: boolean }).__brandAssetsReady === true);
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
