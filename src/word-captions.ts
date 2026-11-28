export interface TimedVoiceLine {
  text: string;
  start: number;
  end: number;
}

export interface WordToken {
  word: string;
  start: number;
  end: number;
}

export interface WordCaptionChunk {
  start: number;
  end: number;
  words: WordToken[];
}

/**
 * Her konuşma satırını karakter ağırlıklı milisaniye zaman damgalarıyla 2-3 kelimelik
 * TikTok/Shorts tarzı dinamik parçalara (chunk) böler.
 */
export function buildWordCaptionChunks(lines: TimedVoiceLine[], maxWordsPerChunk = 3): WordCaptionChunk[] {
  const chunks: WordCaptionChunk[] = [];
  for (const line of lines) {
    const rawWords = line.text
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
    if (rawWords.length === 0 || line.end <= line.start) continue;

    const weights = rawWords.map((w) => Math.max(2, w.replace(/[^a-zA-Z0-9]/g, "").length) + (/[,.!?—]$/.test(w) ? 2.2 : 0));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const dur = line.end - line.start;

    const tokens: WordToken[] = [];
    let cur = line.start;
    for (let i = 0; i < rawWords.length; i++) {
      const wDur = (weights[i] / totalW) * dur;
      const next = i === rawWords.length - 1 ? line.end : cur + wDur;
      tokens.push({ word: rawWords[i].toUpperCase(), start: cur, end: next });
      cur = next;
    }

    for (let i = 0; i < tokens.length; i += maxWordsPerChunk) {
      const slice = tokens.slice(i, i + maxWordsPerChunk);
      chunks.push({
        start: slice[0].start,
        end: slice[slice.length - 1].end,
        words: slice,
      });
    }
  }
  return chunks;
}

/**
 * Playwright Canvas overlay içine gömülen 60fps Word-Pop dinamik altyazı çizim fonksiyonu.
 * Ekranda aynı anda en fazla 2-3 kelime gösterir; söylenen kelime kanal vurgu renginde
 * parlar ve damped-spring (yay) animasyonuyla büyür.
 */
export function buildWordCaptionCanvasSnippet(lines: TimedVoiceLine[], accentHex: string): string {
  const chunks = buildWordCaptionChunks(lines, 3);
  return `
    const WORD_CHUNKS = ${JSON.stringify(chunks)};
    const WORD_ACCENT = ${JSON.stringify(accentHex)};
    function drawWordPopCaption(ctx, tSec, W, H, S) {
      let active = null;
      for (let i = 0; i < WORD_CHUNKS.length; i++) {
        const c = WORD_CHUNKS[i];
        if (tSec >= c.start && tSec <= c.end + 0.04) { active = c; break; }
      }
      if (!active) return;

      const basePx = Math.round(34 * S);
      const maxRowW = W * 0.80;
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Satır genişliğini ölç, taşarsa fontu orantılı küçült
      let fontPx = basePx;
      const spaceW = () => fontPx * 0.34;
      let totalW = 0;
      while (fontPx > Math.round(18 * S)) {
        ctx.font = "900 " + fontPx + "px -apple-system, BlinkMacSystemFont, sans-serif";
        totalW = 0;
        for (let i = 0; i < active.words.length; i++) {
          totalW += ctx.measureText(active.words[i].word).width;
          if (i < active.words.length - 1) totalW += spaceW();
        }
        if (totalW <= maxRowW) break;
        fontPx -= 2;
      }

      const cy = H * 0.768;
      const padX = 22 * S, padY = 14 * S;
      const pillW = Math.min(W * 0.88, totalW + padX * 2);
      const pillH = fontPx + padY * 2;
      ctx.fillStyle = "rgba(5, 10, 22, 0.82)";
      ctx.beginPath();
      ctx.roundRect((W - pillW) * 0.5, cy - pillH * 0.5, pillW, pillH, 16 * S);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1.6 * S;
      ctx.stroke();

      let x = (W - totalW) * 0.5;
      const sp = spaceW();
      for (let i = 0; i < active.words.length; i++) {
        const tk = active.words[i];
        ctx.font = "900 " + fontPx + "px -apple-system, BlinkMacSystemFont, sans-serif";
        const ww = ctx.measureText(tk.word).width;
        const isCurrent = tSec >= tk.start && tSec <= tk.end + 0.04;
        const isSpoken = tSec > tk.end;

        ctx.save();
        ctx.translate(x + ww * 0.5, cy);
        if (isCurrent) {
          const dt = Math.max(0, tSec - tk.start);
          // Damped spring pop: 1.0 -> 1.18 -> 1.07
          const spring = 1 + 0.18 * Math.exp(-dt * 16) * Math.sin(dt * 38) + 0.07 * Math.min(1, dt / 0.08);
          ctx.scale(spring, spring);
          ctx.shadowColor = WORD_ACCENT;
          ctx.shadowBlur = 18 * S;
          ctx.fillStyle = WORD_ACCENT;
        } else {
          ctx.fillStyle = isSpoken ? "rgba(255, 255, 255, 0.92)" : "rgba(226, 232, 240, 0.65)";
        }
        ctx.lineWidth = 5 * S;
        ctx.strokeStyle = "rgba(2, 6, 23, 0.95)";
        ctx.lineJoin = "round";
        ctx.strokeText(tk.word, -ww * 0.5, 0);
        ctx.fillText(tk.word, -ww * 0.5, 0);
        ctx.restore();

        x += ww + sp;
      }
      ctx.restore();
    }
  `;
}
