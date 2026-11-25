import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  BODY_TRIGGERS,
  GRAVITY_ACTIVITIES,
  GRAVITY_BODIES,
  INSIDE_SUBJECTS,
  MYTHS,
  PERSPECTIVE_REVEALS,
  PHYSICS_DUELS,
  SCALE_CHAINS,
  VISUAL_PROOFS,
  WHAT_IFS,
  type Channel,
} from "./ideas/data.js";

/**
 * FİKİR FABRİKASI
 * Somut konu listelerini (src/ideas/data.ts) yalnızca UYUMLU video formatlarıyla birleştirip
 * binlerce benzersiz Shorts/Reels fikri üretir. Her fikir: başlık, 1.5 sn hook, görsel plan,
 * kapanış/loop cümlesi, A/B yorum sorusu ve öncelik puanı içerir.
 *
 * Çalıştır: npm run ideas   → ideas/IDEA_BANK.json + ideas/IDEA_BANK.csv + ideas/TOP_200.md
 */

export type Idea = {
  id: string;
  channel: Channel;
  series: string;
  format: string;
  title: string;
  hook: string;
  visual: string;
  ending: string;
  commentPrompt: string;
  score: number;
};

type Format<T> = {
  key: string;
  series: string;
  channel: Channel | ((item: T) => Channel);
  /** Bu format yalnızca anlamlı eşleşen konuları kabul eder (yoksa hepsi) */
  accepts?: (item: T) => boolean;
  /** Referans videolar ve pazar araştırmasına göre taban viral potansiyel (0-100) */
  base: number;
  title: (x: T) => string;
  hook: (x: T) => string;
  visual: (x: T) => string;
  ending: (x: T) => string;
  comment: (x: T) => string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SMALL_WORDS = new Set(["a", "an", "the", "of", "in", "on", "to", "for", "and", "or", "vs", "at", "by", "from", "with", "into", "as"]);
/** Başlık içi ifade için Title Case ("a crescent moon" → "a Crescent Moon"; ilk küçük kelime küçük kalır). */
const tc = (s: string) =>
  s
    .split(" ")
    .map((w) => {
      if (SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase();
      // Formül/birim içeren kelimelere dokunma (km/h, n(n+1)/2, √2 ...)
      if (!/^[A-Za-z][A-Za-z'’-]*[.,…]?$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
/** Başlığın en başında kullanılacak ifade (ilk harf her zaman büyük). */
const tcStart = (s: string) => cap(tc(s));
const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// ───────────────────────── FORMATLAR ─────────────────────────

const perspectiveFormats: Format<(typeof PERSPECTIVE_REVEALS)[number]>[] = [
  {
    key: "rotate-reveal",
    series: "Change Your Angle",
    channel: "explainer",
    base: 92,
    title: (x) => `It Looks Like ${tc(x.front)}… Until the Camera Turns`,
    hook: (x) => `This is ${x.front}. Right?`,
    visual: (x) => `Front orthographic view of ${x.front} → slow 90° camera orbit → depth axis + labels reveal: ${x.truth}.`,
    ending: (x) => `${cap(x.lesson)}. Rotate back → loop to the first frame.`,
    comment: () => "Did you see it before the camera turned? A) Yes  B) No way",
  },
  {
    key: "poetic-caption",
    series: "Perspective Poems",
    channel: "explainer",
    base: 88,
    title: (x) => `${tcStart(x.lesson)} #perspective`,
    hook: (x) => `${cap(x.lesson)}…`,
    visual: (x) => `Minimal dark space, single glowing object (${x.front}); text line fades in; camera rotates to show ${x.truth}.`,
    ending: (x) => `Question card: "Is it the object or your viewpoint?" → cut back to ${x.front}.`,
    comment: () => "Distance or viewpoint — what fooled you? A) Distance  B) Viewpoint",
  },
  {
    key: "guess-first",
    series: "Guess The Shape",
    channel: "explainer",
    base: 85,
    title: (x) => `99% Guess Wrong: Is This Really ${tc(x.front)}?`,
    hook: () => `Freeze. What shape is this?`,
    visual: (x) => `3-second countdown on ${x.front} with A/B guesses → orbit reveal: ${x.truth}.`,
    ending: (x) => `Answer + one-line why → camera returns to the frontal illusion (perfect loop).`,
    comment: () => "What was your first guess? A) Flat  B) 3D",
  },
  {
    key: "split-view",
    series: "Two Cameras, One Truth",
    channel: "explainer",
    base: 80,
    title: (x) => `Left Camera vs Right Camera: ${tc(x.front)}`,
    hook: () => `Same object. Two cameras. Which one lies?`,
    visual: (x) => `Split screen: left = front view (${x.front}), right = side view showing ${x.truth}; sync zoom.`,
    ending: (x) => `${cap(x.lesson)}.`,
    comment: () => "Which camera tells the truth? A) Left  B) Right",
  },
];

const scaleFormats: Format<(typeof SCALE_CHAINS)[number]>[] = [
  {
    key: "zoom-ladder",
    series: "Scale Ladder",
    channel: "explainer",
    base: 84,
    title: (x) => `From ${tc(x.from)} to ${tc(x.to)} in ${x.steps} Steps`,
    hook: (x) => `Start with ${x.from}. Now keep zooming.`,
    visual: (x) => `Continuous zoom with ${x.steps} labeled checkpoints, size bar and ×10 counter.`,
    ending: (x) => `Reach ${x.to} → snap back to ${x.from} (loop).`,
    comment: () => "Which step shocked you most? A) The first jump  B) The last jump",
  },
  {
    key: "side-by-side",
    series: "Size Shock",
    channel: "explainer",
    base: 78,
    title: (x) => `${tcStart(x.from)} vs ${tc(x.to)}: True Scale Comparison`,
    hook: (x) => `You've never seen ${x.to} at real scale.`,
    visual: (x) => `Both objects side by side; camera pulls back until ${x.from} is a single pixel.`,
    ending: () => `Pixel highlight circle → zoom back in.`,
    comment: () => "Bigger or smaller than you imagined? A) Bigger  B) Smaller",
  },
];

const insideFormats: Format<(typeof INSIDE_SUBJECTS)[number]>[] = [
  {
    key: "cutaway",
    series: "How It Actually Works",
    channel: "explainer",
    base: 82,
    title: (x) => `What's Really Inside ${tc(x.name)}?`,
    hook: (x) => `You've used ${x.name} your whole life. You've never seen this.`,
    visual: (x) => `Exterior → animated cross-section slice → x-ray layers; key moment: ${x.secret}.`,
    ending: () => `Reassemble the object → loop to closed exterior.`,
    comment: () => "Did you know this? A) Yes  B) Mind blown",
  },
  {
    key: "secret-fact",
    series: "Hidden Engineering",
    channel: "explainer",
    base: 86,
    title: (x) => `The Hidden Trick Inside ${tc(x.name)}`,
    hook: (x) => `${cap(x.name)} hides a secret.`,
    visual: (x) => `Macro zoom-in, freeze frame, glowing callout: "${x.secret}".`,
    ending: (x) => `Recap in 1 line → back to normal view of ${x.name}.`,
    comment: () => "Should we break down something else next? A) Machine  B) Animal",
  },
  {
    key: "slowmo",
    series: "1000x Slow Motion",
    accepts: (x) => x.domain === "machine" || x.domain === "nature" || /punch|snap|dive|tongue|righting|sneeze|hiccup|heart valves|vocal/.test(x.name + x.secret),
    channel: (x) => (x.domain === "machine" || x.domain === "nature" ? "physics" : "explainer"),
    base: 79,
    title: (x) => `${tcStart(x.name)} at 1000x Slow Motion`,
    hook: () => `Real speed… now 1000x slower.`,
    visual: (x) => `Real-time clip (1 s) → time-stretch simulation with frame counter; reveal: ${x.secret}.`,
    ending: () => `Speed ramps back to real-time → loop.`,
    comment: () => "Want more slow-mo? A) Yes  B) Even slower!",
  },
  {
    key: "build-from-zero",
    series: "Build It From Zero",
    accepts: (x) => x.domain === "machine",
    channel: "explainer",
    base: 74,
    title: (x) => `Building ${tc(x.name)} Piece by Piece`,
    hook: () => `Part 1 of ... how many?`,
    visual: (x) => `Exploded view assembling one part per beat; final part reveals ${x.secret}.`,
    ending: () => `Full object spins → explode again (loop).`,
    comment: () => "Guess the number of parts! A) Under 10  B) Over 10",
  },
  {
    key: "fail-mode",
    series: "What If It Failed?",
    accepts: (x) => x.domain === "machine",
    channel: "explainer",
    base: 76,
    title: (x) => `What Happens When ${tc(x.name)} Fails?`,
    hook: (x) => `Remove one part of ${x.name}. Watch.`,
    visual: (x) => `Working model → key part removed → failure animation → explanation: ${x.secret}.`,
    ending: () => `Part snaps back in → working again (loop).`,
    comment: () => "Would you have guessed that part? A) Yes  B) No",
  },
];

const duelFormats: Format<(typeof PHYSICS_DUELS)[number]>[] = [
  {
    key: "arena-duel",
    series: "Physics Arena",
    channel: "physics",
    base: 87,
    title: (x) => `${tcStart(x.a)} vs ${tc(x.b)} in ${tc(x.arena)}`,
    hook: (x) => `${cap(x.a)} or ${x.b}? Pick now.`,
    visual: (x) => `Deterministic sim in ${x.arena}; live score HUD, color-coded teams, sub-bass impact hits.`,
    ending: () => `Winner freeze → instant reset to start state (seamless loop).`,
    comment: (x) => `Who wins? A) ${cap(x.a)}  B) ${cap(x.b)}`,
  },
  {
    key: "triple-split",
    series: "3-Way Split",
    channel: "physics",
    base: 84,
    title: (x) => `3 Setups, 1 Winner: ${tc(x.arena)}`,
    hook: () => `Left, middle or right?`,
    visual: (x) => `Three columns run ${x.arena} with ${x.a}, ${x.b} and a mystery third variant.`,
    ending: () => `Winner column glows → rewind all three.`,
    comment: () => "Which column? A) Left  B) Right",
  },
  {
    key: "escalation",
    series: "Level Up Until It Breaks",
    channel: "physics",
    base: 80,
    title: (x) => `${tcStart(x.arena)}: Level 1 → Level 10`,
    hook: () => `Level 1 is easy. Level 10 is chaos.`,
    visual: (x) => `${x.a} vs ${x.b} with parameters doubling each level; level counter, rising pitch.`,
    ending: () => `Level 10 explodes → cut to calm Level 1 (loop).`,
    comment: () => "At which level did you call it? A) Before 5  B) After 5",
  },
];

const whatIfFormats: Format<string>[] = [
  {
    key: "what-if-sim",
    series: "What If?",
    channel: "explainer",
    base: 85,
    title: (x) => `What If ${tc(x)}?`,
    hook: (x) => `What if ${x}? Let's simulate it.`,
    visual: (x) => `Calm Earth/scene → timeline counter → simulated consequences for "${x}" in 3 escalating beats.`,
    ending: () => `Rewind effect back to normal → loop.`,
    comment: () => "Would humanity survive? A) Yes  B) No",
  },
  {
    key: "what-if-seconds",
    series: "Second by Second",
    channel: "explainer",
    base: 78,
    title: (x) => `${tcStart(x)}: Second by Second`,
    hook: () => `0 seconds. Everything is normal.`,
    visual: (x) => `Big timestamp HUD (0 s, 1 s, 1 min, 1 day…) each with a visual consequence of "${x}".`,
    ending: () => `Timestamp wraps to 0 s → loop.`,
    comment: () => "Which second was the scariest? A) The first  B) The last",
  },
];

const bodyFormats: Format<string>[] = [
  {
    key: "body-inside",
    series: "Inside Your Body",
    channel: "explainer",
    base: 88,
    title: (x) => `What Happens Inside Your Body When ${tc(x)}`,
    hook: (x) => `This is what happens the moment ${x}.`,
    visual: (x) => `Stylized 3D body x-ray; camera dives into the relevant organ; animated cells react to "${x}".`,
    ending: () => `Camera exits back to the full body silhouette → loop.`,
    comment: () => "Did you feel this today? A) Yes  B) Not yet",
  },
  {
    key: "body-timeline",
    series: "Body Timeline",
    channel: "explainer",
    base: 80,
    title: (x) => `${tcStart(x)}: Your Body After 1 Min, 1 Hour, 1 Day`,
    hook: () => `Watch the clock — your body is changing.`,
    visual: (x) => `Clock HUD + organ icons lighting up in sequence for "${x}".`,
    ending: () => `Clock resets → loop.`,
    comment: () => "Which stage surprised you? A) 1 minute  B) 1 day",
  },
  {
    key: "body-myth",
    series: "Body Myth or Fact",
    channel: "explainer",
    base: 74,
    title: (x) => `Is It Bad When ${tc(x)}? Myth or Fact`,
    hook: () => `Your mom was wrong about this. Maybe.`,
    visual: (x) => `MYTH / FACT stamp game, microscope zoom on the real mechanism behind "${x}".`,
    ending: () => `Verdict stamp → rewind to question.`,
    comment: () => "Myth or fact? A) Myth  B) Fact",
  },
];

const proofFormats: Format<string>[] = [
  {
    key: "visual-proof",
    series: "Proof Without Words",
    channel: "explainer",
    base: 83,
    title: (x) => `${tcStart(x)} — Explained Without Words`,
    hook: () => `No formulas. Just watch.`,
    visual: (x) => `Silent geometric animation proving "${x}"; shapes slide, rotate and snap together.`,
    ending: () => `Final equation appears for 1 s → shapes reset (loop).`,
    comment: () => "Did it click? A) Instantly  B) Watch again",
  },
  {
    key: "proof-3d",
    series: "Math in 3D",
    channel: "explainer",
    base: 81,
    title: (x) => `See in 3D: ${tc(x)}`,
    hook: () => `Your teacher never showed you this angle.`,
    visual: (x) => `3D objects + rotating camera (perspective-reveal style) to show "${x}".`,
    ending: () => `Camera returns to the flat 2D textbook view → loop.`,
    comment: () => "Should schools teach it like this? A) Yes  B) Obviously",
  },
  {
    key: "proof-sim",
    series: "Math Simulation",
    accepts: (x) => /monty|birthday|bell curve|random walk|benford|primes|compound|harmonic|π is|folding/i.test(x),
    channel: "physics",
    base: 75,
    title: (x) => `I Ran It 10,000 Times: ${tcStart(x)}`,
    hook: () => `10,000 trials. Let's check.`,
    visual: (x) => `Fast Monte-Carlo / particle sim converging on the result of "${x}"; live counter.`,
    ending: () => `Counter resets → loop.`,
    comment: () => "Did you believe it before? A) Yes  B) No",
  },
];

const mythFormats: Format<(typeof MYTHS)[number]>[] = [
  {
    key: "myth-test",
    series: "Physics Myth Test",
    accepts: (x) =>
      /fall|lightning|gravity|glass|toast|penny|coin|drains|airplanes|microwave|summer|seasons|heat|moon|diamonds|everest/i.test(x.myth),
    channel: "physics",
    base: 82,
    title: (x) => `Myth: ${tc(x.myth)}. Let's Test It`,
    hook: (x) => `Everyone believes ${x.myth}.`,
    visual: (x) => `Simulation/experiment testing the claim; result HUD: ${x.truth}.`,
    ending: () => `BUSTED stamp → rewind to the claim.`,
    comment: () => "Did you believe it? A) Yes  B) Never",
  },
  {
    key: "myth-explainer",
    series: "You Were Taught Wrong",
    channel: "explainer",
    base: 79,
    title: (x) => `You Were Taught Wrong: ${tc(x.myth)}`,
    hook: () => `School got this wrong.`,
    visual: (x) => `Textbook page tears away → animated real mechanism: ${x.truth}.`,
    ending: () => `Page reassembles → loop.`,
    comment: () => "Which myth next? A) Space  B) Body",
  },
];

type GravityPair = { a: (typeof GRAVITY_BODIES)[number]; b: (typeof GRAVITY_BODIES)[number]; act: string };

const gravityFormats: Format<GravityPair>[] = [
  {
    key: "gravity-vs",
    series: "Gravity Showdown",
    channel: "physics",
    base: 86,
    title: (x) => `${tcStart(x.act)} on ${tc(x.a.name)} vs ${tc(x.b.name)}`,
    hook: (x) => `Same ${x.act.replace(/^an? /, "")}. ${cap(x.a.name)} or ${x.b.name}?`,
    visual: (x) =>
      `Split screen, identical start; left g=${x.a.g} m/s², right g=${x.b.g} m/s²; live height/time HUD, planet backdrop.`,
    ending: () => `Both land → instant reset to the start frame (loop, rewatch to compare).`,
    comment: (x) => `Which looks more fun? A) ${cap(x.a.name)}  B) ${cap(x.b.name)}`,
  },
];

// ───────────────────────── ÜRETİM ─────────────────────────

function expand<T>(items: T[], formats: Format<T>[], keyOf: (x: T) => string): Idea[] {
  const out: Idea[] = [];
  for (const item of items) {
    for (const f of formats) {
      if (f.accepts && !f.accepts(item)) continue;
      const channel = typeof f.channel === "function" ? f.channel(item) : f.channel;
      out.push({
        id: `${f.key}-${slug(keyOf(item))}`,
        channel,
        series: f.series,
        format: f.key,
        title: f.title(item),
        hook: f.hook(item),
        visual: f.visual(item),
        ending: f.ending(item),
        commentPrompt: f.comment(item),
        score: f.base,
      });
    }
  }
  return out;
}

/** Başlık uzunluğu, sayı ve soru gibi kanıtlanmış sinyallerle taban puanı ince ayarlar. */
function refineScore(idea: Idea): number {
  let s = idea.score;
  if (idea.title.length <= 60) s += 3;
  else if (idea.title.length > 85) s -= 4;
  if (/\d/.test(idea.title)) s += 2;
  if (/\?$/.test(idea.title)) s += 2;
  if (/black hole|sun|moon|earth|brain|heart|gravity|light/i.test(idea.title)) s += 2;
  return Math.max(0, Math.min(100, s));
}

/** Her aktivite için tüm gezegen ikilileri (neutron star yalnızca absürt-komik kontrast için Earth ile eşleşir). */
function buildGravityPairs(): GravityPair[] {
  const pairs: GravityPair[] = [];
  const normal = GRAVITY_BODIES.filter((b) => b.name !== "a neutron star");
  const earth = GRAVITY_BODIES.find((b) => b.name === "Earth")!;
  const neutron = GRAVITY_BODIES.find((b) => b.name === "a neutron star")!;
  for (const act of GRAVITY_ACTIVITIES) {
    for (let i = 0; i < normal.length; i++) {
      for (let j = i + 1; j < normal.length; j++) pairs.push({ a: normal[i], b: normal[j], act });
    }
    pairs.push({ a: earth, b: neutron, act });
  }
  return pairs;
}

export function generateIdeas(): Idea[] {
  const all = [
    ...expand(PERSPECTIVE_REVEALS, perspectiveFormats, (x) => x.front),
    ...expand(SCALE_CHAINS, scaleFormats, (x) => `${x.from}-${x.to}`),
    ...expand(INSIDE_SUBJECTS, insideFormats, (x) => x.name),
    ...expand(PHYSICS_DUELS, duelFormats, (x) => `${x.a}-${x.b}-${x.arena}`),
    ...expand(WHAT_IFS, whatIfFormats, (x) => x),
    ...expand(BODY_TRIGGERS, bodyFormats, (x) => x),
    ...expand(VISUAL_PROOFS, proofFormats, (x) => x),
    ...expand(MYTHS, mythFormats, (x) => x.myth),
    ...expand(buildGravityPairs(), gravityFormats, (x) => `${x.act}-${x.a.name}-${x.b.name}`),
  ];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: Idea[] = [];
  for (const idea of all) {
    const t = idea.title.toLowerCase();
    if (seenIds.has(idea.id) || seenTitles.has(t)) continue;
    seenIds.add(idea.id);
    seenTitles.add(t);
    unique.push({ ...idea, score: refineScore(idea) });
  }
  return unique.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

async function main() {
  const ideas = generateIdeas();
  const outDir = resolve("ideas");
  await mkdir(outDir, { recursive: true });

  await writeFile(resolve(outDir, "IDEA_BANK.json"), `${JSON.stringify(ideas, null, 2)}\n`);

  const header = ["id", "channel", "series", "format", "score", "title", "hook", "visual", "ending", "commentPrompt"];
  const rows = ideas.map((i) =>
    [i.id, i.channel, i.series, i.format, i.score, i.title, i.hook, i.visual, i.ending, i.commentPrompt].map(csvCell).join(","),
  );
  await writeFile(resolve(outDir, "IDEA_BANK.csv"), `${header.join(",")}\n${rows.join("\n")}\n`);

  // Her seriden dengeli seçilmiş en iyi 200 (tek seri listeyi domine etmesin)
  const perSeries = new Map<string, number>();
  const top: Idea[] = [];
  for (const i of ideas) {
    const n = perSeries.get(i.series) ?? 0;
    if (n >= 14) continue;
    perSeries.set(i.series, n + 1);
    top.push(i);
    if (top.length >= 200) break;
  }
  const bySeries = new Map<string, number>();
  for (const i of ideas) bySeries.set(i.series, (bySeries.get(i.series) ?? 0) + 1);

  const md = [
    "# En İyi 200 Fikir (otomatik sıralı)",
    "",
    `Toplam fikir: **${ideas.length}** · Kinetic Lab: **${ideas.filter((i) => i.channel === "physics").length}** · Clear Mechanics: **${ideas.filter((i) => i.channel === "explainer").length}**`,
    "",
    "| Seri | Fikir sayısı |",
    "|---|---|",
    ...[...bySeries.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `| ${s} | ${n} |`),
    "",
    "| # | Puan | Kanal | Seri | Başlık | Hook (ilk 1.5 sn) |",
    "|---|---|---|---|---|---|",
    ...top.map(
      (i, idx) =>
        `| ${idx + 1} | ${i.score} | ${i.channel === "physics" ? "Kinetic Lab" : "Clear Mechanics"} | ${i.series} | ${i.title.replace(/\|/g, "/")} | ${i.hook.replace(/\|/g, "/")} |`,
    ),
    "",
    "Tam liste (görsel plan, kapanış, yorum sorusu dahil): `ideas/IDEA_BANK.csv` / `ideas/IDEA_BANK.json`",
    "",
  ].join("\n");
  await writeFile(resolve(outDir, "TOP_200.md"), md);

  console.log(`✅ [idea-factory] ${ideas.length} benzersiz fikir üretildi → ideas/IDEA_BANK.{json,csv}, ideas/TOP_200.md`);
  for (const [s, n] of [...bySeries.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${s.padEnd(26)} ${n}`);
}

const isDirectRun = process.argv[1]?.endsWith("idea-factory.ts") || process.argv[1]?.endsWith("idea-factory.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[idea-factory] HATA:", e);
    process.exit(1);
  });
}
