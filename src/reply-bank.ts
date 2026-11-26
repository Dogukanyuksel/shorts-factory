import { createHash } from "node:crypto";

/**
 * Organik yorum yanıt motoru (yalnızca KENDİ videolarımızdaki yorumlar için).
 * - Yorumu sınıflar (oy, soru, övgü, illüzyon başarısı/başarısızlığı, tahmin, eleştiri, genel)
 * - Her sınıfta çok sayıda varyant; yorum kimliğine göre deterministik seçim → aynı cevap seri halde tekrar etmez
 * - Spam/link/hakaret içeren yorumlara HİÇ yanıt verilmez (etkileşime girmek dağıtıma zarar verir)
 * - Türkçe yorumlara Türkçe yanıt
 */

export type ReplyChannel = "physics" | "explainer";
export type ReplyCategory =
  | "vote"
  | "illusion_success"
  | "illusion_fail"
  | "guess"
  | "question"
  | "praise"
  | "critique"
  | "generic";

const SPAM = /(https?:\/\/|www\.|\.com\b|sub ?4 ?sub|check (out )?my|follow me|dm me|whatsapp|telegram|crypto|onlyfans|promo|free followers|giveaway)/i;
const TOXIC = /\b(idiot|stupid|trash|garbage|fake|scam|kys|f+u+c+k|shit|dumb|retard)\b|aptal|salak|gerizekal|siktir|amk|orospu|şerefsiz/i;
const TURKISH = /[ğüşıöçĞÜŞİÖÇ]|\b(ve|bir|bu|çok|nasıl|neden|harika|güzel|döndü|olmadı|abi|hocam|mükemmel)\b/i;

export function shouldSkipComment(text: string): boolean {
  const t = text.trim();
  if (t.length < 1) return true;
  if (SPAM.test(t) || TOXIC.test(t)) return true;
  // Sadece etiketleme/emoji olmayan çok uzun metin blokları genelde spam
  if (t.length > 600) return true;
  return false;
}

export function classifyComment(text: string): ReplyCategory {
  const low = text.toLowerCase().trim();
  if (/^[ab]\b[\s)!.:,-]*$/i.test(text.trim()) || /\b(vote|option)\s*[ab]\b/i.test(low)) return "vote";
  if (/(both ways|i did it|it flipped|flipped|changed direction|i can switch|reversed|it worked|easy|easiest|did it|yaptım|döndü|tersine)/i.test(low)) return "illusion_success";
  if (/(can'?t|cannot|doesn'?t (work|flip)|not working|only one way|impossible|still spinning|yapamadım|olmadı|dönmüyor)/i.test(low)) return "illusion_fail";
  if (/^\s*\d{1,4}\s*(folds?|steps?|times?)?\s*[!.?]*\s*$/i.test(low) || /\b(i guessed|my guess|i said)\b|\btahmin/i.test(low)) return "guess";
  if (/\?/.test(text) || /^(how|why|what|when|where|is|does|can|nasıl|neden|niye|ne zaman)\b/i.test(low)) return "question";
  if (/(wrong|incorrect|actually|not true|misleading|inaccurate|yanlış|hatalı)/i.test(low)) return "critique";
  if (/(cool|satisfying|love|amazing|awesome|nice|fire|wow|beautiful|insane|great|crazy|🔥|😍|🤯|harika|güzel|muhteşem|süper)/i.test(low)) return "praise";
  return "generic";
}

