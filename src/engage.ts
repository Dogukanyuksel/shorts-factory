import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadState, type PublishedRecord } from "./auto-publish.js";
import { isValidInstagramMediaId } from "./devops.js";
import { fetchInstagramCommentsDetailed, getInstagramUsername, replyToInstagramComment } from "./instagram.js";
import { buildReply, type ReplyChannel } from "./reply-bank.js";
import {
  getMyChannelId,
  listVideoCommentThreads,
  refreshAccessToken,
  replyToYouTubeComment,
  YouTubeScopeError,
} from "./youtube.js";
import {
  activeBlock,
  loadQuotaState,
  quotaKey,
  recordQuotaBlock,
  resolveYouTubeClient,
  writePublishNotice,
  YouTubeQuotaError,
} from "./youtube-quota.js";

/**
 * ORGANİK ETKİLEŞİM MOTORU — yalnızca KENDİ videolarımızdaki yorumlara, platform API'leri üzerinden yanıt verir.
 * Başkalarını takip etme, başka hesaplara yorum atma, sahte etkileşim YOK (platform kurallarına uygun).
 *
 * - YouTube: son 7 günün videoları; kanal başına GÜNLÜK yanıt sınırı (kota koruması: yanıt = 50 birim)
 * - Instagram: son 7 günün Reels'leri; çalışma başına sınır
 * - İnsan temposu: yanıtlar arası 4–10 sn; en çok beğenilen ve en yeni yorumlar önce
 * - Aynı yoruma asla iki kez yanıt yok (state/engagement.json)
 */

const ENGAGE_PATH = resolve("state", "engagement.json");
const LOOKBACK_DAYS = 7;

type EngageState = {
  repliedIds: string[];
  day: string;
  ytReplies: Record<string, number>;
  igReplies: Record<string, number>;
  /** Uyarı bildiriminin en son gönderildiği Pasifik günü (günde en fazla 1 uyarı) */
  noticeDay?: string;
};

function pacificDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
}

async function loadEngage(): Promise<EngageState> {
  const empty: EngageState = { repliedIds: [], day: pacificDay(), ytReplies: {}, igReplies: {} };
  if (!existsSync(ENGAGE_PATH)) return empty;
  try {
    const s = JSON.parse(await readFile(ENGAGE_PATH, "utf8")) as Partial<EngageState>;
    const st: EngageState = {
      repliedIds: Array.isArray(s.repliedIds) ? s.repliedIds : [],
      day: s.day || pacificDay(),
      ytReplies: s.ytReplies || {},
      igReplies: s.igReplies || {},
      noticeDay: s.noticeDay,
    };
    // Kota günü (Pasifik) değiştiyse günlük sayaçları sıfırla
    if (st.day !== pacificDay()) {
      st.day = pacificDay();
      st.ytReplies = {};
      st.igReplies = {};
    }
    return st;
  } catch {
    return empty;
  }
}

async function saveEngage(s: EngageState): Promise<void> {
  await mkdir(dirname(ENGAGE_PATH), { recursive: true });
  await writeFile(ENGAGE_PATH, `${JSON.stringify({ ...s, repliedIds: s.repliedIds.slice(-5000) }, null, 2)}\n`, "utf8");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const humanPause = () => (process.env.ENGAGE_NO_PAUSE === "true" ? Promise.resolve() : sleep(4000 + Math.floor(Math.random() * 6000)));

function recentRecords(records: PublishedRecord[], channel: ReplyChannel): PublishedRecord[] {
  const cutoff = Date.now() - LOOKBACK_DAYS * 86_400_000;
  return records
    .filter((r) => r.channel === channel && Date.parse(r.publishedAt) >= cutoff)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 14);
}

function resolveRefreshToken(channel: ReplyChannel): string {
  return (
    (channel === "explainer" ? process.env.YOUTUBE_REFRESH_TOKEN_EXPLAINER : process.env.YOUTUBE_REFRESH_TOKEN_PHYSICS)?.trim() || ""
  );
}

async function engageYouTube(channel: ReplyChannel, records: PublishedRecord[], st: EngageState, dryRun: boolean): Promise<number> {
  const { clientId, clientSecret } = resolveYouTubeClient(channel);
  const refreshToken = resolveRefreshToken(channel);
  if (!clientId || !clientSecret || !refreshToken) return 0;
  if (activeBlock(await loadQuotaState(), quotaKey(clientId))) {
    console.log(`[engage] YouTube ${channel}: kota bloğu aktif, atlanıyor.`);
    return 0;
  }
  const dailyCap = Math.max(0, Number(process.env.YT_DAILY_REPLY_CAP || 25));
  let budget = dailyCap - (st.ytReplies[channel] || 0);
  if (budget <= 0) {
    console.log(`[engage] YouTube ${channel}: günlük yanıt sınırı (${dailyCap}) doldu.`);
    return 0;
  }

  const token = await refreshAccessToken({ clientId, clientSecret, refreshToken });
  const me = await getMyChannelId(token);
  const replied = new Set(st.repliedIds);
  const cutoff = Date.now() - LOOKBACK_DAYS * 86_400_000;

  const candidates: Array<{ id: string; text: string; likes: number; at: number }> = [];
  for (const rec of records.filter((r) => r.videoId)) {
    const threads = await listVideoCommentThreads(rec.videoId, token, 50);
    for (const t of threads) {
      if (!t.text || replied.has(`yt:${t.commentId}`)) continue;
      if (me && (t.authorChannelId === me || t.replyAuthorChannelIds.includes(me))) continue;
      if (Date.parse(t.publishedAt) < cutoff) continue;
      candidates.push({ id: t.commentId, text: t.text, likes: t.likeCount, at: Date.parse(t.publishedAt) });
    }
  }
  candidates.sort((a, b) => b.likes - a.likes || b.at - a.at);

  let sent = 0;
  for (const c of candidates) {
    if (budget <= 0) break;
    const reply = buildReply(c.id, c.text, channel);
    if (!reply) {
      st.repliedIds.push(`yt:${c.id}`); // spam/hakaret: bir daha değerlendirme
      continue;
    }
    if (dryRun) {
      console.log(`[engage][dry] YT ${channel} ← "${c.text.slice(0, 60)}" → "${reply}"`);
    } else {
      await replyToYouTubeComment(c.id, reply, token);
      console.log(`💬 [engage] YT ${channel}: "${c.text.slice(0, 50)}" → "${reply}"`);
      st.ytReplies[channel] = (st.ytReplies[channel] || 0) + 1;
      await humanPause();
    }
    st.repliedIds.push(`yt:${c.id}`);
    budget--;
    sent++;
  }
  return sent;
}

