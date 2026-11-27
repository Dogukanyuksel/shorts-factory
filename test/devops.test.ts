import assert from "node:assert/strict";
import test from "node:test";
import { isValidInstagramMediaId, mergePublishedRecords, redactTokens } from "../src/devops.js";

test("mergePublishedRecords: paralel workflow çakışmasında iki tarafın yayın kaydını da korur", () => {
  const remote = [
    { id: "v1", videoId: "yt1", instagramMediaId: "179000000001" },
    { id: "v2", videoId: "yt2" },
  ];
  const local = [
    { id: "v1", videoId: "yt1", instagramMediaId: "179000000001" },
    { id: "v3", videoId: "yt3", instagramMediaId: "179000000003" },
  ];
  const merged = mergePublishedRecords(remote, local);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["v1", "v2", "v3"],
  );
});

test("isValidInstagramMediaId: gerçek Meta ID'lerini kabul eder, sahte/placeholder etiketleri eler", () => {
  assert.equal(isValidInstagramMediaId("17925931233223430"), true);
  assert.equal(isValidInstagramMediaId("manual-pack-1"), false);
  assert.equal(isValidInstagramMediaId(""), false);
  assert.equal(isValidInstagramMediaId(undefined), false);
});

test("redactTokens: hata mesajlarındaki access_token, API key ve Bearer/OAuth sırlarını maskeler", () => {
  const raw = "GET https://graph.facebook.com/v21.0/123?access_token=EAAGsecret123&key=AIzaSecret456 Bearer tok_xyz";
  const safe = redactTokens(raw);
  assert.ok(!safe.includes("EAAGsecret123"));
  assert.ok(!safe.includes("AIzaSecret456"));
  assert.ok(!safe.includes("tok_xyz"));
  assert.ok(safe.includes("access_token=[REDACTED]"));
});

test("hoursSinceLastPublish: short ve longform kayıtlarını kanal bazında ayrı ölçer", async () => {
  const { hoursSinceLastPublish } = await import("../src/devops.js");
  const now = new Date("2026-11-26T12:00:00Z");
  const recs = [
    { id: "a", channel: "physics", publishedAt: "2026-11-26T11:00:00Z" },
    { id: "longform-physics-ep1", channel: "physics", publishedAt: "2026-11-25T12:00:00Z" },
    { id: "b", channel: "explainer", publishedAt: "2026-11-26T06:00:00Z" },
  ];
  assert.equal(hoursSinceLastPublish(recs, "physics", "short", now), 1);
  assert.equal(hoursSinceLastPublish(recs, "physics", "longform", now), 24);
  assert.equal(hoursSinceLastPublish(recs, "explainer", "short", now), 6);
  assert.equal(hoursSinceLastPublish(recs, "explainer", "longform", now), Infinity);
});

test("resolveMinGapHours: FORCE_PUBLISH korumayı kapatır, geçersiz değer 0 olur", async () => {
  const { resolveMinGapHours } = await import("../src/devops.js");
  assert.equal(resolveMinGapHours({ MIN_PUBLISH_GAP_HOURS: "3" }), 3);
  assert.equal(resolveMinGapHours({ MIN_PUBLISH_GAP_HOURS: "3", FORCE_PUBLISH: "true" }), 0);
  assert.equal(resolveMinGapHours({ MIN_PUBLISH_GAP_HOURS: "abc" }), 0);
  assert.equal(resolveMinGapHours({}), 0);
});

test("resolveMetaToken: kanala özel Meta token ortak token'a göre önceliklidir", async () => {
  const { resolveMetaToken } = await import("../src/devops.js");
  const env = { META_ACCESS_TOKEN: "shared", META_ACCESS_TOKEN_PHYSICS: "phys" };
  assert.equal(resolveMetaToken("physics", env), "phys");
  assert.equal(resolveMetaToken("explainer", env), "shared");
  assert.equal(resolveMetaToken("explainer", {}), "");
});

test("mergePublishedFiles: silinen kayıt eski bir kopyadan geri GELMEZ (tombstone)", async () => {
  const { mergePublishedFiles } = await import("../src/devops.js");
  const remote = { published: [{ id: "a", videoId: "A" }], removedVideoIds: ["X"] };
  const staleLocal = { published: [{ id: "a", videoId: "A" }, { id: "x", videoId: "X" }, { id: "b", videoId: "B" }] };
  const merged = mergePublishedFiles(remote, staleLocal);
  assert.deepEqual(merged.published.map((r) => r.id), ["a", "b"]);
  assert.deepEqual(merged.removedVideoIds, ["X"]);
  // Aynı iş yeniden (farklı videoId ile) yayınlanınca kayıt korunur
  const republished = mergePublishedFiles(merged, { published: [{ id: "x", videoId: "X2" }] });
  assert.ok(republished.published.some((r) => r.id === "x" && r.videoId === "X2"));
});

test("mergePublishedFiles: eski kopyadaki silinmiş kayıt yeniden yayını ezmez", async () => {
  const { mergePublishedFiles } = await import("../src/devops.js");
  const remote = { published: [{ id: "x", videoId: "X2" }], removedVideoIds: ["X"] };
  const staleLocal = { published: [{ id: "x", videoId: "X" }] };
  const merged = mergePublishedFiles(remote, staleLocal);
  assert.deepEqual(merged.published, [{ id: "x", videoId: "X2" }]);
});
