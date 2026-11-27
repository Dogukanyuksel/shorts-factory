import assert from "node:assert/strict";
import test from "node:test";
import { buildWordCaptionChunks } from "../src/word-captions.js";

test("buildWordCaptionChunks: en fazla 3 kelime/parca ve monoton zaman damgalari uretir", () => {
  const chunks = buildWordCaptionChunks(
    [
      { text: "Sitting doesn't just make your back stiff it pulls your spine.", start: 0.2, end: 3.8 },
      { text: "Watch the L4 disc pressure spike!", start: 4.0, end: 6.2 },
    ],
    3,
  );
  assert.ok(chunks.length >= 5);
  let prevEnd = 0;
  for (const ch of chunks) {
    assert.ok(ch.words.length >= 1 && ch.words.length <= 3, `Parca 3 kelimeden fazla: ${ch.words.length}`);
    assert.ok(ch.start >= prevEnd - 1e-6);
    assert.ok(ch.end > ch.start);
    prevEnd = ch.end;
  }
});
