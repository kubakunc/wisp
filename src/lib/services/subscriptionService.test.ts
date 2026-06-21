import { describe, it, expect } from 'vitest';
import { createSubscriptionService } from './subscriptionService';
import { createFakePurchases } from '$lib/adapters/fakes/fakePurchases';

describe('subscriptionService', () => {
  it('reports not-premium by default and after init', async () => {
    const { adapter } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    expect(await svc.init('key')).toBe(false);
    expect(await svc.isPremium()).toBe(false);
  });

  it('reports premium when entitlement is active', async () => {
    const { adapter } = createFakePurchases({ startPremium: true });
    const svc = createSubscriptionService(adapter);
    expect(await svc.isPremium()).toBe(true);
  });

  it('lists annual and monthly packages', async () => {
    const { adapter } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    const pkgs = await svc.listPackages();
    expect(pkgs.map((p) => p.packageType).sort()).toEqual(['ANNUAL', 'MONTHLY']);
  });

  it('buy grants premium', async () => {
    const { adapter } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    const pkgs = await svc.listPackages();
    expect(await svc.buy(pkgs[0])).toBe(true);
    expect(await svc.isPremium()).toBe(true);
  });

  it('restore reflects entitlement state', async () => {
    const { adapter, setPremium } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    setPremium(true);
    expect(await svc.restore()).toBe(true);
  });
});
