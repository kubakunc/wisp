import { describe, it, expect } from 'vitest';
import { createStorageService } from './storageService';
import { createFakePreferences } from '$lib/adapters/fakes/fakePreferences';
import type { Mix } from '$lib/types';

const mix: Mix = { id: 'm1', name: 'Rainy', layers: [{ soundId: 'rain', volume: 0.5 }] };

describe('storageService', () => {
  it('round-trips mixes through preferences as JSON', async () => {
    const { adapter, store } = createFakePreferences();
    const svc = createStorageService(adapter);
    await svc.saveMixes([mix]);
    expect(store.get('wisp.mixes')).toContain('Rainy');
    expect(await svc.loadMixes()).toEqual([mix]);
  });

  it('returns [] when no mixes saved', async () => {
    const { adapter } = createFakePreferences();
    const svc = createStorageService(adapter);
    expect(await svc.loadMixes()).toEqual([]);
  });

  it('returns [] when stored mixes JSON is corrupt', async () => {
    const { adapter, store } = createFakePreferences();
    store.set('wisp.mixes', 'not json');
    const svc = createStorageService(adapter);
    expect(await svc.loadMixes()).toEqual([]);
  });

  it('stores and reads namespaced settings', async () => {
    const { adapter, store } = createFakePreferences();
    const svc = createStorageService(adapter);
    await svc.saveSetting('theme', 'dark');
    expect(store.get('wisp.setting.theme')).toBe('dark');
    expect(await svc.loadSetting('theme')).toBe('dark');
    expect(await svc.loadSetting('missing')).toBeNull();
  });
});
