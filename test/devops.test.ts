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
