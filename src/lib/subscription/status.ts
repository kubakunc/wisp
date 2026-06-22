// Pure subscription-status model + mapping from RevenueCat's CustomerInfo.
// Kept out of the (coverage-excluded) native adapter so the mapping is unit-tested.
import type { CustomerInfo, PurchasesEntitlementInfo } from '@revenuecat/purchases-capacitor';

export type SubscriptionPlan = 'monthly' | 'annual' | null;
export type SubscriptionStatusKind = 'active' | 'trial' | 'grace' | 'expired' | 'none';

/** Everything the UI needs about the user's subscription. Wisp has a single
 *  paid tier, so `active` (any active entitlement) means premium. */
export interface SubscriptionStatus {
  active: boolean;
  plan: SubscriptionPlan;
  status: SubscriptionStatusKind;
  /** Will the subscription auto-renew at the period end? */
  willRenew: boolean;
  /** Epoch ms the access expires / renews; null if unknown / no sub. */
  expiresAt: number | null;
  /** Store the purchase was made on (PLAY_STORE / TEST_STORE / …). */
  store: string | null;
  /** RevenueCat-provided URL to manage/cancel (Google Play); null if absent. */
  managementUrl: string | null;
}

export const INACTIVE_STATUS: SubscriptionStatus = {
  active: false,
  plan: null,
  status: 'none',
  willRenew: false,
  expiresAt: null,
  store: null,
  managementUrl: null
};

/** annual vs monthly from a product identifier (e.g. "yearly", "wisp_premium_annual"). */
export function planFromProductId(productId: string): SubscriptionPlan {
  const p = productId.toLowerCase();
  if (/year|annual/.test(p)) return 'annual';
  if (/month/.test(p)) return 'monthly';
  return null;
}

/** Map RevenueCat CustomerInfo → SubscriptionStatus (first active entitlement;
 *  single paid tier). */
export function toStatus(ci: CustomerInfo): SubscriptionStatus {
  const ent: PurchasesEntitlementInfo | undefined = Object.values(ci.entitlements.active)[0];
  if (!ent) {
    // No active entitlement: "expired" if they ever subscribed, else "none".
    const everSubscribed = ci.allPurchasedProductIdentifiers.length > 0;
    return {
      ...INACTIVE_STATUS,
      status: everSubscribed ? 'expired' : 'none',
      managementUrl: ci.managementURL
    };
  }
  const status: SubscriptionStatusKind =
    ent.billingIssueDetectedAtMillis != null
      ? 'grace'
      : ent.periodType === 'TRIAL'
        ? 'trial'
        : 'active';
  return {
    active: true,
    plan: planFromProductId(ent.productIdentifier),
    status,
    willRenew: ent.willRenew,
    expiresAt: ent.expirationDateMillis,
    store: ent.store,
    managementUrl: ci.managementURL
  };
}
