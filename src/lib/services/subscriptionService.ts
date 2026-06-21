import type { PurchasesAdapter, PackageLite, CustomerInfoLite } from '$lib/adapters/purchases';
import { PREMIUM_ENTITLEMENT } from '$lib/adapters/purchases';

const hasPremium = (info: CustomerInfoLite) => info.entitlements.includes(PREMIUM_ENTITLEMENT);

export function createSubscriptionService(purchases: PurchasesAdapter) {
  return {
    async init(apiKey: string): Promise<boolean> {
      await purchases.configure(apiKey);
      return hasPremium(await purchases.getCustomerInfo());
    },
    async isPremium(): Promise<boolean> {
      return hasPremium(await purchases.getCustomerInfo());
    },
    async listPackages(): Promise<PackageLite[]> {
      return (await purchases.getOfferings()).packages;
    },
    async buy(pkg: PackageLite): Promise<boolean> {
      return hasPremium(await purchases.purchasePackage(pkg));
    },
    async restore(): Promise<boolean> {
      return hasPremium(await purchases.restorePurchases());
    }
  };
}

export type SubscriptionService = ReturnType<typeof createSubscriptionService>;
