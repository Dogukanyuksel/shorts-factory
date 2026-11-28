import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fetchWithRetry } from "./devops.js";

export type VoiceChannelId = "physics" | "explainer" | "wealth" | "bio";

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
    voice: "echo",
    instructions: "Calm, sharp financial analyst narrator. Confident, clear numerical emphasis. Clear American English.",
  },
  bio: {
    voice: "nova",
    instructions: "Warm, engaging medical & human-body documentary narrator. Vivid, clear American English.",
  },
};

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
 * Y-LABS OS v2.1 Çoklu Nöral Seslendirme Motoru:
 * 1) OPENAI_API_KEY tanımlıysa: kanal başına 4 farklı OpenAI nöral belgesel sesi (ash / onyx / echo / nova)
 * 2) Varsayılan ücretsiz birincil: haber.yukselmedya.com doğal nöral TTS API (3 deneme + üstel bekleme)
 * 3) Üretimde robotik `espeak-ng` YASAKTIR (yalnızca DRY_RUN=true veya ALLOW_ROBOTIC_TTS=true yerel testte).
 */
export async function synthesizeVoice(
  text: string,
  outFile: string,
  channel: VoiceChannelId = "explainer",
): Promise<string> {
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
      console.warn(`[voice] OpenAI TTS uyarısı (${channel}), birincil nöral API'ye geçiliyor:`, err instanceof Error ? err.message : String(err));
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
    console.warn(`[voice] Birincil nöral TTS başarısız (${channel}): ${err instanceof Error ? err.message : String(err)}`);
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
