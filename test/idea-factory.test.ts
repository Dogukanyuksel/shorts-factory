import assert from "node:assert/strict";
import test from "node:test";
import { generateIdeas } from "../src/idea-factory.js";

test("generateIdeas: binlerce benzersiz fikir, tekrar eden id/başlık yok", () => {
  const ideas = generateIdeas();
  assert.ok(ideas.length >= 2000, `yalnızca ${ideas.length} fikir`);
  assert.equal(new Set(ideas.map((i) => i.id)).size, ideas.length);
  assert.equal(new Set(ideas.map((i) => i.title.toLowerCase())).size, ideas.length);
});

test("generateIdeas: her fikir eksiksiz ve YouTube başlık sınırında", () => {
  for (const i of generateIdeas()) {
    assert.ok(i.title && i.hook && i.visual && i.ending && i.commentPrompt, i.id);
    assert.ok(i.title.length <= 100, `${i.id}: ${i.title}`);
    assert.ok(i.score >= 0 && i.score <= 100);
  }
});

test("generateIdeas: fizik kanalına alakasız (biyoloji) mit eşleşmez", () => {
  const bad = generateIdeas().filter((i) => i.format === "myth-test" && /brain|goldfish|tongue/i.test(i.title));
  assert.deepEqual(bad, []);
});
