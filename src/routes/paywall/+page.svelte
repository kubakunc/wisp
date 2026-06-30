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
  let notice = $state('');

  const annualPkg = $derived(packages.find((p) => p.packageType === 'ANNUAL') ?? null);
  const monthlyPkg = $derived(packages.find((p) => p.packageType === 'MONTHLY') ?? null);
  // No live offerings (no RevenueCat key, or no offering configured yet). We
  // only ever show REAL, purchasable packages — never fake placeholder cards.
  const unavailable = $derived(!loading && packages.length === 0);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // RevenueCat's offerings fetch can transiently return empty (cache warming),
  // so retry a couple of times with a short backoff before giving up.
  async function loadPackages() {
    loading = true;
    let pkgs: PackageLite[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        pkgs = await subscription.listPackages();
      } catch {
        pkgs = [];
      }
      if (pkgs.length > 0) break;
      if (attempt < 2) await sleep(600);
    }
    packages = pkgs;
    selectedPkg = pkgs.find((p) => p.packageType === 'ANNUAL') ?? pkgs[0] ?? null;
    loading = false;
  }

  onMount(() => {
    analytics.track(WispEvent.paywallView).catch(() => {});
    loadPackages();
  });

  function goBack() {
    history.back();
  }

  async function handleBuy() {
    if (!selectedPkg || buying) return;
    buying = true;
    notice = '';
    try {
      const ok = await subscription.buy(selectedPkg);
      if (ok) {
        analytics.track(WispEvent.purchase, { pkg_id: selectedPkg.identifier }).catch(() => {});
        goto('/');
      } else {
        notice = 'Purchase wasn’t completed.';
      }
    } catch {
      notice = 'Purchase could not be completed. Please try again.';
    } finally {
      buying = false;
    }
  }

  async function handleRestore() {
    notice = '';
    try {
      const ok = await subscription.restore();
      if (ok) {
        analytics.track(WispEvent.restore).catch(() => {});
        goto('/');
      } else {
        notice = 'No previous purchases found to restore.';
      }
    } catch {
      notice = 'Could not restore purchases.';
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
    <WispMark size={64} />
    <h1 class="paywall-title">Wisp Premium</h1>
    <p class="paywall-sub">Everything you need for a perfect night.<br>Unlock every sound. Cancel anytime.</p>
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
  {#if loading}
    <div class="packages-loading" aria-live="polite">Loading plans…</div>
  {:else if unavailable}
    <div class="packages-unavailable" aria-live="polite">
      <p>Plans are temporarily unavailable. Please check your connection and try again.</p>
      <button class="retry-btn" onclick={loadPackages}>Try again</button>
    </div>
  {:else}
    <div class="packages">
      {#if annualPkg}
        <PackageCard
          pkg={annualPkg}
          featured={selectedPkg?.identifier === annualPkg.identifier}
          onSelect={() => { selectedPkg = annualPkg; }}
        />
      {/if}
      {#if monthlyPkg}
        <PackageCard
          pkg={monthlyPkg}
          featured={selectedPkg?.identifier === monthlyPkg.identifier}
          onSelect={() => { selectedPkg = monthlyPkg; }}
        />
      {/if}
    </div>
  {/if}

  <!-- CTA (only when real plans are available) -->
  {#if !unavailable}
    <button class="cta-btn" onclick={handleBuy} disabled={!selectedPkg || buying} aria-busy={buying}>
      {buying ? 'Processing…' : 'Start 7-day free trial'}
    </button>
  {/if}

  {#if notice}
    <p class="paywall-notice" role="alert">{notice}</p>
  {/if}

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
    top: calc(env(safe-area-inset-top, 0px) + 14px);
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
    margin-top: calc(env(safe-area-inset-top, 0px) + 70px);
    text-align: center;
  }

  .paywall-notice {
    margin-top: 14px;
    max-width: 340px;
    text-align: center;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
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

  .packages-unavailable {
    margin-top: 20px;
    max-width: 340px;
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .packages-unavailable p {
    margin: 0;
  }
  .retry-btn {
    padding: 10px 24px;
    border-radius: var(--r-pill);
    background: var(--surface);
    border: 1px solid rgba(124, 140, 240, 0.3);
    color: #9aa6f5;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
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
