import { readFile, stat } from "node:fs/promises";

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

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  if (!res.ok) {
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

  const initRes = await fetch(
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
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
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
