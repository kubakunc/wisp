<script lang="ts">
  import type { PackageLite } from '$lib/adapters/purchases';
  import { parsePriceNumber } from '$lib/subscription/price';

  let { pkg, featured = false, onSelect, savingsPercent = null }: {
    pkg: PackageLite;
    featured?: boolean;
    onSelect: () => void;
    /** Percent saved vs the monthly plan, shown in the badge. null hides the number. */
    savingsPercent?: number | null;
  } = $props();

  const isAnnual = $derived(pkg.packageType === 'ANNUAL');

  // Derive a per-month label for annual packages as a value cue.
  const perMonthLabel = $derived(
    (() => {
      if (!isAnnual) return null;
      const annual = parsePriceNumber(pkg.priceString);
      if (annual === null) return null;
      const perMonth = annual / 12;
      // Format to 2 decimal places with the same currency symbol.
      const sym = pkg.priceString.replace(/[\d.,\s]+/, '').trim() || '$';
      return `${sym}${perMonth.toFixed(2)}/month`;
    })()
  );

  const badgeLabel = $derived(
    savingsPercent != null ? `BEST VALUE · SAVE ${savingsPercent}%` : 'BEST VALUE'
  );
</script>

<button
  class="package-card"
  class:featured
  onclick={onSelect}
>
  {#if featured && isAnnual}
    <div class="badge-row">
      <span class="badge">{badgeLabel}</span>
    </div>
  {/if}

  <div class="card-top">
    <span class="pkg-type">{isAnnual ? 'Annual' : 'Monthly'}</span>
  </div>

  <div class="price-row">
    <span class="price">{pkg.priceString}</span>
    <span class="per">/ {isAnnual ? 'year' : 'month'}</span>
  </div>

  {#if isAnnual && perMonthLabel}
    <span class="per-month">{perMonthLabel}</span>
  {/if}

  {#if featured && isAnnual}
    <span class="sub-note trial">7-day free trial</span>
  {:else if isAnnual}
    <span class="sub-note">Billed once a year</span>
  {:else}
    <span class="sub-note">Cancel anytime</span>
  {/if}
</button>

<style>
  .package-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1.5px solid rgba(255, 255, 255, 0.07);
    cursor: pointer;
    text-align: left;
    color: var(--text);
    transition: border-color 0.2s, background 0.2s;
    width: 100%;
  }

  .package-card.featured {
    border-color: var(--accent-1);
    background: rgba(124, 140, 240, 0.08);
  }

  .badge-row {
    display: flex;
    margin-bottom: 4px;
  }

  .badge {
    font-size: 10px;
    font-weight: 800;
    background: var(--accent-grad);
    color: var(--on-accent);
    padding: 3px 10px;
    border-radius: var(--r-pill);
    letter-spacing: 0.06em;
  }

  .card-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pkg-type {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .price {
    font-size: 28px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .per {
    font-size: 14px;
    color: var(--muted);
  }

  .per-month {
    font-size: 13px;
    color: var(--accent-1);
    font-weight: 600;
  }

  .sub-note {
    font-size: 12px;
    color: var(--muted);
  }

  .trial {
    color: var(--accent-1);
    font-weight: 600;
  }
</style>
