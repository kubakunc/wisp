import type {
  PurchasesAdapter,
  CustomerInfoLite,
  OfferingsLite,
  PackageLite
} from '$lib/adapters/purchases';

export interface FakePurchasesOptions {
  startPremium?: boolean;
  packages?: PackageLite[];
}

const DEFAULT_PACKAGES: PackageLite[] = [
  { identifier: '$rc_annual', productId: 'wisp_premium_annual', priceString: '$39.99', packageType: 'ANNUAL' },
  { identifier: '$rc_monthly', productId: 'wisp_premium_monthly', priceString: '$6.99', packageType: 'MONTHLY' }
];

export function createFakePurchases(opts: FakePurchasesOptions = {}): {
  adapter: PurchasesAdapter;
  setPremium: (on: boolean) => void;
} {
  let premium = opts.startPremium ?? false;
  const packages = opts.packages ?? DEFAULT_PACKAGES;
  const info = (): CustomerInfoLite => ({ entitlements: premium ? ['premium'] : [] });
  const adapter: PurchasesAdapter = {
    async configure() {},
    async getCustomerInfo() {
      return info();
    },
    async getOfferings(): Promise<OfferingsLite> {
      return { packages };
    },
    async purchasePackage() {
      premium = true;
      return info();
    },
    async restorePurchases() {
      return info();
    }
  };
  return { adapter, setPremium: (on) => (premium = on) };
}
