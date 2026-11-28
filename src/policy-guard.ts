export type PolicyChannelId = "physics" | "explainer" | "wealth" | "bio";

export interface PolicyCheckInput {
  channel: PolicyChannelId;
  title: string;
  description: string;
  recentTitles: string[];
}

export interface PolicyCheckResult {
  ok: boolean;
  maxSimilarity: number;
  closestTitle?: string;
  errors: string[];
  warnings: string[];
}

const FORBIDDEN_PERSONA_PATTERNS: RegExp[] = [
  /\b(i am|i'm)\s+(a|your)\s+(doctor|physician|cardiologist|financial advisor|cpa|broker)\b/i,
  /\bguaranteed\s+(returns?|profits?|millionaire|income)\b/i,
  /\bmedical\s+diagnosis\b/i,
  /\bfinancial\s+advice\b(?!.*not\s+financial\s+advice)/i,
];

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/#\w+/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );
}

/** İki metin arasındaki Jaccard kelime benzerliği (0.0 – 1.0). */
export function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) {
    if (sb.has(w)) inter++;
  }
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Y-LABS OS v2.1 Politika & Benzerlik Kapısı (YouTube Help 1311392 "Inauthentic Content" Koruması):
 * 1) Kanal içi ve kanallar arası aşırı benzer başlık/şablon tekrarını yakalar (>= 0.72 eşik).
 * 2) Wealth ve Bio kanallarında AI doktor/finans danışmanı personası yasağını ve
 *    eğitim amaçlı feragatname (disclaimer) kuralını denetler.
 */
export function runPolicyGuard(input: PolicyCheckInput): PolicyCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let maxSimilarity = 0;
  let closestTitle: string | undefined;
  for (const prev of input.recentTitles) {
    const sim = jaccardSimilarity(input.title, prev);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      closestTitle = prev;
    }
  }
  if (maxSimilarity >= 0.78) {
    errors.push(`Aşırı başlık benzerliği (${(maxSimilarity * 100).toFixed(0)}%): "${closestTitle}"`);
  } else if (maxSimilarity >= 0.62) {
    warnings.push(`Yüksek başlık benzerliği (${(maxSimilarity * 100).toFixed(0)}%): "${closestTitle}"`);
  }

  if (input.channel === "wealth" || input.channel === "bio") {
    const combined = `${input.title}\n${input.description}`;
    for (const pat of FORBIDDEN_PERSONA_PATTERNS) {
      if (pat.test(combined)) {
        errors.push(`Hassas niş AI persona/iddia kuralı ihlali (${input.channel}): ${pat.source}`);
      }
    }
    const lowDesc = input.description.toLowerCase();
    const hasDisclaimer =
      lowDesc.includes("educational") ||
      lowDesc.includes("not financial advice") ||
      lowDesc.includes("not medical advice") ||
      lowDesc.includes("visualization") ||
      lowDesc.includes("simulation");
    if (!hasDisclaimer) {
      warnings.push(`${input.channel} açıklamasında "educational / simulation" ibaresi eksik — otomatik eklenecek.`);
    }
  }

  return {
    ok: errors.length === 0,
    maxSimilarity: Number(maxSimilarity.toFixed(3)),
    closestTitle,
    errors,
    warnings,
  };
}

/** Wealth & Bio açıklamalarına YouTube Help 1311392 uyumlu kısa eğitim feragatnamesini garanti eder. */
export function ensureSensitiveDisclaimer(channel: PolicyChannelId, description: string): string {
  const low = description.toLowerCase();
  if (channel === "wealth" && !low.includes("not financial advice")) {
    return `${description}\n\n(Educational math visualization only — not financial advice.)`;
  }
  if (channel === "bio" && !low.includes("not medical advice")) {
    return `${description}\n\n(Educational anatomy & biology visualization only — not medical advice.)`;
  }
  return description;
}
