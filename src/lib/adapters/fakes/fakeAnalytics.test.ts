import { describe, it, expect } from 'vitest';
import { createFakeAnalytics } from './fakeAnalytics';

describe('fakeAnalytics', () => {
  it('records events, screens, enabled', async () => {
    const { adapter, state } = createFakeAnalytics();
    await adapter.setScreen('Home');
    await adapter.logEvent('sound_play', { soundId: 'rain' });
    await adapter.setEnabled(false);
    expect(state.screens).toEqual(['Home']);
    expect(state.events).toEqual([{ name: 'sound_play', params: { soundId: 'rain' } }]);
    expect(state.enabled).toBe(false);
  });

  it('starts with enabled true and empty state', () => {
    const { state } = createFakeAnalytics();
    expect(state.enabled).toBe(true);
    expect(state.events).toEqual([]);
    expect(state.screens).toEqual([]);
  });

  it('records event without params', async () => {
    const { adapter, state } = createFakeAnalytics();
    await adapter.logEvent('paywall_view');
    expect(state.events).toEqual([{ name: 'paywall_view', params: undefined }]);
  });
});
