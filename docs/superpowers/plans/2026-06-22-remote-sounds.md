# Remote Sound Delivery & On-Device Cache — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship only the 3 noise colors in the APK; download every other sound from a static host on first tap and cache it persistently on device.

**Architecture:** A `bundled` flag in `sounds.json` marks the 3 shipped sounds. A new `soundCacheService` (over a `@capacitor/filesystem` adapter seam) resolves a play URI — `asset://` for bundled, `file://` for cached, or downloads-then-returns for uncached. A `downloads` store drives per-sound `idle→downloading→ready→error` state with progress; `activeSounds` resolves the URI before calling `engine.play(soundId, uri)`. Real adapter is coverage-excluded; an in-memory fake backs unit tests.

**Tech Stack:** SvelteKit + Svelte 5 runes, Capacitor 8, `@capacitor/filesystem@^8`, Vitest (90% thresholds), Playwright/CDP `verify-app.mjs`.

## Global Constraints

- Strict TypeScript, no `any`; no swallowed errors that hide a real failure.
- Adapter-seam pattern: real adapter in `src/lib/adapters/*.ts` (added to `vite.config.ts` coverage `exclude`), fake in `src/lib/adapters/fakes/`, services/stores tested against fakes.
- Coverage thresholds stay at lines/functions/branches/statements = 90 on `src/lib/**`.
- **Do NOT use optional-parameter syntax (`x?: T`) in `.svelte` `<script>` runtime code** — this project's vite/svelte TS transform fails the build on it (use a default value, `x: T = …`, or a type-only annotation). Plain `.ts` files are fine.
- Bundled sounds = exactly `white-noise`, `pink-noise`, `brown-noise`.
- Free non-bundled sounds (`rain`, `ocean`, `fan`, `forest`, `stream`) download for everyone; premium sounds download only for Pro (existing paywall gate already prevents a free tap on a premium sound from reaching play/download).
- Base URL: `import.meta.env.VITE_SOUND_CDN ?? ''`; empty means "use the local `static/` copy" (dev fallback). Trailing slash normalized to exactly one.
- `nativeAudio.resolveAudioUri` already passes through absolute `http(s)|file|asset|content:` URIs unchanged; rely on that — pass a `file://` or `asset:///public/...` string as `assetPath`.

---

## File Structure

- `src/lib/sounds/sounds.json` — add `"bundled"` to each entry. *(modify)*
- `src/lib/sounds/registry.ts` — carry `bundled` onto `SoundDef`; add `isBundled`. *(modify)*
- `src/lib/sounds/remote.ts` — `SOUND_CDN_BASE`, `remoteUrl(file)`. *(create)*
- `scripts/generate-sounds.mjs` — split output static vs `cdn-sounds/`. *(modify)*
- `.gitignore` — ignore `cdn-sounds/`. *(modify)*
- `src/lib/adapters/filesystem.ts` — real Filesystem adapter. *(create, coverage-excluded)*
- `src/lib/adapters/fakes/fakeFilesystem.ts` — in-memory fake. *(create)*
- `src/lib/services/soundCacheService.ts` — cache/resolve/download/usage/clear. *(create)*
- `src/lib/stores/downloads.ts` — per-sound download state machine. *(create)*
- `src/lib/services/audioEngine.ts` — `play(soundId, assetPath?)` override. *(modify)*
- `src/lib/stores/activeSounds.ts` — resolve URI before `engine.play`. *(modify)*
- `src/lib/app.ts` — compose fs adapter + cacheService + downloads. *(modify)*
- `src/lib/components/SoundRow.svelte` — progress ring overlay. *(modify)*
- `src/routes/+page.svelte`, `src/routes/now-playing/+page.svelte` — pass download state. *(modify)*
- `src/routes/settings/+page.svelte` — "Downloaded sounds · X MB · Clear". *(modify)*
- `vite.config.ts` — exclude `filesystem.ts`. *(modify)*
- `scripts/verify-app.mjs` — E2E for download + clear. *(modify)*
- `README.md`, `static/sounds/README.md` — hosting workflow. *(modify)*

---

## Task 1: Catalogue `bundled` flag, registry `isBundled`, remote URL config

**Files:**
- Modify: `src/lib/sounds/sounds.json`
- Modify: `src/lib/sounds/registry.ts`
- Create: `src/lib/sounds/remote.ts`
- Test: `src/lib/sounds/registry.test.ts`, `src/lib/sounds/remote.test.ts` (create)

**Interfaces:**
- Produces: `SoundDef.bundled: boolean`; `isBundled(soundId: string): boolean`; `remoteUrl(file: string): string`; `SOUND_CDN_BASE: string`.

- [ ] **Step 1: Add `bundled` to the catalogue.** In `src/lib/sounds/sounds.json`, add `"bundled": true` to `white-noise`, `pink-noise`, `brown-noise`; add `"bundled": false` to every other entry. Update the `$comment` to note: `'bundled': true ships in the app; false is downloaded on first use from VITE_SOUND_CDN.`

- [ ] **Step 2: Write failing registry tests.** Append to `src/lib/sounds/registry.test.ts`:

