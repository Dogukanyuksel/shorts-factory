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

function shortTitle(title: string, max = 44): string {
  const clean = title.replace(/#shorts\b/gi, "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * İzleyicinin İngilizce yorumuna bağlama uygun, tek tıkla kopyalanabilir İngilizce cevap önerisi üretir.
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

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  html: string,
  button?: { text: string; url: string },
): Promise<void> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: html.slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (button?.url) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: button.text, url: button.url }]],
    };
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
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
  const sep = "━━━━━━━━━━━━━━━━━━━━";

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
    const physLines: string[] = [];
    const expLines: string[] = [];

    for (const rec of ytRecs) {
      const s = stats.get(rec.videoId) || { views: 0, likes: 0, comments: 0 };
      totalViews += s.views;
      totalLikes += s.likes;
      totalComments += s.comments;
      const line = `  • ${escapeHtml(shortTitle(rec.title))}\n    👀 <b>${s.views.toLocaleString("tr-TR")}</b>  •  👍 ${s.likes}  •  💬 ${s.comments}`;
      if (rec.channel === "physics") physLines.push(line);
      else expLines.push(line);

      if (s.comments > 0) {
        const comments = await fetchYouTubeCommentDetails(rec.videoId, ytApiKey);
        for (const c of comments) {
          const key = `yt:${c.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const channelLabel = rec.channel === "physics" ? "⚡ Kinetic Lab" : "⚙️ Clear Mechanics";
          const reply = suggestReply(c.text, rec.channel);
          const msg = [
            `💬 <b>YOUTUBE YENİ YORUM</b>`,
            sep,
            `${channelLabel}`,
            `🎬 ${escapeHtml(shortTitle(rec.title, 60))}`,
            ``,
            `👤 <b>${escapeHtml(c.author)}</b>`,
            `<blockquote>${escapeHtml(c.text)}</blockquote>`,
            ``,
            `📋 <b>Hazır Cevap (tek tıkla kopyala):</b>`,
            `<pre>${escapeHtml(reply)}</pre>`,
          ].join("\n");
          await sendTelegramMessage(botToken, ytChat, msg, {
            text: "🎬 YouTube'da Aç & Yanıtla",
            url: rec.url,
          });
        }
      }
    }

    const ytSummary = [
      `📺 <b>YOUTUBE SHORTS RAPORU</b>`,
      sep,
      `👀 İzlenme: <b>${totalViews.toLocaleString("tr-TR")}</b>`,
      `👍 Beğeni: <b>${totalLikes.toLocaleString("tr-TR")}</b>   •   💬 Yorum: <b>${totalComments}</b>`,
      ``,
      `⚡ <b>Kinetic Lab (${physLines.length} video)</b>`,
      ...physLines.slice(-4),
      ``,
      `⚙️ <b>Clear Mechanics (${expLines.length} video)</b>`,
      ...expLines.slice(-4),
    ].join("\n");

    await sendTelegramMessage(botToken, ytChat, ytSummary);
    console.log(`[telegram-monitor] YouTube raporu gönderildi (${totalViews} izlenme).`);
  }

  // ================= 2) INSTAGRAM REELS RAPORU & YENİ YORUMLAR =================
  if (metaToken && igChat) {
    const igRecs = state.published.filter((r) => Boolean(r.instagramMediaId));
    let igLikes = 0;
    let igComments = 0;
    const physLines: string[] = [];
    const expLines: string[] = [];

    for (const rec of igRecs) {
      if (!rec.instagramMediaId) continue;
      const info = await fetchInstagramMediaInfo(rec.instagramMediaId, metaToken);
      if (!info) continue;
      igLikes += info.likes;
      igComments += info.commentsCount;
      const line = `  • ${escapeHtml(shortTitle(rec.title))}\n    ❤️ <b>${info.likes}</b>  •  💬 ${info.commentsCount}`;
      if (rec.channel === "physics") physLines.push(line);
      else expLines.push(line);

      for (const c of info.comments) {
        const key = `ig:${c.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const channelLabel = rec.channel === "physics" ? "⚡ Kinetic Lab IG" : "⚙️ Clear Mechanics IG";
        const reply = suggestReply(c.text, rec.channel);
        const msg = [
          `💬 <b>INSTAGRAM YENİ YORUM</b>`,
          sep,
          `${channelLabel}`,
          `🎬 ${escapeHtml(shortTitle(rec.title, 60))}`,
          ``,
          `👤 <b>@${escapeHtml(c.author)}</b>`,
          `<blockquote>${escapeHtml(c.text)}</blockquote>`,
          ``,
          `📋 <b>Hazır Cevap (tek tıkla kopyala):</b>`,
          `<pre>${escapeHtml(reply)}</pre>`,
        ].join("\n");
        await sendTelegramMessage(
          botToken,
          igChat,
          msg,
          info.permalink ? { text: "📸 Instagram'da Aç & Yanıtla", url: info.permalink } : undefined,
        );
      }
    }

    const igSummary = [
      `📸 <b>INSTAGRAM REELS RAPORU</b>`,
      sep,
      `❤️ Beğeni: <b>${igLikes.toLocaleString("tr-TR")}</b>   •   💬 Yorum: <b>${igComments}</b>`,
      ``,
      `⚡ <b>Kinetic Lab IG (${physLines.length} reels)</b>`,
      ...physLines.slice(-4),
      ``,
      `⚙️ <b>Clear Mechanics IG (${expLines.length} reels)</b>`,
      ...expLines.slice(-4),
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
