import assert from "node:assert/strict";
import test from "node:test";
import { buildReply, classifyComment, shouldSkipComment } from "../src/reply-bank.js";

test("classifyComment: yorum türlerini doğru sınıflar", () => {
  assert.equal(classifyComment("A"), "vote");
  assert.equal(classifyComment("I made it spin both ways!"), "illusion_success");
  assert.equal(classifyComment("I can't make it flip"), "illusion_fail");
  assert.equal(classifyComment("42"), "guess");
  assert.equal(classifyComment("How is this made?"), "question");
  assert.equal(classifyComment("so satisfying 🔥"), "praise");
});

test("shouldSkipComment: spam, link ve hakarete yanıt verilmez", () => {
  assert.equal(shouldSkipComment("check out my channel"), true);
  assert.equal(shouldSkipComment("https://spam.example"), true);
  assert.equal(shouldSkipComment("this is stupid trash"), true);
  assert.equal(shouldSkipComment("wow amazing"), false);
  assert.equal(buildReply("c1", "sub4sub?", "physics"), null);
});

test("buildReply: aynı yorum için deterministik, farklı yorumlar için çeşitli, Türkçeye Türkçe", () => {
  assert.equal(buildReply("x1", "amazing", "physics"), buildReply("x1", "amazing", "physics"));
  const variants = new Set(Array.from({ length: 40 }, (_, i) => buildReply(`id${i}`, "amazing", "physics")));
  assert.ok(variants.size >= 3, `yalnızca ${variants.size} farklı yanıt`);
  assert.match(buildReply("t1", "çok güzel olmuş", "explainer") || "", /[ğüşıöçİ]|teşekkür|harika|sevindik/i);
});

test("isOwnChannelComment: kendi ilk anket yorumumuz bildirim/yanıt dışı kalır", async () => {
  const { isOwnChannelComment } = await import("../src/telegram-monitor.js");
  assert.equal(isOwnChannelComment("UC1", "UC1", "anything"), true);
  assert.equal(isOwnChannelComment("UC1", "UC2", "VOTE NEXT SIMULATION 👇\nA) x\nB) y"), true);
  assert.equal(isOwnChannelComment("UC1", "UC2", "so cool!"), false);
  assert.equal(isOwnChannelComment(undefined, undefined, "nice"), false);
});
