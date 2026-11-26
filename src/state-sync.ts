import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { mergePublishedRecords, type MinimalPublishedRecord } from "./devops.js";

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
    const remote = (JSON.parse(remoteRaw) as { published?: MinimalPublishedRecord[] }).published ?? [];
    const local = existsSync(statePath)
      ? ((JSON.parse(readFileSync(statePath, "utf8")) as { published?: MinimalPublishedRecord[] }).published ?? [])
      : [];
    const merged = mergePublishedRecords(local, remote);
    const added = merged.length - local.length;
    if (added > 0) {
      writeFileSync(statePath, `${JSON.stringify({ published: merged }, null, 2)}\n`, "utf8");
      console.log(`[state-sync] origin/main'den ${added} yeni yayın kaydı alındı.`);
    }
    return added;
  } catch (err) {
    console.warn("[state-sync] Uzak state okunamadı, yerel dosyayla devam:", err instanceof Error ? err.message.slice(0, 200) : err);
    return 0;
  }
}
