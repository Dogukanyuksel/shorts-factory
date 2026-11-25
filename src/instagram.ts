import { readFile, stat } from "node:fs/promises";
import { fetchWithRetry } from "./devops.js";

export type InstagramCredentials = {
  igUserId: string;
  accessToken: string;
};

export type InstagramUploadResult = {
  mediaId: string;
  containerId: string;
};

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function buildInstagramCaption(title: string, description: string): string {
  // YouTube'a özel #shorts etiketini temizle, Instagram Reels için temiz İngilizce caption üret
  const cleanTitle = title.replace(/#shorts\b/gi, "").replace(/\s{2,}/g, " ").trim();
  const cleanDesc = description.replace(/#shorts\b/gi, "#reels").trim();
  const combined = `${cleanTitle}\n\n${cleanDesc}`;
  return combined.slice(0, 2200);
}

async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  maxWaitMs = 180_000,
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const url = `${GRAPH_BASE}/${encodeURIComponent(containerId)}?fields=status_code,status`;
    const res = await fetchWithRetry(
      url,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      { retries: 2, timeoutMs: 20_000 },
    );
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Instagram container durum sorgusu hatası (${res.status}): ${text.slice(0, 400)}`);
    }
    const json = JSON.parse(text) as { status_code?: string; status?: string };
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      throw new Error(`Instagram Reels işleme başarısız (${json.status_code}): ${json.status || text}`);
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw new Error("Instagram Reels container zaman aşımına uğradı.");
}

/**
 * Meta Graph API Resumable Upload ile doğrudan yerel MP4 dosyasını Instagram Reels olarak yayınlar.
 * Harici dosya sunucusu / S3 gerektirmez.
 */
export async function uploadReelToInstagram(
  filePath: string,
  caption: string,
  creds: InstagramCredentials,
): Promise<InstagramUploadResult> {
  const fileStat = await stat(filePath);
  const videoBytes = await readFile(filePath);

  // 1) Resumable Reels container başlat
  const initBody = new URLSearchParams({
    media_type: "REELS",
    upload_type: "resumable",
    caption,
    share_to_feed: "true",
    access_token: creds.accessToken,
  });

  const initRes = await fetch(`${GRAPH_BASE}/${encodeURIComponent(creds.igUserId)}/media`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: initBody,
    signal: AbortSignal.timeout(30_000),
  });
  const initText = await initRes.text();
  if (!initRes.ok) {
    throw new Error(`Instagram Reels init hatası (${initRes.status}): ${initText.slice(0, 500)}`);
  }

  const initJson = JSON.parse(initText) as { id?: string; uri?: string };
  if (!initJson.id || !initJson.uri) {
    throw new Error(`Instagram init yanıtında id/uri eksik: ${initText.slice(0, 300)}`);
  }

  // 2) MP4 baytlarını doğrudan rupload.facebook.com adresine yükle
  const uploadRes = await fetch(initJson.uri, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${creds.accessToken}`,
      offset: "0",
      file_size: String(fileStat.size),
      "content-type": "application/octet-stream",
    },
    body: videoBytes,
    signal: AbortSignal.timeout(300_000),
  });
  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) {
    throw new Error(`Instagram Reels binary yükleme hatası (${uploadRes.status}): ${uploadText.slice(0, 500)}`);
  }

  // 3) Meta video işlemesinin bitmesini bekle
  await waitForContainerReady(initJson.id, creds.accessToken);

  // 4) Reels'i yayınla
  const pubBody = new URLSearchParams({
    creation_id: initJson.id,
    access_token: creds.accessToken,
  });
  const pubRes = await fetch(`${GRAPH_BASE}/${encodeURIComponent(creds.igUserId)}/media_publish`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: pubBody,
    signal: AbortSignal.timeout(30_000),
  });
  const pubText = await pubRes.text();
  if (!pubRes.ok) {
    throw new Error(`Instagram Reels publish hatası (${pubRes.status}): ${pubText.slice(0, 500)}`);
  }
  const pubJson = JSON.parse(pubText) as { id?: string };
  if (!pubJson.id) {
    throw new Error(`Instagram publish yanıtında media ID yok: ${pubText.slice(0, 300)}`);
  }

  return { mediaId: pubJson.id, containerId: initJson.id };
}

/**
 * Yayınlanan Instagram Reels videosuna otomatik ilk yorum (A/B anketi) atar.
 */
export async function postInstagramComment(
  mediaId: string,
  message: string,
  creds: InstagramCredentials,
): Promise<string> {
  const body = new URLSearchParams({
    message: message.slice(0, 1000),
    access_token: creds.accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(mediaId)}/comments`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Instagram yorum hatası (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = JSON.parse(text) as { id?: string };
  return json.id || "";
}

/**
 * Instagram Reels videosundaki son yorumları çeker (A/B anket oylarını saymak için).
 */
export async function fetchInstagramComments(
  mediaId: string,
  creds: InstagramCredentials,
  limit = 100,
): Promise<string[]> {
  const url = `${GRAPH_BASE}/${encodeURIComponent(mediaId)}/comments?fields=text&limit=${limit}`;
  const res = await fetchWithRetry(
    url,
    { headers: { Authorization: `Bearer ${creds.accessToken}` } },
    { retries: 2, timeoutMs: 20_000 },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Instagram yorum okuma hatası (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = JSON.parse(text) as { data?: Array<{ text?: string }> };
  return (json.data || []).map((c) => (c.text || "").trim()).filter(Boolean);
}

/**
 * Yorumlardaki A ve B oylarını sayar (kendi "VOTE NEXT..." bot yorumumuzu otomatik eler).
 */
export function tallyABVotes(
  comments: string[],
  labelA: string,
  labelB: string,
): { votesA: number; votesB: number; winner: "A" | "B" | null } {
  let votesA = 0;
  let votesB = 0;
  const normA = labelA.toLowerCase();
  const normB = labelB.toLowerCase();

  for (const raw of comments) {
    const t = raw.trim();
    const low = t.toLowerCase();
    // Kendi anket yorumumuzu sayma
    if (low.includes("vote next") || (low.includes("a)") && low.includes("b)"))) continue;

    const pickA =
      /^a\b[\s)!.:,-]*$/i.test(t) ||
      /\boption\s*a\b|\bvote\s*a\b|^a\)/i.test(low) ||
      (normA.length >= 4 && low.includes(normA));
    const pickB =
      /^b\b[\s)!.:,-]*$/i.test(t) ||
      /\boption\s*b\b|\bvote\s*b\b|^b\)/i.test(low) ||
      (normB.length >= 4 && low.includes(normB));

    if (pickA && !pickB) votesA++;
    else if (pickB && !pickA) votesB++;
  }

  if (votesA === 0 && votesB === 0) return { votesA, votesB, winner: null };
  return { votesA, votesB, winner: votesB > votesA ? "B" : "A" };
}
