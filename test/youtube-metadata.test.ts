import assert from "node:assert/strict";
import test from "node:test";
import { buildYouTubeVideoPayload, cleanYouTubeMetadata } from "../src/youtube.js";

test("cleanYouTubeMetadata: short'ta yalnız #shorts kalır, diğer hashtag'ler etikete taşınır", () => {
  const r = cleanYouTubeMetadata({
    title: "How Many Paper Folds to Reach the Moon? #shorts",
    description: "Fold a sheet of paper.\n\n✨ Follow for a new one every day\n\n#shorts #math #space #exponentialGrowth #science",
    tags: ["paper folding", "math"],
  });
  assert.equal(r.title, "How Many Paper Folds to Reach the Moon? #shorts");
  assert.equal((r.description.match(/#\w+/g) || []).join(" "), "#shorts");
  assert.ok(r.description.startsWith("Fold a sheet of paper."));
  assert.deepEqual(r.tags, ["paper folding", "math", "space", "exponential Growth", "science", "shorts"]);
});

test("cleanYouTubeMetadata: uzun videoda hiç hashtag kalmaz", () => {
  const r = cleanYouTubeMetadata({
    title: "8 Science & Engineering Breakdowns (Deep Dive #2)",
    description: "Chapters:\n00:00 Intro\n\n#engineering #howitworks #science",
    tags: ["engineering"],
  });
  assert.equal(r.isShort, false);
  assert.equal(r.title, "8 Science & Engineering Breakdowns (Deep Dive #2)"); // "#2" bölüm numarası korunur
  assert.equal(/#[a-z]/i.test(r.description), false);
  assert.ok(r.tags.includes("howitworks") && r.tags.includes("science"));
});

test("etiketler YouTube 500 karakter sınırını aşmaz", () => {
  const many = Array.from({ length: 80 }, (_, i) => `keyword number ${i}`);
  const p = buildYouTubeVideoPayload({ title: "x #shorts", description: "", tags: many, categoryId: "28", privacyStatus: "public" });
  const total = p.snippet.tags.reduce((a, t) => a + t.length + (t.includes(" ") ? 2 : 0), 0) + p.snippet.tags.length - 1;
  assert.ok(total <= 500, `toplam ${total}`);
});
