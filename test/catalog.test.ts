import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { CURATED_PHYSICS_JOBS, EXPLAINER_JOBS, getEngagementKit, pickJobByKey, pickNextJob } from "../src/catalog.js";
import { buildInstagramCaption, tallyABVotes } from "../src/instagram.js";
import { parseFfmpegProbe } from "../src/qc.js";
import { buildYouTubeVideoPayload } from "../src/youtube.js";

test("pickNextJob (physics): ardışık iki video asla aynı simülasyon mekaniğini tekrarlamaz ve tüm sahneler mevcuttur", () => {
  const published = new Set<string>();
  const seenNiches = new Set<string>();
  let prevNiche: string | null = null;

  for (let i = 0; i < CURATED_PHYSICS_JOBS.length + 19; i++) {
    const job = pickNextJob("physics", published);
    assert.ok(job && job.channel === "physics", `Adım ${i} için physics işi üretilmeli`);
    assert.notEqual(job.niche, prevNiche, `Ardışık tekrar tespit edildi: ${job.niche}`);
    assert.ok(job.title.length <= 100, `Başlık 100 karakteri aştı: ${job.title}`);
    assert.ok(job.narration.length >= 30, `Sesli anlatım çok kısa: ${job.id}`);
    const sceneFile = resolve("niches", job.niche, "scene.html");
    assert.ok(existsSync(sceneFile), `Sahne dosyası eksik: ${sceneFile}`);
    seenNiches.add(job.niche);
    published.add(job.id);
    prevNiche = job.niche;
  }
  assert.equal(seenNiches.size, 19, "19 farklı fizik mekaniği rotasyonda olmalı");
});

test("pickNextJob (explainer): 38 bölümü eksiksiz sırayla verir, tüm HTML dosyaları mevcuttur ve sonra null döner", () => {
  assert.equal(EXPLAINER_JOBS.length, 38);
  const published = new Set<string>();
  for (let i = 0; i < EXPLAINER_JOBS.length; i++) {
    const job = pickNextJob("explainer", published);
    assert.ok(job && job.channel === "explainer");
    assert.ok(job.title.length <= 100, `Başlık 100 karakteri aştı: ${job.title}`);
    const epFile = resolve("niches", "how-it-works", "episodes", `${job.episode}.html`);
    assert.ok(existsSync(epFile), `Bölüm dosyası eksik: ${epFile}`);
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

test("buildInstagramCaption: #shorts etiketini #reels olarak dönüştürür ve 2200 karakter altında tutar", () => {
  const caption = buildInstagramCaption("How a Jet Engine Works #shorts", "Inside a jet engine.\n#shorts #aviation");
  assert.ok(!caption.includes("#shorts"));
  assert.ok(caption.includes("#reels"));
  assert.ok(caption.length <= 2200);
});

test("getEngagementKit: her video için A/B oylaması, ilk yorum ve seri rozeti üretir", () => {
  const physKit = getEngagementKit(CURATED_PHYSICS_JOBS[0]);
  assert.notEqual(physKit.optionA, physKit.optionB);
  assert.ok(physKit.pollLine.includes("A)") && physKit.pollLine.includes("B)"));
  assert.ok(physKit.enrichedDescription.includes("VOTE NEXT SIMULATION"));

  const expKit = getEngagementKit(EXPLAINER_JOBS[2]);
  assert.equal(expKit.introCta, "EP. 03");
  assert.notEqual(expKit.optionA, expKit.optionB);
  assert.ok(expKit.commentPrompt.includes("VOTE NEXT EPISODE"));
});

test("tallyABVotes & pickJobByKey: yorumlardaki A/B oylarını doğru sayar ve kazananı seçer", () => {
  const tally = tallyABVotes(
    [
      "VOTE NEXT SIMULATION 👇\nA) Marble Drop\nB) Double Pendulum",
      "B",
      "b!",
      "Double Pendulum please",
      "A",
    ],
    "Marble Drop",
    "Double Pendulum",
  );
  assert.equal(tally.votesA, 1);
  assert.equal(tally.votesB, 3);
  assert.equal(tally.winner, "B");

  const picked = pickJobByKey("physics", "double-pendulum", new Set());
  assert.ok(picked && picked.channel === "physics" && picked.niche === "double-pendulum");

  const pickedExp = pickJobByKey("explainer", "jet-engine", new Set());
  assert.ok(pickedExp && pickedExp.channel === "explainer" && pickedExp.episode === "jet-engine");
});

test("parseFfmpegProbe (QC Gate) ve teknik birim doğruluğu kontrolü", () => {
  const sampleStderr = `
    Duration: 00:00:32.04, start: 0.000000, bitrate: 3450 kb/s
    Stream #0:0: Video: h264 (Main), yuv420p, 1080x1920 [SAR 1:1 DAR 9:16], 60 fps
    Stream #0:1: Audio: aac (LC), 48000 Hz, stereo, fltp, 128 kb/s
  `;
  const parsed = parseFfmpegProbe(sampleStderr);
  assert.equal(parsed.width, 1080);
  assert.equal(parsed.height, 1920);
  assert.equal(parsed.hasH264Video, true);
  assert.equal(parsed.hasAacAudio, true);
  assert.ok(parsed.durationSec > 31 && parsed.durationSec < 33);

  // İngilizce metinlerde yanlış "km/s" (saniyede km) birim hatası olmamalı
  for (const j of [...CURATED_PHYSICS_JOBS, ...EXPLAINER_JOBS]) {
    const allText = `${j.title} ${j.description}`;
    assert.ok(!/\b\d+\s*km\/s\b/i.test(allText), `Birim hatası (km/s yerine km/h olmalı): ${j.id}`);
  }
});
