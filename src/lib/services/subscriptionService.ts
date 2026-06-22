import type { PurchasesAdapter, PackageLite, CustomerInfoLite } from '$lib/adapters/purchases';

// Wisp has a single paid tier, so ANY active RevenueCat entitlement means
// premium. This is intentionally name-agnostic — it works whether the
// entitlement is configured as `premium`, `Wisp Premium`, etc. (the adapter
// only ever returns ACTIVE entitlements). Add per-entitlement checks here only
// if multiple tiers are introduced.
const hasPremium = (info: CustomerInfoLite) => info.entitlements.length > 0;

export function createSubscriptionService(purchases: PurchasesAdapter) {
  // RevenueCat's native configure() throws (and hard-crashes the app on its own
  // thread, uncatchable from JS) when given an empty API key. So we only configure
  // when a key is present; until then the app runs fully as the free tier and every
  // entitlement read short-circuits to "not premium". This keeps the app launchable
  // before RevenueCat is wired up (e.g. no VITE_RC_API_KEY in a dev/emulator build).
  let configured = false;

  return {
    async init(apiKey: string): Promise<boolean> {
      if (!apiKey) {
        configured = false;
        return false;
      }
      await purchases.configure(apiKey);
      configured = true;
      return hasPremium(await purchases.getCustomerInfo());
    },
    async isPremium(): Promise<boolean> {
      if (!configured) return false;
      return hasPremium(await purchases.getCustomerInfo());
    },
    async listPackages(): Promise<PackageLite[]> {
      if (!configured) return [];
      return (await purchases.getOfferings()).packages;
    },
    async buy(pkg: PackageLite): Promise<boolean> {
      if (!configured) return false;
      return hasPremium(await purchases.purchasePackage(pkg));
    },
    async restore(): Promise<boolean> {
      if (!configured) return false;
      return hasPremium(await purchases.restorePurchases());
    }
  };
}

export type SubscriptionService = ReturnType<typeof createSubscriptionService>;
