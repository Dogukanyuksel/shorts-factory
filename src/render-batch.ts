import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const HOW_IT_WORKS_EPISODES = [
  "airplane-wing",
  "noise-canceling",
  "car-differential",
  "touchscreen",
  "submarine",
  "qr-code",
  "mechanical-watch",
  "wifi-walls",
  "bulletproof-vest",
];

const PHYSICS_VARIATIONS = [
  { seed: 2, seconds: 15, hook: "WAIT FOR THE FINAL RING..." },
  { seed: 3, seconds: 16, hook: "99% THINK IT GETS TRAPPED" },
  { seed: 4, seconds: 15, hook: "IT GETS FASTER EVERY BOUNCE" },
  { seed: 5, seconds: 16, hook: "CAN IT BREAK ALL 7 RINGS?" },
  { seed: 6, seconds: 15, hook: "LISTEN TO THIS SATISFYING BEAT" },
  { seed: 7, seconds: 16, hook: "ONLY 1% WATCH TO THE END" },
  { seed: 8, seconds: 15, hook: "SPEED BOOST ON EVERY HIT" },
  { seed: 9, seconds: 16, hook: "WATCH RING 5 SHATTER..." },
  { seed: 10, seconds: 15, hook: "IMPOSSIBLE GRAVITY ESCAPE" },
  { seed: 11, seconds: 16, hook: "ODDLY SATISFYING PHYSICS" },
];

function runTsx(args: string[]): Promise<void> {
  return new Promise((ok, no) => {
    const p = spawn("npx", ["tsx", ...args], { stdio: "inherit" });
    p.on("close", (c) => (c === 0 ? ok() : no(new Error(`tsx ${args.join(" ")} exit ${c}`))));
  });
}

async function main() {
  const mode = process.argv[2] || "all";

  if (mode === "all" || mode === "explainers") {
    for (const ep of HOW_IT_WORKS_EPISODES) {
      console.log(`\n=== [HOW-IT-WORKS] ${ep} ===`);
      await runTsx(["src/render-explainer.ts", "--episode", ep, "--fps", "60"]);
    }
  }

  if (mode === "all" || mode === "physics") {
    const outDir = resolve("out");
    await mkdir(outDir, { recursive: true });
    for (const v of PHYSICS_VARIATIONS) {
      console.log(`\n=== [PHYSICS] seed=${v.seed} (${v.hook}) ===`);
      await runTsx([
        "src/render.ts",
        "--niche", "physics-ring",
        "--seed", String(v.seed),
        "--seconds", String(v.seconds),
        "--fps", "60",
        "--hook", v.hook,
      ]);
    }
    await writeFile(
      resolve(outDir, "physics-channel-titles.json"),
      JSON.stringify(
        PHYSICS_VARIATIONS.map((v) => ({
          file: `physics-ring-seed${v.seed}.mp4`,
          title: `${v.hook} #shorts #satisfying #physics`,
          hashtags: ["#shorts", "#satisfying", "#physics", "#simulation", "#oddlysatisfying"],
        })),
        null,
        2,
      ),
    );
  }
  console.log("\nTÜM TOPLU ÜRETİM TAMAMLANDI!");
}

main().catch((e) => { console.error(e); process.exit(1); });