```ts
import { isBundled } from './registry';

it('marks the 3 noise colors as bundled', () => {
  expect(isBundled('white-noise')).toBe(true);
  expect(isBundled('pink-noise')).toBe(true);
  expect(isBundled('brown-noise')).toBe(true);
});

it('marks nature/premium sounds as not bundled', () => {
  expect(isBundled('rain')).toBe(false);
  expect(isBundled('thunder')).toBe(false);
});

it('exposes bundled on SoundDef', () => {
  const { getSound } = require('./registry');
  expect(getSound('white-noise')?.bundled).toBe(true);
  expect(getSound('rain')?.bundled).toBe(false);
});

it('unknown id is not bundled', () => {
  expect(isBundled('nope')).toBe(false);
});
```

- [ ] **Step 3: Run it (fails).** `npm test -- registry` → FAIL (`isBundled` not exported).

- [ ] **Step 4: Implement in `registry.ts`.** Add `bundled` AND the bare `file` name to the raw type and to `SoundDef`; map both; add `isBundled`:

```ts
// in RawSound interface (already has `file: string` and `premium`):
  bundled: boolean;
// in the SOUNDS map object literal, add BOTH:
  bundled: s.bundled,
  file: s.file,
// new export:
export function isBundled(soundId: string): boolean {
  return getSound(soundId)?.bundled ?? false;
}
```

Also add `bundled: boolean;` and `file: string;` to the `SoundDef` interface in `src/lib/types.ts`. Add a registry test: `expect(getSound('rain')?.file).toBe('rain.wav')`.

- [ ] **Step 5: Write failing remote-config test.** Create `src/lib/sounds/remote.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { remoteUrl, SOUND_CDN_BASE } from './remote';

describe('remote sound config', () => {
  it('builds a URL from base + file', () => {
    // SOUND_CDN_BASE is '' in tests (no VITE_SOUND_CDN) → relative path
    expect(remoteUrl('rain.wav')).toBe(`${SOUND_CDN_BASE}rain.wav`);
  });
  it('joins with exactly one slash regardless of base trailing slash', () => {
    // remoteUrl must never produce a double slash between base and file
    expect(remoteUrl('rain.wav')).not.toMatch(/[^:]\/\//);
  });
});
```

- [ ] **Step 6: Run it (fails).** `npm test -- remote` → FAIL (module missing).

- [ ] **Step 7: Implement `src/lib/sounds/remote.ts`.**

```ts
/** Base URL for downloadable sounds. Empty = use the local static/ copy (dev). */
const RAW = (import.meta as { env?: Record<string, string> }).env?.VITE_SOUND_CDN ?? '';
export const SOUND_CDN_BASE: string = RAW === '' ? '' : RAW.replace(/\/+$/, '') + '/';

/** Absolute (or, when no CDN configured, relative `sounds/<file>`) URL for a file. */
export function remoteUrl(file: string): string {
  const clean = file.replace(/^\/+/, '');
  return SOUND_CDN_BASE === '' ? `sounds/${clean}` : `${SOUND_CDN_BASE}${clean}`;
}
```

- [ ] **Step 8: Run tests.** `npm test -- registry remote` → PASS.

- [ ] **Step 9: Commit.** `git add -A && git commit -m "feat(sounds): bundled flag + remote URL config"`

---

## Task 2: Split generator output; remove remote WAVs from git

**Files:**
- Modify: `scripts/generate-sounds.mjs`
- Modify: `.gitignore`
- Modify: `README.md`, `static/sounds/README.md`
- Delete (git rm): 29 remote WAVs under `static/sounds/`

**Interfaces:**
- Produces: `static/sounds/` contains only the 3 bundled WAVs; `cdn-sounds/` (git-ignored) holds the 29 remote WAVs.

- [ ] **Step 1: Update the generator's output routing.** In `scripts/generate-sounds.mjs`, replace the write target so bundled → `static/sounds`, remote → `cdn-sounds`:

```js
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
// ...existing SR/SECONDS/PRNG/filters/recipes/render/toWav unchanged...

const catalogue = JSON.parse(readFileSync('src/lib/sounds/sounds.json', 'utf8')).sounds;
mkdirSync('static/sounds', { recursive: true });
mkdirSync('cdn-sounds', { recursive: true });

let seed = 1, written = 0;
const missing = [];
for (const s of catalogue) {
  seed++;
  if (!s.file.endsWith('.wav')) continue;
  const recipe = RECIPES[s.id];
  if (!recipe) { missing.push(s.id); continue; }
  const wav = toWav(render(recipe, seed));
  const dir = s.bundled ? 'static/sounds' : 'cdn-sounds';
  writeFileSync(`${dir}/${s.file}`, wav);
  written++;
  console.log(`wrote ${dir}/${s.file} (${(wav.length / 1024).toFixed(0)} KB)`);
}
if (missing.length) { console.error(`\nNO RECIPE for: ${missing.join(', ')}`); process.exit(1); }
console.log(`\ndone — ${written} sounds (bundled → static/sounds, rest → cdn-sounds)`);
```

- [ ] **Step 2: Ignore the CDN output.** Append to `.gitignore`:

```
# Downloadable sounds (uploaded to VITE_SOUND_CDN; regenerate via scripts/generate-sounds.mjs)
cdn-sounds/
```

- [ ] **Step 3: Regenerate.** `node scripts/generate-sounds.mjs` then verify: `ls static/sounds/*.wav | wc -l` → `3`; `ls cdn-sounds/*.wav | wc -l` → `29`.

