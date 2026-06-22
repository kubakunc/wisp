import { writable, get } from 'svelte/store';
import type { StorageService } from '$lib/services/storageService';
import type { Mix, MixLayer } from '$lib/types';

export const FREE_MIX_LIMIT = 1;

/** Two mixes are "the same" when they layer the same sounds at the same volumes
 *  (order-independent). Used to stop saving a mix that's already saved. */
export function sameMixLayers(a: MixLayer[], b: MixLayer[]): boolean {
  if (a.length !== b.length) return false;
  const norm = (ls: MixLayer[]) =>
    ls.map((l) => `${l.soundId}:${Math.round(l.volume * 100)}`).sort().join('|');
  return norm(a) === norm(b);
}

// IDs must be unique across the whole lifetime of the install. An in-memory
// counter is NOT safe: it resets to 0 every launch, so a mix saved in one
// session and another saved in a later session both became "mix-1" — duplicate
// ids that crash the Mixes list's keyed {#each} (svelte each_key_duplicate).
// Use a collision-resistant id (UUID, with a timestamp+random fallback).
function defaultIdGen(): () => string {
  return () => {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    return `mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };
}

export function createSavedMixesStore(storage: StorageService, idGen: () => string = defaultIdGen()) {
  const { subscribe, set } = writable<Mix[]>([]);

  async function persist(mixes: Mix[]): Promise<void> {
    set(mixes);
    await storage.saveMixes(mixes);
  }

  function canSave(isPremium: boolean): boolean {
    if (isPremium) return true;
    return get({ subscribe }).length < FREE_MIX_LIMIT;
  }

  return {
    subscribe,
    async load(): Promise<void> {
      // Heal legacy data: older builds could persist mixes with colliding ids
      // (the in-memory counter reset across launches). Re-key any missing or
      // duplicate id so the keyed {#each} in the Mixes list never throws, and
      // re-persist so the fix is permanent.
      const loaded = await storage.loadMixes();
      const seen = new Set<string>();
      let changed = false;
      const unique = loaded.map((m) => {
        if (!m.id || seen.has(m.id)) {
          changed = true;
          let id = idGen();
          while (seen.has(id)) id = idGen();
          seen.add(id);
          return { ...m, id };
        }
        seen.add(m.id);
        return m;
      });
      set(unique);
      if (changed) await storage.saveMixes(unique);
    },
    canSave,
    async save(name: string, layers: MixLayer[], isPremium: boolean): Promise<Mix> {
      // Don't save a mix that's already saved (same sounds + volumes). Checked
      // before the free-tier limit so re-saving the current mix reports
      // "already saved" rather than a misleading limit error.
      if (get({ subscribe }).some((m) => sameMixLayers(m.layers, layers))) {
        throw new Error('ALREADY_SAVED');
      }
      if (!canSave(isPremium)) throw new Error('FREE_MIX_LIMIT');
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
