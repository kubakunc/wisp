<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { formatBytes } from '$lib/format';
  import PremiumStatusCard from '$lib/components/PremiumStatusCard.svelte';

  const { subscription, soundCache } = app;
  const { isPremium } = subscription;

  let usage = $state(0);

  onMount(() => {
    soundCache.usageBytes().then((bytes) => { usage = bytes; }).catch(() => {});
  });

  async function handleClear() {
    try {
      await soundCache.clear();
      usage = 0;
    } catch {
      // platform call failed — leave usage unchanged
    }
  }
</script>

<div class="settings-page">
  <header class="header">
    <h1 class="page-title">Settings</h1>
  </header>

  <!-- Premium status card → opens the Manage subscription screen -->
  <div class="section">
    <a href="/subscription" class="card-link" aria-label={$isPremium ? 'Manage subscription' : 'See Premium plans'}>
      <PremiumStatusCard premium={$isPremium} />
    </a>
    <a href="/subscription" class="upgrade-link">
      {$isPremium ? 'Manage subscription' : 'Upgrade to Premium'} →
    </a>
  </div>

  <!-- Settings rows -->
  <div class="rows-section">
    <div class="settings-row info-row sound-cache-row" role="note">
      <div class="row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <span class="row-label">Downloaded sounds</span>
      <span class="row-usage">{formatBytes(usage)}</span>
      <button class="clear-btn" onclick={handleClear}>Clear</button>
    </div>

    <!-- Restore purchases lives on the subscription screen (/subscription). -->

    <div class="settings-row info-row" role="note">
      <div class="row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
      </div>
      <div class="row-text">
        <span class="row-label">Battery optimization</span>
        <span class="row-sub">On Xiaomi &amp; Samsung, disable battery optimization for Wisp to keep sounds playing while your screen is off.</span>
      </div>
    </div>

    <a href="https://kubakunc.github.io/wisp/privacy-policy.html" target="_blank" rel="noopener" class="settings-row link-row">
      <div class="row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <span class="row-label">Privacy Policy</span>
      <svg class="row-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>

    <a href="https://wisp.app/terms" target="_blank" rel="noopener" class="settings-row link-row">
      <div class="row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
      </div>
      <span class="row-label">Terms of Service</span>
      <svg class="row-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>
  </div>
</div>

<style>
  .settings-page {
    display: flex;
    flex-direction: column;
    padding-bottom: 24px;
  }

  .header {
    padding: calc(env(safe-area-inset-top, 0px) + 16px) 24px 8px;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: 25px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin: 0;
    color: var(--text);
  }

  .section {
    padding: 16px 22px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card-link {
    display: block;
    text-decoration: none;
  }

  .upgrade-link {
    font-size: 13px;
    color: var(--accent-1);
    font-weight: 600;
    text-align: right;
    padding-right: 4px;
    text-decoration: none;
  }

  .rows-section {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 24px;
    padding: 0 22px;
    border-radius: var(--r-card);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .settings-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 15px;
    transition: background 0.15s;
    text-decoration: none;
    width: 100%;
  }

  .settings-row:last-child {
    border-bottom: none;
  }

  .settings-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .info-row {
    cursor: default;
    align-items: flex-start;
  }

  .info-row:hover {
    background: none;
  }

  .row-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(124, 140, 240, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-1);
    flex-shrink: 0;
  }

  .row-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row-label {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
  }

  .row-sub {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
  }

  .row-chevron {
    color: var(--muted-2);
    flex-shrink: 0;
  }

  .link-row {
    text-decoration: none;
  }

  .sound-cache-row {
    cursor: default;
  }

  .sound-cache-row:hover {
    background: none;
  }

  .row-usage {
    font-size: 13px;
    color: var(--muted);
    margin-left: auto;
    margin-right: 10px;
  }

  .clear-btn {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-1);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    font-family: var(--font-body);
    flex-shrink: 0;
  }

  .clear-btn:hover {
    opacity: 0.8;
  }
</style>
