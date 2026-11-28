import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "playwright-core";

/**
 * Headless Chromium'da hem 2D Canvas hem gerçek Three.js WebGL 3D PBR render'ı
 * (GPU'suz GitHub Actions sunucularında SwiftShader ile) hatasız çalıştıran bayraklar.
 */
export const CHROMIUM_RENDER_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
];

/**
 * Three.js (ve ileride eklenecek diğer yerel motorları) %100 çevrimdışı, CDN bağımlılığı olmadan
 * `https://local.shorts/...` üzerinden Playwright sayfasına servis eder.
 */
export async function attachLocalEngines(page: Page): Promise<void> {
  const threeBuildDir = resolve("node_modules", "three", "build");
  const kitPath = resolve("src", "ylabs-3d-kit.js");
  await page.route("https://local.shorts/**", async (route) => {
    const url = route.request().url();
    const rel = url.replace("https://local.shorts/", "").replace(/\?.*$/, "");
    if (rel === "ylabs-3d-kit.js" && existsSync(kitPath)) {
      const body = await readFile(kitPath, "utf8");
      await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body });
      return;
    }
    if (rel === "three.module.js" || rel === "three.core.js") {
      const target = resolve(threeBuildDir, rel);
      if (existsSync(target)) {
        const body = await readFile(target, "utf8");
        await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body });
        return;
      }
    }
    await route.abort();
  });
}

export function isLegacy2DAllowed(): boolean {
  return process.env.ALLOW_LEGACY_2D === "true";
}

export async function isThreeJsSceneFile(scenePath: string): Promise<boolean> {
  if (!existsSync(scenePath)) return false;
  const html = await readFile(scenePath, "utf8");
  return /data-engine=["']three["']|local\.shorts\/three\.module\.js/i.test(html);
}

/**
 * 3D-Only Publish Gate: Hiçbir sahne Three.js 3D PBR'ye çevrilmeden (veya ALLOW_LEGACY_2D=true
 * açıkça verilmeden) yayına gönderilemez. Analiz sırayı değiştirse bile 2D sahneleri engeller.
 */
export async function assertThreeJsScene(scenePath: string, label: string): Promise<void> {
  if (isLegacy2DAllowed()) return;
  const is3D = await isThreeJsSceneFile(scenePath);
  if (!is3D) {
    throw new Error(
      `[3D-GATE] "${label}" (${scenePath}) henüz Three.js 3D PBR değil! 3D'ye çevrilmeden yayına gönderilmez (override: ALLOW_LEGACY_2D=true).`,
    );
  }
}
