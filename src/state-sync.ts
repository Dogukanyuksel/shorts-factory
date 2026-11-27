import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { mergePublishedFiles, type PublishedFile } from "./devops.js";

/**
 * Workflow checkout'u tetiklenme anındaki commit'i alır; arada başka bir run (ör. watchdog'un
 * başlattığı yeniden deneme) yayın yapıp state'i push etmiş olabilir. Video seçmeden ÖNCE
 * origin/main'deki güncel state/published.json'ı yerel dosyayla birleştirir → aynı video iki kez yüklenmez.
 * Git/ağ hatasında sessizce yerel dosyayla devam eder (yerel geliştirmeyi bozmaz).
 */
export function syncPublishedStateFromRemote(statePath = resolve("state", "published.json")): number {
  try {
    execFileSync("git", ["fetch", "--quiet", "origin", "main"], { stdio: ["ignore", "ignore", "pipe"], timeout: 60_000 });
    const rel = relative(process.cwd(), statePath).split("\\").join("/");
    const remoteRaw = execFileSync("git", ["show", `origin/main:${rel}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const remote = JSON.parse(remoteRaw) as Partial<PublishedFile>;
    const local: Partial<PublishedFile> = existsSync(statePath)
      ? (JSON.parse(readFileSync(statePath, "utf8")) as Partial<PublishedFile>)
      : {};
    const merged = mergePublishedFiles(local, remote);
    const before = JSON.stringify({ published: local.published ?? [], removedVideoIds: local.removedVideoIds ?? [] });
    const after = JSON.stringify({ published: merged.published, removedVideoIds: merged.removedVideoIds ?? [] });
    const added = merged.published.length - (local.published?.length ?? 0);
    if (before !== after) {
      writeFileSync(statePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
      console.log(`[state-sync] origin/main ile senkronlandı (${added >= 0 ? "+" : ""}${added} kayıt).`);
    }
    return added;
  } catch (err) {
    console.warn("[state-sync] Uzak state okunamadı, yerel dosyayla devam:", err instanceof Error ? err.message.slice(0, 200) : err);
    return 0;
  }
}
