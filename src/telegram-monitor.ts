import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchYouTubeStatistics } from "./analytics.js";
import { loadState } from "./auto-publish.js";

type NotifiedState = {
  seenCommentKeys: string[];
  lastReportAt?: string;
};

const NOTIFIED_PATH = resolve("state", "telegram-notified.json");
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * İzleyicinin İngilizce yorumuna bağlama uygun, kopyala-yapıştır hazır İngilizce cevap önerisi üretir.
 */
export function suggestReply(comment: string, channel: "physics" | "explainer"): string {
  const low = comment.toLowerCase().trim();
  if (/^[ab]\b[\s)!.:,-]*$/i.test(comment.trim()) || /\bvote\s*[ab]\b|\boption\s*[ab]\b/i.test(low)) {
    return "Vote counted! 🗳️ Make sure you're subscribed so you catch the winner tomorrow! 🔔";
  }
  if (/\bslow\b|\blong\b|\btook a while\b|\btoo fast\b|\bshort\b/i.test(low)) {
    return "Great feedback — we just tightened the pacing on the next ones! What should we build next? ⚡";
  }
  if (/\?/.test(comment) || /\bhow\b|\bwhy\b|\bwhat\b/i.test(low)) {
    return channel === "physics"
      ? "Awesome question! It's 100% custom-coded deterministic physics — what simulation should we test next? ⚡"
      : "Great question! Let us know what everyday machine you want us to break down next! ⚙️";
  }
  if (/\bcool\b|\bsatisfying\b|\blove\b|\bamazing\b|\bawesome\b|\bnice\b|\bfire\b|🔥/i.test(low)) {
    return "Glad you enjoyed it! Drop A or B in the comments to pick tomorrow's video! 🚀";
  }
  return channel === "physics"
    ? "Thanks for watching! Comment which simulation you want to see next ⚡"
    : "Thanks for watching! What machine should we cut open next? ⚙️";
}

