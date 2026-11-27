export type NetworkChannelId = "physics" | "explainer" | "wealth" | "bio";

export interface NetworkChannelInfo {
  id: NetworkChannelId;
  brandName: string;
  ytUrl: string;
  igHandle: string; // '@' olmadan gerçek Instagram kullanıcı adı
}

export const NETWORK_CHANNELS: Record<NetworkChannelId, NetworkChannelInfo> = {
  physics: {
    id: "physics",
    brandName: "Kinetic Lab HQ",
    ytUrl: "https://www.youtube.com/@kineticlabshorts",
    igHandle: "kineticlab.montion",
  },
  explainer: {
    id: "explainer",
    brandName: "Clear Mechanics",
    ytUrl: "https://www.youtube.com/@clearmechanicsshorts",
    igHandle: "clearmechanics.lab",
  },
  wealth: {
    id: "wealth",
    brandName: "Wealth Mechanics",
    ytUrl: "https://www.youtube.com/@wealthmechanicsshorts",
    igHandle: "wealthmechanics.hq",
  },
  bio: {
    id: "bio",
    brandName: "Bio Mechanics",
    ytUrl: "https://www.youtube.com/@biomechanicshq",
    igHandle: "biomechanics.hq",
  },
};

/**
 * Instagram Reels açıklaması / yorumu için YouTube çağrısı + 4'lü kardeş IG ağı.
 * ÖNEMLİ: Instagram '@' işaretini yalnızca IG profili olarak bağladığı için
 * YouTube kanal adı asla '@' ile yazılmaz; '@' yalnızca gerçek Instagram hesaplarımızda kullanılır.
 */
export function buildInstagramYouTubeCallout(channel: NetworkChannelId, hasDeepDives = false): string {
  const info = NETWORK_CHANNELS[channel];
  return hasDeepDives
    ? `🎬 Full 4-min breakdowns on YouTube: "${info.brandName}" (Link in Bio 👆)`
    : `🎬 Full breakdowns on YouTube: "${info.brandName}" (Link in Bio 👆)`;
}

export function buildInstagramSisterTagLine(currentChannel?: NetworkChannelId): string {
  const handles = Object.values(NETWORK_CHANNELS)
    .filter((c) => !currentChannel || c.id !== currentChannel)
    .map((c) => `@${c.igHandle}`);
  return `🌐 Follow our network: ${handles.join(" • ")}`;
}

/**
 * YouTube açıklaması için 4'lü YouTube + Instagram çapraz büyüme bloğu.
 */
export function buildYouTubeNetworkFooter(currentChannel: NetworkChannelId): string {
  const cur = NETWORK_CHANNELS[currentChannel];
  const sisters = Object.values(NETWORK_CHANNELS)
    .filter((c) => c.id !== currentChannel)
    .map((c) => `• ${c.brandName}: ${c.ytUrl}`)
    .join("\n");
  return [
    `📲 Follow on Instagram: https://instagram.com/${cur.igHandle}`,
    `🌐 Our 4-Channel Lab on YouTube:`,
    sisters,
  ].join("\n");
}
