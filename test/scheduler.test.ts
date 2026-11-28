import assert from "node:assert/strict";
import test from "node:test";
import { decide, latestOccurrence, SLOTS, type RunInfo } from "../src/scheduler.js";

const slot = (k: string) => SLOTS.find((s) => s.key === k)!;
const run = (created: string, status = "completed", conclusion: string | null = "success", title = "x"): RunInfo => ({
  created_at: created, status, conclusion, display_title: title, event: "schedule",
});

test("latestOccurrence: en son slot, lookback dışıysa null, gece yarısı geçişi", () => {
  assert.equal(latestOccurrence(slot("physics-shorts"), new Date("2026-11-26T16:25:00Z"))?.toISOString(), "2026-11-26T14:07:00.000Z");
  assert.equal(latestOccurrence(slot("physics-shorts"), new Date("2026-11-26T18:30:00Z")), null); // 14:07 + 4s lookback dışı
  assert.equal(latestOccurrence(slot("physics-shorts"), new Date("2026-11-26T22:00:00Z"))?.toISOString(), "2026-11-26T19:07:00.000Z");
  assert.equal(latestOccurrence(slot("engagement"), new Date("2026-11-26T15:00:00Z"))?.toISOString(), "2026-11-26T14:23:00.000Z");
});

test("decide: hiç çalışma yoksa başlat, başarılıysa dokunma, başarısızsa 1 kez yeniden dene", () => {
  const occ = new Date("2026-11-26T14:07:00Z");
  const s = slot("physics-shorts");
  assert.equal(decide(s, occ, []).action, "dispatch");
  assert.equal(decide(s, occ, [run("2026-11-26T08:00:00Z")]).action, "dispatch"); // eski çalışma sayılmaz
  assert.equal(decide(s, occ, [run("2026-11-26T14:20:00Z")]).action, "ok");
  assert.equal(decide(s, occ, [run("2026-11-26T14:20:00Z", "in_progress", null)]).action, "wait");
  assert.equal(decide(s, occ, [run("2026-11-26T14:20:00Z", "completed", "failure")]).action, "retry");
  assert.equal(
    decide(s, occ, [run("2026-11-26T14:20:00Z", "completed", "failure"), run("2026-11-26T14:40:00Z", "completed", "failure")]).action,
    "ok",
  );
});

test("decide: long-form kanalları run başlığıyla ayırt edilir", () => {
  const occ = new Date("2026-11-26T15:15:00Z");
  const phys = slot("longform-physics");
  assert.equal(decide(phys, occ, [run("2026-11-26T15:20:00Z", "completed", "success", "Long-Form explainer")]).action, "dispatch");
  assert.equal(decide(phys, occ, [run("2026-11-26T15:20:00Z", "completed", "success", "Long-Form physics")]).action, "ok");
  assert.equal(decide(phys, occ, [run("2026-11-26T15:20:00Z", "completed", "success", "Long-Form both")]).action, "ok");
});

test("nextOccurrenceAll: en yakın gelecek slotu bulur (gün geçişi dahil)", async () => {
  const { nextOccurrenceAll } = await import("../src/scheduler.js");
  const a = nextOccurrenceAll(SLOTS, new Date("2026-11-26T19:20:00Z"))!;
  assert.equal(a.at.toISOString(), "2026-11-26T19:37:00.000Z");
  assert.equal(a.slot.key, "explainer-shorts");
  const b = nextOccurrenceAll(SLOTS, new Date("2026-11-26T23:40:00Z"))!;
  assert.equal(b.at.toISOString(), "2026-11-27T00:15:00.000Z");
});
