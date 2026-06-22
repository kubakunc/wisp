import { describe, it, expect } from 'vitest';
import { createSubscriptionService } from './subscriptionService';
import { createFakePurchases } from '$lib/adapters/fakes/fakePurchases';

describe('subscriptionService', () => {
  it('reports not-premium by default and after init', async () => {
    const { adapter } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    expect((await svc.init('key')).active).toBe(false);
    expect(await svc.isPremium()).toBe(false);
  });

  it('init returns the full status (plan, willRenew, expiry) when premium', async () => {
    const { adapter } = createFakePurchases({ startPremium: true });
    const svc = createSubscriptionService(adapter);
    const status = await svc.init('key');
    expect(status.active).toBe(true);
    expect(status.plan).toBe('annual');
    expect(status.willRenew).toBe(true);
    expect(typeof status.expiresAt).toBe('number');
  });

  it('reports premium when entitlement is active', async () => {
    const { adapter } = createFakePurchases({ startPremium: true });
    const svc = createSubscriptionService(adapter);
    await svc.init('key');
    expect(await svc.isPremium()).toBe(true);
  });

  it('lists annual and monthly packages', async () => {
    const { adapter } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    await svc.init('key');
    const pkgs = await svc.listPackages();
    expect(pkgs.map((p) => p.packageType).sort()).toEqual(['ANNUAL', 'MONTHLY']);
  });

  it('buy grants premium', async () => {
    const { adapter } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    await svc.init('key');
    const pkgs = await svc.listPackages();
    expect((await svc.buy(pkgs[0])).active).toBe(true);
    expect(await svc.isPremium()).toBe(true);
  });

  it('restore reflects entitlement state', async () => {
    const { adapter, setPremium } = createFakePurchases();
    const svc = createSubscriptionService(adapter);
    await svc.init('key');
    setPremium(true);
    expect((await svc.restore()).active).toBe(true);
  });

  describe('with no API key (unconfigured / free-tier fallback)', () => {
    it('init("") stays free and does NOT configure (so RevenueCat never crashes)', async () => {
      // startPremium would surface as premium IF we ever read RevenueCat — proving
      // the guard short-circuits and configure() is skipped.
      const { adapter } = createFakePurchases({ startPremium: true });
      const svc = createSubscriptionService(adapter);
      expect((await svc.init('')).active).toBe(false);
      expect(await svc.isPremium()).toBe(false);
    });

    it('listPackages returns [] and buy/restore are no-ops when unconfigured', async () => {
      const { adapter } = createFakePurchases({ startPremium: true });
      const svc = createSubscriptionService(adapter);
      await svc.init('');
      expect(await svc.listPackages()).toEqual([]);
      expect((await svc.buy({ identifier: 'x', productId: 'x', priceString: '$1', packageType: 'ANNUAL' })).active).toBe(false);
      expect((await svc.restore()).active).toBe(false);
    });
  });
});
