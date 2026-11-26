import { readFile, stat } from "node:fs/promises";
import { fetchWithRetry } from "./devops.js";
import { detectQuotaReason, YouTubeAuthError, YouTubeQuotaError } from "./youtube-quota.js";

export type PrivacyStatus = "public" | "private" | "unlisted";

export type YouTubeCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type YouTubeUploadMetadata = {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: PrivacyStatus;
};

export type YouTubeUploadResult = {
  videoId: string;
  url: string;
};

export function buildYouTubeVideoPayload(meta: YouTubeUploadMetadata) {
  const safeTitle = meta.title.trim().slice(0, 100);
  return {
    snippet: {
      title: safeTitle,
      description: meta.description.trim().slice(0, 5000),
      tags: meta.tags.slice(0, 15),
      categoryId: meta.categoryId,
      defaultLanguage: "en",
      defaultAudioLanguage: "en",
    },
    status: {
      privacyStatus: meta.privacyStatus,
      selfDeclaredMadeForKids: false,
      embeddable: true,
      publicStatsViewable: true,
    },
  };
}

export async function refreshAccessToken(creds: YouTubeCredentials): Promise<string> {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetchWithRetry(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    { retries: 3, timeoutMs: 30_000 },
  );

  const text = await res.text();
  if (!res.ok) {
    if (/invalid_grant/i.test(text)) {
      throw new YouTubeAuthError(
        "YouTube refresh token geçersiz (invalid_grant): token iptal edilmiş ya da süresi dolmuş. " +
          "Google Cloud OAuth ekranı 'Testing' modundaysa tokenlar 7 günde düşer → 'In production' yapın ve " +
          "`npm run youtube:auth` ile yeni token alıp GitHub secret'ını güncelleyin.",
      );
    }
    throw new Error(`YouTube OAuth token yenileme hatası (${res.status}): ${text.slice(0, 400)}`);
  }

  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("YouTube OAuth yanıtında access_token bulunamadı.");
  }
  return json.access_token;
}

export async function uploadVideoToYouTube(
  filePath: string,
  meta: YouTubeUploadMetadata,
  creds: YouTubeCredentials,
): Promise<YouTubeUploadResult> {
  const accessToken = await refreshAccessToken(creds);
  const fileStat = await stat(filePath);
  const payload = buildYouTubeVideoPayload(meta);

  const initRes = await fetchWithRetry(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-length": String(fileStat.size),
        "x-upload-content-type": "video/mp4",
      },
      body: JSON.stringify(payload),
    },
    { retries: 3, timeoutMs: 30_000 },
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    const quotaReason = detectQuotaReason(initRes.status, errText);
    if (quotaReason) {
      throw new YouTubeQuotaError(quotaReason, `YouTube kotası/limiti doldu (${quotaReason}).`);
    }
    throw new Error(`YouTube resumable init hatası (${initRes.status}): ${errText.slice(0, 500)}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube resumable init yanıtında Location başlığı eksik.");
  }

  const videoBytes = await readFile(filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "video/mp4",
      "content-length": String(videoBytes.byteLength),
    },
    body: videoBytes,
    signal: AbortSignal.timeout(300_000),
  });

  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) {
    const quotaReason = detectQuotaReason(uploadRes.status, uploadText);
    if (quotaReason) {
      throw new YouTubeQuotaError(quotaReason, `YouTube kotası/limiti doldu (${quotaReason}).`);
    }
    throw new Error(`YouTube video yükleme hatası (${uploadRes.status}): ${uploadText.slice(0, 500)}`);
  }

  const uploaded = JSON.parse(uploadText) as { id?: string };
  if (!uploaded.id) {
    throw new Error(`YouTube yükleme yanıtında video ID yok: ${uploadText.slice(0, 300)}`);
  }

  return {
    videoId: uploaded.id,
    url: `https://youtube.com/shorts/${uploaded.id}`,
  };
}

/**
 * YouTube Shorts videosundaki herkese açık yorumları çeker (A/B anket oylarını saymak için).
 * YOUTUBE_API_KEY varsa onunla, yoksa OAuth access token ile okur.
 */
