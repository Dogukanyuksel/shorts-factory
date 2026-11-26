import assert from "node:assert/strict";
import test from "node:test";
import { activeBlock, detectQuotaReason, nextPacificMidnight, quotaKey, resolveYouTubeClient } from "../src/youtube-quota.js";

test("detectQuotaReason: YouTube kota/limit gerekçelerini tanır, diğer hataları tanımaz", () => {
  const body = '{"error":{"code":403,"errors":[{"reason":"quotaExceeded"}]}}';
  assert.equal(detectQuotaReason(403, body), "quotaExceeded");
  assert.equal(detectQuotaReason(400, '{"error":{"errors":[{"reason":"uploadLimitExceeded"}]}}'), "uploadLimitExceeded");
  assert.equal(detectQuotaReason(403, '{"error":{"errors":[{"reason":"forbidden"}]}}'), null);
  assert.equal(detectQuotaReason(500, body), null);
});

test("nextPacificMidnight: kış (PST) ve yaz (PDT) saatinde doğru UTC anı", () => {
  // 26 Kasım 2026 01:00 UTC = 25 Kasım 17:00 PST → sıfırlama 26 Kasım 00:00 PST = 08:00 UTC
  assert.equal(nextPacificMidnight(new Date("2026-11-26T01:00:00Z")).toISOString(), "2026-11-26T08:00:00.000Z");
  // 26 Kasım 09:00 UTC = 01:00 PST → bir sonraki: 27 Kasım 08:00 UTC
  assert.equal(nextPacificMidnight(new Date("2026-11-26T09:00:00Z")).toISOString(), "2026-11-27T08:00:00.000Z");
  // Temmuz (PDT, UTC-7) → 07:00 UTC
  assert.equal(nextPacificMidnight(new Date("2026-07-10T12:00:00Z")).toISOString(), "2026-07-11T07:00:00.000Z");
});

test("activeBlock: süresi geçen blok yok sayılır", () => {
  const key = quotaKey("client-a");
  const state = { blocks: { [key]: { until: "2026-11-26T08:00:00.000Z", reason: "quotaExceeded", at: "x" } } };
  assert.ok(activeBlock(state, key, new Date("2026-11-26T07:59:00Z")));
  assert.equal(activeBlock(state, key, new Date("2026-11-26T08:00:01Z")), null);
  assert.equal(activeBlock(state, quotaKey("client-b"), new Date("2026-11-26T07:00:00Z")), null);
});

test("resolveYouTubeClient: kanala özel proje ortak projeye göre önceliklidir", () => {
  const env = { YOUTUBE_CLIENT_ID: "shared", YOUTUBE_CLIENT_SECRET: "s", YOUTUBE_CLIENT_ID_PHYSICS: "phys", YOUTUBE_CLIENT_SECRET_PHYSICS: "ps" };
  assert.deepEqual(resolveYouTubeClient("physics", env), { clientId: "phys", clientSecret: "ps" });
  assert.deepEqual(resolveYouTubeClient("explainer", env), { clientId: "shared", clientSecret: "s" });
});
