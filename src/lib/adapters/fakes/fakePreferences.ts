import type { PreferencesAdapter } from '$lib/adapters/preferences';

export function createFakePreferences(): { adapter: PreferencesAdapter; store: Map<string, string> } {
  const store = new Map<string, string>();
  const adapter: PreferencesAdapter = {
    async get(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async remove(key) {
      store.delete(key);
    }
  };
  return { adapter, store };
}
