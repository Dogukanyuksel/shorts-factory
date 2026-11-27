import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { mergePublishedFiles, sleepSync, type PublishedFile } from "./devops.js";

/**
 * GitHub Actions'da state/*.json dosyalarını yarışma (race condition) olmadan main'e push eder.
 * Paralel çalışan physics & explainer workflow'ları state/published.json üzerinde çakışırsa
 * iki tarafın JSON kayıtlarını otomatik birleştirip yeniden dener (asla video kaydı kaybolmaz).
 */
function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function main() {
  const filePath = process.argv[2];
  const commitMsg = process.argv[3] || "chore(state): durum guncellendi";
  if (!filePath) throw new Error("Kullanım: tsx src/safe-git-push.ts <dosya> <commit-mesaji>");

  const abs = resolve(filePath);
  const localContent = readFileSync(abs, "utf8");
  const isPublishedJson = filePath.endsWith("published.json") || filePath.endsWith("published-expansion.json");
  const isDerivedQueueJson = filePath.endsWith("derived-shorts-queue.json");

  const status = runGit(["status", "--porcelain", filePath]);
  if (!status) {
    console.log(`[safe-git-push] Değişiklik yok: ${filePath}`);
    return;
  }

  runGit(["config", "user.name", "github-actions[bot]"]);
  runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      runGit(["fetch", "origin", "main"]);
      // --mixed: HEAD + index'i origin/main'e hizalar, boylece eski commit'ten kalan
      // hicbir alakasiz dosya (or. .github/workflows/*) asla stage edilmez.
      runGit(["reset", "--mixed", "origin/main"]);
      if (isPublishedJson) {
        let remoteFile: Partial<PublishedFile> = {};
        try {
          remoteFile = JSON.parse(runGit(["show", `origin/main:${filePath}`])) as Partial<PublishedFile>;
        } catch {
          // Uzakta dosya yoksa boş başla
        }
        const localFile = JSON.parse(localContent) as Partial<PublishedFile>;
        // Silinenler listesi her iki taraftan birleşir → eski kopya silinmiş kaydı geri getiremez
        const merged = mergePublishedFiles(remoteFile, localFile);
        writeFileSync(abs, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
      } else if (isDerivedQueueJson) {
        type QItem = { id: string; publishedAt?: string; shortVideoId?: string; [k: string]: unknown };
        let remoteItems: QItem[] = [];
        try {
          const remoteParsed = JSON.parse(runGit(["show", `origin/main:${filePath}`])) as { items?: QItem[] };
          if (Array.isArray(remoteParsed.items)) remoteItems = remoteParsed.items;
        } catch {
          // Uzakta dosya yoksa boş başla
        }
        const localParsed = JSON.parse(localContent) as { items?: QItem[] };
        const localItems = Array.isArray(localParsed.items) ? localParsed.items : [];
        const byId = new Map<string, QItem>();
        for (const it of remoteItems) byId.set(it.id, it);
        for (const it of localItems) {
          const prev = byId.get(it.id);
          byId.set(it.id, prev ? { ...prev, ...it, publishedAt: it.publishedAt || prev.publishedAt, shortVideoId: it.shortVideoId || prev.shortVideoId } : it);
        }
        writeFileSync(abs, `${JSON.stringify({ items: [...byId.values()] }, null, 2)}\n`, "utf8");
      } else {
        writeFileSync(abs, localContent, "utf8");
      }

      runGit(["add", "--", filePath]);
      const staged = runGit(["diff", "--cached", "--name-only"]);
      if (!staged) {
        console.log(`[safe-git-push] Uzakla zaten eşit: ${filePath}`);
        return;
      }
      runGit(["commit", "-m", commitMsg]);
      runGit(["push", "origin", "HEAD:main"]);
      console.log(`✅ [safe-git-push] Push başarılı (deneme ${attempt}): ${filePath}`);
      return;
    } catch (err) {
      console.warn(`[safe-git-push] Deneme ${attempt}/4 başarısız:`, err instanceof Error ? err.message.slice(0, 200) : err);
      if (attempt === 4) throw err;
      // Üstel geri çekilme + jitter: paralel workflow'larla aynı saniyede tekrar çakışmayı önler
      const waitMs = 2000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1500);
      console.log(`[safe-git-push] ${Math.round(waitMs / 1000)} sn sonra tekrar denenecek...`);
      sleepSync(waitMs);
    }
  }
}

main();
