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
    igHandle: "kineticlab.motion",
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

/**
 * 2026 Instagram #1 keşfet sinyali (Sends per Reach > %1) için nişe özel DM paylaşım tetikleyicisi.
 */
export function buildDmShareTrigger(channel: NetworkChannelId, title = ""): string {
  const low = title.toLowerCase();
  if (channel === "wealth") {
    if (low.includes("credit card")) return "💸 Send this to a friend paying only the minimum on their card!";
    if (low.includes("inflation") || low.includes("cash")) return "💸 Send this to someone who keeps all their savings in cash!";
    if (low.includes("rent") || low.includes("house")) return "🏠 Send this to a friend debating renting vs buying!";
    if (low.includes("tax")) return "🧾 Send this to someone who thinks a raise puts them in a worse tax bracket!";
    return "💸 Send this to a friend who needs to see this compound math!";
  }
  if (channel === "bio") {
    if (low.includes("caffeine") || low.includes("coffee")) return "☕ Send this to a friend who drinks 3+ coffees a day!";
    if (low.includes("sleep")) return "😴 Send this to a friend who stays up until 2 AM scrolling!";
    if (low.includes("soda") || low.includes("sugar")) return "🥤 Send this to someone who drinks soda every day!";
    if (low.includes("muscle") || low.includes("weight")) return "💪 Send this to your gym partner right now!";
    return "🫀 Send this to someone who loves seeing what happens inside the human body!";
  }
  if (channel === "explainer") {
    return "⚙️ Send this to a friend who loves seeing how machines actually work!";
  }
  return "🌀 Send this to someone who gets hypnotized by physics simulations!";
}

/**
 * 2026 YouTube Shorts #1 sinyali (Viewed vs Swiped Away > %70) için ilk 1.75 sn sessiz kanca metni.
 */
export function buildScrollStopHook(title: string): string {
  const clean = title.replace(/#\w+/g, "").replace(/[?!.]+$/g, "").trim();
  const mVs = clean.match(/(\$?\d[\d.,a-z/]*\s+vs\.?\s+\$?\d[\d.,a-z/]*)/i);
  if (mVs) return `${mVs[1].toUpperCase()} 👀`;
  const mNum = clean.match(/(\$\d[\d,]*|\d+(?:\.\d+)?\s*(?:%|sec|seconds|minutes|years|million|liters|times|x))/i);
  if (mNum) return `WAIT FOR ${mNum[1].toUpperCase()} 👀`;
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 4).join(" ").toUpperCase();
  return words.length <= 24 ? `${words} 👀` : `${words.slice(0, 21).trim()}... 👀`;
}
