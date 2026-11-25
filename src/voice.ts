import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

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
 * İngilizce seslendirme üretir.
 * 1) Birincil: haber.yukselmedya.com TTS API (doğal insan sesi)
 * 2) Yedek (macOS): `say`
 * 3) Yedek (Linux / GitHub Actions): `espeak-ng` veya `espeak`
 */
export async function synthesizeVoice(text: string, outFile: string): Promise<string> {
  try {
    const r = await fetch("https://haber.yukselmedya.com/api/v1/ses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metin: text, ses: "erkek", dil: "en" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 400) {
        await writeFile(outFile, buf);
        return outFile;
      }
    }
  } catch {
    // Çevrimdışıysa yerel sentezleyiciye düş
  }

  if (process.platform === "darwin") {
    const aiff = `${outFile}.aiff`;
    await runBin("say", ["-v", "Samantha", "-r", "195", "-o", aiff, text]);
    return aiff;
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
