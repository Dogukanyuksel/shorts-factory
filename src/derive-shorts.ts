import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ChannelId } from "./catalog.js";
import type { DerivedShortSpec, NarrativeLongformSpec } from "./longform-narrative.js";

export interface DerivedShortQueueItem {
  id: string;
  channel: NarrativeLongformSpec["channel"];
  parentEpisodeId: string;
  parentSlug: string;
  parentVideoId: string;
  parentTitle: string;
  parentUrl: string;
  shortIndex: 0 | 1 | 2;
  hook: string;
  partLabel: string;
  title: string;
  descriptionLead: string;
  tags: string[];
  beatIds: string[];
  ctaText: string;
  enqueuedAt: string;
  publishedAt?: string;
  shortVideoId?: string;
  shortUrl?: string;
}

export interface DerivedShortsQueueState {
  items: DerivedShortQueueItem[];
}

const DEFAULT_QUEUE_PATH = resolve("state", "derived-shorts-queue.json");

export async function loadDerivedShortsQueue(queuePath = DEFAULT_QUEUE_PATH): Promise<DerivedShortsQueueState> {
  if (!existsSync(queuePath)) return { items: [] };
  try {
    const raw = await readFile(queuePath, "utf8");
    const parsed = JSON.parse(raw) as DerivedShortsQueueState;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

export async function saveDerivedShortsQueue(
  state: DerivedShortsQueueState,
  queuePath = DEFAULT_QUEUE_PATH,
): Promise<void> {
  await mkdir(dirname(queuePath), { recursive: true });
  await writeFile(queuePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * Yayınlanan 4–5 dakikalık bütüncül uzun videodan tanımlı 2–3 Vitrin Short'u kuyruğa ekler.
 * Aynı `id` zaten kuyruktaysa mükerrer eklemez.
 */
export async function enqueueDerivedShorts(
  spec: NarrativeLongformSpec,
  parentVideoId: string,
  parentUrl: string,
  queuePath = DEFAULT_QUEUE_PATH,
): Promise<DerivedShortQueueItem[]> {
  const queue = await loadDerivedShortsQueue(queuePath);
  const existingIds = new Set(queue.items.map((i) => i.id));
  const added: DerivedShortQueueItem[] = [];
  const now = new Date().toISOString();

  for (const ds of spec.derivedShorts) {
    const id = `${spec.id}-${ds.slugSuffix}`;
    if (existingIds.has(id)) continue;
    const item: DerivedShortQueueItem = {
      id,
      channel: spec.channel,
      parentEpisodeId: spec.id,
      parentSlug: spec.slug,
      parentVideoId,
      parentTitle: spec.title,
      parentUrl,
      shortIndex: ds.shortIndex,
      hook: ds.hook,
      partLabel: ds.partLabel,
      title: ds.title,
      descriptionLead: ds.descriptionLead,
      tags: ds.tags,
      beatIds: ds.beatIds,
      ctaText: ds.ctaText,
      enqueuedAt: now,
    };
    queue.items.push(item);
    added.push(item);
  }

  if (added.length > 0) {
    await saveDerivedShortsQueue(queue, queuePath);
  }
  return added;
}

/** Verilen kanal için yayınlanmamış ilk Vitrin Short'u döndürür (öncelikli huni kuyruğu). */
export function pickNextDerivedShort(
  queue: DerivedShortsQueueState,
  channel: ChannelId,
  publishedIds: Set<string>,
): DerivedShortQueueItem | null {
  for (const item of queue.items) {
    if (item.channel !== channel) continue;
    if (item.publishedAt || item.shortVideoId) continue;
    if (publishedIds.has(item.id)) continue;
    return item;
  }
  return null;
}

/** Türetilmiş Short için ana uzun videoya yönlendiren açıklama ve ilk yorum metnini oluşturur. */
export function buildFunnelMetadata(item: DerivedShortQueueItem): {
  description: string;
  pinnedComment: string;
  studioRelatedVideoAlert: string;
} {
  const shortCleanTitle = item.title.replace(/#shorts/gi, "").trim();
  const description =
    `${item.descriptionLead}\n\n` +
    `🎬 Watch the full 3D breakdown here: ${item.parentUrl}\n` +
    `(${item.parentTitle})\n\n` +
    `🔔 Subscribe to never miss the next deep dive!\n` +
    `#shorts #${item.channel === "explainer" ? "howitworks #engineering" : "physics #simulation"}`;

  const pinnedComment =
    `Want to see what happens at extreme limits? Watch the full 3D breakdown here 👉 ${item.parentUrl} — Which stage surprised you most?`;

  const studioUrl = item.shortVideoId
    ? `https://studio.youtube.com/video/${item.shortVideoId}/edit`
    : "https://studio.youtube.com";

  const studioRelatedVideoAlert =
    `🔗 <b>5 Saniyede Related Video Bağla (${item.channel === "explainer" ? "Clear Mechanics" : "Kinetic Lab"})</b>\n` +
    `• Short: ${shortCleanTitle}\n` +
    `• Bağlanacak Ana Video: <b>${item.parentTitle}</b>\n` +
    `• Tek Tık Studio: ${studioUrl}`;

  return { description, pinnedComment, studioRelatedVideoAlert };
}

export function findDerivedShortSpec(
  spec: NarrativeLongformSpec,
  shortIndex: number,
): DerivedShortSpec | null {
  return spec.derivedShorts.find((s) => s.shortIndex === shortIndex) ?? null;
}
