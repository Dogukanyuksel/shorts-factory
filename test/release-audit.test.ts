import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { CURATED_PHYSICS_JOBS, EXPLAINER_JOBS, pickNextJob } from "../src/catalog.js";
import { EXPANSION_JOBS, pickNextExpansionJob } from "../src/catalog-expansion.js";
import { ensureSensitiveDisclaimer, runPolicyGuard } from "../src/policy-guard.js";
import { isThreeJsSceneFileSync } from "../src/webgl-helper.js";

test("release-audit: tum chromium.launch cagrilari CHROMIUM_RENDER_ARGS kullanir", () => {
  const srcFiles = readdirSync(resolve("src")).filter((f) => f.endsWith(".ts"));
  for (const file of srcFiles) {
    const content = readFileSync(resolve("src", file), "utf8");
    const matches = [...content.matchAll(/chromium\.launch\s*\(\s*\{[\s\S]*?\}\s*\)/g)];
    for (const m of matches) {
      assert.ok(
        m[0].includes("CHROMIUM_RENDER_ARGS"),
        `src/${file} icinde CHROMIUM_RENDER_ARGS eksik chromium.launch bulundu`,
      );
    }
  }
});

test("release-audit: gercek tum Wealth/Bio/Physics/Explainer isleri kendi kendini reddetmez (0 false-positive)", () => {
  for (const job of EXPANSION_JOBS) {
    const desc = ensureSensitiveDisclaimer(job.channel, job.description);
    const res = runPolicyGuard({ channel: job.channel, title: job.title, description: desc, recentTitles: [] });
    assert.equal(res.ok, true, `Expansion ${job.id} kendi kendini reddetti: ${res.errors.join(" | ")}`);
  }
  for (const job of [...CURATED_PHYSICS_JOBS, ...EXPLAINER_JOBS]) {
    const res = runPolicyGuard({ channel: job.channel, title: job.title, description: job.description, recentTitles: [] });
    assert.equal(res.ok, true, `Catalog ${job.id} kendi kendini reddetti: ${res.errors.join(" | ")}`);
  }
});

test("release-audit: 3D-Only secici 2D sahneleri atlayip kilitlenmeden siradaki 3D sahneyi secer", () => {
  const pub = new Set<string>();
  const pickedExp = pickNextExpansionJob("wealth", pub, (c) =>
    isThreeJsSceneFileSync(resolve("niches", "expansion", `${c.episode}.html`)),
  );
  assert.ok(pickedExp, "Wealth kanalinda en az 1 uygun 3D sahne bulunmali");
  assert.equal(
    isThreeJsSceneFileSync(resolve("niches", "expansion", `${pickedExp.episode}.html`)),
    true,
    "Secilen Wealth sahnesi 3D PBR olmali",
  );

  const pickedPhys = pickNextJob("physics", pub, (c) =>
    c.channel === "physics" && isThreeJsSceneFileSync(resolve("niches", c.niche, "scene.html")),
  );
  assert.ok(pickedPhys, "Physics kanalinda en az 1 uygun 3D sahne bulunmali");
});

test("release-audit: longform HTML dosyalarinda findBeat boslukta son beat'e (SUBSCRIBE) dusmez", () => {
  const dir = resolve("niches", "longform-deep-dive");
  const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
  for (const f of files) {
    const html = readFileSync(resolve(dir, f), "utf8");
    const buggyGap1 = /return\s+t\s*<\s*BEATS\[0\]\.start\s*\?\s*BEATS\[0\]\s*:\s*BEATS\[BEATS\.length\s*-\s*1\]/;
    const buggyGap2 = /return\s*\{\s*idx:\s*BEATS\.length\s*-\s*1,\s*beat:\s*BEATS\[BEATS\.length\s*-\s*1\]\s*\}/;
    assert.equal(buggyGap1.test(html) || buggyGap2.test(html), false, `${f} icinde boslukta son beat'i donduren bug bulundu`);
  }
});

test("release-audit: tum publish workflow'larinda TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID tanimli", () => {
  const wfFiles = [
    "auto-publish-physics.yml",
    "auto-publish-explainer.yml",
    "auto-publish-wealth.yml",
    "auto-publish-bio.yml",
    "auto-publish-longform.yml",
    "publish-longform-expansion.yml",
  ];
  for (const wf of wfFiles) {
    const yml = readFileSync(resolve(".github", "workflows", wf), "utf8");
    assert.ok(yml.includes("TELEGRAM_BOT_TOKEN"), `${wf} icinde TELEGRAM_BOT_TOKEN eksik`);
    assert.ok(yml.includes("TELEGRAM_CHAT_ID"), `${wf} icinde TELEGRAM_CHAT_ID eksik`);
  }
});
