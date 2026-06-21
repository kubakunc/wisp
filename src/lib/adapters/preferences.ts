// Real adapter: native-plugin wrapper, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
// Targets @capacitor/preferences@8.
// .d.ts: node_modules/@capacitor/preferences/dist/esm/definitions.d.ts
import { Preferences } from '@capacitor/preferences';

export interface PreferencesAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const preferencesAdapter: PreferencesAdapter = {
  async get(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  }
};
