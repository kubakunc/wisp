import type { PreferencesAdapter } from '$lib/adapters/preferences';
import type { Mix } from '$lib/types';

const MIXES_KEY = 'wisp.mixes';
const SETTING_PREFIX = 'wisp.setting.';

export function createStorageService(prefs: PreferencesAdapter) {
  return {
    async loadMixes(): Promise<Mix[]> {
      const raw = await prefs.get(MIXES_KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Mix[]) : [];
      } catch {
        return [];
      }
    },
    async saveMixes(mixes: Mix[]): Promise<void> {
      await prefs.set(MIXES_KEY, JSON.stringify(mixes));
    },
    async loadSetting(key: string): Promise<string | null> {
      return prefs.get(SETTING_PREFIX + key);
    },
    async saveSetting(key: string, value: string): Promise<void> {
      await prefs.set(SETTING_PREFIX + key, value);
    }
  };
}

export type StorageService = ReturnType<typeof createStorageService>;