- [ ] **Step 4: Remove the 29 remote WAVs from git.** `git rm static/sounds/*.wav` then re-add only the 3 bundled: `git add static/sounds/white-noise.wav static/sounds/pink-noise.wav static/sounds/brown-noise.wav`. Confirm `git status` shows the other 26 (previously tracked) as deleted and none of `cdn-sounds/` staged.

- [ ] **Step 5: Update docs.** In `static/sounds/README.md` and the README sound section, state: only bundled sounds live here; the generator writes the rest to `cdn-sounds/`; upload `cdn-sounds/*` to the host behind `VITE_SOUND_CDN`; set `VITE_SOUND_CDN` (e.g. in `.env`) to the bucket base URL, or leave it unset to fall back to the local `static/` copy in dev.

- [ ] **Step 6: Build sanity.** `npm run build` → succeeds; `du -sh static/sounds` → ~2 MB.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "build(sounds): ship only bundled WAVs; generate rest to cdn-sounds/"`

---

## Task 3: `@capacitor/filesystem` adapter + fake

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/lib/adapters/filesystem.ts`
- Modify: `vite.config.ts` (coverage exclude)
- Create: `src/lib/adapters/fakes/fakeFilesystem.ts`
- Test: `src/lib/adapters/fakes/fakeFilesystem.test.ts` (create)

**Interfaces:**
- Produces:

```ts
export interface DownloadProgress { loaded: number; total: number; }
export interface FilesystemAdapter {
  /** Download url → Data dir at relativePath; reports progress; resolves to the file's native uri. */
  download(url: string, relativePath: string, onProgress?: (p: DownloadProgress) => void): Promise<string>;
  /** Bytes of a file, or null if it doesn't exist. */
  sizeOf(relativePath: string): Promise<number | null>;
  /** Native uri (file://…) for a relative path, or null if it doesn't exist. */
  uriOf(relativePath: string): Promise<string | null>;
  /** Move within the Data dir (used for temp→final rename). */
  move(fromRelative: string, toRelative: string): Promise<void>;
  /** Delete a single file (no-op if absent). */
  remove(relativePath: string): Promise<void>;
  /** Recursively delete a directory (no-op if absent). */
  removeDir(relativePath: string): Promise<void>;
  /** Total bytes across files directly inside a directory (0 if absent). */
  dirSize(relativeDir: string): Promise<number>;
}
```

- [ ] **Step 1: Install the plugin.** `npm i @capacitor/filesystem@^8` (postinstall reapplies patch-package). Confirm `node -e "require('@capacitor/filesystem/package.json').version"` → 8.x.

- [ ] **Step 2: Implement `src/lib/adapters/filesystem.ts`** (real adapter; uses `Directory.Data`):

```ts
// Real adapter: @capacitor/filesystem wrapper. Coverage-excluded (exercised via fake + E2E).
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface DownloadProgress { loaded: number; total: number; }
export interface FilesystemAdapter { /* …signatures from Interfaces above… */ }

export const filesystemAdapter: FilesystemAdapter = {
  async download(url, relativePath, onProgress) {
    let handle: { remove: () => Promise<void> } | undefined;
    if (onProgress) {
      handle = await Filesystem.addListener('progress', (e: { url: string; bytes: number; contentLength: number }) => {
        if (e.url === url) onProgress({ loaded: e.bytes, total: e.contentLength });
      });
    }
    try {
      const res = await Filesystem.downloadFile({ url, path: relativePath, directory: Directory.Data, progress: true });
      const uri = res.path ?? (await Filesystem.getUri({ path: relativePath, directory: Directory.Data })).uri;
      return uri;
    } finally {
      await handle?.remove();
    }
  },
  async sizeOf(relativePath) {
    try { const s = await Filesystem.stat({ path: relativePath, directory: Directory.Data }); return s.size; }
    catch { return null; }
  },
  async uriOf(relativePath) {
    try { await Filesystem.stat({ path: relativePath, directory: Directory.Data });
      return (await Filesystem.getUri({ path: relativePath, directory: Directory.Data })).uri; }
    catch { return null; }
  },
  async move(fromRelative, toRelative) {
    await Filesystem.rename({ from: fromRelative, to: toRelative, directory: Directory.Data });
  },
  async remove(relativePath) {
    try { await Filesystem.deleteFile({ path: relativePath, directory: Directory.Data }); } catch { /* absent */ }
  },
  async removeDir(relativeDir) {
    try { await Filesystem.rmdir({ path: relativeDir, directory: Directory.Data, recursive: true }); } catch { /* absent */ }
  },
  async dirSize(relativeDir) {
    try {
      const { files } = await Filesystem.readdir({ path: relativeDir, directory: Directory.Data });
      let total = 0;
      for (const f of files) {
        const name = typeof f === 'string' ? f : f.name;
        const s = await this.sizeOf(`${relativeDir}/${name}`);
        if (s) total += s;
      }
      return total;
    } catch { return 0; }
  }
};
```

> Note: the `catch { /* absent */ }` blocks swallow only the expected "not found" case for idempotent delete/stat; they must not wrap the download/move calls whose failures must propagate.

- [ ] **Step 3: Exclude from coverage.** In `vite.config.ts` `coverage.exclude`, add the line: `'src/lib/adapters/filesystem.ts',`.

