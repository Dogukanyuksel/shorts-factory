import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * YouTube Data API kota yönetimi.
 *
 * - Günlük kota her gün GECE YARISI PASİFİK SAATİ'nde (America/Los_Angeles) sıfırlanır.
 * - Kota tek bir Google Cloud projesine (OAuth client) bağlıdır: iki kanal AYNI client ile yükleme
 *   yaparsa kotayı paylaşır. YOUTUBE_CLIENT_ID_PHYSICS / _EXPLAINER ile her kanala ayrı proje verilebilir.
 * - Kota dolunca: o projenin yüklemeleri sıfırlanma anına kadar "bloklanır"; sonraki çalışmalar
 *   render bile yapmadan temiz biçimde atlar (CI dakikası ve gereksiz "run failed" yok).
 */

export const QUOTA_STATE_PATH = resolve("state", "youtube-quota.json");

export type QuotaBlock = { until: string; reason: string; at: string; channel?: string };
export type QuotaState = { blocks: Record<string, QuotaBlock> };

/** YouTube'un kota/limit hata gerekçeleri (403/400/429 yanıt gövdesinde "reason"). */
const QUOTA_REASONS = /quotaExceeded|dailyLimitExceeded|uploadLimitExceeded|userRateLimitExceeded|rateLimitExceeded/i;

export class YouTubeQuotaError extends Error {
  constructor(
    public readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "YouTubeQuotaError";
  }
}

/** OAuth refresh token iptal edildi / süresi doldu (ör. OAuth ekranı "Testing" modunda → 7 günde düşer). */
export class YouTubeAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeAuthError";
  }
}

export function detectQuotaReason(status: number, body: string): string | null {
  if (status !== 403 && status !== 400 && status !== 429) return null;
  const m = body.match(QUOTA_REASONS);
  return m ? m[0] : null;
}

/** Bir sonraki Pasifik gece yarısı (YouTube kota sıfırlama anı), UTC Date olarak. */
export function nextPacificMidnight(now: Date = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  // Önce PST (UTC-8) varsay, sonra o anda PT saati 00 değilse (PDT, UTC-7) 1 saat düzelt
  let guess = new Date(Date.UTC(y, m - 1, d + 1, 8, 0, 0));
  const hourThere = Number(
    Object.fromEntries(fmt.formatToParts(guess).map((p) => [p.type, p.value])).hour,
  );
  if (hourThere !== 0) guess = new Date(guess.getTime() - hourThere * 3_600_000);
  return guess;
}

/** Kota anahtarı: OAuth client ID'nin kısa özeti (aynı proje = aynı kota). Secret değildir ama yine de hashlenir. */
export function quotaKey(clientId: string): string {
  return createHash("sha256").update(clientId).digest("hex").slice(0, 12);
}

export async function loadQuotaState(path = QUOTA_STATE_PATH): Promise<QuotaState> {
  if (!existsSync(path)) return { blocks: {} };
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<QuotaState>;
    return { blocks: parsed.blocks && typeof parsed.blocks === "object" ? parsed.blocks : {} };
  } catch {
    return { blocks: {} };
  }
}

export async function saveQuotaState(state: QuotaState, path = QUOTA_STATE_PATH): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/** Aktif blok varsa döner (süresi geçmiş blokları yok sayar). */
export function activeBlock(state: QuotaState, key: string, now: Date = new Date()): QuotaBlock | null {
  const b = state.blocks[key];
  if (!b) return null;
  return Date.parse(b.until) > now.getTime() ? b : null;
}

export async function recordQuotaBlock(key: string, reason: string, channel: string, now: Date = new Date()): Promise<QuotaBlock> {
  const state = await loadQuotaState();
  // Süresi geçmiş blokları temizle
  for (const [k, b] of Object.entries(state.blocks)) if (Date.parse(b.until) <= now.getTime()) delete state.blocks[k];
  const block: QuotaBlock = { until: nextPacificMidnight(now).toISOString(), reason, at: now.toISOString(), channel };
  state.blocks[key] = block;
  await saveQuotaState(state);
  return block;
}

/** Kanal için OAuth client: önce kanala özel proje, yoksa ortak proje. */
export function resolveYouTubeClient(channel: "physics" | "explainer", env: NodeJS.ProcessEnv = process.env) {
  const suffix = channel === "explainer" ? "EXPLAINER" : "PHYSICS";
  const clientId = env[`YOUTUBE_CLIENT_ID_${suffix}`]?.trim() || env.YOUTUBE_CLIENT_ID?.trim() || "";
  const clientSecret = env[`YOUTUBE_CLIENT_SECRET_${suffix}`]?.trim() || env.YOUTUBE_CLIENT_SECRET?.trim() || "";
  return { clientId, clientSecret };
}

/**
 * Workflow'un Telegram'a iletmesi için bilgi notu yazar (hata DEĞİL, bilgilendirme).
 * GitHub Actions'da ayrıca iş özetine (step summary) eklenir.
 */
export async function writePublishNotice(text: string): Promise<void> {
  await mkdir(resolve("out"), { recursive: true });
  await writeFile(resolve("out", "publish-notice.txt"), text, "utf8");
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) await writeFile(summary, `${text}\n`, { flag: "a" });
  console.log(`::notice::${text.replace(/\n/g, " ")}`);
}

/** Yayın hatasının okunabilir özetini Telegram hata mesajı için dosyaya yazar. */
export async function writeLastError(err: unknown): Promise<void> {
  try {
    await mkdir(resolve("out"), { recursive: true });
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await writeFile(resolve("out", "last-error.txt"), msg.slice(0, 700), "utf8");
  } catch {
    // en iyi çaba
  }
}

export function formatTrTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
