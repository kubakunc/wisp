import { describe, it, expect } from 'vitest';
import { createAnalyticsService } from './analyticsService';
import { createFakeAnalytics } from '$lib/adapters/fakes/fakeAnalytics';
import { WispEvent } from '$lib/analytics/events';

describe('analyticsService', () => {
  it('tracks a typed event with params', async () => {
    const { adapter, state } = createFakeAnalytics();
    const svc = createAnalyticsService(adapter);
    await svc.track(WispEvent.mixSave, { layers: 2 });
    expect(state.events).toEqual([{ name: 'mix_save', params: { layers: 2 } }]);
  });

  it('logs a screen view', async () => {
    const { adapter, state } = createFakeAnalytics();
    const svc = createAnalyticsService(adapter);
    await svc.screen('Paywall');
    expect(state.screens).toEqual(['Paywall']);
  });

  it('forwards setEnabled to the adapter', async () => {
    const { adapter, state } = createFakeAnalytics();
    const svc = createAnalyticsService(adapter);
    await svc.setEnabled(false);
    expect(state.enabled).toBe(false);
  });

  it('tracks an event without params', async () => {
    const { adapter, state } = createFakeAnalytics();
    const svc = createAnalyticsService(adapter);
    await svc.track(WispEvent.paywallView);
    expect(state.events).toEqual([{ name: 'paywall_view', params: undefined }]);
  });

  it('does not swallow errors', async () => {
    const brokenAdapter = {
      logEvent: async () => { throw new Error('network failure'); },
      setScreen: async () => {},
      setEnabled: async () => {}
    };
    const svc = createAnalyticsService(brokenAdapter);
    await expect(svc.track(WispEvent.soundPlay)).rejects.toThrow('network failure');
  });
});
