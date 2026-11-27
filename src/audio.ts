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

/**
 * 0.02 sn noktasında sinematik sub-bass açılış darbesi ekler (sesi açık kaydıran izleyiciyi 0.5 sn'de yakalar).
 */
export function applyIntroSubBass(stereoPcm: Int16Array, sampleRate = 48000, gain = 0.34): void {
  const start = Math.floor(0.02 * sampleRate);
  const len = Math.floor(0.28 * sampleRate);
  const totalFrames = Math.floor(stereoPcm.length / 2);
  for (let i = 0; i < len && start + i < totalFrames; i++) {
    const dt = i / sampleRate;
    const freq = 115 * Math.exp(-dt * 11) + 44;
    const env = Math.min(1, dt / 0.008) * Math.exp(-dt * 12);
    const sig = Math.sin(2 * Math.PI * freq * dt) * env * gain;
    const idx = (start + i) * 2;
    stereoPcm[idx] = Math.round(Math.tanh(stereoPcm[idx] / 32768 + sig) * 32000);
    stereoPcm[idx + 1] = Math.round(Math.tanh(stereoPcm[idx + 1] / 32768 + sig) * 32000);
  }
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

/**
 * %100 telifsiz, deterministik arka plan synth bas + nabız ritmi + yumuşak arpej üretir (48 kHz stereo PCM).
 * Her seed farklı bir akor dizilimi ve tempo seçer; çarpışma SFX'i ve seslendirmeyi boğmadan enerji katar.
 */
export function synthesizeBackgroundMusicPcm(
  durationSec: number,
  seed = 1,
  sampleRate = 48000,
): Int16Array {
  const totalFrames = Math.max(1, Math.ceil(durationSec * sampleRate));
  const mixL = new Float32Array(totalFrames);
  const mixR = new Float32Array(totalFrames);

  // 4 farklı modern sci-fi/ambient minör akor yürüyüşü (Hz)
  const PROGRESSIONS: number[][][] = [
    [
      [110.0, 220.0, 261.63, 329.63], // Am
      [87.31, 174.61, 220.0, 261.63], // F
      [130.81, 261.63, 329.63, 392.0], // C
      [98.0, 196.0, 246.94, 293.66], // G
    ],
    [
      [130.81, 261.63, 311.13, 392.0], // Cm
      [103.83, 207.65, 261.63, 311.13], // Ab
      [116.54, 233.08, 293.66, 349.23], // Bb
      [98.0, 196.0, 246.94, 293.66], // G
    ],
    [
      [146.83, 293.66, 349.23, 440.0], // Dm
      [116.54, 233.08, 293.66, 349.23], // Bb
      [130.81, 261.63, 329.63, 392.0], // C
      [110.0, 220.0, 261.63, 329.63], // Am
    ],
    [
      [164.81, 329.63, 392.0, 493.88], // Em
      [130.81, 261.63, 329.63, 392.0], // C
      [196.0, 392.0, 493.88, 587.33], // G
      [146.83, 293.66, 369.99, 440.0], // D
    ],
  ];

  const prog = PROGRESSIONS[Math.abs(seed) % PROGRESSIONS.length];
  const bpm = 114 + (Math.abs(seed * 7) % 14); // 114–127 BPM dinamik tempo
  const beatSec = 60 / bpm;
  const stepSec = beatSec / 2; // 8'lik arpej adımları
  const totalSteps = Math.ceil(durationSec / stepSec);

  for (let step = 0; step < totalSteps; step++) {
    const t0 = step * stepSec;
    const start = Math.floor(t0 * sampleRate);
    if (start >= totalFrames) break;
    const bar = Math.floor(step / 8);
    const chord = prog[bar % prog.length];

    // 1) Her vuruşta (çift adımlarda) yumuşak derin sub-kick nabzı
    if (step % 2 === 0) {
      const kLen = Math.min(totalFrames - start, Math.floor(sampleRate * 0.16));
      for (let i = 0; i < kLen; i++) {
        const dt = i / sampleRate;
        const f = 92 * Math.exp(-dt * 22) + 42;
        const kick = Math.sin(2 * Math.PI * f * dt) * Math.exp(-dt * 16) * 0.24;
        mixL[start + i] += kick;
        mixR[start + i] += kick;
      }
    }

    // 2) Sıcak analog bas notası (bar başında)
    if (step % 4 === 0) {
      const bassHz = chord[0];
      const bLen = Math.min(totalFrames - start, Math.floor(sampleRate * beatSec * 1.9));
      for (let i = 0; i < bLen; i++) {
        const dt = i / sampleRate;
        const env = Math.min(1, dt / 0.015) * Math.exp(-dt * 2.2);
        const bass =
          (Math.sin(2 * Math.PI * bassHz * dt) * 0.78 +
            Math.sin(2 * Math.PI * bassHz * 2 * dt) * 0.22) *
          env *
          0.16;
        mixL[start + i] += bass;
        mixR[start + i] += bass;
      }
    }

    // 3) Stereo hipnotik arpej tınısı
    const arpHz = chord[1 + (step % 3)] * (step % 8 === 7 ? 2 : 1);
    const aLen = Math.min(totalFrames - start, Math.floor(sampleRate * stepSec * 0.92));
    const pan = (step % 2 === 0 ? -1 : 1) * 0.25;
    for (let i = 0; i < aLen; i++) {
      const dt = i / sampleRate;
      const env = Math.min(1, dt / 0.008) * Math.exp(-dt * 7.5);
      const arp =
        (Math.sin(2 * Math.PI * arpHz * dt) * 0.75 +
          Math.sin(2 * Math.PI * arpHz * 2 * dt) * 0.18) *
        env *
        0.11;
      mixL[start + i] += arp * (1 - Math.max(0, pan));
      mixR[start + i] += arp * (1 + Math.min(0, pan));
    }
  }

  // Başta hızlı fade-in (0.2s), sonda yumuşak fade-out (0.8s)
  const fadeInSamples = Math.floor(0.2 * sampleRate);
  const fadeOutSamples = Math.floor(0.8 * sampleRate);
  const out = new Int16Array(totalFrames * 2);
  for (let i = 0; i < totalFrames; i++) {
    let env = 1;
    if (i < fadeInSamples) env = i / Math.max(1, fadeInSamples);
    else if (i > totalFrames - fadeOutSamples) env = (totalFrames - i) / Math.max(1, fadeOutSamples);
    out[i * 2] = Math.round(Math.tanh(mixL[i] * env) * 32000);
    out[i * 2 + 1] = Math.round(Math.tanh(mixR[i] * env) * 32000);
  }
  return out;
}
