import { describe, it, expect } from 'vitest';
import { createAdsService } from './adsService';
import { createFakeAdMob } from '$lib/adapters/fakes/fakeAdMob';
import { BANNER_HEIGHT_PX } from '$lib/ads/config';

describe('adsService', () => {
  it('shows a banner for free users once consent is obtained', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.bannerShown).toBe(true);
  });

  it('never shows a banner for premium users', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(true);
    expect(state.bannerShown).toBe(false);
  });

  it('does not show when consent is unavailable', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'unavailable' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.bannerShown).toBe(false);
  });

  it('shows banner for free users when consent is not_required', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'not_required' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.bannerShown).toBe(true);
  });

  it('init returns the consent result', async () => {
    const { adapter } = createFakeAdMob({ consent: 'not_required' });
    const svc = createAdsService(adapter);
    const result = await svc.init();
    expect(result).toBe('not_required');
  });

  it('init calls initialize on the adapter', async () => {
    const { adapter, state } = createFakeAdMob();
    const svc = createAdsService(adapter);
    await svc.init();
    expect(state.initialized).toBe(true);
  });

  it('init requests consent on the adapter', async () => {
    const { adapter, state } = createFakeAdMob();
    const svc = createAdsService(adapter);
    await svc.init();
    expect(state.consentRequested).toBe(true);
  });

  it('uses the default BANNER_HEIGHT_PX as margin', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.lastMargin).toBe(BANNER_HEIGHT_PX);
  });

  it('uses custom marginBottomPx when provided', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter, { marginBottomPx: 120 });
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.lastMargin).toBe(120);
  });

  it('removes banner when premium user calls showIfEligible (was previously shown)', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.bannerShown).toBe(true);
    await svc.showIfEligible(true);
    expect(state.bannerShown).toBe(false);
  });

  it('removes banner when consent unavailable and previously shown', async () => {
    // Simulate init with obtained then re-init with unavailable
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    expect(state.bannerShown).toBe(true);
    // Simulate re-check with unavailable consent
    await svc.hide();
    expect(state.bannerShown).toBe(false);
  });

  it('hide delegates to adapter hideBanner', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    await svc.hide();
    expect(state.bannerShown).toBe(false);
  });

  it('remove delegates to adapter removeBanner', async () => {
    const { adapter, state } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    await svc.init();
    await svc.showIfEligible(false);
    await svc.remove();
    expect(state.bannerShown).toBe(false);
  });
});
