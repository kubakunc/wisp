<script lang="ts">
  import type { PackageLite } from '$lib/adapters/purchases';

  let { pkg, selected, onSelect }: {
    pkg: PackageLite;
    selected: boolean;
    onSelect: () => void;
  } = $props();

  const isAnnual = $derived(pkg.packageType === 'ANNUAL');
</script>

<button
  class="package-card"
  class:selected
  aria-pressed={selected}
  onclick={onSelect}
>
  <div class="card-top">
    <span class="pkg-type">{isAnnual ? 'Annual' : 'Monthly'}</span>
    {#if isAnnual}
      <span class="badge">Best Value</span>
    {/if}
  </div>
  <div class="price-row">
    <span class="price">{pkg.priceString}</span>
    <span class="per">/ {isAnnual ? 'year' : 'month'}</span>
  </div>
  {#if isAnnual}
    <span class="sub-note">Billed once a year</span>
  {:else}
    <span class="sub-note">Billed monthly, cancel anytime</span>
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

  .package-card.selected {
    border-color: var(--accent-1);
    background: rgba(124, 140, 240, 0.1);
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

  .badge {
    font-size: 11px;
    font-weight: 700;
    background: var(--accent-grad);
    color: var(--on-accent);
    padding: 2px 8px;
    border-radius: var(--r-pill);
    letter-spacing: 0.04em;
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

  .sub-note {
    font-size: 12px;
    color: var(--muted);
  }
</style>
