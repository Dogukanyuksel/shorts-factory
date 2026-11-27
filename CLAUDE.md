# Shorts Factory — 4-Channel Autonomous Production Spec

> **Single Source of Truth:** Static architectural rules, channel brand kits, and production contracts live in Git (`CLAUDE.md`). Daily publish logs, analytics snapshots, and queues stay strictly in `state/`.

## 1. Active 4-Channel Network (English / US Prime Time — Pre–Feb 1, 2027 YPP Goal)
- **`physics` → Kinetic Lab HQ:** YT `@kineticlabshorts` | IG `@kineticlab.motion`
  - **Brand Kit:** BG `#0B0F19`, Primary `#00F0FF` (Electric Cyan), Accent `#FF3B30`. Style: 2D/3D physics simulations, vector arrows, velocity/acceleration counters, technical grid.
- **`explainer` → Clear Mechanics:** YT `@clearmechanicsshorts` | IG `@clearmechanics.lab`
  - **Brand Kit:** BG `#141414` (Anthracite), Primary `#FF9500` (Industrial Orange), Accent `#FFFFFF` + `#38bdf8`. Style: 3D Three.js WebGL PBR exploded views, X-ray translucent metal, part callouts.
- **`wealth` → Wealth Mechanics ($12–$22 RPM):** YT `@wealthmechanicsshorts` | IG `@wealthmechanics.hq`
  - **Brand Kit:** BG `#090D16` (Financial Night), Primary `#FFD60A` (Gold), Accent `#30D158` / `#10b981` (Growth Green). Style: Dynamic compound curves, odometer counters, clean financial typography.
- **`bio` → Bio Mechanics ($8–$14 RPM):** YT `@biomechanicshq` | IG `@biomechanics.hq`
  - **Brand Kit:** BG `#0D1117` (Dark Carbon), Primary `#34C759` (Bio Green), Accent `#FF2D55` (Tension Crimson). Style: Bioluminescent anatomical cutaways, force vectors, angle protractors, live telemetry.

## 2. Strict Shorts/Reels Production Rules (1080×1920, 60fps, 28–42s)
1. **0.0–2.0s Scroll-Stopper Hook:** Immediate visual break (collision, shocking stat, or 3D zoom) + 1-sentence curiosity hook + high-contrast top Safe-Zone silent hook pill (target `Viewed vs Swiped Away > 70%`).
2. **Pattern Interrupt Every 3–4s:** Visual state must change every 3–4 seconds (camera angle, new data layer, vector highlight, phase transition). Static screens are forbidden.
3. **Subtitles & Safe Zone:** 2–3 words max at once, active word highlighted in channel accent color. Keep all key UI within `x ∈ [6%W, 84%W]`, `y ∈ [14%H, 74%H]`. Never nest functions inside `page.evaluate` (`tsx` `__name` helper) — inject overlays via `page.addScriptTag`.
4. **Seamless Loop:** Final spoken line bridges semantically back to the opening line, and final frame returns smoothly to frame 0 (no static full-screen blocker at the end; sleek floating glass pill only).
5. **Multi-Platform Distribution (1 Render → 3 Platforms):** Every Short publishes to **YouTube Shorts + Instagram Reels + Facebook Reels** (`src/facebook.ts`). Never put `@` in front of YouTube channel names on Instagram; use `@` strictly for our 4 real sister Instagram handles (`src/network-links.ts`).

## 3. 4-Act 16:9 Long-Form Architecture (4,000 Watch-Hour YPP Engine)
- Every flagship 16:9 video (`1920×1080`, 4:00–4:45) covers **1 single topic across 4 cohesive acts** (Hook → Core Mechanism → Failure/Limit State → Comparative Summary) with explicit Narrative Bridges and visual phase shifts every 20–30s.
- Publishing a 4-Act video automatically enqueues 3 standalone Showcase Shorts into `state/derived-shorts-queue.json`.

## 4. Safety & Verification
- Always verify channel ownership via `src/channel-guard.ts` / `getMyChannel()`.
- Normalize audio to `-14 LUFS`, H.264 `yuv420p`, run `src/qc.ts`, and verify `npm run typecheck && npm test` + `git pull --rebase origin main` before pushing.
