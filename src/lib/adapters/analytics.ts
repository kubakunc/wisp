// Real adapter: native-plugin wrapper, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
// Targets @capacitor-firebase/analytics@^8.3.0.
// .d.ts: node_modules/@capacitor-firebase/analytics/dist/esm/definitions.d.ts
//        node_modules/@capacitor-firebase/analytics/dist/esm/index.d.ts
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

export interface AnalyticsAdapter {
  logEvent(name: string, params?: Record<string, string | number | boolean>): Promise<void>;
  setScreen(name: string): Promise<void>;
  setEnabled(enabled: boolean): Promise<void>;
}

export const analyticsAdapter: AnalyticsAdapter = {
  async logEvent(name, params) {
    // LogEventOptions.params is typed as { [key: string]: any } in the plugin.
    // Our boundary narrows it to Record<string, string|number|boolean>; the cast
    // is safe because we never pass anything outside that union at call sites.
    await FirebaseAnalytics.logEvent({ name, params: params as { [key: string]: string | number | boolean } });
  },
  async setScreen(name) {
    await FirebaseAnalytics.setCurrentScreen({ screenName: name });
  },
  async setEnabled(enabled) {
    await FirebaseAnalytics.setEnabled({ enabled });
  }
};
