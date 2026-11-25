import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { mergePublishedRecords, type MinimalPublishedRecord } from "./devops.js";

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
  const isPublishedJson = filePath.endsWith("published.json");

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
        let remotePublished: MinimalPublishedRecord[] = [];
        try {
          const remoteRaw = runGit(["show", `origin/main:${filePath}`]);
          const parsed = JSON.parse(remoteRaw) as { published?: MinimalPublishedRecord[] };
          if (Array.isArray(parsed.published)) remotePublished = parsed.published;
        } catch {
          // Uzakta dosya yoksa boş başla
        }
        const localParsed = JSON.parse(localContent) as { published?: MinimalPublishedRecord[] };
        const merged = mergePublishedRecords(remotePublished, localParsed.published || []);
        writeFileSync(abs, `${JSON.stringify({ published: merged }, null, 2)}\n`, "utf8");
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
    }
  }
}

main();
