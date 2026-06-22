import { writable, derived, type Readable } from 'svelte/store';
import type { SubscriptionService } from '$lib/services/subscriptionService';
import type { PackageLite, SubscriptionStatus } from '$lib/adapters/purchases';
import { INACTIVE_STATUS } from '$lib/adapters/purchases';

export interface SubscriptionState {
  status: SubscriptionStatus;
  ready: boolean;
}

export function createSubscriptionStore(svc: SubscriptionService) {
  const { subscribe, set, update } = writable<SubscriptionState>({
    status: INACTIVE_STATUS,
    ready: false
  });

  const isPremium: Readable<boolean> = derived({ subscribe }, ($s) => $s.status.active);
  const status: Readable<SubscriptionStatus> = derived({ subscribe }, ($s) => $s.status);

  return {
    subscribe,
    isPremium,
    status,
    async init(apiKey: string): Promise<void> {
      const next = await svc.init(apiKey);
      set({ status: next, ready: true });
    },
    async refresh(): Promise<void> {
      const next = await svc.getStatus();
      update((s) => ({ ...s, status: next }));
    },
    async buy(pkg: PackageLite): Promise<boolean> {
      const next = await svc.buy(pkg);
      update((s) => ({ ...s, status: next }));
      return next.active;
    },
    async restore(): Promise<boolean> {
      const next = await svc.restore();
      update((s) => ({ ...s, status: next }));
      return next.active;
    },
    async listPackages() {
      return svc.listPackages();
    }
  };
}

export type SubscriptionStore = ReturnType<typeof createSubscriptionStore>;
