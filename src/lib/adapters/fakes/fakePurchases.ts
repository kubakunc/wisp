import type { PurchasesAdapter, OfferingsLite, PackageLite, SubscriptionStatus } from '$lib/adapters/purchases';
import { INACTIVE_STATUS } from '$lib/adapters/purchases';

export interface FakePurchasesOptions {
  startPremium?: boolean;
  packages?: PackageLite[];
  /** Override fields of the active status (plan, willRenew, expiresAt, etc.). */
  status?: Partial<SubscriptionStatus>;
}

const DEFAULT_PACKAGES: PackageLite[] = [
  { identifier: '$rc_annual', productId: 'wisp_premium_annual', priceString: '$34.99', packageType: 'ANNUAL' },
  { identifier: '$rc_monthly', productId: 'wisp_premium_monthly', priceString: '$6.99', packageType: 'MONTHLY' }
];

const ACTIVE_STATUS: SubscriptionStatus = {
  active: true,
  plan: 'annual',
  status: 'active',
  willRenew: true,
  expiresAt: 1_900_000_000_000,
  store: 'TEST_STORE',
  managementUrl: 'https://play.google.com/store/account/subscriptions'
};

export function createFakePurchases(opts: FakePurchasesOptions = {}): {
  adapter: PurchasesAdapter;
  setPremium: (on: boolean) => void;
} {
  let premium = opts.startPremium ?? false;
  const overrides = opts.status ?? {};
  const packages = opts.packages ?? DEFAULT_PACKAGES;
  const statusOf = (): SubscriptionStatus => (premium ? { ...ACTIVE_STATUS, ...overrides } : INACTIVE_STATUS);
  const adapter: PurchasesAdapter = {
    async configure() {},
    async getStatus() {
      return statusOf();
    },
    async getOfferings(): Promise<OfferingsLite> {
      return { packages };
    },
    async purchasePackage() {
      premium = true;
      return statusOf();
    },
    async restorePurchases() {
      return statusOf();
    }
  };
  return { adapter, setPremium: (on) => (premium = on) };
}
