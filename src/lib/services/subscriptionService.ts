import type { PurchasesAdapter, PackageLite, SubscriptionStatus } from '$lib/adapters/purchases';
import { INACTIVE_STATUS } from '$lib/adapters/purchases';

export function createSubscriptionService(purchases: PurchasesAdapter) {
  // RevenueCat's native configure() throws (and hard-crashes the app on its own
  // thread, uncatchable from JS) when given an empty API key. So we only configure
  // when a key is present; until then the app runs fully as the free tier and every
  // entitlement read short-circuits to "inactive". This keeps the app launchable
  // before RevenueCat is wired up (e.g. no VITE_RC_API_KEY in a dev/emulator build).
  let configured = false;

  // Local (not `this`-bound) so the returned methods survive destructuring.
  async function getStatus(): Promise<SubscriptionStatus> {
    if (!configured) return INACTIVE_STATUS;
    return purchases.getStatus();
  }

  return {
    async init(apiKey: string): Promise<SubscriptionStatus> {
      if (!apiKey) {
        configured = false;
        return INACTIVE_STATUS;
      }
      await purchases.configure(apiKey);
      configured = true;
      return purchases.getStatus();
    },
    getStatus,
    async isPremium(): Promise<boolean> {
      return (await getStatus()).active;
    },
    async listPackages(): Promise<PackageLite[]> {
      if (!configured) return [];
      return (await purchases.getOfferings()).packages;
    },
    async buy(pkg: PackageLite): Promise<SubscriptionStatus> {
      if (!configured) return INACTIVE_STATUS;
      return purchases.purchasePackage(pkg);
    },
    async restore(): Promise<SubscriptionStatus> {
      if (!configured) return INACTIVE_STATUS;
      return purchases.restorePurchases();
    }
  };
}

export type SubscriptionService = ReturnType<typeof createSubscriptionService>;
