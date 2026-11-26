import assert from "node:assert/strict";
import test from "node:test";
import { channelMatches, expectedChannelPattern } from "../src/channel-guard.js";

test("kanal kilidi: doğru kanal geçer, yanlış kanal yakalanır", () => {
  assert.equal(channelMatches("Kinetic Lab HQ", expectedChannelPattern("physics", {})), true);
  assert.equal(channelMatches("Clear Mechanics", expectedChannelPattern("explainer", {})), true);
  assert.equal(channelMatches("Kinetic Lab HQ", expectedChannelPattern("explainer", {})), false);
  assert.equal(channelMatches("Clear Mechanics", expectedChannelPattern("physics", {})), false);
  assert.equal(expectedChannelPattern("physics", { YOUTUBE_EXPECTED_CHANNEL_PHYSICS: "My Lab" }), "my lab");
});
