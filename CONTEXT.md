# Y-LABS OS — Project Context (`shorts-factory`)

- **Spec & OS:** `CLAUDE.md` + `docs/Y-LABS-OS.md` (v2.3) | **Agent Rules:** `AGENTS.md`
- **4 Live Channels (YT + IG, US Prime Time):**
  1. `physics` → Kinetic Lab HQ (`@kineticlabshorts` / `@kineticlab.motion`, 32 niches, voice `am_fenrir`)
  2. `explainer` → Clear Mechanics (`@clearmechanicsshorts` / `@clearmechanics.lab`, 44 episodes, voice `am_michael`)
  3. `wealth` → Wealth Mechanics (`@wealthmechanicsshorts` / `@wealthmechanics.hq`, 9 shorts + 4-act deep dive, voice `af_bella` A-)
  4. `bio` → Bio Mechanics (`@biomechanicshq` / `@biomechanics.hq`, 10 shorts + 4-act deep dive, voice `af_heart` A)
- **Core Modules (`src/`):** `voice.ts` + `phonetic-overrides.ts` (Kokoro-82M \$0/mo + Act-2 Co-Host + medical/physics TTS pronunciation overrides), `policy-guard.ts` (4-channel Jaccard + Wealth/Bio compliance), `word-captions.ts` (`H*0.768`), `webgl-helper.ts` + `ylabs-3d-kit.js` (shared offline Three.js 3D PBR cinema kit), `render.ts` / `render-explainer.ts` / `render-narrative.ts` (Related Video bridge CTAs, zero `60fps` CTA jargon, 8–10 min single-topic 16:9 target + 3 thumbs + `.srt`), `publish-expansion.ts`, `channel-director.ts`, `analytics-kpi.ts`.
- **3D PBR Scenes (32 Live — 8/Channel + Hard Gate):** `physics` (+`gravity-funnel`, `black-hole-eat`, `double-pendulum`, `pendulum-wave`), `explainer` (+`airbag`, `disc-brake`, `electric-motor`, `bulletproof-vest`), `wealth` (+`wealth-rule-of-72`, `wealth-rent-vs-buy-math`, `wealth-sp500-30-years`, `wealth-dividend-snowball`), `bio` (+`bio-gut-brain-highway`, `bio-sitting-psoas-back`, `bio-cold-plunge-shock`, `bio-dehydration-2-percent`). **3D-Only Publish Gate** + Telegram empty-queue alert.
- **8–10 Min Single-Topic Pillars (`src/longform-narrative.ts`):** `narrative-wealth-invisible-traps` (30 beats) & `narrative-bio-sleep-deprivation-24h` (30 beats) + V4.0 Growth Protocol (`docs/Y-LABS-V4-GROWTH.md`).
- **Installed Skills (9 Y-LABS):** `ylabs-3d-cinema-engine`, `ylabs-pro-motion-graphics`, `ylabs-retention-visual-qa`, `ylabs-thumbnail-director`, `ylabs-release-audit-gate`, `ylabs-psychoacoustic-mixer`, `ylabs-analytics-feedback-loop`, `ylabs-cognitive-misconception-miner`, `ylabs-visual-metaphor-scaler`.
- **Schedule:** 2 Shorts/day (28–38s target) + 1 Long-Form 16:9 every 2 days per channel (`MIN_PUBLISH_GAP_HOURS=40`). Facebook Reels OFF by default.
- **Verification:** `npm run typecheck && npm test` (59/59 PASS) + `git pull --rebase origin main` before push. Never nest arrow functions inside `page.evaluate()`.
