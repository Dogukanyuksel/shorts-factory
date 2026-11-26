import assert from "node:assert/strict";
import test from "node:test";
import { buildLongformPlan, numberWord } from "../src/render-longform.js";

test("buildLongformPlan: başlıktaki sayı her zaman gerçek bölüm sayısıyla eşleşir", () => {
  for (let ep = 1; ep <= 12; ep++) {
    const plan = buildLongformPlan("explainer", ep, 8);
    const m = plan.title.match(/\d+/);
    assert.ok(m, `ep${ep} başlığında sayı yok: ${plan.title}`);
    assert.equal(Number(m[0]), plan.chapters.length, `ep${ep}: ${plan.title}`);
    assert.ok(plan.title.length <= 100, `ep${ep} başlığı 100 karakteri aşıyor`);
  }
});

test("buildLongformPlan: eksik bölümlü tema başlığı alakasız içerikle kullanılmaz", () => {
  // ep2 teması (Space & Black Holes) şu an yalnızca 4 mevcut bölüme sahip → jenerik başlık beklenir
  const plan = buildLongformPlan("explainer", 2, 8);
  assert.ok(!/Black Holes & Extreme Physics/.test(plan.title), plan.title);
  // Jenerik başlıktaki öne çıkan bölümler gerçekten videoda olmalı
  assert.equal(plan.chapters.length, 8);
});

test("buildLongformPlan: ardışık bölümler aynı konuları tekrar etmez", () => {
  const ep1 = new Set(buildLongformPlan("explainer", 1, 8).chapters.map((c) => c.slug));
  const ep2 = buildLongformPlan("explainer", 2, 8).chapters.map((c) => c.slug);
  assert.deepEqual(ep2.filter((s) => ep1.has(s)), []);
});

test("buildLongformPlan: physics intro seslendirmesi raunt sayısını doğru söyler", () => {
  for (const rounds of [4, 6, 8]) {
    const plan = buildLongformPlan("physics", 3, rounds);
    assert.equal(plan.chapters.length, rounds);
    assert.ok(plan.introVoice.toLowerCase().includes(`${numberWord(rounds)} wild`), plan.introVoice);
    assert.ok(plan.title.includes(`(${rounds} Wild Simulations)`));
  }
});
