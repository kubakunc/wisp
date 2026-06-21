import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createSavedMixesStore } from './savedMixes';
import { createStorageService } from '$lib/services/storageService';
import { createFakePreferences } from '$lib/adapters/fakes/fakePreferences';
import type { MixLayer } from '$lib/types';

const layers: MixLayer[] = [{ soundId: 'rain', volume: 0.5 }];

function make() {
  const { adapter, store: prefStore } = createFakePreferences();
  const storage = createStorageService(adapter);
  let n = 0;
  const store = createSavedMixesStore(storage, () => `id-${++n}`);
  return { store, prefStore };
}

describe('savedMixes store', () => {
  it('loads [] initially', async () => {
    const { store } = make();
    await store.load();
    expect(get(store)).toEqual([]);
  });

  it('premium user can save many mixes', async () => {
    const { store } = make();
    await store.save('A', layers, true);
    await store.save('B', layers, true);
    expect(get(store).map((m) => m.name)).toEqual(['A', 'B']);
  });

  it('free user can save exactly one mix', async () => {
    const { store } = make();
    await store.save('A', layers, false);
    expect(store.canSave(false)).toBe(false);
    await expect(store.save('B', layers, false)).rejects.toThrow('FREE_MIX_LIMIT');
  });

  it('persists saved mixes to storage', async () => {
    const { store, prefStore } = make();
    await store.save('A', layers, true);
    expect(prefStore.get('wisp.mixes')).toContain('A');
  });

  it('rename and remove work', async () => {
    const { store } = make();
    const mix = await store.save('A', layers, true);
    await store.rename(mix.id, 'Renamed');
    expect(get(store)[0].name).toBe('Renamed');
    await store.remove(mix.id);
    expect(get(store)).toEqual([]);
  });
});
