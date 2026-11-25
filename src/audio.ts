/**
 * Deterministik ses sentezi (48 kHz stereo PCM) ve sessizlik kırpma araçları.
 * Fizik çarpışma ve halka kırılma olaylarını pentatonik marimba/synth + kristal kırılma efektine çevirir.
 */

export type SoundEvent = {
  t: number; // saniye
  type: "bounce" | "break" | "win";
  pitchIndex?: number;
  intensity?: number; // 0..1
};

// C majör pentatonik frekans merdiveni (hipnotik, kulağa hoş tırmanan notalar)
const PENTATONIC_HZ = [
  261.63, 293.66, 329.63, 392.0, 440.0,
  523.25, 587.33, 659.25, 783.99, 880.0,
  1046.5, 1174.66, 1318.51, 1567.98, 1760.0,
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function synthesizeEventsPcm(
  events: SoundEvent[],
  durationSec: number,
  sampleRate = 48000,
): Int16Array {
  const totalFrames = Math.max(1, Math.ceil(durationSec * sampleRate));
  const mixL = new Float32Array(totalFrames);
  const mixR = new Float32Array(totalFrames);

  for (const ev of events) {
    const start = Math.floor(ev.t * sampleRate);
    if (start < 0 || start >= totalFrames) continue;
    const gain = clamp(ev.intensity ?? 0.75, 0.2, 1.0);
    const idx = Math.abs(ev.pitchIndex ?? 0) % PENTATONIC_HZ.length;
    const freq = PENTATONIC_HZ[idx];

    if (ev.type === "bounce") {
      // Sıcak, parlak marimba/kalimba tınısı (temel + 2. harmonik)
      const len = Math.min(totalFrames - start, Math.floor(sampleRate * 0.22));
      const pan = ((idx % 5) - 2) * 0.12; // hafif stereo genişlik
      for (let i = 0; i < len; i++) {
        const dt = i / sampleRate;
        const env = Math.min(1, dt / 0.004) * Math.exp(-dt * 19);
        const sig =
          (Math.sin(2 * Math.PI * freq * dt) * 0.72 +
            Math.sin(2 * Math.PI * freq * 2 * dt) * 0.22 * Math.exp(-dt * 28) +
            Math.sin(2 * Math.PI * freq * 3 * dt) * 0.06 * Math.exp(-dt * 40)) *
          env *
          gain *
          0.34;
        mixL[start + i] += sig * (1 - Math.max(0, pan));
        mixR[start + i] += sig * (1 + Math.min(0, pan));
      }
    } else if (ev.type === "break") {
      // Halka kırılma: güçlü bas darbesi + yüksek parıltılı akor
      const len = Math.min(totalFrames - start, Math.floor(sampleRate * 0.45));
      for (let i = 0; i < len; i++) {
        const dt = i / sampleRate;
        const bassFreq = 130 * Math.exp(-dt * 7) + 48;
        const bass = Math.sin(2 * Math.PI * bassFreq * dt) * Math.exp(-dt * 10) * 0.42;
        const chime =
          (Math.sin(2 * Math.PI * freq * 1.5 * dt) + Math.sin(2 * Math.PI * freq * 2.0 * dt) * 0.6) *
          Math.exp(-dt * 9) *
          0.18;
        const sig = (bass + chime) * gain;
        mixL[start + i] += sig;
        mixR[start + i] += sig;
      }
    } else if (ev.type === "win") {
      // Final zafer akoru (C-E-G-C arpej)
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((f, cIdx) => {
        const cStart = start + Math.floor(cIdx * 0.06 * sampleRate);
        const len = Math.min(totalFrames - cStart, Math.floor(sampleRate * 0.9));
        for (let i = 0; i < len; i++) {
          const dt = i / sampleRate;
          const env = Math.min(1, dt / 0.01) * Math.exp(-dt * 3.8);
          const sig = Math.sin(2 * Math.PI * f * dt) * env * 0.22;
          mixL[cStart + i] += sig;
          mixR[cStart + i] += sig;
        }
      });
    }
  }

  // Yumuşak sınırlayıcı (tanh) ile stereo s16le paketle
  const out = new Int16Array(totalFrames * 2);
  for (let i = 0; i < totalFrames; i++) {
    out[i * 2] = Math.round(Math.tanh(mixL[i]) * 32000);
    out[i * 2 + 1] = Math.round(Math.tanh(mixR[i]) * 32000);
  }
  return out;
}

/** Seslendirme kliplerindeki baş/son ölü sessizliği kırpar (ripple-cut). */
export function trimSilence(pcm: Int16Array, sampleRate = 48000, rmsThreshold = 280): Int16Array {
  const win = Math.max(1, Math.round(sampleRate * 0.01));
  if (pcm.length < win * 20) return pcm;
  const rms = (a: number, b: number) => {
    let s = 0;
    for (let i = a; i < b; i++) s += pcm[i] * pcm[i];
    return Math.sqrt(s / Math.max(1, b - a));
  };
  let first = -1;
  for (let i = 0; i < pcm.length; i += win) {
    if (rms(i, Math.min(pcm.length, i + win)) >= rmsThreshold) {
      first = i;
      break;
    }
  }
  if (first < 0) return pcm;
  let last = pcm.length;
  for (let i = Math.floor((pcm.length - 1) / win) * win; i >= first; i -= win) {
    if (rms(i, Math.min(pcm.length, i + win)) >= rmsThreshold) {
      last = Math.min(pcm.length, i + win);
      break;
    }
  }
  const pad = Math.round(sampleRate * 0.03);
  const a = Math.max(0, first - pad);
  const b = Math.min(pcm.length, last + pad);
  return b - a < win * 10 ? pcm : pcm.subarray(a, b);
}