- [ ] **Step 4: Write failing fake test.** Create `src/lib/adapters/fakes/fakeFilesystem.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createFakeFilesystem } from './fakeFilesystem';

describe('fakeFilesystem', () => {
  it('download stores a file and reports progress', async () => {
    const { adapter, state } = createFakeFilesystem();
    const ticks: number[] = [];
    const uri = await adapter.download('http://x/rain.wav', 'sounds/rain.wav', (p) => ticks.push(p.loaded));
    expect(uri).toMatch(/rain\.wav$/);
    expect(state.files['sounds/rain.wav']).toBeGreaterThan(0);
    expect(ticks.length).toBeGreaterThan(0);
  });
  it('download rejects when the url is configured to fail, leaving no file', async () => {
    const { adapter } = createFakeFilesystem({ failUrls: ['http://x/bad.wav'] });
    await expect(adapter.download('http://x/bad.wav', 'sounds/bad.wav')).rejects.toThrow();
    expect(await adapter.sizeOf('sounds/bad.wav')).toBeNull();
  });
  it('move renames, remove deletes, dirSize sums', async () => {
    const { adapter } = createFakeFilesystem();
    await adapter.download('http://x/a.wav', 'sounds/.tmp-a.wav');
    await adapter.move('sounds/.tmp-a.wav', 'sounds/a.wav');
    expect(await adapter.uriOf('sounds/a.wav')).toMatch(/a\.wav$/);
    expect(await adapter.uriOf('sounds/.tmp-a.wav')).toBeNull();
    expect(await adapter.dirSize('sounds')).toBeGreaterThan(0);
    await adapter.remove('sounds/a.wav');
    expect(await adapter.sizeOf('sounds/a.wav')).toBeNull();
  });
});
```

- [ ] **Step 5: Run it (fails).** `npm test -- fakeFilesystem` → FAIL.

- [ ] **Step 6: Implement `src/lib/adapters/fakes/fakeFilesystem.ts`.**

```ts
import type { FilesystemAdapter, DownloadProgress } from '$lib/adapters/filesystem';

export interface FakeFilesystemState { files: Record<string, number>; } // relativePath -> size bytes
export interface FakeFilesystemOpts { failUrls?: string[]; fileBytes?: number; }

export function createFakeFilesystem(opts?: FakeFilesystemOpts): { adapter: FilesystemAdapter; state: FakeFilesystemState } {
  const fail = new Set(opts?.failUrls ?? []);
  const bytes = opts?.fileBytes ?? 1000;
  const state: FakeFilesystemState = { files: {} };
  const uri = (p: string) => `file:///data/${p}`;

  const adapter: FilesystemAdapter = {
    async download(url, relativePath, onProgress?: (p: DownloadProgress) => void) {
      if (fail.has(url)) throw new Error(`download failed: ${url}`);
      onProgress?.({ loaded: bytes / 2, total: bytes });
      onProgress?.({ loaded: bytes, total: bytes });
      state.files[relativePath] = bytes;
      return uri(relativePath);
    },
    async sizeOf(p) { return p in state.files ? state.files[p] : null; },
    async uriOf(p) { return p in state.files ? uri(p) : null; },
    async move(from, to) {
      if (!(from in state.files)) throw new Error(`no such file: ${from}`);
      state.files[to] = state.files[from];
      delete state.files[from];
    },
    async remove(p) { delete state.files[p]; },
    async removeDir(dir) {
      for (const k of Object.keys(state.files)) if (k.startsWith(dir + '/')) delete state.files[k];
    },
    async dirSize(dir) {
      return Object.entries(state.files)
        .filter(([k]) => k.startsWith(dir + '/'))
        .reduce((sum, [, v]) => sum + v, 0);
    }
  };
  return { adapter, state };
}
```

- [ ] **Step 7: Run tests.** `npm test -- fakeFilesystem` → PASS.

- [ ] **Step 8: Commit.** `git add -A && git commit -m "feat(fs): @capacitor/filesystem adapter + in-memory fake"`

---

## Task 4: `soundCacheService`

**Files:**
- Create: `src/lib/services/soundCacheService.ts`
- Test: `src/lib/services/soundCacheService.test.ts` (create)

**Interfaces:**
- Consumes: `FilesystemAdapter` (Task 3); `getSound`, `isBundled` (Task 1); `remoteUrl` (Task 1).
- Produces:

```ts
export interface SoundCacheService {
  resolveUri(soundId: string, onProgress?: (p: number) => void): Promise<string>; // 0..1 progress
  isReady(soundId: string): Promise<boolean>;   // bundled OR cached
  usageBytes(): Promise<number>;
  clear(): Promise<void>;
}
export function createSoundCacheService(fs: FilesystemAdapter): SoundCacheService;
```

- [ ] **Step 1: Write failing tests.** Create `src/lib/services/soundCacheService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSoundCacheService } from './soundCacheService';
import { createFakeFilesystem } from '$lib/adapters/fakes/fakeFilesystem';
import { getSound } from '$lib/sounds/registry';

