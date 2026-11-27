/**
 * DevOps yardımcıları: geçici ağ/5xx hatalarında üstel geri çekilmeli fetch,
 * URL token maskeleme ve state/published.json güvenli birleştirme.
 */

export function redactTokens(input: string): string {
  return input
    .replace(/(access_token=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(key=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+|OAuth\s+)[^\s"']+/gi, "$1[REDACTED]");
}

export function isValidInstagramMediaId(id: string | undefined): boolean {
  return Boolean(id && /^\d{8,30}$/.test(id.trim()));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: { retries?: number; baseDelayMs?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1500;
  const timeoutMs = opts.timeoutMs ?? 25_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
      if (res.ok || (res.status < 500 && res.status !== 429)) {
        return res;
      }
      if (attempt + 1 >= retries) return res;
      const retryAfterSec = Number(res.headers.get("retry-after") || 0);
      const delayMs = retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 15_000) : baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delayMs));
    } catch (err) {
      lastErr = err;
      if (attempt + 1 >= retries) {
        const msg = err instanceof Error ? redactTokens(err.message) : redactTokens(String(err));
        throw new Error(msg);
      }
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(redactTokens(String(lastErr)));
}

export type MinimalPublishedRecord = {
  id: string;
  videoId?: string;
  instagramMediaId?: string;
  [k: string]: unknown;
};

/**
 * İki paralel workflow'un (physics + explainer) aynı anda state/published.json'a yazması durumunda
 * kayıt kaybetmeden ve tekrar oluşturmadan güvenli birleştirme yapar.
 */
export function mergePublishedRecords<T extends MinimalPublishedRecord>(
  base: T[],
  incoming: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of base) {
    if (item?.id) byId.set(item.id, { ...item });
  }
  for (const item of incoming) {
    if (!item?.id) continue;
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, { ...item });
    } else {
      byId.set(item.id, {
        ...prev,
        ...item,
        videoId: item.videoId || prev.videoId,
        instagramMediaId: item.instagramMediaId || prev.instagramMediaId,
      });
    }
  }
  return [...byId.values()];
}

/** Senkron bekleme (CLI script'lerinde retry backoff için). */
export function sleepSync(ms: number): void {
  if (ms <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Bir kanalın belirli türdeki (short / longform) en son yayınından bu yana geçen süre (saat).
 * Hiç yayın yoksa Infinity döner.
 */
export function hoursSinceLastPublish(
  records: Array<{ id: string; channel?: unknown; publishedAt?: unknown }>,
  channel: string,
  kind: "short" | "longform",
  now: Date = new Date(),
): number {
  let latest = -Infinity;
  for (const r of records) {
    if (r.channel !== channel) continue;
    const isLong = r.id.startsWith("longform-");
    if ((kind === "longform") !== isLong) continue;
    const t = Date.parse(String(r.publishedAt ?? ""));
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  return latest === -Infinity ? Infinity : (now.getTime() - latest) / 3_600_000;
}

/** MIN_PUBLISH_GAP_HOURS / FORCE_PUBLISH ortam değişkenlerinden yayın aralığı korumasını okur (0 = kapalı). */
export function resolveMinGapHours(env: NodeJS.ProcessEnv = process.env): number {
  if (env.FORCE_PUBLISH === "true") return 0;
  const n = Number(env.MIN_PUBLISH_GAP_HOURS || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Kanal için Meta (Instagram) erişim token'ı: önce kanala özel (META_ACCESS_TOKEN_PHYSICS / _EXPLAINER),
 * yoksa ortak META_ACCESS_TOKEN. Kanallar ayrı Business portföylerindeyse her biri kendi system-user token'ını kullanır.
 */
export function resolveMetaToken(channel: "physics" | "explainer", env: NodeJS.ProcessEnv = process.env): string {
  const specific = (channel === "explainer" ? env.META_ACCESS_TOKEN_EXPLAINER : env.META_ACCESS_TOKEN_PHYSICS)?.trim();
  return specific || env.META_ACCESS_TOKEN?.trim() || "";
}

export type PublishedFile<T extends MinimalPublishedRecord = MinimalPublishedRecord> = {
  published: T[];
  /**
   * "Silinenler listesi" (tombstone): bu videoId'lere sahip kayıtlar, birleştirmede eski bir kopyadan
   * geri gelse bile her zaman düşürülür. (Yanlış kanala giden videoyu yeniden yayınlatmak için kullanılır.)
   */
  removedVideoIds?: string[];
};

/** İki published.json içeriğini birleştirir: kayıtlar birleşir, silinenler listesi birleşir ve uygulanır. */
export function mergePublishedFiles<T extends MinimalPublishedRecord>(
  base: Partial<PublishedFile<T>>,
  incoming: Partial<PublishedFile<T>>,
): PublishedFile<T> {
  const removed = [...new Set([...(base.removedVideoIds || []), ...(incoming.removedVideoIds || [])])];
  const removedSet = new Set(removed);
  // Silinenler birleştirmeden ÖNCE ayıklanır: eski kopyadaki silinmiş kayıt, aynı işin yeni yayınını ezemez
  const alive = (rs: T[] | undefined) => (rs || []).filter((r) => !(r.videoId && removedSet.has(r.videoId)));
  const merged = mergePublishedRecords(alive(base.published), alive(incoming.published));
  return { published: merged, ...(removed.length ? { removedVideoIds: removed } : {}) };
}
