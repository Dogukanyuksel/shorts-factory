# Shorts Factory — Modular Project Rules (`Kinetic Lab` & `Clear Mechanics`)

> **Single Source of Truth:** Static architectural rules, channel contracts, and prompt templates live in Git (`brain` / this file). Daily publish logs, analytics snapshots, and queues stay strictly in `state/` (never bloat `brain` with daily logs). No Obsidian or external PKM tools.

## 1. Strategic Focus (Pre–Feb 1, 2027 YPP Window)
- **Active Channels Only (English / US-targeted):**
  - `physics` → **Kinetic Lab** (`@kineticlabshorts`)
  - `explainer` → **Clear Mechanics** (`@clearmechanicsshorts`)
- **Primary Monetization Goal:** Reach **1,000 subscribers + 4,000 public watch hours** (or 10M Shorts views) as fast as possible.
- **No-Expansion Rule:** Do NOT add new news sites, new social channels, or external tools until both English YouTube channels pass YPP and generate steady revenue.

## 2. Content & Render Architecture ("Long-Form First → Derived Showcase Shorts")
- **Long-Form (16:9 `1920×1080`, 4:00–4:45):**
  - Never build long-form videos by concatenating unrelated Shorts when a 4-Act narrative episode is available.
  - Every deep dive follows **1 single topic across 4 cohesive acts**:
    1. *Act 1 (0:00–0:45):* Hook & Problem
    2. *Act 2 (0:45–2:15):* Core Mechanism & Forces
    3. *Act 3 (2:15–3:45):* Limit State / Failure Mode
    4. *Act 4 (3:45–4:30):* Comparative Summary & Next-Episode Bridge
  - Use explicit **Narrative Bridges** between acts and shift visual angles/layers every **20–30 seconds** (never freeze a static diagram).
- **Derived Showcase Shorts (9:16 `1080×1920`, 30–42s):**
  - Every published 4-Act long-form episode automatically enqueues **2–3 standalone Showcase Shorts** into `state/derived-shorts-queue.json` linked to `parentVideoId`.
  - `src/auto-publish.ts` prioritizes the derived funnel queue, attaches the full-video link in the description + first comment, and sends a 1-tap Telegram YouTube Studio link so the native *Related Video* chip can be linked in 5 seconds.
- **Retention & Sub Conversion:**
  - Safe-Zone overlays only (`page.addScriptTag`, never nested functions inside `page.evaluate` due to `tsx` `__name` helper).
  - Include series continuity (`PART 1 / 3`, `NEXT: ...`) + 1-second crisp Subscribe CTA.
  - Normalize audio to `-14 LUFS`, H.264 `Main@4.1` closed-GOP for IG Reels compatibility, and run `src/qc.ts` before every upload.

## 3. Channel Guard & Brand Consistency
- Canonical names: **`Kinetic Lab`** (`physics`) and **`Clear Mechanics`** (`explainer`).
- `src/channel-guard.ts` verifies OAuth token ownership before rendering/uploading to prevent cross-channel uploads.
- Always run `npm run typecheck && npm test` and `git pull --rebase origin main` before pushing.
