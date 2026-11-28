# Y-LABS OS v2.2 — 4-Channel Autonomous Production Spec

> **Living Single Source of Truth:** Static architectural rules, channel brand kits, voice identities, and policy contracts live in Git (`CLAUDE.md` + `docs/Y-LABS-OS.md`). Daily publish logs, analytics snapshots, and queues stay strictly in `state/`. Every research finding and production lesson evolves this OS.

## 1. Strategic Objective & YPP Thresholds `[RESMİ]`
- **4-Channel Simultaneous Growth:** All 4 channels run in parallel in US Prime Time (English / Tier-1 RPM).
- **Phase 1 — Feb 1, 2027 Sprint `[RESMİ]`:** Push toward **1,000 subscribers + 4,000 public watch hours** before February 1, 2027. Apply the exact day any channel crosses threshold.
- **Phase 2 — Post–Feb 1, 2027 Compound Engine `[RESMİ]`:** YouTube doubles YPP entry thresholds to **8,000 public watch hours / 20M Shorts views** on Feb 1, 2027. Every 6–8 min Pillar Deep Dive compounds directly toward both 4,000h and 8,000h.

## 2. Active 4-Channel Network & Kokoro-82M Voice Matrix (\$0/mo, Apache-2.0)
Each channel has a **unique signature US English neural voice** (`src/voice.ts`, 2 Male + 2 Female balance) to maximize brand recall and eliminate "inauthentic / template mass-production" risk (`YouTube Help 1311392` `[RESMİ]`):

- **`physics` → Kinetic Lab HQ:** YT `@kineticlabshorts` | IG `@kineticlab.motion`
  - **Voice:** `am_fenrir` (Male, 1.04x — Energetic Science) | **Long-form Act-2 Co-Host:** `af_bella`
  - **Brand Kit:** BG `#0B0F19`, Primary `#00F0FF`, Accent `#FF3B30`. 2D/3D physics simulations, vector arrows, live telemetry.
- **`explainer` → Clear Mechanics:** YT `@clearmechanicsshorts` | IG `@clearmechanics.lab`
  - **Voice:** `am_michael` (Male, 1.00x — Engineering Documentary) | **Long-form Act-2 Co-Host:** `af_heart`
  - **Brand Kit:** BG `#141414`, Primary `#FF9500`, Accent `#FFFFFF` + `#38bdf8`. Three.js WebGL PBR exploded views, X-ray metal, callouts.
- **`wealth` → Wealth Mechanics (\$12–\$22 RPM):** YT `@wealthmechanicsshorts` | IG `@wealthmechanics.hq`
  - **Voice:** `af_bella` (Female, **Grade A-**, 0.98x — Sharp Financial Analyst) | **Long-form Act-2 Co-Host:** `am_michael`
  - **Brand Kit:** BG `#090D16`, Primary `#FFD60A`, Accent `#30D158`. Compound curves, odometer counters, clean financial math.
- **`bio` → Bio Mechanics (\$8–\$14 RPM):** YT `@biomechanicshq` | IG `@biomechanics.hq`
  - **Voice:** `af_heart` (Female, **Grade A**, 1.00x — Warm Medical Narrator) | **Long-form Act-2 Co-Host:** `am_fenrir`
  - **Brand Kit:** BG `#0D1117`, Primary `#34C759`, Accent `#FF2D55`. Bioluminescent anatomical cutaways, force vectors, live telemetry.

> **TTS Fallback & Ban:** Primary is **Kokoro-82M** (`kokoro-js`, cached in `~/.cache/kokoro-82m`). Optional `OPENAI_API_KEY` overrides if ever configured. Fallback is `haber.yukselmedya.com`. **Robotic `espeak-ng` is strictly BANNED in production** (`DRY_RUN=true` local test only). Never use unofficial Edge TTS endpoints.

## 3. Publishing Rhythm & Distribution
- **Golden Rhythm:** **2 Shorts/day** per channel in US Prime Time (`UTC 14:xx`, `19:xx`) + **1 Long-Form 16:9 every 2 days** per channel (alternating odd/even days, `MIN_PUBLISH_GAP_HOURS=40`).
- **Distribution:** Every Short publishes to **YouTube Shorts + Instagram Reels** (`ENABLE_FACEBOOK_REELS` defaults to `false`). Never put `@` in front of YouTube handles on Instagram; use `@` strictly for our 4 real sister Instagram handles (`src/network-links.ts`).

## 4. Production, Retention & Policy Guardrails
1. **Shorts (`1080×1920`, 60fps, 28–42s) `[GÖRÜŞ/VERİ]`:** Immediate visual motion in first 2s + silent top Safe-Zone hook pill (`0–1.75s`) + 2–3 word Canvas Word-Pop captions (`src/word-captions.ts`) + visual state shift every 3–5s. Standalone Shorts end with a seamless loop; Showcase Shorts derived from 16:9 videos end with an explicit CTA to the Related Video `[RESMİ]`.
2. **Long-Form Pillars (`1920×1080`, 6–8 min target) `[GÖRÜŞ]`:** 4 cohesive Acts on 1 deep topic (Hook → Core Mechanism [Act-2 Co-Host voice shift] → Failure/Limit State → Synthesis). First 5s immediately delivers the thumbnail promise `[RESMİ]`. Auto-generates **3 distinct `1280×720` thumbnail variants** (A/B/C for Studio `Test & Compare`) + local `.srt` Closed Captions file.
3. **Policy & Anti-Template Gate (`src/policy-guard.ts`) `[RESMİ]`:** Runs before upload on ALL 4 channels. Blocks duplicate/template titles (`Jaccard >= 0.78`), blocks AI advisor/doctor personas in Wealth/Bio, and enforces educational disclaimers (`ensureSensitiveDisclaimer`).
4. **Safety & Verification:** Always verify channel ownership (`src/channel-guard.ts`), enforce **3D-Only Publish Gate** (`assertThreeJsScene` in `src/webgl-helper.ts` — never publish a 2D scene even if analytics/director reorders the queue; convert the next queued scene to Three.js 3D PBR first), never nest arrow functions inside `page.evaluate()` (`tsx` `__name` bug), normalize audio to `-14 LUFS`, run `src/qc.ts`, and verify `npm run typecheck && npm test` + `git pull --rebase origin main` before pushing.
