import test from "node:test";
import assert from "node:assert/strict";
import { KOKORO_CHANNEL_VOICES, KOKORO_COHOST_VOICES, type VoiceChannelId } from "../src/voice.js";
import { applyPhoneticOverrides } from "../src/phonetic-overrides.js";

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

  const allEight = [
    ...channels.map((c) => KOKORO_CHANNEL_VOICES[c].voice),
    ...channels.map((c) => KOKORO_COHOST_VOICES[c].voice),
  ];
  assert.equal(new Set(allEight).size, 8, "All 4 primary + 4 co-host voices must be 8 distinct voice IDs");
});

test("applyPhoneticOverrides rewrites tricky medical & physics terms cleanly without breaking normal prose", () => {
  const bioLine = "Your Vagus nerve and cerebrospinal fluid flush beta-amyloid while macrophages clear debris.";
  const spokenBio = applyPhoneticOverrides(bioLine);
  assert.ok(spokenBio.includes("Vay-gus nerve"), spokenBio);
  assert.ok(spokenBio.includes("seh-ree-bro-spy-nal fluid"), spokenBio);
  assert.ok(spokenBio.includes("bay-ta am-uh-loyd"), spokenBio);
  assert.ok(spokenBio.includes("mak-ro-fay-jiz"), spokenBio);

  const physLine = "Gyroscopic precession and Chladni plates follow Bernoulli and Fourier math.";
  const spokenPhys = applyPhoneticOverrides(physLine);
  assert.ok(spokenPhys.includes("jy-roh-skop-ik"), spokenPhys);
  assert.ok(spokenPhys.includes("pree-sesh-un"), spokenPhys);
  assert.ok(spokenPhys.includes("Klad-nee"), spokenPhys);

  const normalLine = "Every time you pay the minimum balance, compound interest steals your future.";
  assert.equal(applyPhoneticOverrides(normalLine), normalLine);
});
