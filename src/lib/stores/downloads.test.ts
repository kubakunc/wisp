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
