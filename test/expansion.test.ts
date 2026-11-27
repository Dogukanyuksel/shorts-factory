import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { EXPANSION_JOBS, pickNextExpansionJob } from "../src/catalog-expansion.js";

test("EXPANSION_JOBS: Wealth Mechanics ve Bio Mechanics bölümlerinin tüm HTML dosyaları mevcuttur", () => {
  assert.ok(EXPANSION_JOBS.length >= 6);
  for (const job of EXPANSION_JOBS) {
    assert.ok(job.title.length <= 100, `Başlık 100 karakteri aştı: ${job.title}`);
    const p = resolve("niches", "expansion", `${job.episode}.html`);
    assert.ok(existsSync(p), `Eksik expansion sahnesi: ${p}`);
  }
  const w1 = pickNextExpansionJob("wealth", new Set());
  const b1 = pickNextExpansionJob("bio", new Set());
  assert.equal(w1?.channel, "wealth");
  assert.equal(b1?.channel, "bio");
});
