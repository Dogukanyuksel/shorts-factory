import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpegPath: string = require("ffmpeg-static");

export type QcReport = {
  ok: boolean;
  fileSizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  hasH264Video: boolean;
  hasAacAudio: boolean;
  errors: string[];
};

function probeWithFfmpeg(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ["-i", filePath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => { stderr += String(d); });
    p.on("error", reject);
    // ffmpeg -i <file> çıktı dosyası verilmediği için 1 ile çıkar, stderr'de stream bilgisi vardır
    p.on("close", () => resolve(stderr));
  });
}

export function parseFfmpegProbe(stderr: string) {
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const durationSec = durMatch
    ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
    : 0;

  const resMatch = stderr.match(/Video:[^\n]*?,\s*(\d{3,4})x(\d{3,4})/);
  const width = resMatch ? Number(resMatch[1]) : 0;
  const height = resMatch ? Number(resMatch[2]) : 0;

  const hasH264Video = /Video:\s*h264/i.test(stderr);
  const hasAacAudio = /Audio:\s*aac/i.test(stderr);

  return { durationSec, width, height, hasH264Video, hasAacAudio };
}

/**
 * Yayın öncesi otomatik kalite kontrol kapısı (Pre-Publish QC Gate).
 * Bozuk, sessiz, yanlış çözünürlüklü veya 60 sn sınırını aşan videoların yayınlanmasını engeller.
 */
export async function runVideoQc(filePath: string): Promise<QcReport> {
  const errors: string[] = [];
  const st = await stat(filePath);
  const fileSizeBytes = st.size;

  if (fileSizeBytes < 300_000) {
    errors.push(`Dosya boyutu anormal küçük (${Math.round(fileSizeBytes / 1024)} KB) — siyah/bozuk render olabilir.`);
  }

  const stderr = await probeWithFfmpeg(filePath);
  const parsed = parseFfmpegProbe(stderr);

  if (!parsed.hasH264Video) {
    errors.push("H.264 video akışı bulunamadı.");
  }
  if (!parsed.hasAacAudio) {
    errors.push("AAC ses akışı bulunamadı (sessiz video engellendi).");
  }
  if (parsed.width !== 1080 || parsed.height !== 1920) {
    errors.push(`Beklenen çözünürlük 1080x1920, bulunan: ${parsed.width}x${parsed.height}`);
  }
  if (parsed.durationSec < 12 || parsed.durationSec > 59.5) {
    errors.push(`Shorts süresi sınır dışında (${parsed.durationSec.toFixed(1)}s; 12–59.5s arası olmalı).`);
  }

  return {
    ok: errors.length === 0,
    fileSizeBytes,
    ...parsed,
    errors,
  };
}