const EN: Record<ReplyCategory, string[]> = {
  vote: [
    "Vote counted 🗳️ Results decide what drops next — stay tuned!",
    "Got it! Your vote's in. Winner gets made next 🔥",
    "Counted ✅ It's a close one so far!",
    "Noted! Tell a friend to vote too, it's tight 👀",
  ],
  illusion_success: [
    "Your brain is officially elite 🧠 Can you switch it back again?",
    "Nice! Now try flipping it while looking at the edge 👀",
    "Legend. Most people need 3+ tries for that one 🔥",
    "That's the moment your brain re-guesses the depth. Wild, right?",
    "Love it! Next one is harder — ready? 😏",
  ],
  illusion_fail: [
    "Try this: stare at the center, blink slowly, imagine it spinning the other way 👀",
    "Totally normal! Look at a single dot, then relax your eyes — it usually flips 🔄",
    "Keep going — it often clicks on the 3rd or 4th try. Report back!",
    "Tip: focus on the bottom edge instead of the top. Works for most people 🧠",
  ],
  guess: [
    "Bold guess! 👀 Did the answer surprise you?",
    "Close one! Exponential growth fools almost everyone 😄",
    "Love that you guessed before the end 🔥 What should we double next?",
    "That's what makes doubling wild — it's tiny, then suddenly enormous 🚀",
  ],
  question: [
    "Great question! Short answer: the whole thing is simulated with real physics math, frame by frame ⚙️",
    "Good one — we might turn this into its own video. Want that? 👀",
    "Love this question! Drop more and we'll answer them in a video 🙌",
    "It comes down to the geometry — want a deeper breakdown in a full video?",
  ],
  praise: [
    "Thank you! 🙌 What should we make next?",
    "Appreciate you! New one drops every day 🔥",
    "Glad you liked it! Which part was the most satisfying?",
    "Means a lot 🙏 Got an idea for the next one?",
    "🔥🔥 Thanks for watching till the end!",
  ],
  critique: [
    "Fair point — thanks for keeping us sharp! We'll look into it 🙏",
    "Good catch, appreciate the detail. Always happy to improve ⚙️",
    "Thanks for the feedback! What would you change?",
  ],
  generic: [
    "Thanks for watching! 🙌 What should we try next?",
    "Appreciate you being here! New one every day 🔥",
    "🙌 Glad you stopped by — which one's your favorite so far?",
    "Thanks! Tell us what to simulate next 👇",
  ],
};

const TR: Record<ReplyCategory, string[]> = {
  vote: ["Oyun sayıldı 🗳️ Kazanan bir sonraki videoda!", "Not aldım ✅ Şu an kafa kafaya gidiyor 👀"],
  illusion_success: ["Beynin efsane çalışıyor 🧠 Şimdi tekrar geri çevirebilir misin?", "Süper! Çoğu kişi 3 denemede yapabiliyor 🔥"],
  illusion_fail: ["Merkeze odaklan, yavaşça göz kırp ve ters döndüğünü hayal et 👀", "Çok normal! Tek bir noktaya bakıp gözünü gevşet, genelde dönüyor 🔄"],
  guess: ["Cesur tahmin! 👀 Sonuç şaşırttı mı?", "Üstel büyüme herkesi şaşırtıyor 😄 Sıradaki neyi ikiye katlayalım?"],
  question: ["Güzel soru! Her şey gerçek fizik hesaplarıyla kare kare simüle ediliyor ⚙️", "Harika soru — bunu ayrı bir video yapabiliriz, ister misin? 👀"],
  praise: ["Çok teşekkürler! 🙌 Sıradaki ne olsun?", "Beğenmene sevindik! Her gün yeni video geliyor 🔥"],
  critique: ["Haklı olabilirsin, geri bildirim için teşekkürler 🙏 İnceleyeceğiz."],
  generic: ["İzlediğin için teşekkürler! 🙌 Sıradaki ne olsun?", "Burada olman harika! Her gün yeni video 🔥"],
};

function pick<T>(arr: T[], seed: string): T {
  const h = createHash("sha256").update(seed).digest();
  return arr[h.readUInt32BE(0) % arr.length];
}

/** Yorum için yanıt üretir; yanıt verilmemesi gerekiyorsa null döner. */
export function buildReply(commentId: string, text: string, _channel: ReplyChannel): string | null {
  if (shouldSkipComment(text)) return null;
  const cat = classifyComment(text);
  const bank = TURKISH.test(text) ? TR : EN;
  return pick(bank[cat], `${commentId}:${cat}`);
}
