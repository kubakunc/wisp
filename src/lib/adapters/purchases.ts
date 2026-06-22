// Real adapter: native-plugin wrapper, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
// Targets @revenuecat/purchases-capacitor@13.
// .d.ts: node_modules/@revenuecat/purchases-capacitor/dist/esm/definitions.d.ts
//        node_modules/@revenuecat/purchases-typescript-internal-esm/dist/customerInfo.d.ts (CustomerInfo, PurchasesEntitlementInfo)
import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import {
  toStatus,
  INACTIVE_STATUS,
  planFromProductId,
  type SubscriptionStatus,
  type SubscriptionPlan,
  type SubscriptionStatusKind
} from '$lib/subscription/status';

// Re-export the status model so existing consumers can keep importing from here.
export { toStatus, INACTIVE_STATUS, planFromProductId };
export type { SubscriptionStatus, SubscriptionPlan, SubscriptionStatusKind };

export interface PackageLite {
  identifier: string;
  productId: string;
  priceString: string;
  packageType: 'ANNUAL' | 'MONTHLY';
}
export interface OfferingsLite {
  packages: PackageLite[];
}

export interface PurchasesAdapter {
  configure(apiKey: string, appUserId?: string): Promise<void>;
  getStatus(): Promise<SubscriptionStatus>;
  getOfferings(): Promise<OfferingsLite>;
  purchasePackage(pkg: PackageLite): Promise<SubscriptionStatus>;
  restorePurchases(): Promise<SubscriptionStatus>;
}

// Maps our lite identifiers back to the live RevenueCat package objects so
// purchasePackage can forward to the native SDK with the full object.
const livePackages = new Map<string, PurchasesPackage>();

export const purchasesAdapter: PurchasesAdapter = {
  async configure(apiKey, appUserId) {
    await Purchases.configure({ apiKey, ...(appUserId ? { appUserID: appUserId } : {}) });
  },
  async getStatus() {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return toStatus(customerInfo);
  },
  async getOfferings() {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    livePackages.clear();
    const packages: PackageLite[] = pkgs
      .filter((p) => p.packageType === PACKAGE_TYPE.ANNUAL || p.packageType === PACKAGE_TYPE.MONTHLY)
      .map((p) => {
        livePackages.set(p.identifier, p);
        return {
          identifier: p.identifier,
          productId: p.product.identifier,
          priceString: p.product.priceString,
          packageType: p.packageType === PACKAGE_TYPE.ANNUAL ? 'ANNUAL' : 'MONTHLY'
        };
      });
    return { packages };
  },
  async purchasePackage(pkg) {
    const live = livePackages.get(pkg.identifier);
    if (!live) throw new Error(`purchasesAdapter: unknown package identifier "${pkg.identifier}" — call getOfferings first`);
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: live });
    return toStatus(customerInfo);
  },
  async restorePurchases() {
    const { customerInfo } = await Purchases.restorePurchases();
    return toStatus(customerInfo);
  }
};
