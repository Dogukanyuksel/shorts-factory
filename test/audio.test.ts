import assert from "node:assert/strict";
import { test } from "node:test";
import { synthesizeEventsPcm, trimSilence } from "../src/audio.js";

test("synthesizeEventsPcm: çarpışma ve kırılma olaylarında deterministik stereo PCM üretir", () => {
  const pcm = synthesizeEventsPcm(
    [
      { t: 0.1, type: "bounce", pitchIndex: 0, intensity: 0.8 },
      { t: 0.5, type: "break", pitchIndex: 4, intensity: 1.0 },
    ],
    1.0,
    48000,
  );
  assert.equal(pcm.length, 48000 * 2);
  // Başta sessiz, olay sonrası enerjili
  assert.equal(pcm[10], 0);
  const peak = pcm.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak > 5000, `beklenen güçlü ses, gelen peak=${peak}`);
});

test("trimSilence: baştaki ve sondaki ölü sessizliği kırpar", () => {
  const sr = 48000;
  const pcm = new Int16Array(sr * 2);
  for (let i = sr * 0.5; i < sr * 1.1; i++) {
    pcm[i] = Math.round(Math.sin((2 * Math.PI * 300 * i) / sr) * 8000);
  }
  const trimmed = trimSilence(pcm, sr);
  const sec = trimmed.length / sr;
  assert.ok(sec > 0.62 && sec < 0.72, `beklenen ~0.66s, gelen ${sec.toFixed(3)}s`);
});
