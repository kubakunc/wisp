import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createSubscriptionStore } from './subscription';
import { createSubscriptionService } from '$lib/services/subscriptionService';
import { createFakePurchases } from '$lib/adapters/fakes/fakePurchases';

function makeStore(startPremium = false) {
  const { adapter, setPremium } = createFakePurchases({ startPremium });
  const svc = createSubscriptionService(adapter);
  return { store: createSubscriptionStore(svc), setPremium };
}

describe('subscription store', () => {
  it('starts not ready and not premium', () => {
    const { store } = makeStore();
    expect(get(store)).toEqual({ premium: false, ready: false });
  });

  it('init populates premium state and marks ready', async () => {
    const { store } = makeStore(true);
    await store.init('key');
    expect(get(store)).toEqual({ premium: true, ready: true });
    expect(get(store.isPremium)).toBe(true);
  });

  it('refresh picks up entitlement changes (resume case)', async () => {
    const { store, setPremium } = makeStore(false);
    await store.init('key');
    setPremium(true);
    await store.refresh();
    expect(get(store.isPremium)).toBe(true);
  });

  it('buy updates premium', async () => {
    const { store } = makeStore(false);
    await store.init('key');
    await store.buy({ identifier: '$rc_annual', productId: 'x', priceString: '$39.99', packageType: 'ANNUAL' });
    expect(get(store.isPremium)).toBe(true);
  });

  it('restore updates premium when entitlement is active', async () => {
    const { store, setPremium } = makeStore(false);
    await store.init('key');
    setPremium(true);
    await store.restore();
    expect(get(store.isPremium)).toBe(true);
  });

  it('lists packages through the store', async () => {
    const { store } = makeStore();
    const pkgs = await store.listPackages();
    expect(pkgs.length).toBe(2);
  });
});