async function sendTelegramMessage(botToken: string, chatId: string, html: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html.slice(0, 4000),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Telegram sendMessage hatası (${res.status}): ${text.slice(0, 300)}`);
  }
}

async function loadNotified(): Promise<NotifiedState> {
  if (!existsSync(NOTIFIED_PATH)) return { seenCommentKeys: [] };
  const raw = await readFile(NOTIFIED_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<NotifiedState>;
  return {
    seenCommentKeys: Array.isArray(parsed.seenCommentKeys) ? parsed.seenCommentKeys : [],
    lastReportAt: parsed.lastReportAt,
  };
}

async function saveNotified(s: NotifiedState): Promise<void> {
  await mkdir(dirname(NOTIFIED_PATH), { recursive: true });
  // Son 2000 yorum ID'sini tut
  const trimmed: NotifiedState = {
    seenCommentKeys: s.seenCommentKeys.slice(-2000),
    lastReportAt: new Date().toISOString(),
  };
  await writeFile(NOTIFIED_PATH, `${JSON.stringify(trimmed, null, 2)}\n`, "utf8");
}

async function fetchYouTubeCommentDetails(
  videoId: string,
  apiKey: string,
): Promise<Array<{ id: string; author: string; text: string }>> {
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
    maxResults: "25",
    order: "time",
    textFormat: "plainText",
    key: apiKey,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    items?: Array<{
      id?: string;
      snippet?: { topLevelComment?: { snippet?: { authorDisplayName?: string; textDisplay?: string } } };
    }>;
  };
  return (json.items || [])
    .map((it) => ({
      id: it.id || "",
      author: it.snippet?.topLevelComment?.snippet?.authorDisplayName || "Viewer",
      text: it.snippet?.topLevelComment?.snippet?.textDisplay?.trim() || "",
    }))
    .filter((c) => Boolean(c.id && c.text));
}

async function fetchInstagramMediaInfo(
  mediaId: string,
  accessToken: string,
): Promise<{
  likes: number;
  commentsCount: number;
  permalink: string;
  comments: Array<{ id: string; author: string; text: string }>;
} | null> {
  const url = `${GRAPH_BASE}/${encodeURIComponent(mediaId)}?fields=like_count,comments_count,permalink,comments.limit(25){id,text,username}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    like_count?: number;
    comments_count?: number;
    permalink?: string;
    comments?: { data?: Array<{ id?: string; text?: string; username?: string }> };
  };
  const comments = (json.comments?.data || [])
    .map((c) => ({
      id: c.id || "",
      author: c.username || "ig_user",
      text: (c.text || "").trim(),
    }))
    .filter((c) => Boolean(c.id && c.text && !c.text.toLowerCase().includes("vote next")));

  return {
    likes: Number(json.like_count || 0),
    commentsCount: Number(json.comments_count || 0),
    permalink: json.permalink || "",
    comments,
  };
}

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const defaultChat = process.env.TELEGRAM_CHAT_ID?.trim() || "";
  const ytChat = process.env.TELEGRAM_CHAT_ID_YOUTUBE?.trim() || defaultChat;
  const igChat = process.env.TELEGRAM_CHAT_ID_INSTAGRAM?.trim() || defaultChat;

  if (!botToken || (!ytChat && !igChat)) {
    console.log("[telegram-monitor] TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID tanımlı değil, atlanıyor.");
    return;
  }

  const state = await loadState();
  const notified = await loadNotified();
  const seen = new Set(notified.seenCommentKeys);
  const ytApiKey = process.env.YOUTUBE_API_KEY?.trim() || "";
  const metaToken = process.env.META_ACCESS_TOKEN?.trim() || "";

  // ================= 1) YOUTUBE SHORTS RAPORU & YENİ YORUMLAR =================
  if (ytApiKey && ytChat) {
    const ytRecs = state.published.filter((r) => Boolean(r.videoId));
    const stats = await fetchYouTubeStatistics(
      ytRecs.map((r) => r.videoId),
      ytApiKey,
    );

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let physViews = 0;
    let expViews = 0;
    let topTitle = "";
    let topViews = -1;

    for (const rec of ytRecs) {
      const s = stats.get(rec.videoId) || { views: 0, likes: 0, comments: 0 };
      totalViews += s.views;
      totalLikes += s.likes;
      totalComments += s.comments;
      if (rec.channel === "physics") physViews += s.views;
      else expViews += s.views;
      if (s.views > topViews) {
        topViews = s.views;
        topTitle = rec.title;
      }

      if (s.comments > 0) {
        const comments = await fetchYouTubeCommentDetails(rec.videoId, ytApiKey);
        for (const c of comments) {
          const key = `yt:${c.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const channelLabel = rec.channel === "physics" ? "Kinetic Lab" : "Clear Mechanics";
          const reply = suggestReply(c.text, rec.channel);
          const msg = [
            `💬 <b>YOUTUBE YENİ YORUM (${channelLabel})</b>`,
            `🎬 <b>Video:</b> ${escapeHtml(rec.title)}`,
            `👤 <b>Yazan:</b> ${escapeHtml(c.author)}`,
            `📝 <b>Yorum:</b> <i>"${escapeHtml(c.text)}"</i>`,
            ``,
            `✅ <b>Hazır Cevap (kopyala):</b>`,
            `<code>${escapeHtml(reply)}</code>`,
            `🔗 ${rec.url}`,
          ].join("\n");
          await sendTelegramMessage(botToken, ytChat, msg);
        }
      }
    }

    const ytSummary = [
      `📺 <b>YOUTUBE SHORTS — 6 SAATLİK RAPOR</b>`,
      `• Toplam Video: <b>${ytRecs.length}</b>`,
      `• Toplam İzlenme: <b>${totalViews.toLocaleString("tr-TR")}</b>`,
      `• Toplam Beğeni: <b>${totalLikes.toLocaleString("tr-TR")}</b> | Yorum: <b>${totalComments}</b>`,
      ``,
      `⚡ <b>Kinetic Lab:</b> ${physViews.toLocaleString("tr-TR")} izlenme`,
      `⚙️ <b>Clear Mechanics:</b> ${expViews.toLocaleString("tr-TR")} izlenme`,
      topTitle ? `\n🏆 <b>Lider Video:</b> ${escapeHtml(topTitle)} (${topViews.toLocaleString("tr-TR")})` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await sendTelegramMessage(botToken, ytChat, ytSummary);
    console.log(`[telegram-monitor] YouTube raporu gönderildi (${totalViews} izlenme).`);
  }

  // ================= 2) INSTAGRAM REELS RAPORU & YENİ YORUMLAR =================
  if (metaToken && igChat) {
    const igRecs = state.published.filter((r) => Boolean(r.instagramMediaId));
    let igLikes = 0;
    let igComments = 0;
    let physLikes = 0;
    let expLikes = 0;

    for (const rec of igRecs) {
      if (!rec.instagramMediaId) continue;
      const info = await fetchInstagramMediaInfo(rec.instagramMediaId, metaToken);
      if (!info) continue;
      igLikes += info.likes;
      igComments += info.commentsCount;
      if (rec.channel === "physics") physLikes += info.likes;
      else expLikes += info.likes;

      for (const c of info.comments) {
        const key = `ig:${c.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const channelLabel = rec.channel === "physics" ? "Kinetic Lab" : "Clear Mechanics";
        const reply = suggestReply(c.text, rec.channel);
        const msg = [
          `💬 <b>INSTAGRAM YENİ YORUM (${channelLabel})</b>`,
          `🎬 <b>Reels:</b> ${escapeHtml(rec.title)}`,
          `👤 <b>Yazan:</b> @${escapeHtml(c.author)}`,
          `📝 <b>Yorum:</b> <i>"${escapeHtml(c.text)}"</i>`,
          ``,
          `✅ <b>Hazır Cevap (kopyala):</b>`,
          `<code>${escapeHtml(reply)}</code>`,
          info.permalink ? `🔗 ${info.permalink}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        await sendTelegramMessage(botToken, igChat, msg);
      }
    }

    const igSummary = [
      `📸 <b>INSTAGRAM REELS — 6 SAATLİK RAPOR</b>`,
      `• Toplam Reels: <b>${igRecs.length}</b>`,
      `• Toplam Beğeni: <b>${igLikes.toLocaleString("tr-TR")}</b> | Yorum: <b>${igComments}</b>`,
      ``,
      `⚡ <b>Kinetic Lab IG:</b> ${physLikes} beğeni`,
      `⚙️ <b>Clear Mechanics IG:</b> ${expLikes} beğeni`,
    ].join("\n");

    await sendTelegramMessage(botToken, igChat, igSummary);
    console.log(`[telegram-monitor] Instagram raporu gönderildi (${igLikes} beğeni).`);
  }

  notified.seenCommentKeys = [...seen];
  await saveNotified(notified);
}

const isDirectRun =
  process.argv[1]?.endsWith("telegram-monitor.ts") || process.argv[1]?.endsWith("telegram-monitor.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[telegram-monitor] HATA:", e);
    process.exit(1);
  });
}
