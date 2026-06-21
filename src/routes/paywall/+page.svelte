<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { WispEvent } from '$lib/analytics/events';
  import WispMark from '$lib/components/WispMark.svelte';
  import PackageCard from '$lib/components/PackageCard.svelte';
  import type { PackageLite } from '$lib/adapters/purchases';

  const { subscription, analytics } = app;

  let packages = $state<PackageLite[]>([]);
  let selectedPkg = $state<PackageLite | null>(null);
  let loading = $state(true);
  let buying = $state(false);

  const annualPkg = $derived(packages.find((p) => p.packageType === 'ANNUAL') ?? null);
  const monthlyPkg = $derived(packages.find((p) => p.packageType === 'MONTHLY') ?? null);

  onMount(async () => {
    analytics.track(WispEvent.paywallView).catch(() => {});
    try {
      const offerings = await subscription.listPackages();
      packages = offerings;
      selectedPkg = offerings.find((p) => p.packageType === 'ANNUAL') ?? offerings[0] ?? null;
    } catch {
      packages = [];
    } finally {
      loading = false;
    }
  });

  function goBack() {
    history.back();
  }

  async function handleBuy() {
    if (!selectedPkg || buying) return;
    buying = true;
    try {
      await subscription.buy(selectedPkg);
      analytics.track(WispEvent.purchase, { pkg_id: selectedPkg.identifier }).catch(() => {});
      goto('/');
    } catch {
      // Purchase cancelled or error — stay on paywall
    } finally {
      buying = false;
    }
  }

  async function handleRestore() {
    try {
      await subscription.restore();
      analytics.track(WispEvent.restore).catch(() => {});
      goto('/');
    } catch {
      // ignore
    }
  }

  const BENEFITS = [
    { text: 'Full library — ', bold: '60+ premium sounds' },
    { text: 'Unlimited saved mixes', bold: '' },
    { text: 'High-quality offline playback', bold: '' }
  ];
</script>

<div class="paywall">
  <!-- Close button -->
  <button class="close-btn" aria-label="Close paywall" onclick={goBack}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  </button>

  <!-- Brand -->
  <div class="brand-block">
    <WispMark size={64} gradient={true} />
    <h1 class="paywall-title">Wisp Premium</h1>
    <p class="paywall-sub">Everything you need for a perfect night.<br>Less than half what Calm or Headspace charge.</p>
  </div>

  <!-- Benefits -->
  <ul class="benefits-list" aria-label="Premium benefits">
    {#each BENEFITS as b}
      <li class="benefit-item">
        <span class="benefit-check" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <span class="benefit-text">{b.text}{#if b.bold}<strong>{b.bold}</strong>{/if}</span>
      </li>
    {/each}
  </ul>

  <!-- Package cards -->
  {#if !loading}
    <div class="packages">
      {#if annualPkg}
        <PackageCard
          pkg={annualPkg}
          featured={selectedPkg?.identifier === annualPkg.identifier}
          onSelect={() => { selectedPkg = annualPkg; }}
        />
      {:else}
        <!-- Fallback annual card -->
        <div class="pkg-placeholder featured-placeholder">
          <span class="pkg-badge">BEST VALUE · SAVE 60%</span>
          <span class="pkg-type">Annual</span>
          <span class="pkg-price">$39.99 / year</span>
          <span class="pkg-note trial">7-day free trial</span>
        </div>
      {/if}

      {#if monthlyPkg}
        <PackageCard
          pkg={monthlyPkg}
          featured={selectedPkg?.identifier === monthlyPkg.identifier}
          onSelect={() => { selectedPkg = monthlyPkg; }}
        />
      {:else}
        <!-- Fallback monthly card -->
        <div class="pkg-placeholder">
          <span class="pkg-type">Monthly</span>
          <span class="pkg-price">$6.99 / month</span>
          <span class="pkg-note">Cancel anytime</span>
        </div>
      {/if}
    </div>
  {:else}
    <div class="packages-loading" aria-live="polite">Loading plans…</div>
  {/if}

  <!-- CTA -->
  <button class="cta-btn" onclick={handleBuy} disabled={!selectedPkg || buying} aria-busy={buying}>
    {buying ? 'Processing…' : 'Start 7-day free trial'}
  </button>

  <!-- Footer links -->
  <footer class="paywall-footer">
    <button class="footer-link" onclick={handleRestore}>Restore purchases</button>
    <span class="footer-sep" aria-hidden="true">·</span>
    <a href="https://wisp.app/terms" class="footer-link" target="_blank" rel="noopener">Terms</a>
    <span class="footer-sep" aria-hidden="true">·</span>
    <a href="https://wisp.app/privacy" class="footer-link" target="_blank" rel="noopener">Privacy</a>
  </footer>
</div>

<style>
  .paywall {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100dvh;
    padding: 24px 24px 40px;
    position: relative;
    background: linear-gradient(180deg, #0c1226, #0a0e1c);
  }

  .close-btn {
    position: absolute;
    top: 54px;
    left: 24px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    cursor: pointer;
  }

  .brand-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: 80px;
    text-align: center;
  }

  .paywall-title {
    font-family: var(--font-display);
    font-size: 27px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
    letter-spacing: -0.5px;
  }

  .paywall-sub {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.55;
    margin: 0;
    max-width: 300px;
  }

  .benefits-list {
    list-style: none;
    padding: 0;
    margin: 20px 0 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 340px;
  }

  .benefit-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .benefit-check {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(124, 140, 240, 0.15);
    border: 1px solid rgba(124, 140, 240, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-1);
    flex-shrink: 0;
  }

  .benefit-text {
    font-size: 14px;
    color: var(--text-dim);
    font-weight: 500;
  }

  .packages {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
    width: 100%;
    max-width: 360px;
  }

  .packages-loading {
    margin-top: 20px;
    color: var(--muted);
    font-size: 14px;
  }

  /* Fallback package placeholders */
  .pkg-placeholder {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 16px;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1.5px solid rgba(255, 255, 255, 0.07);
    width: 100%;
  }

  .featured-placeholder {
    border-color: var(--accent-1);
    background: rgba(124, 140, 240, 0.08);
  }

  .pkg-badge {
    font-size: 10px;
    font-weight: 800;
    background: var(--accent-grad);
    color: var(--on-accent);
    padding: 3px 10px;
    border-radius: var(--r-pill);
    letter-spacing: 0.06em;
    align-self: flex-start;
  }

  .pkg-type {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pkg-price {
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
  }

  .pkg-note {
    font-size: 12px;
    color: var(--muted);
  }

  .trial {
    color: var(--accent-1);
    font-weight: 600;
  }

  .cta-btn {
    margin-top: 20px;
    width: 100%;
    max-width: 360px;
    padding: 17px;
    border-radius: var(--r-pill);
    background: var(--accent-grad);
    border: none;
    color: var(--on-accent);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
    font-family: var(--font-body);
  }

  .cta-btn:hover:not(:disabled) {
    opacity: 0.88;
  }

  .cta-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .paywall-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .footer-link {
    font-size: 12px;
    color: var(--muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
    font-family: var(--font-body);
    text-decoration: none;
  }

  .footer-link:hover {
    color: var(--text-dim);
  }

  .footer-sep {
    color: var(--muted-2);
  }
</style>