async function engageInstagram(channel: ReplyChannel, records: PublishedRecord[], st: EngageState, dryRun: boolean): Promise<number> {
  const igUserId = (channel === "explainer" ? process.env.IG_USER_ID_EXPLAINER : process.env.IG_USER_ID_PHYSICS)?.trim() || "";
  const accessToken = process.env.META_ACCESS_TOKEN?.trim() || "";
  if (!igUserId || !accessToken) return 0;
  const creds = { igUserId, accessToken };
  const me = (await getInstagramUsername(creds)).toLowerCase();
  const replied = new Set(st.repliedIds);
  const runCap = Math.max(0, Number(process.env.IG_RUN_REPLY_CAP || 25));
  const cutoff = Date.now() - LOOKBACK_DAYS * 86_400_000;

  let sent = 0;
  for (const rec of records.filter((r) => isValidInstagramMediaId(r.instagramMediaId))) {
    if (sent >= runCap) break;
    const comments = await fetchInstagramCommentsDetailed(rec.instagramMediaId!, creds, 50);
    for (const c of comments) {
      if (sent >= runCap) break;
      if (replied.has(`ig:${c.id}`)) continue;
      if (c.username.toLowerCase() === me || c.replyUsernames.some((u) => u.toLowerCase() === me)) continue;
      if (c.timestamp && Date.parse(c.timestamp) < cutoff) continue;
      // Kendi anket yorumumuz
      if (/vote next/i.test(c.text)) continue;
      const reply = buildReply(c.id, c.text, channel);
      st.repliedIds.push(`ig:${c.id}`);
      if (!reply) continue;
      if (dryRun) {
        console.log(`[engage][dry] IG ${channel} ← @${c.username}: "${c.text.slice(0, 60)}" → "${reply}"`);
      } else {
        await replyToInstagramComment(c.id, `@${c.username} ${reply}`, creds);
        console.log(`💬 [engage] IG ${channel}: @${c.username} "${c.text.slice(0, 50)}" → "${reply}"`);
        st.igReplies[channel] = (st.igReplies[channel] || 0) + 1;
        await humanPause();
      }
      sent++;
    }
  }
  return sent;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
  const state = await loadState();
  const st = await loadEngage();
  const problems: string[] = [];
  const totals: string[] = [];

  try {
    for (const channel of ["physics", "explainer"] as const) {
      const recs = recentRecords(state.published, channel);
      try {
        const n = await engageYouTube(channel, recs, st, dryRun);
        totals.push(`YT ${channel}: ${n}`);
      } catch (err) {
        if (err instanceof YouTubeQuotaError) {
          const { clientId } = resolveYouTubeClient(channel);
          if (clientId) await recordQuotaBlock(quotaKey(clientId), err.reason, channel);
          problems.push(`YouTube ${channel}: kota doldu, yanıtlar yarın devam edecek.`);
        } else if (err instanceof YouTubeScopeError) {
          problems.push(`YouTube ${channel}: yorum izni yok → npm run youtube:auth -- --channel ${channel} ile yeniden yetkilendirin.`);
        } else {
          problems.push(`YouTube ${channel}: ${err instanceof Error ? err.message.slice(0, 160) : String(err)}`);
        }
      }
      try {
        const n = await engageInstagram(channel, recs, st, dryRun);
        totals.push(`IG ${channel}: ${n}`);
      } catch (err) {
        problems.push(`Instagram ${channel}: ${err instanceof Error ? err.message.slice(0, 160) : String(err)}`);
      }
    }
  } finally {
    if (!dryRun) await saveEngage(st);
  }

  console.log(`✅ [engage] Yanıtlar → ${totals.join(" · ")}`);
  if (problems.length) {
    for (const p of problems) console.warn(`[engage] ⚠️ ${p}`);
    // Bilgilendirme (hata değil): Telegram'a GÜNDE EN FAZLA 1 kez iletilir
    if (st.noticeDay !== st.day) {
      st.noticeDay = st.day;
      if (!dryRun) await saveEngage(st);
      await writePublishNotice(`Otomatik yorum yanıtlama uyarıları:\n• ${problems.join("\n• ")}`);
    }
  }
}

const isDirectRun = process.argv[1]?.endsWith("engage.ts") || process.argv[1]?.endsWith("engage.js");
if (isDirectRun) {
  main().catch((e) => {
    console.error("[engage] HATA:", e);
    process.exit(1);
  });
}
