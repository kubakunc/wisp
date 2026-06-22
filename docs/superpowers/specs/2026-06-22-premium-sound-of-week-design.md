# Premium Sound of the Week — Design

**Status:** Approved (brainstorming) — ready for implementation plan.
**Date:** 2026-06-22

## Goal

Each ISO week, one premium sound becomes fully playable for free (non-subscribed)
users and is visually highlighted as something special. The featured sound
cycles deterministically through the premium catalogue, so over successive weeks
free users get a taste of every premium sound — a discovery hook that complements
the existing 7-day free trial.

## Context

- Sounds are defined in `src/lib/sounds/sounds.json` and typed in
  `src/lib/sounds/registry.ts` (`SOUNDS: SoundDef[]`, `tier: 'free' | 'premium'`).
- Gating helpers in `registry.ts`:
  - `isPlayable(soundId, isPremium)` → `!!s && (isPremium || s.tier !== 'premium')`
  - `playableLayers(layers, isPremium)` → filters layers by `isPlayable`.
- Home (`src/routes/+page.svelte`) `handleSoundTap` decides `locked` for premium
  sounds and routes to `/paywall`; it renders `SoundRow` per sound.
- `SoundRow.svelte` already has `locked`, `downloading`, `error`, `needsDownload`
  states.
- The daily-phrase code already calls `new Date()` at module/component scope, so
  using the wall clock for week selection matches existing patterns.

## Decisions (locked during brainstorming)

1. **Access scope:** the featured sound is treated as free for the whole week —
   play it, layer it into a mix, run the sleep timer with it. It re-locks when
   the week rolls over.
2. **Selection:** deterministic weekly rotation (no persistence, same for
   everyone, predictable, easy to test).
3. **Highlight:** a warm gold/amber treatment with a "✨ Free this week" badge,
   distinct from the blue accent and purple Premium styling. Shown to free users
   only.
4. **Scope of access:** the featured sound plays everywhere that week (sounds
   list AND inside hero/saved mixes), via the shared gating helpers.

## Architecture

### 1. Selection module — `src/lib/sounds/featured.ts` (new, coverage-included)

Pure, deterministic, no I/O:

```ts
/** ISO-8601 week index: whole weeks since the Unix epoch's first Monday.
 *  Stable and monotonic — only its modulo against the catalogue size matters. */
export function isoWeekIndex(date: Date): number {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  // Epoch (1970-01-01) was a Thursday; shift by 4 days so weeks break on Monday.
  return Math.floor((date.getTime() + 4 * 24 * 60 * 60 * 1000) / MS_PER_WEEK);
}

/** The premium sound featured for the week containing `date`, or null when the
 *  catalogue has no premium sounds. `premiumIds` must be a stable-ordered list. */
export function featuredPremiumSoundId(date: Date, premiumIds: string[]): string | null {
  if (premiumIds.length === 0) return null;
  return premiumIds[isoWeekIndex(date) % premiumIds.length];
}
```

A thin runtime wrapper (also in `featured.ts`) supplies the real catalogue + clock:

```ts
import { SOUNDS } from './registry';
const PREMIUM_IDS = SOUNDS.filter((s) => s.tier === 'premium').map((s) => s.id);
export function featuredSoundId(now: Date = new Date()): string | null {
  return featuredPremiumSoundId(now, PREMIUM_IDS);
}
```

> Note: `featuredSoundId()` reads `new Date()` and the live `SOUNDS` list, so it
> is exercised via the home page / E2E, not unit-tested directly. The pure
> functions (`isoWeekIndex`, `featuredPremiumSoundId`) carry the unit coverage.

### 2. Gating — extend `registry.ts`

Add an optional `featuredId` so callers that know the week's featured sound can
treat it as free, with zero behaviour change for callers that don't:

```ts
export function isPlayable(soundId: string, isPremium: boolean, featuredId?: string | null): boolean {
  const s = getSound(soundId);
  if (!s) return false;
  return isPremium || s.tier !== 'premium' || soundId === featuredId;
}

export function playableLayers<T extends { soundId: string }>(
  layers: T[], isPremium: boolean, featuredId?: string | null
): T[] {
  return layers.filter((l) => isPlayable(l.soundId, isPremium, featuredId));
}
```

### 3. Home page — `src/routes/+page.svelte`

- Compute `const featured = featuredSoundId();` once (module/component scope).
- `handleSoundTap`: a premium sound is only `locked` when it is **not** the
  featured sound: `tier === 'premium' && !$isPremium && !wasActive && soundId !== featured`.
- `SoundRow` props per sound:
  - `locked={sound.tier === 'premium' && !$isPremium && !active && sound.id !== featured}`
  - `featured={!$isPremium && sound.id === featured}` (highlight only for free users)
- Pass `featured` into `playableLayers(heroMix.layers, $isPremium, featured)` so a
  hero/saved mix containing the featured sound plays it this week.

### 4. Mixes page — `src/routes/mixes/+page.svelte`

- Thread the featured id into the existing `playableLayers(mix.layers, $isPremium, featured)`
  call (both in `handlePlay` and `lockedSoundCount`), so the featured sound isn't
  counted as "won't play" and isn't stripped from a launched mix this week.

### 5. SoundRow — `src/lib/components/SoundRow.svelte`

- New optional prop `featured = false`.
- When `featured` (and therefore not `locked`): render a gold/amber border tint
  on the row and a small **"✨ Free this week"** chip placed next to the sound
  name (its own element, independent of the subtitle). The existing subtitle
  precedence (locked > downloading > error > needsDownload > active) is
  untouched — the featured chip is additive and shows regardless of those
  states.
- Styling: a dedicated `.sound-row.featured` border (`rgba(245,196,81,0.55)`) and
  a `.featured-badge` chip with a warm gold gradient; the gold accent is a local
  value in this component (no global palette change needed).

## Premium-user behaviour

`featured` is passed as `false` for premium users (they own everything), so no
badge/highlight appears for them. The gating helpers already grant premium users
all sounds.

## Edge cases

- **Remote (non-bundled) featured sound:** because `locked` is false, tapping
  goes through the normal toggle → download path; existing download/needs-download
  UI applies. No special-case needed.
- **No premium sounds in the catalogue:** `featuredSoundId()` returns `null`;
  nothing is highlighted or unlocked.
- **Week rollover:** purely a function of `new Date()`; the previously featured
  sound re-locks and the next one lights up. No cleanup needed.
- **Saving a mix containing the featured sound:** unchanged — saving is still
  bounded by `FREE_MIX_LIMIT`. Only *playing* is unlocked.

## Testing

- `featured.test.ts`: `isoWeekIndex` monotonic & stable across a known date;
  `featuredPremiumSoundId` rotates with the week, is stable within a week, wraps
  modulo the catalogue, and returns `null` for an empty catalogue.
- `registry` tests: `isPlayable`/`playableLayers` with a `featuredId` unlock the
  featured premium sound for a free user and leave other premium sounds locked.
- `SoundRow.test.ts`: `featured` renders the badge + gold class; not shown when
  `featured` is false.
- Keep total coverage > 90% (branch included).

## Out of scope (YAGNI)

- No persistence / per-device random pick (deterministic rotation chosen).
- No dedicated "featured" screen or carousel — it lives inline in the sounds list.
- No new analytics event (existing `soundPlay` still fires); can add a `featured`
  flag later if desired.
