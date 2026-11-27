import { readFile } from "node:fs/promises";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface FacebookReelUploadResult {
  pageId: string;
  pageName: string;
  videoId: string;
}

interface ManagedPage {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id?: string };
}

/**
 * Mevcut Meta token + IG User ID üzerinden o Instagram hesabına bağlı Facebook Sayfasını
 * ve Page Access Token'ını otomatik keşfeder (sıfır ek GitHub Secret gerektirir!).
 */
async function resolveLinkedFacebookPage(
  igUserId: string,
  userAccessToken: string,
): Promise<{ pageId: string; pageName: string; pageToken: string } | null> {
  const url = `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account%7Bid%7D&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: ManagedPage[] };
  const match = (json.data || []).find(
    (p) => p.instagram_business_account?.id === igUserId && p.id && p.access_token,
  );
  if (!match || !match.access_token) return null;
  return {
    pageId: match.id,
    pageName: match.name || match.id,
    pageToken: match.access_token,
  };
}

/**
 * Aynı render edilmiş 9:16 MP4'ü bağlı Facebook Sayfasına otomatik Facebook Reels olarak yayınlar.
 * İzin yoksa veya bağlı sayfa bulunamazsa null döner (YouTube / Instagram akışını asla engellemez).
 */
export async function uploadReelToFacebook(
  mp4Path: string,
  description: string,
  creds: { igUserId: string; accessToken: string },
): Promise<FacebookReelUploadResult | null> {
  if (!creds.igUserId || !creds.accessToken) return null;

  const page = await resolveLinkedFacebookPage(creds.igUserId, creds.accessToken);
  if (!page) {
    console.log("[facebook] Bağlı Facebook Sayfası bulunamadı — Facebook Reels atlanıyor.");
    return null;
  }

  // 1) Upload oturumunu başlat
  const startRes = await fetch(`${GRAPH_BASE}/${encodeURIComponent(page.pageId)}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      upload_phase: "start",
      access_token: page.pageToken,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => "");
    throw new Error(`Facebook Reels start hatası (${startRes.status}): ${errText.slice(0, 240)}`);
  }
  const startJson = (await startRes.json()) as { video_id?: string; upload_url?: string };
  const videoId = startJson.video_id;
  const uploadUrl = startJson.upload_url || `https://rupload.facebook.com/video-upload/v21.0/${videoId}`;
  if (!videoId) throw new Error("Facebook Reels video_id dönmedi.");

  // 2) MP4 dosyasını ikili (binary) yükle
  const videoBytes = await readFile(mp4Path);
  const upRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${page.pageToken}`,
      offset: "0",
      file_size: String(videoBytes.byteLength),
      "Content-Type": "application/octet-stream",
    },
    body: videoBytes,
    signal: AbortSignal.timeout(120_000),
  });
  if (!upRes.ok) {
    const errText = await upRes.text().catch(() => "");
    throw new Error(`Facebook Reels binary upload hatası (${upRes.status}): ${errText.slice(0, 240)}`);
  }

  // 3) Yayını tamamla (PUBLISHED)
  const finRes = await fetch(`${GRAPH_BASE}/${encodeURIComponent(page.pageId)}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      upload_phase: "finish",
      video_id: videoId,
      video_state: "PUBLISHED",
      description: description.slice(0, 2000),
      access_token: page.pageToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!finRes.ok) {
    const errText = await finRes.text().catch(() => "");
    throw new Error(`Facebook Reels finish hatası (${finRes.status}): ${errText.slice(0, 240)}`);
  }

  console.log(`✅ [facebook] FACEBOOK REELS YAYINLANDI (${page.pageName}): videoId=${videoId}`);
  return { pageId: page.pageId, pageName: page.pageName, videoId };
}
