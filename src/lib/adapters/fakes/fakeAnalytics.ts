import type { AnalyticsAdapter } from '$lib/adapters/analytics';

export interface FakeAnalyticsState {
  events: { name: string; params?: Record<string, string | number | boolean> }[];
  screens: string[];
  enabled: boolean;
}

export function createFakeAnalytics(): { adapter: AnalyticsAdapter; state: FakeAnalyticsState } {
  const state: FakeAnalyticsState = {
    events: [],
    screens: [],
    enabled: true
  };

  const adapter: AnalyticsAdapter = {
    async logEvent(name, params) {
      state.events.push({ name, params });
    },
    async setScreen(name) {
      state.screens.push(name);
    },
    async setEnabled(enabled) {
      state.enabled = enabled;
    }
  };

  return { adapter, state };
}
