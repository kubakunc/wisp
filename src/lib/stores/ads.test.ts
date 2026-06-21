import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createAdsStore } from './ads';
import { createAdsService } from '$lib/services/adsService';
import { createFakeAdMob } from '$lib/adapters/fakes/fakeAdMob';

describe('ads store', () => {
  it('starts with unknown consent and bannerVisible false', () => {
    const { adapter } = createFakeAdMob();
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    const s = get(store);
    expect(s.consent).toBe('unknown');
    expect(s.bannerVisible).toBe(false);
  });

  it('init records consent status (obtained)', async () => {
    const { adapter } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    const s = get(store);
    expect(s.consent).toBe('obtained');
  });

  it('init records consent status (not_required)', async () => {
    const { adapter } = createFakeAdMob({ consent: 'not_required' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    expect(get(store).consent).toBe('not_required');
  });

  it('init records consent status (unavailable)', async () => {
    const { adapter } = createFakeAdMob({ consent: 'unavailable' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    expect(get(store).consent).toBe('unavailable');
  });

  it('sync(false) sets bannerVisible true when consent obtained', async () => {
    const { adapter } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    await store.sync(false);
    expect(get(store).bannerVisible).toBe(true);
  });

  it('sync(true) sets bannerVisible false for premium user', async () => {
    const { adapter } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    await store.sync(true);
    expect(get(store).bannerVisible).toBe(false);
  });

  it('sync(false) does not show banner when consent unavailable', async () => {
    const { adapter } = createFakeAdMob({ consent: 'unavailable' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    await store.sync(false);
    expect(get(store).bannerVisible).toBe(false);
  });

  it('hide sets bannerVisible false', async () => {
    const { adapter } = createFakeAdMob({ consent: 'obtained' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    await store.sync(false);
    expect(get(store).bannerVisible).toBe(true);
    await store.hide();
    expect(get(store).bannerVisible).toBe(false);
  });

  it('sync(false) with not_required consent shows banner', async () => {
    const { adapter } = createFakeAdMob({ consent: 'not_required' });
    const svc = createAdsService(adapter);
    const store = createAdsStore(svc);
    await store.init();
    await store.sync(false);
    expect(get(store).bannerVisible).toBe(true);
  });
});
