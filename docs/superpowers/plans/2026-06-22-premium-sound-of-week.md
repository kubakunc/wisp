# Premium Sound of the Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each ISO week, one premium sound is fully playable for free users and highlighted as special, cycling deterministically through the premium catalogue.

**Architecture:** A pure selection module picks the week's sound from the premium catalogue by ISO-week index. The existing gating helpers (`isPlayable`/`playableLayers`) gain an optional `featuredId` that unlocks just that sound. The home and mixes pages compute the featured id and pass it down; `SoundRow` renders a gold "Free this week" highlight.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript (strict), Vitest + @testing-library/svelte, Capacitor 8 (Android). Coverage via v8 (`include: src/lib/**`).

## Global Constraints

- Total test coverage must stay **> 90%** (lines and branches).
- Strict TypeScript — no `any`, no swallowed errors.
- The featured highlight is shown to **free users only** (premium users own everything).
- Selection is **deterministic** (ISO-week rotation) — no persistence.
- Badge copy is exactly **`✨ Free this week`**; gold border `rgba(245, 196, 81, 0.55)`.
- `featuredId` params are **optional** (`featuredId?: string | null`) so existing call sites are unaffected.
- Run all unit commands with the repo's Node; the Vitest binary is `npx vitest`.

---

### Task 1: Selection module (`featured.ts`)

**Files:**
- Create: `src/lib/sounds/featured.ts`
- Test: `src/lib/sounds/featured.test.ts`

**Interfaces:**
- Consumes: `SOUNDS` from `src/lib/sounds/registry.ts` (`SoundDef[]` with `id: string`, `tier: 'free' | 'premium'`).
- Produces:
  - `isoWeekIndex(date: Date): number`
  - `featuredPremiumSoundId(date: Date, premiumIds: string[]): string | null`
  - `featuredSoundId(now?: Date): string | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sounds/featured.test.ts
import { describe, it, expect } from 'vitest';
import { isoWeekIndex, featuredPremiumSoundId } from './featured';

const MONDAY = new Date('2026-06-22T10:00:00Z'); // a Monday
const SAME_WEEK_SUN = new Date('2026-06-28T23:00:00Z'); // Sunday of same ISO week
const NEXT_WEEK = new Date('2026-06-29T01:00:00Z'); // following Monday

describe('isoWeekIndex', () => {
  it('is stable within a Monday→Sunday week and increments the next week', () => {
    expect(isoWeekIndex(SAME_WEEK_SUN)).toBe(isoWeekIndex(MONDAY));
    expect(isoWeekIndex(NEXT_WEEK)).toBe(isoWeekIndex(MONDAY) + 1);
  });
});

describe('featuredPremiumSoundId', () => {
  const ids = ['a', 'b', 'c'];
  it('returns null for an empty catalogue', () => {
    expect(featuredPremiumSoundId(MONDAY, [])).toBeNull();
  });
  it('is stable within a week', () => {
    expect(featuredPremiumSoundId(SAME_WEEK_SUN, ids)).toBe(featuredPremiumSoundId(MONDAY, ids));
  });
  it('advances by one catalogue slot the next week (modulo length)', () => {
    const i = isoWeekIndex(MONDAY);
    expect(featuredPremiumSoundId(MONDAY, ids)).toBe(ids[i % 3]);
    expect(featuredPremiumSoundId(NEXT_WEEK, ids)).toBe(ids[(i + 1) % 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sounds/featured.test.ts`
Expected: FAIL — `featured.ts` / exports not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sounds/featured.ts
import { SOUNDS } from './registry';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Whole weeks since the epoch, with weeks breaking on Monday (1970-01-01 was a
 *  Thursday, so shift +4 days). Monotonic and stable; only its modulo matters. */
export function isoWeekIndex(date: Date): number {
  return Math.floor((date.getTime() + 4 * MS_PER_DAY) / MS_PER_WEEK);
}

/** The premium sound featured for `date`'s week, or null when there are none.
 *  `premiumIds` must be stably ordered. */
export function featuredPremiumSoundId(date: Date, premiumIds: string[]): string | null {
  if (premiumIds.length === 0) return null;
  return premiumIds[isoWeekIndex(date) % premiumIds.length];
}

const PREMIUM_IDS = SOUNDS.filter((s) => s.tier === 'premium').map((s) => s.id);

