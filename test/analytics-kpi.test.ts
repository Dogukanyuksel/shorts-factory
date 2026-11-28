import test from "node:test";
import assert from "node:assert/strict";
import { calcYppProgressPct, daysUntilYppDouble } from "../src/analytics-kpi.js";

test("analytics-kpi: calculates YPP 4K/8K progress and Feb 1 2027 countdown accurately", () => {
  assert.equal(calcYppProgressPct(0, 4000), 0);
  assert.equal(calcYppProgressPct(1000, 4000), 25);
  assert.equal(calcYppProgressPct(4500, 4000), 100);
  assert.equal(calcYppProgressPct(2000, 8000), 25);

  const days = daysUntilYppDouble(new Date("2026-11-28T00:00:00Z"));
  assert.equal(days, 65);
  assert.equal(daysUntilYppDouble(new Date("2027-02-05T00:00:00Z")), 0);
});
