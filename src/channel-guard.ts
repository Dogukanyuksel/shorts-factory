import { getMyChannel, refreshAccessToken, YouTubeScopeError, type YouTubeCredentials } from "./youtube.js";

/**
 * KANAL KİLİDİ: Yüklemeden ÖNCE token'ın gerçekten hedef kanala ait olduğunu doğrular.
 * (26 Kasım: Clear Mechanics token'ı yanlışlıkla Kinetic Lab hesabıyla alınmış, videolar yanlış kanala gitmişti.)
 * Beklenen kanal adı kalıbı: YOUTUBE_EXPECTED_CHANNEL_PHYSICS / _EXPLAINER (yoksa varsayılan).
 */

export class ChannelMismatchError extends Error {
  constructor(channel: string, actual: string, expected: string) {
    super(
      `YANLIŞ KANAL KİLİDİ: "${channel}" için kullanılan YouTube token'ı "${actual}" kanalına ait (beklenen: ${expected}). ` +
        `Yükleme YAPILMADI. ${channel === "explainer" ? "YOUTUBE_REFRESH_TOKEN_EXPLAINER" : "YOUTUBE_REFRESH_TOKEN_PHYSICS"} ` +
        "secret'ını doğru kanal seçilerek alınan token ile güncelleyin.",
    );
    this.name = "ChannelMismatchError";
  }
}

const DEFAULT_EXPECTED: Record<"physics" | "explainer", string> = {
  physics: "kinetic",
  explainer: "clear mechanics",
};

export function expectedChannelPattern(channel: "physics" | "explainer", env: NodeJS.ProcessEnv = process.env): string {
  const v = channel === "explainer" ? env.YOUTUBE_EXPECTED_CHANNEL_EXPLAINER : env.YOUTUBE_EXPECTED_CHANNEL_PHYSICS;
  return (v?.trim() || DEFAULT_EXPECTED[channel]).toLowerCase();
}

export function channelMatches(title: string, pattern: string): boolean {
  return title.toLowerCase().includes(pattern);
}

/** Uyuşmazlıkta ChannelMismatchError fırlatır. Token'da kanal okuma izni yoksa uyarı verip geçer. */
export async function assertUploadChannel(channel: "physics" | "explainer", creds: YouTubeCredentials): Promise<string> {
  const token = await refreshAccessToken(creds);
  try {
    const me = await getMyChannel(token);
    const expected = expectedChannelPattern(channel);
    if (!channelMatches(me.title, expected)) throw new ChannelMismatchError(channel, me.title || "(bilinmiyor)", expected);
    console.log(`🔒 [kanal-kilidi] Doğrulandı: ${channel} → "${me.title}"`);
    return me.title;
  } catch (err) {
    if (err instanceof YouTubeScopeError) {
      console.warn("[kanal-kilidi] Token'da kanal okuma izni yok, doğrulama atlandı.");
      return "";
    }
    throw err;
  }
}
