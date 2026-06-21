import { writable, get } from 'svelte/store';
import type { StorageService } from '$lib/services/storageService';
import type { Mix, MixLayer } from '$lib/types';

export const FREE_MIX_LIMIT = 1;

function defaultIdGen(): () => string {
  let n = 0;
  return () => `mix-${++n}`;
}

export function createSavedMixesStore(storage: StorageService, idGen: () => string = defaultIdGen()) {
  const { subscribe, set, update: _update } = writable<Mix[]>([]);

  async function persist(mixes: Mix[]): Promise<void> {
    set(mixes);
    await storage.saveMixes(mixes);
  }

  return {
    subscribe,
    async load(): Promise<void> {
      set(await storage.loadMixes());
    },
    canSave(isPremium: boolean): boolean {
      if (isPremium) return true;
      return get({ subscribe }).length < FREE_MIX_LIMIT;
    },
    async save(name: string, layers: MixLayer[], isPremium: boolean): Promise<Mix> {
      if (!this.canSave(isPremium)) throw new Error('FREE_MIX_LIMIT');
      const mix: Mix = { id: idGen(), name, layers };
      await persist([...get({ subscribe }), mix]);
      return mix;
    },
    async rename(id: string, name: string): Promise<void> {
      await persist(get({ subscribe }).map((m) => (m.id === id ? { ...m, name } : m)));
    },
    async remove(id: string): Promise<void> {
      await persist(get({ subscribe }).filter((m) => m.id !== id));
    }
  };
}

export type SavedMixesStore = ReturnType<typeof createSavedMixesStore>;
