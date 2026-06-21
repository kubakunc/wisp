import { writable, derived, type Readable } from 'svelte/store';
import type { SubscriptionService } from '$lib/services/subscriptionService';
import type { PackageLite } from '$lib/adapters/purchases';

export interface SubscriptionState {
  premium: boolean;
  ready: boolean;
}

export function createSubscriptionStore(svc: SubscriptionService) {
  const { subscribe, set, update } = writable<SubscriptionState>({ premium: false, ready: false });

  const isPremium: Readable<boolean> = derived({ subscribe }, ($s) => $s.premium);

  return {
    subscribe,
    isPremium,
    async init(apiKey: string): Promise<void> {
      const premium = await svc.init(apiKey);
      set({ premium, ready: true });
    },
    async refresh(): Promise<void> {
      const premium = await svc.isPremium();
      update((s) => ({ ...s, premium }));
    },
    async buy(pkg: PackageLite): Promise<void> {
      const premium = await svc.buy(pkg);
      update((s) => ({ ...s, premium }));
    },
    async restore(): Promise<void> {
      const premium = await svc.restore();
      update((s) => ({ ...s, premium }));
    },
    async listPackages() {
      return svc.listPackages();
    }
  };
}

export type SubscriptionStore = ReturnType<typeof createSubscriptionStore>;