export async function fetchYouTubeComments(
  videoId: string,
  opts: { apiKey?: string; creds?: YouTubeCredentials },
  maxResults = 100,
): Promise<string[]> {
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
    maxResults: String(maxResults),
    order: "relevance",
    textFormat: "plainText",
  });
  const headers: Record<string, string> = {};

  if (opts.apiKey?.trim()) {
    params.set("key", opts.apiKey.trim());
  } else if (opts.creds) {
    const token = await refreshAccessToken(opts.creds);
    headers.authorization = `Bearer ${token}`;
  } else {
    return [];
  }

  const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`YouTube yorum okuma hatası (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as {
    items?: Array<{ snippet?: { topLevelComment?: { snippet?: { textDisplay?: string } } } }>;
  };
  return (json.items || [])
    .map((item) => item.snippet?.topLevelComment?.snippet?.textDisplay?.trim() || "")
    .filter(Boolean);
}

// ─────────── ETKİLEŞİM (yorum yanıtı, ilk yorum, oynatma listesi) — youtube.force-ssl izni gerekir ───────────

export class YouTubeScopeError extends Error {
  constructor() {
    super(
      "YouTube token'ında yorum/oynatma listesi izni (youtube.force-ssl) yok. " +
        "`npm run youtube:auth -- --channel <kanal>` ile yeniden yetkilendirip refresh token secret'ını güncelleyin.",
    );
    this.name = "YouTubeScopeError";
  }
}

async function ytApi<T>(method: "GET" | "POST", path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetchWithRetry(
    `https://www.googleapis.com/youtube/v3/${path}`,
    {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    },
    { retries: 2, timeoutMs: 20_000 },
  );
  const text = await res.text();
  if (!res.ok) {
    const quotaReason = detectQuotaReason(res.status, text);
    if (quotaReason) throw new YouTubeQuotaError(quotaReason, `YouTube kotası doldu (${quotaReason}).`);
    if (res.status === 403 && /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes/i.test(text)) {
      throw new YouTubeScopeError();
    }
    throw new Error(`YouTube API ${method} ${path.split("?")[0]} hatası (${res.status}): ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export type YouTubeCommentThread = {
  threadId: string;
  commentId: string;
  videoId: string;
  author: string;
  authorChannelId: string;
  text: string;
  publishedAt: string;
  likeCount: number;
  replyAuthorChannelIds: string[];
};

/** Kanalın kendi kimliği (kendi yorumlarımızı ayırt etmek için). 1 birim. */
export async function getMyChannelId(token: string): Promise<string> {
  const json = await ytApi<{ items?: Array<{ id: string }> }>("GET", "channels?part=id&mine=true", token);
  return json.items?.[0]?.id ?? "";
}

/** Bir videonun en yeni üst düzey yorumları + mevcut yanıt sahipleri. 1 birim. */
export async function listVideoCommentThreads(videoId: string, token: string, maxResults = 50): Promise<YouTubeCommentThread[]> {
  const params = new URLSearchParams({ part: "snippet,replies", videoId, maxResults: String(maxResults), order: "time", textFormat: "plainText" });
  type Item = {
    id: string;
    snippet: {
      topLevelComment: {
        id: string;
        snippet: { authorDisplayName?: string; authorChannelId?: { value?: string }; textDisplay?: string; publishedAt?: string; likeCount?: number };
      };
    };
    replies?: { comments?: Array<{ snippet?: { authorChannelId?: { value?: string } } }> };
  };
  const json = await ytApi<{ items?: Item[] }>("GET", `commentThreads?${params}`, token);
  return (json.items || []).map((it) => {
    const s = it.snippet.topLevelComment.snippet;
    return {
      threadId: it.id,
      commentId: it.snippet.topLevelComment.id,
      videoId,
      author: s.authorDisplayName || "",
      authorChannelId: s.authorChannelId?.value || "",
      text: (s.textDisplay || "").trim(),
      publishedAt: s.publishedAt || "",
      likeCount: s.likeCount || 0,
      replyAuthorChannelIds: (it.replies?.comments || []).map((c) => c.snippet?.authorChannelId?.value || ""),
    };
  });
}

/** Kendi videomuzdaki bir yoruma yanıt verir. 50 birim. */
export async function replyToYouTubeComment(parentId: string, text: string, token: string): Promise<string> {
  const json = await ytApi<{ id?: string }>("POST", "comments?part=snippet", token, {
    snippet: { parentId, textOriginal: text.slice(0, 1000) },
  });
  return json.id || "";
}

/** Kendi videomuza ilk (üst düzey) yorumu atar. 50 birim. (API sabitlemeye izin vermez.) */
export async function postYouTubeTopLevelComment(videoId: string, text: string, token: string): Promise<string> {
  const json = await ytApi<{ id?: string }>("POST", "commentThreads?part=snippet", token, {
    snippet: { videoId, topLevelComment: { snippet: { textOriginal: text.slice(0, 1000) } } },
  });
  return json.id || "";
}

/** Başlığa göre kanalın oynatma listesini bulur, yoksa herkese açık olarak oluşturur. (liste 1 + oluşturma 50 birim) */
export async function ensureYouTubePlaylist(title: string, description: string, token: string): Promise<string> {
  let pageToken = "";
  for (let i = 0; i < 5; i++) {
    const params = new URLSearchParams({ part: "snippet", mine: "true", maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    const json = await ytApi<{ items?: Array<{ id: string; snippet?: { title?: string } }>; nextPageToken?: string }>(
      "GET",
      `playlists?${params}`,
      token,
    );
    const hit = (json.items || []).find((p) => p.snippet?.title === title);
    if (hit) return hit.id;
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  const created = await ytApi<{ id?: string }>("POST", "playlists?part=snippet,status", token, {
    snippet: { title: title.slice(0, 150), description: description.slice(0, 5000), defaultLanguage: "en" },
    status: { privacyStatus: "public" },
  });
  return created.id || "";
}

/** Videoyu oynatma listesine ekler. 50 birim. */
export async function addVideoToPlaylist(playlistId: string, videoId: string, token: string): Promise<void> {
  await ytApi("POST", "playlistItems?part=snippet", token, {
    snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } },
  });
}
