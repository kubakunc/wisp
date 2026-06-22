# Remote Sound Delivery & On-Device Cache — Design

**Goal:** Stop shipping every sound inside the APK. Bundle only the three noise
colors; download the rest from a static host on first use and cache them
persistently on the device.

**Status:** Approved (2026-06-22). Ready for implementation planning.

## Context

Today all 32 sounds are generated WAVs committed under `static/sounds/`
(~27 MB), copied into the Android assets at build time, and played via
`asset:///public/sounds/<file>` (see `src/lib/adapters/nativeAudio.ts`
`resolveAudioUri`). `src/lib/sounds/registry.ts` maps each `sounds.json` entry to
a `SoundDef` with `assetPath = sounds/<file>`. `@capacitor/filesystem` is not yet
installed.

## Confirmed decisions

1. **Bundled set:** exactly the three noise colors — `white-noise`,
   `pink-noise`, `brown-noise` — ship in the APK. All 29 others are remote.
2. **Download trigger:** automatic on tap, with an inline progress indicator;
   the sound plays as soon as the download completes.
3. **Hosting:** a configurable static base URL (`VITE_SOUND_CDN`); the app builds
   `${base}<file>` from the catalogue. No backend.
4. **Cache:** persistent (`Filesystem` `Directory.Data`), with a Settings option
   to show usage and clear downloads.
5. **Entitlement:** premium gating is unchanged. Free non-bundled sounds
   (`rain`, `ocean`, `fan`, `forest`, `stream`) download for everyone; premium
   sounds download only for Pro users (tapping one while free still routes to the
   paywall, so a download is never started for an un-entitled sound).

## Catalogue & build

- `sounds.json` entries gain `"bundled": boolean`. Only the 3 noise colors are
  `true`. `registry.ts` carries `bundled` onto `SoundDef` and exposes
  `isBundled(soundId)`.
- `scripts/generate-sounds.mjs` writes **bundled** sounds to `static/sounds/`
  (shipped in the APK) and **remote** sounds to a new `cdn-sounds/` directory
  (git-ignored) for upload to the host. The generator reads the `bundled` flag.
- Remove the 29 remote WAVs from `static/sounds/` (and git) so they leave the
  APK. APK audio: ~27 MB → ~2 MB.
- **Hosting workflow (documented, not automated):** upload `cdn-sounds/*` to the
  bucket behind `VITE_SOUND_CDN`. For local dev, `VITE_SOUND_CDN` may point at a
  served copy of the files (e.g. a static file server over `cdn-sounds/`), so the
  feature runs without a production bucket.

## Architecture (adapter-seam, matching the existing pattern)

```
filesystem adapter (real)  ── @capacitor/filesystem (downloadFile + progress,
  src/lib/adapters/filesystem.ts                       stat, readFile uri, deleteFile, mkdir)
  fakes/fakeFilesystem.ts  ── in-memory: files map, sizes, scripted progress/errors

soundCacheService (src/lib/services/soundCacheService.ts)
  - cacheDir = Directory.Data, subdir 'sounds/'
  - isCached(soundId): boolean (via stat)
  - localUri(soundId): string | null   (file:// path when cached)
  - download(soundId, onProgress): Promise<string>  (returns local uri)
  - usageBytes(): Promise<number>      (sum of cached file sizes)
  - clear(): Promise<void>             (delete the cache subdir)
  depends on: filesystem adapter + registry (file name) + config (base URL)

downloads store (src/lib/stores/downloads.ts)
  - per-sound state: { status: 'idle'|'downloading'|'ready'|'error', progress }
  - ensure(soundId): resolves to a playable uri, downloading if needed;
    updates state; sets 'error' on failure (retriable by calling ensure again)
  depends on: soundCacheService

config (src/lib/sounds/remote.ts)
  - SOUND_CDN_BASE = import.meta.env.VITE_SOUND_CDN ?? '' (trailing slash normalized)
  - remoteUrl(file): `${SOUND_CDN_BASE}${file}`
```

## Play data flow

`activeSounds.toggle(soundId)` (and `applyMix`) currently call
`engine.play(soundId)`, and the engine builds the URI from `registry`'s
`assetPath`. The change: resolve the URI through a single async resolver before
play.

1. User taps a sound (home/orbit/mix).
2. Resolve URI:
   - bundled → `asset:///public/sounds/<file>` (instant).
   - cached → `file://…/<file>`.
   - uncached → `downloads.ensure(soundId)`: set `downloading`, fetch with
     progress into `Directory.Data`, set `ready`, return `file://` uri.
3. Engine preloads + plays the resolved uri (existing audioEngine/nativeAudio
   path; `resolveAudioUri` already passes through absolute `file:`/`asset:` URIs).
4. While `downloading`, the sound's row/orbit tile shows a progress ring; the
   toggle reflects "loading" rather than active until playback starts.

The audio engine/adapter keep playing by URI; only the URI source changes
(asset vs. cached file). The engine should receive the resolved absolute URI
rather than recomputing `assetPath` for remote sounds.

## UX

- **SoundRow / orbit tile:** a determinate progress ring (0–100%) overlays the
  icon while downloading; on completion the sound activates and plays. A failed
  download shows a small "retry" affordance; tapping retries.
- **First-tap latency:** acceptable — sounds are ~0.9 MB; show progress so it
  never feels frozen.
- **Settings:** a "Downloaded sounds" row showing `usageBytes()` formatted (e.g.
  "18 MB") and a "Clear" action that calls `clear()` and resets download states.

## Error handling & offline

- Bundled and cached sounds always work offline.
- A download failure (offline, 404, write error) sets the sound's state to
  `error` with a brief, non-blocking toast ("Couldn't download — check your
  connection"). No swallowed errors; nothing is marked active that isn't playing.
- Partial/interrupted downloads must not leave a half file treated as cached:
  write to a temp name then move/rename on success, or delete on failure, so
  `isCached` is only true for complete files.

## Testing

- `fakes/fakeFilesystem.ts`: in-memory store with controllable progress and
  failure injection; the real `filesystem.ts` adapter is excluded from coverage
  (same convention as `nativeAudio`, `admob`).
- Unit tests:
  - `soundCacheService`: bundled vs remote resolution, cached/uncached,
    download success returns uri + caches, failure cleans up, usageBytes sum,
    clear empties.
  - `downloads` store: idle→downloading(progress)→ready; error on failure;
    retry path; concurrent taps on the same sound dedupe to one download.
  - `registry`: `isBundled`, remote URL construction, `bundled` carried to
    `SoundDef`.
- Maintain > 90% coverage on `src/lib/**`.
- The Playwright/CDP `verify-app.mjs` suite keeps covering the user-facing flow
  on the emulator (tap → progress → plays; Settings clear).

## Out of scope (YAGNI for this iteration)

- Checksums / signed URLs / auth.
- "Download all for offline" bulk action.
- Background prefetch or LRU eviction (cache is user-cleared only).
