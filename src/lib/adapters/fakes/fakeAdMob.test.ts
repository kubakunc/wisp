import { describe, it, expect } from 'vitest';
import { createFakeAdMob } from './fakeAdMob';

describe('fakeAdMob', () => {
  it('starts with all state false/null', () => {
    const { state } = createFakeAdMob();
    expect(state.initialized).toBe(false);
    expect(state.consentRequested).toBe(false);
    expect(state.bannerShown).toBe(false);
    expect(state.lastMargin).toBeNull();
  });

  it('records initialize call', async () => {
    const { adapter, state } = createFakeAdMob();
    await adapter.initialize();
    expect(state.initialized).toBe(true);
  });

  it('records requestConsent and returns configured consent result (obtained)', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const result = await adapter.requestConsent();
    expect(result).toBe('obtained');
    expect(state.consentRequested).toBe(true);
  });

  it('returns not_required when configured', async () => {
    const { adapter } = createFakeAdMob({ consent: 'not_required' });
    const result = await adapter.requestConsent();
    expect(result).toBe('not_required');
  });

  it('returns unavailable when configured', async () => {
    const { adapter } = createFakeAdMob({ consent: 'unavailable' });
    const result = await adapter.requestConsent();
    expect(result).toBe('unavailable');
  });

  it('defaults consent to obtained', async () => {
    const { adapter } = createFakeAdMob();
    const result = await adapter.requestConsent();
    expect(result).toBe('obtained');
  });

  it('records showBanner with margin', async () => {
    const { adapter, state } = createFakeAdMob();
    await adapter.showBanner({ adId: 'test-id', marginBottomPx: 64 });
    expect(state.bannerShown).toBe(true);
    expect(state.lastMargin).toBe(64);
  });

  it('records hideBanner (sets bannerShown false)', async () => {
    const { adapter, state } = createFakeAdMob();
    await adapter.showBanner({ adId: 'test-id', marginBottomPx: 0 });
    expect(state.bannerShown).toBe(true);
    await adapter.hideBanner();
    expect(state.bannerShown).toBe(false);
  });

  it('records removeBanner (sets bannerShown false)', async () => {
    const { adapter, state } = createFakeAdMob();
    await adapter.showBanner({ adId: 'test-id', marginBottomPx: 0 });
    expect(state.bannerShown).toBe(true);
    await adapter.removeBanner();
    expect(state.bannerShown).toBe(false);
  });
});
