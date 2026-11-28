import assert from "node:assert/strict";
import test from "node:test";
import { EXPANSION_JOBS } from "../src/catalog-expansion.js";
import { ensureSensitiveDisclaimer, jaccardSimilarity, runPolicyGuard } from "../src/policy-guard.js";

test("runPolicyGuard: asiri benzer basliklari yakalar ve hassas nislerde AI persona ihlalini engeller", () => {
  assert.ok(jaccardSimilarity("How a 4-Stroke Engine Works", "How a 4-Stroke Engine Works") === 1);

  const dup = runPolicyGuard({
    channel: "explainer",
    title: "How a Car Differential Lets Wheels Spin at Different Speeds #shorts",
    description: "Mechanical breakdown.",
    recentTitles: ["How a Car Differential Lets Wheels Spin at Different Speeds #shorts"],
  });
  assert.equal(dup.ok, false);
  assert.ok(dup.maxSimilarity >= 0.78);

  const badWealth = runPolicyGuard({
    channel: "wealth",
    title: "Guaranteed Returns With Compound Interest #shorts",
    description: "I am your financial advisor and this gives guaranteed profits.",
    recentTitles: [],
  });
  assert.equal(badWealth.ok, false);

  const goodBio = runPolicyGuard({
    channel: "bio",
    title: "Why Sitting All Day Destroys Your Lower Back #shorts",
    description: "Educational anatomy visualization of the Psoas Major muscle.",
    recentTitles: ["How Your Heart Pumps 100,000 Times a Day #shorts"],
  });
  assert.equal(goodBio.ok, true);

  const withDisc = ensureSensitiveDisclaimer("bio", "Inside the human heart.");
  assert.ok(withDisc.includes("not medical advice"));
});

test("runPolicyGuard: gercek tum Wealth ve Bio EXPANSION_JOBS isleri kendi feragatnamesiyle ok===true doner", () => {
  const seenTitles: string[] = [];
  for (const job of EXPANSION_JOBS) {
    const desc = ensureSensitiveDisclaimer(job.channel, job.description);
    const res = runPolicyGuard({
      channel: job.channel,
      title: job.title,
      description: desc,
      recentTitles: seenTitles,
    });
    assert.equal(res.ok, true, `${job.id} reddedildi: ${res.errors.join(" | ")}`);
    seenTitles.push(job.title);
  }
});