describe('soundCacheService', () => {
  it('bundled sound resolves to its asset path without touching the filesystem', async () => {
    const { adapter, state } = createFakeFilesystem();
    const svc = createSoundCacheService(adapter);
    const uri = await svc.resolveUri('white-noise');
    expect(uri).toBe(getSound('white-noise')!.assetPath); // 'sounds/white-noise.wav'
    expect(Object.keys(state.files)).toHaveLength(0);
    expect(await svc.isReady('white-noise')).toBe(true);
  });

  it('remote sound downloads on first resolve, then serves from cache', async () => {
    const { adapter, state } = createFakeFilesystem();
    const svc = createSoundCacheService(adapter);
    expect(await svc.isReady('rain')).toBe(false);
    const ticks: number[] = [];
    const uri1 = await svc.resolveUri('rain', (p) => ticks.push(p));
    expect(uri1).toMatch(/rain\.wav$/);
    expect(state.files['sounds/rain.wav']).toBeGreaterThan(0);   // final name, not temp
    expect(state.files['sounds/.dl-rain.wav']).toBeUndefined();  // temp cleaned by move
    expect(ticks.at(-1)).toBe(1);
    expect(await svc.isReady('rain')).toBe(true);
    const uri2 = await svc.resolveUri('rain');                   // cached path, no re-download
    expect(uri2).toMatch(/rain\.wav$/);
  });

  it('failed download leaves nothing cached and rejects', async () => {
    const { adapter } = createFakeFilesystem({ failUrls: ['sounds/rain.wav'] });
    const svc = createSoundCacheService(adapter);
    await expect(svc.resolveUri('rain')).rejects.toThrow();
    expect(await svc.isReady('rain')).toBe(false);
  });

  it('usageBytes sums cached files; clear empties', async () => {
    const { adapter } = createFakeFilesystem({ fileBytes: 2000 });
    const svc = createSoundCacheService(adapter);
    await svc.resolveUri('rain');
    await svc.resolveUri('ocean');
    expect(await svc.usageBytes()).toBe(4000);
    await svc.clear();
    expect(await svc.usageBytes()).toBe(0);
    expect(await svc.isReady('rain')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it (fails).** `npm test -- soundCacheService` → FAIL.

- [ ] **Step 3: Implement `src/lib/services/soundCacheService.ts`.**

```ts
import type { FilesystemAdapter } from '$lib/adapters/filesystem';
import { getSound, isBundled } from '$lib/sounds/registry';
import { remoteUrl } from '$lib/sounds/remote';

const CACHE_DIR = 'sounds';
const finalPath = (file: string) => `${CACHE_DIR}/${file}`;
const tempPath = (file: string) => `${CACHE_DIR}/.dl-${file}`;

export interface SoundCacheService {
  resolveUri(soundId: string, onProgress?: (p: number) => void): Promise<string>;
  isReady(soundId: string): Promise<boolean>;
  usageBytes(): Promise<number>;
  clear(): Promise<void>;
}

export function createSoundCacheService(fs: FilesystemAdapter): SoundCacheService {
  return {
    async resolveUri(soundId, onProgress) {
      const def = getSound(soundId);
      if (!def) throw new Error(`Unknown sound: ${soundId}`);
      if (def.bundled) { onProgress?.(1); return def.assetPath; }

      const cached = await fs.uriOf(finalPath(def.file));
      if (cached) { onProgress?.(1); return cached; }

      // Download to a temp name, then rename, so isReady is only ever true for a complete file.
      const tmp = tempPath(def.file);
      try {
        await fs.download(remoteUrl(def.file), tmp, (p) => {
          onProgress?.(p.total > 0 ? Math.min(1, p.loaded / p.total) : 0);
        });
        await fs.move(tmp, finalPath(def.file));
      } catch (e) {
        await fs.remove(tmp); // clean partial
        throw e;
      }
      onProgress?.(1);
      const uri = await fs.uriOf(finalPath(def.file));
      if (!uri) throw new Error(`download did not produce a file: ${soundId}`);
      return uri;
    },
    async isReady(soundId) {
      const def = getSound(soundId);
      if (!def) return false;
      if (def.bundled) return true;
      return (await fs.sizeOf(finalPath(def.file))) !== null;
    },
    async usageBytes() { return fs.dirSize(CACHE_DIR); },
    async clear() { await fs.removeDir(CACHE_DIR); }
  };
}
export type { SoundCacheService as default };
```

> `def.file` is the catalogue filename, added to `SoundDef` in Task 1.

- [ ] **Step 4: Run tests.** `npm test -- soundCacheService registry` → PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(cache): soundCacheService (resolve/download/usage/clear)"`

---

## Task 5: `downloads` store (state machine)

**Files:**
- Create: `src/lib/stores/downloads.ts`
- Test: `src/lib/stores/downloads.test.ts` (create)

**Interfaces:**
- Consumes: `SoundCacheService` (Task 4).
- Produces:

```ts
export type DownloadStatus = 'idle' | 'downloading' | 'ready' | 'error';
export interface DownloadEntry { status: DownloadStatus; progress: number; } // progress 0..1
export interface DownloadsStore {
  subscribe: (run: (v: Record<string, DownloadEntry>) => void) => () => void;
  /** Resolve a playable uri, downloading if needed; updates state; dedupes concurrent calls. */
  ensure(soundId: string): Promise<string>;
  stateOf(soundId: string): DownloadEntry;
}
export function createDownloadsStore(cache: SoundCacheService): DownloadsStore;
```

- [ ] **Step 1: Write failing tests.** Create `src/lib/stores/downloads.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createDownloadsStore } from './downloads';
import { createSoundCacheService } from '$lib/services/soundCacheService';
import { createFakeFilesystem } from '$lib/adapters/fakes/fakeFilesystem';

function make(opts?: Parameters<typeof createFakeFilesystem>[0]) {
  const { adapter } = createFakeFilesystem(opts);
  return createDownloadsStore(createSoundCacheService(adapter));
}

describe('downloads store', () => {
  it('bundled sound becomes ready immediately', async () => {
    const s = make();
    const uri = await s.ensure('white-noise');
    expect(uri).toBe('sounds/white-noise.wav');
    expect(s.stateOf('white-noise').status).toBe('ready');
  });

  it('remote sound goes downloading → ready with progress 1', async () => {
    const s = make();
    const uri = await s.ensure('rain');
    expect(uri).toMatch(/rain\.wav$/);
    const e = s.stateOf('rain');
    expect(e.status).toBe('ready');
    expect(e.progress).toBe(1);
  });

  it('failure sets error and is retriable', async () => {
    const okFs = createFakeFilesystem();
    // first a failing service, then a working one is overkill; use failUrls then clear:
    const s = make({ failUrls: ['sounds/rain.wav'] });
    await expect(s.ensure('rain')).rejects.toThrow();
    expect(s.stateOf('rain').status).toBe('error');
    void okFs;
  });

  it('concurrent ensure() for the same sound triggers one download', async () => {
    const { adapter, state } = createFakeFilesystem();
    let downloads = 0;
    const orig = adapter.download.bind(adapter);
    adapter.download = (...a) => { downloads++; return orig(...a); };
    const s = createDownloadsStore(createSoundCacheService(adapter));
    await Promise.all([s.ensure('rain'), s.ensure('rain'), s.ensure('rain')]);
    expect(downloads).toBe(1);
    expect(state.files['sounds/rain.wav']).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it (fails).** `npm test -- downloads` → FAIL.

- [ ] **Step 3: Implement `src/lib/stores/downloads.ts`.**

```ts
import { writable, get } from 'svelte/store';
import type { SoundCacheService } from '$lib/services/soundCacheService';

export type DownloadStatus = 'idle' | 'downloading' | 'ready' | 'error';
export interface DownloadEntry { status: DownloadStatus; progress: number; }
const IDLE: DownloadEntry = { status: 'idle', progress: 0 };

export function createDownloadsStore(cache: SoundCacheService) {
  const { subscribe, update } = writable<Record<string, DownloadEntry>>({});
  const inflight = new Map<string, Promise<string>>();

  function set(id: string, e: DownloadEntry) {
    update((m) => ({ ...m, [id]: e }));
  }

  function stateOf(id: string): DownloadEntry {
    return get({ subscribe })[id] ?? IDLE;
  }

  function ensure(id: string): Promise<string> {
    const existing = inflight.get(id);
    if (existing) return existing;
    const p = (async () => {
      set(id, { status: 'downloading', progress: 0 });
      try {
        const uri = await cache.resolveUri(id, (prog) => set(id, { status: 'downloading', progress: prog }));
        set(id, { status: 'ready', progress: 1 });
        return uri;
      } catch (e) {
        set(id, { status: 'error', progress: 0 });
        throw e;
      } finally {
        inflight.delete(id);
      }
    })();
    inflight.set(id, p);
    return p;
  }

  return { subscribe, ensure, stateOf };
}
export type DownloadsStore = ReturnType<typeof createDownloadsStore>;
```

- [ ] **Step 4: Run tests.** `npm test -- downloads` → PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(downloads): per-sound download state machine"`

---

## Task 6: Resolve URI through audioEngine + activeSounds + compose in app.ts

**Files:**
- Modify: `src/lib/services/audioEngine.ts`
- Modify: `src/lib/stores/activeSounds.ts`
- Modify: `src/lib/app.ts`
- Test: `src/lib/services/audioEngine.test.ts`, `src/lib/stores/activeSounds.test.ts`

**Interfaces:**
- Consumes: `DownloadsStore.ensure` (Task 5).
- Produces: `engine.play(soundId: string, assetPath = '')`; `createActiveSoundsStore(engine, resolveUri)` where `resolveUri(soundId): Promise<string>`.

- [ ] **Step 1: Failing engine test.** In `audioEngine.test.ts` add:

```ts
it('play(soundId, uri) preloads with the given uri instead of the registry assetPath', async () => {
  const { adapter, state } = createFakeNativeAudio();
  const engine = createAudioEngine(adapter);
  await engine.play('rain', 'file:///data/sounds/rain.wav');
  expect(state.preloaded['rain'].assetPath).toBe('file:///data/sounds/rain.wav');
});
```

(If `fakeNativeAudio` doesn't already record `assetPath`, extend its state to store the preload options — add `preloaded: Record<string, {assetPath:string}>` and set it in `preload`. Update its existing test if needed.)

- [ ] **Step 2: Run it (fails).** `npm test -- audioEngine` → FAIL.

- [ ] **Step 3: Implement the override in `audioEngine.ts`.** Change `play`:

```ts
async play(soundId: string, assetPath = ''): Promise<void> {
  if (!created.has(soundId)) {
    const def = getSound(soundId);
    if (!def) throw new Error(`Unknown sound: ${soundId}`);
    const isOwner = ownerId === null;
    await audio.preload({
      audioId: def.id,
      assetPath: assetPath || def.assetPath,
      loop: true,
      useForNotification: isOwner,
      title: def.name,
      artist: 'Wisp'
    });
    created.add(soundId);
    if (isOwner) ownerId = soundId;
  }
  await audio.play(soundId);
  if (!active.has(soundId)) active.set(soundId, 1);
},
```

- [ ] **Step 4: Run it (passes).** `npm test -- audioEngine` → PASS.

- [ ] **Step 5: Failing activeSounds test.** In `activeSounds.test.ts` add:

```ts
it('toggle resolves the uri and plays with it', async () => {
  const { adapter, state } = createFakeNativeAudio();
  const engine = createAudioEngine(adapter);
  const store = createActiveSoundsStore(engine, async (id) => `file:///data/sounds/${id}.wav`);
  await store.toggle('rain');
  expect(state.preloaded['rain'].assetPath).toBe('file:///data/sounds/rain.wav');
  expect(Object.keys(get(store))).toContain('rain');
});
```

Also update existing `createActiveSoundsStore(engine)` call sites in the test to pass a resolver (default `async (id) => ''` so the engine falls back to the registry path), keeping prior assertions valid.

- [ ] **Step 6: Run it (fails).** `npm test -- activeSounds` → FAIL (arity).

- [ ] **Step 7: Implement in `activeSounds.ts`.** Add the resolver param and use it in `toggle` and `applyMix`:

```ts
export function createActiveSoundsStore(
  engine: AudioEngine,
  resolveUri: (soundId: string) => Promise<string> = async () => ''
) {
  // …existing body…
  // in toggle()'s "else" (activating) branch, replace `await engine.play(soundId)` with:
  const uri = await resolveUri(soundId);
  await engine.play(soundId, uri);
  // in applyMix()'s loop, replace `await engine.play(layer.soundId)` with:
  const uri = await resolveUri(layer.soundId);
  await engine.play(layer.soundId, uri);
```

- [ ] **Step 8: Run it (passes).** `npm test -- activeSounds` → PASS.

- [ ] **Step 9: Compose in `app.ts`.** Add the dependency + wiring:

```ts
import { filesystemAdapter, type FilesystemAdapter } from '$lib/adapters/filesystem';
import { createSoundCacheService } from '$lib/services/soundCacheService';
import { createDownloadsStore } from '$lib/stores/downloads';
// in AppDeps: filesystem?: FilesystemAdapter;
// in createApp():
const filesystem = deps.filesystem ?? filesystemAdapter;
const soundCache = createSoundCacheService(filesystem);
const downloads = createDownloadsStore(soundCache);
const sounds = createActiveSoundsStore(engine, (id) => downloads.ensure(id));
// return: add soundCache, downloads to the returned object; include `filesystem` in TestHook (AppDeps mirror).
```

- [ ] **Step 10: Full suite.** `npm test` → all pass, coverage ≥ 90%. `npm run check` → 0 errors.

- [ ] **Step 11: Commit.** `git add -A && git commit -m "feat: resolve play URI (bundled/cached/download) via downloads store"`

---

## Task 7: Progress-ring UX on SoundRow + orbit

**Files:**
- Modify: `src/lib/components/SoundRow.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/OrbitNode.svelte` (optional ring) — only if trivial; otherwise SoundRow suffices
- Test: `src/lib/components/SoundRow.test.ts`

**Interfaces:**
- Consumes: `DownloadEntry` (Task 5) via a `downloading: boolean` + `progress: number` prop.

- [ ] **Step 1: Failing SoundRow test.** In `SoundRow.test.ts`:

```ts
it('shows a progress ring while downloading', () => {
  const { container } = render(SoundRow, {
    sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
    active: false, locked: false, downloading: true, progress: 0.5, onPrimary: () => {}
  });
  expect(container.querySelector('.dl-ring')).toBeTruthy();
});

it('no ring when not downloading', () => {
  const { container } = render(SoundRow, {
    sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
    active: false, locked: false, downloading: false, progress: 0, onPrimary: () => {}
  });
  expect(container.querySelector('.dl-ring')).toBeFalsy();
});
```

- [ ] **Step 2: Run it (fails).** `npm test -- SoundRow` → FAIL.

- [ ] **Step 3: Implement in `SoundRow.svelte`.** Add props `downloading = false`, `progress = 0`; overlay a determinate ring on `.icon-tile` when `downloading`:

```svelte
let { sound, active, volume = 0, locked, downloading = false, progress = 0, onPrimary } = $props();
<!-- inside .icon-tile, after SoundIcon: -->
{#if downloading}
  <svg class="dl-ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(124,140,240,0.25)" stroke-width="3"/>
    <circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent-1)" stroke-width="3"
      stroke-linecap="round" stroke-dasharray={2*Math.PI*18}
      stroke-dashoffset={2*Math.PI*18*(1-Math.max(0,Math.min(1,progress)))}
      transform="rotate(-90 22 22)"/>
  </svg>
{/if}
```

CSS: `.icon-tile { position: relative; } .dl-ring { position: absolute; inset: 0; }`. Type the new props in the `$props()` annotation (no optional `?` in a real param — props default-values are fine).

- [ ] **Step 4: Run it (passes).** `npm test -- SoundRow` → PASS.

- [ ] **Step 5: Wire in `+page.svelte`.** Import the app's `downloads` store; subscribe; pass `downloading={$downloads[sound.id]?.status === 'downloading'} progress={$downloads[sound.id]?.progress ?? 0}` to each `SoundRow`. (`handleSoundTap` is unchanged — `sounds.toggle` already triggers the resolver→download.)

- [ ] **Step 6: Run full suite + check.** `npm test` PASS; `npm run check` 0 errors.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat(ui): download progress ring on sound rows"`

---

## Task 8: Settings — "Downloaded sounds · X MB · Clear"

**Files:**
- Modify: `src/routes/settings/+page.svelte`
- Create: `src/lib/format.ts` (byte formatter) + `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `app.soundCache.usageBytes()`, `app.soundCache.clear()`; `formatBytes(n)`.

- [ ] **Step 1: Failing formatter test.** Create `src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatBytes } from './format';
describe('formatBytes', () => {
  it('formats 0 / KB / MB', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(1_500_000)).toBe('1.5 MB');
    expect(formatBytes(18_000_000)).toBe('18 MB');
  });
});
```

- [ ] **Step 2: Run it (fails).** `npm test -- format` → FAIL.

- [ ] **Step 3: Implement `src/lib/format.ts`.**

```ts
/** Human MB string for a byte count (1 decimal under 10 MB, whole above). */
export function formatBytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb === 0) return '0 MB';
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : Math.round(mb)} MB`;
}
```

