import test from "node:test";
import assert from "node:assert/strict";
import { KOKORO_CHANNEL_VOICES, KOKORO_COHOST_VOICES, type VoiceChannelId } from "../src/voice.js";

test("Kokoro-82M assigns 4 distinct US English neural voices (2M + 2F) + distinct Act-2 Co-Hosts", () => {
  const channels: VoiceChannelId[] = ["physics", "explainer", "wealth", "bio"];
  const voices = channels.map((c) => KOKORO_CHANNEL_VOICES[c].voice);
  assert.equal(new Set(voices).size, 4, "Each channel must have a unique primary voice ID");

  const maleCount = voices.filter((v) => v.startsWith("am_")).length;
  const femaleCount = voices.filter((v) => v.startsWith("af_")).length;
  assert.equal(maleCount, 2, "Expected 2 male signature channels");
  assert.equal(femaleCount, 2, "Expected 2 female signature channels");

  for (const ch of channels) {
    const primary = KOKORO_CHANNEL_VOICES[ch];
    const cohost = KOKORO_COHOST_VOICES[ch];
    assert.ok(primary.speed >= 0.85 && primary.speed <= 1.2, `Expected natural speed for ${ch}`);
    assert.notEqual(primary.voice, cohost.voice, `Co-Host voice must differ from primary for ${ch}`);
    assert.notEqual(
      primary.voice.slice(0, 3),
      cohost.voice.slice(0, 3),
      `Co-Host for ${ch} should use opposite gender to break longform ear fatigue`,
    );
  }
});