/** Runtime wrapper: this week's featured premium sound from the live catalogue. */
export function featuredSoundId(now: Date = new Date()): string | null {
  return featuredPremiumSoundId(now, PREMIUM_IDS);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sounds/featured.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sounds/featured.ts src/lib/sounds/featured.test.ts
git commit -m "feat(sounds): deterministic weekly featured-premium-sound selection"
```

---

### Task 2: Gating helpers accept `featuredId`

**Files:**
- Modify: `src/lib/sounds/registry.ts` (functions `isPlayable`, `playableLayers`)
- Test: `src/lib/sounds/registry.test.ts` (add cases; create the file if absent)

**Interfaces:**
- Consumes: `getSound`, `SoundDef`.
- Produces (new signatures, back-compatible):
  - `isPlayable(soundId: string, isPremium: boolean, featuredId?: string | null): boolean`
  - `playableLayers<T extends { soundId: string }>(layers: T[], isPremium: boolean, featuredId?: string | null): T[]`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/sounds/registry.test.ts` (create with this import header if the file does not exist):

```ts
import { describe, it, expect } from 'vitest';
import { isPlayable, playableLayers, SOUNDS } from './registry';

describe('isPlayable with a featured sound', () => {
  const premiumId = SOUNDS.find((s) => s.tier === 'premium')!.id;
  const otherPremiumId = SOUNDS.filter((s) => s.tier === 'premium')[1]!.id;

  it('unlocks the featured premium sound for a free user', () => {
    expect(isPlayable(premiumId, false)).toBe(false);
    expect(isPlayable(premiumId, false, premiumId)).toBe(true);
  });
  it('leaves other premium sounds locked for a free user', () => {
    expect(isPlayable(otherPremiumId, false, premiumId)).toBe(false);
  });
  it('playableLayers keeps the featured layer for a free user', () => {
    const layers = [{ soundId: premiumId, volume: 0.5 }, { soundId: otherPremiumId, volume: 0.5 }];
    expect(playableLayers(layers, false, premiumId).map((l) => l.soundId)).toEqual([premiumId]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sounds/registry.test.ts`
Expected: FAIL — featured sound still locked (3rd arg ignored).

- [ ] **Step 3: Write minimal implementation**

Replace the existing `isPlayable` and `playableLayers` in `src/lib/sounds/registry.ts`:

```ts
export function isPlayable(soundId: string, isPremium: boolean, featuredId?: string | null): boolean {
  const s = getSound(soundId);
  if (!s) return false;
  return isPremium || s.tier !== 'premium' || soundId === featuredId;
}

/** Filter mix layers down to those the user is entitled to play (a featured
 *  sound counts as playable for the week). */
export function playableLayers<T extends { soundId: string }>(
  layers: T[], isPremium: boolean, featuredId?: string | null
): T[] {
  return layers.filter((l) => isPlayable(l.soundId, isPremium, featuredId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sounds/registry.test.ts`
Expected: PASS. Also run `npx svelte-check --tsconfig ./tsconfig.json` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sounds/registry.ts src/lib/sounds/registry.test.ts
git commit -m "feat(sounds): isPlayable/playableLayers accept an optional featuredId"
```

---

### Task 3: SoundRow `featured` highlight

**Files:**
- Modify: `src/lib/components/SoundRow.svelte`
- Test: `src/lib/components/SoundRow.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SoundRow` gains optional prop `featured?: boolean` (default `false`).

- [ ] **Step 1: Write the failing test**

Add to `src/lib/components/SoundRow.test.ts`:

```ts
it('shows a "Free this week" badge + gold class when featured', () => {
  const { container } = render(SoundRow, {
    sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'premium', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
    active: false, locked: false, featured: true, onPrimary: () => {}
  });
  expect(screen.getByText(/Free this week/i)).toBeTruthy();
  expect(container.querySelector('.sound-row.featured')).toBeTruthy();
});

it('no featured badge when not featured', () => {
  const { container } = render(SoundRow, {
    sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'premium', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
    active: false, locked: true, onPrimary: () => {}
  });
  expect(screen.queryByText(/Free this week/i)).toBeFalsy();
  expect(container.querySelector('.sound-row.featured')).toBeFalsy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/components/SoundRow.test.ts`
Expected: FAIL — no `.featured` class / badge.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/components/SoundRow.svelte`:

(a) Add `featured` to the props block:

```ts
  let { sound, active, volume = 0, locked, downloading = false, progress = 0, error = false, needsDownload = false, featured = false, onPrimary }: {
    sound: SoundDef;
    active: boolean;
    volume?: number;
    locked: boolean;
    downloading?: boolean;
    progress?: number;
    error?: boolean;
    needsDownload?: boolean;
    /** This week's free featured premium sound — highlight it as special. */
    featured?: boolean;
    onPrimary: () => void;
  } = $props();
```

(b) Add `class:featured` to the root element:

```svelte
<div
  class="sound-row"
  class:active
  class:locked
  class:error={error && !downloading}
  class:featured
>
```

(c) Add the badge right after the `<span class="name">{sound.name}</span>` line:

```svelte
      <span class="name">{sound.name}</span>
      {#if featured}
        <span class="featured-badge">✨ Free this week</span>
      {/if}
```

(d) Add styles to the `<style>` block:

```css
  .sound-row.featured {
    border-color: rgba(245, 196, 81, 0.55);
    background: linear-gradient(160deg, rgba(245, 196, 81, 0.10), rgba(26, 31, 60, 0.6));
  }
  .featured-badge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    margin-top: 3px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #1a1206;
    background: linear-gradient(135deg, #f5d77e, #e9b949);
    padding: 2px 8px;
    border-radius: 6px;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/components/SoundRow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SoundRow.svelte src/lib/components/SoundRow.test.ts
git commit -m "feat(sounds): SoundRow featured 'Free this week' gold highlight"
```

---

### Task 4: Wire the featured sound into home + mixes

**Files:**
- Modify: `src/routes/+page.svelte` (home)
- Modify: `src/routes/mixes/+page.svelte`

**Interfaces:**
- Consumes: `featuredSoundId` (Task 1), `playableLayers(..., featuredId)` (Task 2), `SoundRow` `featured` prop (Task 3).
- Produces: user-visible behaviour (no exported API). Verified via build + device E2E (routes are excluded from unit coverage).

- [ ] **Step 1: Home — import + compute the featured id**

In `src/routes/+page.svelte` `<script>`:

```ts
  import { SOUNDS, getSound, playableLayers } from '$lib/sounds/registry';
  import { featuredSoundId } from '$lib/sounds/featured';
```

Add near the other derived/consts (after `const { isPremium } = subscription;`):

```ts
  // This week's free featured premium sound (free users only — premium owns all).
  const featured = $derived($isPremium ? null : featuredSoundId());
```

- [ ] **Step 2: Home — unlock the featured sound in `handleSoundTap`**

Replace the `locked` computation inside `handleSoundTap`:

```ts
  function handleSoundTap(soundId: string, tier: 'free' | 'premium') {
    const wasActive = activeSoundIds.includes(soundId);
    // Active sounds can always be turned off; activating a premium sound is gated,
    // EXCEPT this week's featured sound which is free.
    const locked = tier === 'premium' && !$isPremium && !wasActive && soundId !== featured;
    if (locked) {
      analytics.track(WispEvent.paywallView, { source: 'sound_lock' }).catch(() => {});
      goto('/paywall');
      return;
    }
    sounds.toggle(soundId).then(() => {
      if (!wasActive) {
        analytics.track(WispEvent.soundPlay, { sound_id: soundId }).catch(() => {});
      }
    }).catch(() => {});
  }
```

- [ ] **Step 3: Home — pass `featured` to SoundRow and unlock its lock state**

In the `{#each sortedSounds as sound (sound.id)}` block, update the `locked` and add `featured`:

```svelte
        locked={sound.tier === 'premium' && !$isPremium && !activeSoundIds.includes(sound.id) && sound.id !== featured}
        downloading={$downloads[sound.id]?.status === 'downloading'}
        progress={$downloads[sound.id]?.progress ?? 0}
        error={$downloads[sound.id]?.status === 'error'}
        needsDownload={needsDownload(sound.id, sound.bundled)}
        featured={sound.id === featured}
        onPrimary={() => handleSoundTap(sound.id, sound.tier)}
```

- [ ] **Step 4: Home — let the hero mix play the featured sound this week**

Update the `playHeroMix` allowed-layers line:

```ts
    const allowed = playableLayers(heroMix.layers, $isPremium, featured);
```

- [ ] **Step 5: Mixes — thread the featured id through**

In `src/routes/mixes/+page.svelte` `<script>` add the import + derived:

```ts
  import { featuredSoundId } from '$lib/sounds/featured';
```
```ts
  const featured = $derived($isPremium ? null : featuredSoundId());
```

Update both `playableLayers` calls to pass `featured`:

```ts
  function lockedSoundCount(mix: Mix): number {
    return mix.layers.length - playableLayers(mix.layers, $isPremium, featured).length;
  }
```
```ts
    const allowed = playableLayers(mix.layers, $isPremium, featured);
```

- [ ] **Step 6: Verify build + types + full suite**

Run:
```bash
npx svelte-check --tsconfig ./tsconfig.json
npx vitest run --coverage
npm run build
```
Expected: 0 type errors; all tests pass; coverage > 90% (lines & branches); build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte src/routes/mixes/+page.svelte
git commit -m "feat(sounds): surface the weekly featured premium sound in home + mixes"
```

- [ ] **Step 8: Device verification (manual, after build)**

Build the debug APK, install on the emulator/phone as a **free** user, and confirm:
1. Exactly one premium sound on the Sounds list shows the gold "✨ Free this week" badge and is **not** lock-gated.
2. Tapping it plays (downloads first if remote) instead of routing to the paywall.
3. Other premium sounds still show the lock and route to the paywall.
4. As a premium user, no featured badge appears.

---

## Self-Review

**1. Spec coverage:**
- Selection module (`isoWeekIndex`, `featuredPremiumSoundId`, `featuredSoundId`) → Task 1. ✓
- Gating `featuredId` on `isPlayable`/`playableLayers` → Task 2. ✓
- Home `handleSoundTap` unlock + `SoundRow` props + hero mix → Task 4 (steps 1–4). ✓
- Mixes threading → Task 4 (step 5). ✓
- SoundRow gold highlight + badge → Task 3. ✓
- Premium-user suppression (`featured = isPremium ? null : …`) → Task 4 step 1 + `featured={sound.id === featured}` only matches when non-null. ✓
- Coverage > 90% → Task 4 step 6 gate. ✓

**2. Placeholder scan:** none — every code step shows complete code and exact commands.

**3. Type consistency:** `featuredId?: string | null` used identically in Tasks 2 & 4; `featuredSoundId(now?: Date)` returns `string | null`, and `featured` is `string | null`, matching the `featuredId` param and the `sound.id === featured` comparisons.
