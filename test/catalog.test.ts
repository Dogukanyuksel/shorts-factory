import assert from "node:assert/strict";
import test from "node:test";
import { CURATED_PHYSICS_JOBS, EXPLAINER_JOBS, pickNextJob } from "../src/catalog.js";
import { buildYouTubeVideoPayload } from "../src/youtube.js";

test("pickNextJob (physics): ardışık iki video asla aynı simülasyon mekaniğini tekrarlamaz", () => {
  const published = new Set<string>();
  let prevNiche: string | null = null;

  for (let i = 0; i < CURATED_PHYSICS_JOBS.length + 12; i++) {
    const job = pickNextJob("physics", published);
    assert.ok(job && job.channel === "physics", `Adım ${i} için physics işi üretilmeli`);
    assert.notEqual(job.niche, prevNiche, `Ardışık tekrar tespit edildi: ${job.niche}`);
    assert.ok(job.title.length <= 100, `Başlık 100 karakteri aştı: ${job.title}`);
    assert.ok(job.narration.length >= 30, `Sesli anlatım çok kısa: ${job.id}`);
    published.add(job.id);
    prevNiche = job.niche;
  }
});

test("pickNextJob (explainer): 10 bölümü eksiksiz sırayla verir ve sonra null döner", () => {
  const published = new Set<string>();
  for (let i = 0; i < EXPLAINER_JOBS.length; i++) {
    const job = pickNextJob("explainer", published);
    assert.ok(job && job.channel === "explainer");
    assert.ok(job.title.length <= 100);
    published.add(job.id);
  }
  assert.equal(pickNextJob("explainer", published), null);
});

test("buildYouTubeVideoPayload: İngilizce hedefleme ve güvenli başlık kırpma uygular", () => {
  const payload = buildYouTubeVideoPayload({
    title: "A".repeat(140),
    description: "Test explanation",
    tags: ["physics", "shorts"],
    categoryId: "28",
    privacyStatus: "public",
  });
  assert.equal(payload.snippet.title.length, 100);
  assert.equal(payload.snippet.defaultLanguage, "en");
  assert.equal(payload.snippet.defaultAudioLanguage, "en");
  assert.equal(payload.status.selfDeclaredMadeForKids, false);
  assert.equal(payload.status.privacyStatus, "public");
});
