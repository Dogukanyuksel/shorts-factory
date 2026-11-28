import test from "node:test";
import assert from "node:assert/strict";
import { KOKORO_CHANNEL_VOICES, type VoiceChannelId } from "../src/voice.js";

test("Kokoro-82M assigns 4 distinct US English neural voices across all 4 channels", () => {
  const channels: VoiceChannelId[] = ["physics", "explainer", "wealth", "bio"];
  const voices = channels.map((c) => KOKORO_CHANNEL_VOICES[c].voice);
  assert.equal(new Set(voices).size, 4, "Each channel must have a unique voice ID");

  for (const ch of channels) {
    const cfg = KOKORO_CHANNEL_VOICES[ch];
    assert.ok(cfg.voice.startsWith("am_") || cfg.voice.startsWith("af_"), `Expected US English voice for ${ch}`);
    assert.ok(cfg.speed >= 0.85 && cfg.speed <= 1.2, `Expected natural speaking speed for ${ch}`);
  }
});
