/**
 * GÜVENİLİR ZAMANLAYICI (Dispatcher / Watchdog)
 *
 * GitHub'ın `schedule` tetikleyicisi "en iyi çaba"dır: yoğun saatlerde saatlerce gecikir ya da hiç çalışmaz.
 * Bu script, yayın takvimini kendisi tutar ve her çalıştığında:
 *   1) Saati gelmiş ama hiç çalışmamış bir iş varsa → hemen workflow_dispatch ile başlatır
 *   2) Saati gelmiş, çalışmış ama başarısız olmuşsa → 1 kez yeniden dener
 * Kendisi 10 dakikada bir + her workflow bittiğinde tetiklenir; bunlardan TEK BİRİNİN gelmesi tüm
 * kaçırılan işleri telafi etmeye yeter. Çift yayın olmaz: publish script'leri yayın aralığı korumasına uyar.
 */

export type SlotDef = {
  key: string;
  workflow: string;
  /** UTC saat:dakika listesi */
  times: Array<[number, number]>;
  /** Kaçırılan bir slot ne kadar geriye kadar telafi edilir (dakika) */
  lookbackMin: number;
  inputs?: Record<string, string>;
  /** Aynı workflow birden çok slot türü çalıştırıyorsa (long-form), run başlığıyla ayırt et */
  titleFilter?: RegExp;
};

const everyTwoHours: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [i * 2, 23] as [number, number]);

export const SLOTS: SlotDef[] = [
  { key: "physics-shorts", workflow: "auto-publish-physics.yml", times: [[11, 7], [17, 7], [23, 7]], lookbackMin: 300 },
  { key: "explainer-shorts", workflow: "auto-publish-explainer.yml", times: [[11, 37], [17, 37], [23, 37]], lookbackMin: 300 },
  {
    key: "longform-explainer",
    workflow: "auto-publish-longform.yml",
    times: [[14, 15]],
    lookbackMin: 360,
    inputs: { channel: "explainer" },
    titleFilter: /Long-Form (explainer|both)/,
  },
  {
    key: "longform-physics",
    workflow: "auto-publish-longform.yml",
    times: [[15, 15]],
    lookbackMin: 360,
    inputs: { channel: "physics" },
    titleFilter: /Long-Form (physics|both)/,
  },
  { key: "engagement", workflow: "engagement.yml", times: everyTwoHours, lookbackMin: 110 },
  { key: "telegram-monitor", workflow: "telegram-monitor.yml", times: [[0, 15], [6, 15], [12, 15], [18, 15]], lookbackMin: 300 },
];

/** Slotun `now` anından önceki EN SON gerçekleşme zamanı (lookback içinde değilse null). */
export function latestOccurrence(slot: SlotDef, now: Date): Date | null {
  let best: Date | null = null;
  for (const dayOffset of [0, -1]) {
    for (const [h, m] of slot.times) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, h, m, 0));
      if (d.getTime() <= now.getTime() && (!best || d > best)) best = d;
    }
  }
  if (!best) return null;
  return now.getTime() - best.getTime() <= slot.lookbackMin * 60_000 ? best : null;
}

export type RunInfo = {
  created_at: string;
  status: string;
  conclusion: string | null;
  display_title: string;
  event: string;
};

export type Decision = { action: "ok" | "dispatch" | "retry" | "wait"; reason: string };

/**
 * Slot için ne yapılacağına karar verir.
 * - Slot zamanından (2 dk tolerans) sonra oluşturulmuş, filtreye uyan çalışmalar dikkate alınır.
 * - Biri başarılı/devam ediyorsa: ok
 * - Hiç yoksa: dispatch
 * - Hepsi başarısızsa ve 2'den az deneme varsa: retry; yoksa ok (sonsuz döngü yok)
 */
export function decide(slot: SlotDef, occurrence: Date, runs: RunInfo[]): Decision {
  const since = occurrence.getTime() - 2 * 60_000;
  const relevant = runs.filter(
    (r) => Date.parse(r.created_at) >= since && (!slot.titleFilter || slot.titleFilter.test(r.display_title)),
  );
  if (relevant.length === 0) return { action: "dispatch", reason: "slot saati geçti, hiç çalışma yok" };
  if (relevant.some((r) => r.status !== "completed")) return { action: "wait", reason: "çalışma devam ediyor" };
  if (relevant.some((r) => r.conclusion === "success" || r.conclusion === "skipped")) {
    return { action: "ok", reason: "başarılı" };
  }
  if (relevant.length < 2) return { action: "retry", reason: `başarısız (${relevant[0].conclusion}), 1 kez yeniden deneniyor` };
  return { action: "ok", reason: "2 deneme de başarısız, Telegram hata bildirimi zaten gitti" };
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const res = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${path} (${res.status}): ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function main() {
  const now = new Date();
  const dryRun = process.env.DRY_RUN === "true";
  const actions: string[] = [];

  for (const slot of SLOTS) {
    const occ = latestOccurrence(slot, now);
    if (!occ) continue;
    const created = new Date(occ.getTime() - 2 * 60_000).toISOString();
    const json = await gh<{ workflow_runs?: RunInfo[] }>(
      `actions/workflows/${slot.workflow}/runs?per_page=30&created=${encodeURIComponent(`>=${created}`)}`,
    );
    const d = decide(slot, occ, json.workflow_runs || []);
    const label = `${slot.key} @ ${occ.toISOString().slice(11, 16)} UTC`;
    console.log(`[scheduler] ${label}: ${d.action} — ${d.reason}`);
    if ((d.action === "dispatch" || d.action === "retry") && !dryRun) {
      await gh(`actions/workflows/${slot.workflow}/dispatches`, {
        method: "POST",
        body: JSON.stringify({ ref: "main", ...(slot.inputs ? { inputs: slot.inputs } : {}) }),
      });
      actions.push(`${d.action === "retry" ? "↻ yeniden denendi" : "▶ başlatıldı"}: ${label}`);
    }
  }

  if (actions.length) console.log(`::notice::Zamanlayıcı müdahale etti → ${actions.join(" · ")}`);
  else console.log("✅ [scheduler] Tüm slotlar yolunda.");
}

const isDirectRun = process.argv[1]?.endsWith("scheduler.ts") || process.argv[1]?.endsWith("scheduler.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[scheduler] HATA:", e);
    process.exit(1);
  });
}
