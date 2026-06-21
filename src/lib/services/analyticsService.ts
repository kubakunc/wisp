import type { AnalyticsAdapter } from '$lib/adapters/analytics';
import type { WispEventName } from '$lib/analytics/events';

export function createAnalyticsService(adapter: AnalyticsAdapter) {
  return {
    async screen(name: string): Promise<void> {
      await adapter.setScreen(name);
    },
    async track(event: WispEventName, params?: Record<string, string | number | boolean>): Promise<void> {
      await adapter.logEvent(event, params);
    },
    async setEnabled(enabled: boolean): Promise<void> {
      await adapter.setEnabled(enabled);
    }
  };
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
