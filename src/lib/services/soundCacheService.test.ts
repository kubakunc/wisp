import { describe, it, expect } from 'vitest';
import { createSoundCacheService } from './soundCacheService';
import { createFakeFilesystem } from '$lib/adapters/fakes/fakeFilesystem';
import { getSound } from '$lib/sounds/registry';
import { remoteUrl } from '$lib/sounds/remote';

// Derived from the catalogue so the test survives sound-file renames.
const RAIN_FILE = getSound('rain')!.file;

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
    expect(uri1.endsWith(RAIN_FILE)).toBe(true);
    expect(state.files[`sounds/${RAIN_FILE}`]).toBeGreaterThan(0);     // final name, not temp
    expect(state.files[`sounds/.dl-${RAIN_FILE}`]).toBeUndefined();    // temp cleaned by move
    expect(ticks.at(-1)).toBe(1);
    expect(await svc.isReady('rain')).toBe(true);
    const uri2 = await svc.resolveUri('rain');                   // cached path, no re-download
    expect(uri2.endsWith(RAIN_FILE)).toBe(true);
  });

  it('failed download leaves nothing cached and rejects', async () => {
    const { adapter } = createFakeFilesystem({ failUrls: [remoteUrl(RAIN_FILE)] });
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

  it('resolveUri throws for unknown soundId', async () => {
    const { adapter } = createFakeFilesystem();
    const svc = createSoundCacheService(adapter);
    await expect(svc.resolveUri('nonexistent')).rejects.toThrow('Unknown sound: nonexistent');
  });

  it('isReady returns false for unknown soundId', async () => {
    const { adapter } = createFakeFilesystem();
    const svc = createSoundCacheService(adapter);
    expect(await svc.isReady('nonexistent')).toBe(false);
  });
});