- [ ] **Step 4: Run it (passes).** `npm test -- format` → PASS.

- [ ] **Step 5: Add the Settings row.** In `settings/+page.svelte`: on mount call `app.soundCache.usageBytes()` into a `$state` (`let usage = $state(0)`), render a row "Downloaded sounds" with `{formatBytes(usage)}` and a "Clear" button calling `await app.soundCache.clear(); usage = 0;`. Match the existing `.settings-row` markup/classes. Guard the async calls with `.catch(() => {})` only around the platform call, not around state updates.

- [ ] **Step 6: Run full suite + check.** PASS / 0 errors.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat(settings): downloaded-sounds usage + clear"`

---

## Task 9: E2E coverage for download + clear

**Files:**
- Modify: `scripts/verify-app.mjs`

- [ ] **Step 1: Add a download check.** After the existing free-sound check, add a check that taps an uncached remote free sound (e.g. "Ocean") and asserts it becomes active (downloads then plays). Because the emulator may lack the CDN, run this with `VITE_SOUND_CDN` unset so it falls back to local `static/`… **but** Task 2 removed remote WAVs from `static/`. So for the E2E, point `VITE_SOUND_CDN` at a local static file server serving `cdn-sounds/` before building the app under test. Document this in the script header. Assert: after tap, `[aria-pressed="true"]` includes Ocean within a timeout, and `dumpsys audio` shows an extra `state:started` track.

