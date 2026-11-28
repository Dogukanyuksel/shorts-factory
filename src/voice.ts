import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fetchWithRetry } from "./devops.js";

export type VoiceChannelId = "physics" | "explainer" | "wealth" | "bio";

export interface KokoroVoiceConfig {
  voice:
    | "af_heart"
    | "af_alloy"
    | "af_aoede"
    | "af_bella"
    | "af_jessica"
    | "af_kore"
    | "af_nicole"
    | "af_nova"
    | "af_river"
    | "af_sarah"
    | "af_sky"
    | "am_adam"
    | "am_echo"
    | "am_eric"
    | "am_fenrir"
    | "am_liam"
    | "am_michael"
    | "am_onyx"
    | "am_puck"
    | "am_santa";
  speed: number;
  label: string;
}

/**
 * Y-LABS OS v2.2 — 4 kanal = 4 benzersiz ABD İngilizcesi nöral imza ses (2 Erkek + 2 Kadın, $0/ay Kokoro-82M).
 * - Kinetic Lab (physics): am_fenrir (Erkek, C+)
 * - Clear Mechanics (explainer): am_michael (Erkek, C+)
 * - Wealth Mechanics (wealth): af_bella (Kadın, Grade A- — keskin finans analisti)
 * - Bio Mechanics (bio): af_heart (Kadın, Grade A — sıcak tıp/biyoloji anlatıcısı)
 */
export const KOKORO_CHANNEL_VOICES: Record<VoiceChannelId, KokoroVoiceConfig> = {
  physics: {
    voice: "am_fenrir",
    speed: 1.04,
    label: "Fenrir (US Male — Energetic Science)",
  },
  explainer: {
    voice: "am_michael",
    speed: 1.0,
    label: "Michael (US Male — Engineering Documentary)",
  },
  wealth: {
    voice: "af_bella",
    speed: 0.98,
    label: "Bella (US Female, Grade A- — Sharp Financial Analyst)",
  },
  bio: {
    voice: "af_heart",
    speed: 1.0,
    label: "Heart (US Female, Grade A — Warm Medical Narrator)",
  },
};

/**
 * Uzun videolarda (6-8 dk 4-Perdeli Derin Belgesel) 2. Perdede kulak yorgunluğunu kırmak için
 * karşı cinsiyette yardımcı belgesel anlatıcısı (Co-Host). Shorts'larda kullanılmaz; marka sesi sabit kalır.
 */
export const KOKORO_COHOST_VOICES: Record<VoiceChannelId, KokoroVoiceConfig> = {
  physics: {
    voice: "af_nova",
    speed: 1.02,
    label: "Nova (Co-Host — Physics Act 2)",
  },
  explainer: {
    voice: "af_sarah",
    speed: 1.0,
    label: "Sarah (Co-Host — Engineering Act 2)",
  },
  wealth: {
    voice: "am_adam",
    speed: 0.99,
    label: "Adam (Co-Host — Wealth Act 2)",
  },
  bio: {
    voice: "am_eric",
    speed: 1.0,
    label: "Eric (Co-Host — Bio Act 2)",
  },
};

export type VoiceRole = "primary" | "cohost";

const OPENAI_CHANNEL_VOICES: Record<VoiceChannelId, { voice: string; instructions: string }> = {
  physics: {
    voice: "ash",
    instructions: "Crisp, high-energy science narrator. Short pauses before shocking reveals. Clear American English.",
  },
  explainer: {
    voice: "onyx",
    instructions: "Authoritative engineering documentary narrator. Measured, precise pacing. Clear American English.",
  },
  wealth: {
    voice: "shimmer",
    instructions: "Calm, sharp financial analyst narrator. Confident, clear numerical emphasis. Clear American English.",
  },
  bio: {
    voice: "nova",
    instructions: "Warm, engaging medical & human-body documentary narrator. Vivid, clear American English.",
  },
};

type KokoroInstance = {
  generate: (
    text: string,
    opts: { voice: KokoroVoiceConfig["voice"]; speed?: number },
  ) => Promise<{ save: (path: string) => Promise<void> }>;
};

let kokoroSingleton: Promise<KokoroInstance> | null = null;

async function getKokoro(): Promise<KokoroInstance> {
  if (!kokoroSingleton) {
    kokoroSingleton = (async () => {
      const cacheDir = process.env.KOKORO_CACHE_DIR?.trim() || join(homedir(), ".cache", "kokoro-82m");
      await mkdir(cacheDir, { recursive: true });
      const transformers = await import("@huggingface/transformers");
      transformers.env.cacheDir = cacheDir;
      const { KokoroTTS } = await import("kokoro-js");
      const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: "q8",
        device: "cpu",
      });
      return tts as unknown as KokoroInstance;
    })().catch((err) => {
      kokoroSingleton = null;
      throw err;
    });
  }
  return kokoroSingleton;
}

