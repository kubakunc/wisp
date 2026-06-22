import { describe, it, expect } from 'vitest';
import { toStatus, planFromProductId, INACTIVE_STATUS } from './status';
import type { CustomerInfo, PurchasesEntitlementInfo } from '@revenuecat/purchases-capacitor';

// Minimal CustomerInfo fixture — only the fields toStatus reads. Cast is
// test-only (the real type is large); production code stays strictly typed.
function ci(
  active: Partial<PurchasesEntitlementInfo>[] = [],
  extra: Partial<CustomerInfo> = {}
): CustomerInfo {
  const activeMap: Record<string, Partial<PurchasesEntitlementInfo>> = {};
  active.forEach((e, i) => {
    activeMap[e.identifier ?? `e${i}`] = e;
  });
  return {
    entitlements: { active: activeMap, all: activeMap },
    allPurchasedProductIdentifiers: [],
    managementURL: null,
    ...extra
  } as unknown as CustomerInfo;
}

describe('planFromProductId', () => {
  it('maps product ids to plan, else null', () => {
    expect(planFromProductId('yearly')).toBe('annual');
    expect(planFromProductId('wisp_premium_annual')).toBe('annual');
    expect(planFromProductId('monthly')).toBe('monthly');
    expect(planFromProductId('wisp_premium_monthly')).toBe('monthly');
    expect(planFromProductId('lifetime')).toBeNull();
  });
});

describe('toStatus', () => {
  it('no active entitlement, never subscribed → inactive/none', () => {
    expect(toStatus(ci())).toEqual(INACTIVE_STATUS);
  });

  it('no active entitlement but previously subscribed → expired (keeps management url)', () => {
    const s = toStatus(ci([], { allPurchasedProductIdentifiers: ['yearly'], managementURL: 'u' }));
    expect(s.active).toBe(false);
    expect(s.status).toBe('expired');
    expect(s.managementUrl).toBe('u');
  });

  it('active NORMAL yearly → active / annual with renewal + store + management url', () => {
    const s = toStatus(
      ci(
        [{ identifier: 'premium', productIdentifier: 'yearly', periodType: 'NORMAL', willRenew: true, expirationDateMillis: 123, store: 'PLAY_STORE', billingIssueDetectedAtMillis: null }],
        { managementURL: 'https://play' }
      )
    );
    expect(s).toMatchObject({ active: true, plan: 'annual', status: 'active', willRenew: true, expiresAt: 123, store: 'PLAY_STORE', managementUrl: 'https://play' });
  });

  it('TRIAL period → status trial', () => {
    const s = toStatus(ci([{ identifier: 'p', productIdentifier: 'monthly', periodType: 'TRIAL', willRenew: true, expirationDateMillis: 1, store: 'TEST_STORE', billingIssueDetectedAtMillis: null }]));
    expect(s.status).toBe('trial');
    expect(s.plan).toBe('monthly');
  });

  it('billing issue → status grace, willRenew false', () => {
    const s = toStatus(ci([{ identifier: 'p', productIdentifier: 'yearly', periodType: 'NORMAL', willRenew: false, expirationDateMillis: 1, store: 'PLAY_STORE', billingIssueDetectedAtMillis: 999 }]));
    expect(s.status).toBe('grace');
    expect(s.willRenew).toBe(false);
  });
});