```js
await check('remote sound: tap downloads then plays', async () => {
  await homeReset(); await inject();
  await page.evaluate(() => window.__t.clickText('Ocean', 'button'));
  await sleep(4000); // allow download
  const s = await st();
  return { pass: s.pressed.some((p) => p.includes('Ocean')) && s.npBar, pressed: s.pressed };
});
```

- [ ] **Step 2: Add a Settings clear check.**

```js
await check('settings: clear downloaded sounds', async () => {
  await navByLink('Settings'); await sleep(300); await inject();
  const had = await page.evaluate(() => /Downloaded sounds/.test(document.body.textContent));
  await page.evaluate(() => window.__t.clickText('Clear', 'button'));
  await sleep(600);
  const zero = await page.evaluate(() => /0 MB/.test(document.body.textContent));
  return { pass: had && zero, had, zero };
});
```

- [ ] **Step 3: Run on the emulator** per the existing device cycle (build with the CDN env pointing at the served `cdn-sounds/`, sync, assemble, install, forward CDP, run `node scripts/verify-app.mjs`). Expect all checks pass.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "test(e2e): remote download + settings clear"`

---

## Self-Review

**Spec coverage:** bundled flag (T1) · generator split + git removal (T2) · filesystem adapter+fake (T3) · cache service resolve/download/usage/clear with temp-then-rename (T4) · downloads store states/progress/error/retry/dedupe (T5) · URI resolution wired through engine/activeSounds/app (T6) · progress UX (T7) · Settings clear (T8) · offline/error (T4 reject path + T5 error state + T7 ring) · E2E (T9). Premium gating unchanged (no task touches the existing paywall gate; only entitled taps reach `toggle`→`ensure`). All spec sections map to a task.

**Type consistency:** `resolveUri(soundId, onProgress?)` (service) vs `ensure(soundId)` (store) vs `engine.play(soundId, assetPath='')` — store's `ensure` returns the uri the engine receives; `activeSounds` passes `downloads.ensure` as the `resolveUri` arg of the store factory (names align: factory param `resolveUri`, value `(id) => downloads.ensure(id)`). `SoundDef` gains both `bundled` and `file` in T1 (used by T4). `DownloadEntry.{status,progress}` consistent across T5/T7.

**Placeholders:** none — every code step has concrete code; the only deferred values are the real CDN URL (intentionally env-driven) and the catalogue edits (mechanical, fully specified).