function resolveKokoroConfig(channel: VoiceChannelId, role: VoiceRole = "primary"): KokoroVoiceConfig {
  const table = role === "cohost" ? KOKORO_COHOST_VOICES : KOKORO_CHANNEL_VOICES;
  const base = table[channel] || table.explainer;
  if (role === "primary") {
    const envKey = `KOKORO_VOICE_${channel.toUpperCase()}`;
    const override = process.env[envKey]?.trim();
    if (override) {
      return { ...base, voice: override as KokoroVoiceConfig["voice"] };
    }
  }
  return base;
}

function runBin(bin: string, args: string[]): Promise<void> {
  return new Promise((ok, no) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err = (err + String(d)).slice(-500); });
    p.on("error", no);
    p.on("close", (c) => (c === 0 ? ok() : no(new Error(`${bin} exit ${c}: ${err}`))));
  });
}

/**
 * Y-LABS OS v2.2 Çoklu Nöral Seslendirme Motoru:
 * 1) OPENAI_API_KEY tanımlıysa: kanal başına 4 farklı OpenAI nöral belgesel sesi
 * 2) Varsayılan $0/ay birincil: Kokoro-82M (Apache-2.0, 2 Erkek + 2 Kadın imza ses + uzun videoda 2. Perde Co-Host)
 * 3) Yedek nöral API: haber.yukselmedya.com (3 deneme + üstel bekleme)
 * 4) Üretimde robotik `espeak-ng` YASAKTIR (yalnızca DRY_RUN=true veya ALLOW_ROBOTIC_TTS=true yerel testte).
 */
export async function synthesizeVoice(
  text: string,
  outFile: string,
  channel: VoiceChannelId = "explainer",
  opts: { role?: VoiceRole } = {},
): Promise<string> {
  const role: VoiceRole = opts.role ?? "primary";
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const cfg = OPENAI_CHANNEL_VOICES[channel] || OPENAI_CHANNEL_VOICES.explainer;
      const r = await fetchWithRetry(
        "https://api.openai.com/v1/audio/speech",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice: cfg.voice,
            input: text,
            instructions: cfg.instructions,
            response_format: "mp3",
          }),
        },
        { retries: 2, baseDelayMs: 1500, timeoutMs: 25_000 },
      );
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 400) {
          await writeFile(outFile, buf);
          return outFile;
        }
      }
    } catch (err) {
      console.warn(`[voice] OpenAI TTS uyarısı (${channel}), Kokoro-82M'e geçiliyor:`, err instanceof Error ? err.message : String(err));
    }
  }

  if (process.env.DISABLE_KOKORO !== "true") {
    try {
      const tts = await getKokoro();
      const cfg = resolveKokoroConfig(channel, role);
      const audio = await tts.generate(text, { voice: cfg.voice, speed: cfg.speed });
      const wavOut = outFile.endsWith(".wav") ? outFile : `${outFile}.wav`;
      await audio.save(wavOut);
      return wavOut;
    } catch (err) {
      console.warn(
        `[voice] Kokoro-82M uyarısı (${channel}/${role}), yedek nöral API'ye geçiliyor:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  try {
    const r = await fetchWithRetry(
      "https://haber.yukselmedya.com/api/v1/ses",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metin: text, ses: "erkek", dil: "en" }),
      },
      { retries: 3, baseDelayMs: 2000, timeoutMs: 25_000 },
    );
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 400) {
        await writeFile(outFile, buf);
        return outFile;
      }
    }
  } catch (err) {
    console.warn(`[voice] Yedek nöral TTS başarısız (${channel}): ${err instanceof Error ? err.message : String(err)}`);
  }

  if (process.platform === "darwin") {
    const aiff = `${outFile}.aiff`;
    await runBin("say", ["-v", "Samantha", "-r", "195", "-o", aiff, text]);
    return aiff;
  }

  const allowRobotic = process.env.DRY_RUN === "true" || process.env.ALLOW_ROBOTIC_TTS === "true";
  if (!allowRobotic) {
    throw new Error(
      `[voice] Nöral TTS başarısız ve üretimde robotik espeak-ng YASAK (${channel}). ` +
        `Yayın iptal edildi — kaliteli sesle sonraki slotta tekrar denenecek.`,
    );
  }

  const wav = `${outFile}.wav`;
  try {
    await runBin("espeak-ng", ["-v", "en-us", "-s", "170", "-w", wav, text]);
    return wav;
  } catch {
    await runBin("espeak", ["-v", "en-us", "-s", "170", "-w", wav, text]);
    return wav;
  }
}
