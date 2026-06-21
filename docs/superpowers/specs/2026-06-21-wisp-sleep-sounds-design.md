# Wisp — Sleep Sounds & White Noise — Design

**Date:** 2026-06-21
**Status:** Approved (design); implementation plan pending
**App ID:** `com.velologiclabs.wisp`
**Display name:** "Wisp — Sleep Sounds & White Noise"

## Goal
Production-ready Android MVP of a white-noise / sleep-sounds app for Google Play, at solo-developer scale. Optimize for **reliability** (audio plays all night, screen off), tight scope, fast time-to-store. iOS is structured-in but Android is the launch target.

## Tech stack (fixed)
- SvelteKit + TypeScript, static SPA via `@sveltejs/adapter-static` (for Capacitor).
- Capacitor 6+ (Android first).
- Native audio: `@mediagrid/capacitor-native-audio` (media3/ExoPlayer; background playback, media notification, multiple simultaneous sources).
- Subscriptions: `@revenuecat/purchases-capacitor` (wraps Google Play Billing).
- Local persistence: `@capacitor/preferences`.
- State: Svelte stores.

**Hard rule:** No HTML5 `<audio>` or Web Audio API as the primary playback engine. All playable sounds go through the native plugin as bundled files.

## Architecture & layering
Dependency direction (top depends on bottom only):

```
UI (Svelte routes/components)
        │  read stores, call actions
        ▼
Stores (activeSounds, savedMixes, timer, subscription)
        │
        ▼
Services (audioEngine, subscriptionService, storageService)
        │
        ▼
Plugin adapters (native-audio, RevenueCat, Preferences)  ← mockable seams
```

Every Capacitor plugin sits behind a thin TypeScript adapter interface. Nothing above the adapter layer imports a plugin directly. This boundary is what makes >90% unit coverage and browser-based E2E (no device) achievable: tests inject fakes at the adapter boundary.

## Components & responsibilities

### `lib/sounds/registry.ts`
Single source of truth. `SoundDef[]` with: `id`, `name`, `category` (`noise` | `nature`), `assetPath`, `tier: 'free' | 'premium'`, `loopMeta`. Free vs premium derived here. Free tier ~8 sounds (white/pink/brown noise, rain, ocean, fan, forest, stream); premium expands to 30+.

### `lib/services/audioEngine.ts`
Wraps native-audio adapter:
- `preload(soundId, assetPath, metadata)`
- `play(soundId)` / `pause(soundId)` / `stop(soundId)`
- `setVolume(soundId, 0..1)` — independent per sound; this IS the mixer
- N simultaneous looping sounds
- one active sound drives the notification (`useForNotification: true`); others loop alongside
- `fadeOutAll(durationMs)` — ramp every active volume to 0, then stop and tear down

Pure logic + adapter calls; no Svelte imports.

### `lib/services/subscriptionService.ts`
RevenueCat init, `getCustomerInfo`, entitlement id `premium`, one offering with annual (~$39.99, 7-day trial) + monthly packages, purchase/restore.

### `lib/services/storageService.ts`
Typed Preferences wrapper (get/set JSON).

### Stores
- `activeSounds` — Map `soundId → volume`; play/pause/mixer actions.
- `savedMixes` — CRUD; a mix = `{ soundId, volume }[]`; free tier capped at **1** saved mix.
- `timer` — durations 15/30/45/60/90 + custom + "until I stop"; on expiry ~30s `fadeOutAll` then stop playback + foreground service.
- `subscription` — entitlement state; refresh on `App` resume.

### Routes
`/` Home (sound grid) → `/now-playing` (active sounds + per-sound sliders + sleep-timer control) → `/mixes` (saved) → `/paywall` → `/settings`.

## Freemium gating (entitlement "premium")
Gate UI only, never running audio. `subscription.isPremium` drives: locked sound tiles (tap → paywall), saved-mix cap (free = 1), premium soundscapes. Read via `getCustomerInfo()`, refreshed on resume. Core sleep / background-playback function is never gated.

## Sounds / assets — offline-first
- **This build ships a typed registry with placeholder asset paths.** Real seamless-loop files are produced offline and dropped into `src/assets/sounds/` (or Android `assets/`) later; the registry already names every file.
- Noise colors: pre-rendered seamless loop files (generated offline; never generated live in the WebView).
- Nature/ambient: CC0 / royalty-free-for-commercial seamless loops (e.g. Pixabay), loudness-normalized, loop-verified, 128–192 kbps mp3/aac.
- All sounds bundled; no network needed to play.

## Testing strategy
- **Unit (vitest, node/jsdom):** audioEngine, all stores, services, registry, gating logic — adapters faked. Primary source of the >90% coverage line.
- **Component (@testing-library/svelte):** sound tiles, sliders, timer control, paywall states.
- **E2E / automated app tests (Playwright on the web build):** Capacitor plugins replaced by browser fakes. Flows: layer 2 sounds → adjust volumes → save mix → hit free-tier cap → paywall → set timer → fade-out.
- **Coverage gate:** vitest `coverage.thresholds` ≥ 90% (lines/functions/branches/statements), enforced via test script.
- **Manual (physical device, documented in README, not automated):** real Google Play IAP, true background playback with screen off, OEM battery-optimizer behavior (Xiaomi/Samsung).

## Native config (exact entries delivered)
- `AndroidManifest.xml`: declare plugin `AudioPlayerService` with `android:foregroundServiceType="mediaPlayback"`; permissions `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`; main Activity `android:launchMode="singleTop"` (prevents Play purchase-verification cancellation).
- `capacitor.config.ts`: appId `com.velologiclabs.wisp`, appName "Wisp", static `webDir`.
- iOS: Background Modes → Audio enabled.

## Non-functional
- Offline-first; works with no connectivity.
- Battery: single foreground service, efficient looping, no wakelock beyond playback.
- Privacy: privacy-policy URL placeholder; Play Data Safety checklist in README. UMP consent flow only if AdMob is added later.

## Deliverables
1. Full SvelteKit + Capacitor scaffold matching this architecture.
2. Complete `audioEngine.ts` (multi-source, per-sound volume, notification, `fadeOutAll`).
3. Complete stores (activeSounds+volumes, savedMixes, timer, subscription).
4. RevenueCat init + paywall gating logic.
5. Exact `AndroidManifest.xml` entries + `capacitor.config.ts`.
6. Unit + component + E2E test suites with ≥90% coverage gate.
7. README: build/run, where to drop sound files, RevenueCat + Play Console setup checklist, physical-device IAP testing note.

## Out of scope (YAGNI for MVP)
- AdMob / hybrid monetization (structure noted, not built).
- Cloud sync / accounts.
- Real audio asset production.
- On-device (Appium/Maestro) automated tests in CI.
