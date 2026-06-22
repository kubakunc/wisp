<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { WispEvent } from '$lib/analytics/events';
  import WispMark from '$lib/components/WispMark.svelte';

  const { subscription, analytics } = app;
  const { status } = subscription;

  // Google Play subscriptions page (used when RevenueCat gives no managementUrl).
  const PLAY_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions?package=com.velologiclabs.wisp';

  const planLabel = $derived(
    $status.plan === 'annual' ? 'Annual' : $status.plan === 'monthly' ? 'Monthly' : 'Premium'
  );
  const statusLabel = $derived(
    $status.status === 'trial' ? 'Free trial' :
    $status.status === 'grace' ? 'Billing issue' :
    $status.status === 'expired' ? 'Expired' :
    'Active'
  );
  const manageUrl = $derived($status.managementUrl ?? PLAY_SUBSCRIPTIONS);

  function fmtDate(ms: number): string {
    return new Date(ms).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const renewalLine = $derived(
    $status.expiresAt == null ? '' :
    $status.willRenew ? `Renews ${fmtDate($status.expiresAt)}` :
    `Access until ${fmtDate($status.expiresAt)}`
  );

  let restoring = $state(false);
  let notice = $state('');
  async function handleRestore() {
    if (restoring) return;
    restoring = true;
    notice = '';
    try {
      const ok = await subscription.restore();
      analytics.track(WispEvent.restore).catch(() => {});
      notice = ok ? 'Purchases restored.' : 'No active subscription found to restore.';
    } catch {
      notice = 'Could not restore purchases.';
    } finally {
      restoring = false;
    }
  }
</script>

<div class="sub-page">
  <header class="sub-header">
    <button class="icon-btn" aria-label="Back to settings" onclick={() => goto('/settings')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <h1 class="sub-title">Subscription</h1>
    <span class="spacer" aria-hidden="true"></span>
  </header>

  {#if $status.active}
    <!-- Active subscription details -->
    <div class="card">
      <div class="card-top">
        <WispMark size={48} />
        <div class="card-head">
          <span class="card-plan">Wisp Premium · {planLabel}</span>
          <span class="badge" class:warn={$status.status === 'grace' || $status.status === 'expired'}>{statusLabel}</span>
        </div>
      </div>

      <dl class="detail-list">
        {#if renewalLine}
          <div class="detail-row"><dt>{$status.willRenew ? 'Renews' : 'Access until'}</dt><dd>{renewalLine.replace(/^(Renews|Access until) /, '')}</dd></div>
        {/if}
        <div class="detail-row"><dt>Auto-renew</dt><dd>{$status.willRenew ? 'On' : 'Off'}</dd></div>
        <div class="detail-row"><dt>Plan</dt><dd>{planLabel}</dd></div>
      </dl>
    </div>

    <a class="primary-btn" href={manageUrl} target="_blank" rel="noopener">Manage in Google Play</a>
    <p class="hint">Cancel or change your plan in Google Play. Your subscription stays active until the end of the current period.</p>
    <button class="ghost-btn" onclick={handleRestore} disabled={restoring}>{restoring ? 'Restoring…' : 'Restore purchases'}</button>
  {:else}
    <!-- Free / no subscription -->
    <div class="card free-card">
      <WispMark size={48} />
      <span class="card-plan">You're on Free</span>
      <span class="free-sub">Unlock the full library, unlimited mixes, and an ad-free night.</span>
    </div>
    <button class="primary-btn" onclick={() => goto('/paywall')}>See Premium plans</button>
    <button class="ghost-btn" onclick={handleRestore} disabled={restoring}>{restoring ? 'Restoring…' : 'Restore purchases'}</button>
  {/if}

  {#if notice}
    <p class="notice" role="alert">{notice}</p>
  {/if}
</div>

<style>
  .sub-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 0 22px 24px;
    min-height: 100dvh;
  }
  .sub-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 0 8px;
  }
  .icon-btn {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    background: var(--surface); border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex; align-items: center; justify-content: center; color: var(--muted); cursor: pointer;
  }
  .sub-title { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--text); margin: 0; }
  .spacer { width: 40px; }

  .card {
    background: var(--surface); border: 1px solid rgba(124, 140, 240, 0.18);
    border-radius: var(--r-card); padding: 18px; display: flex; flex-direction: column; gap: 16px;
  }
  .card-top { display: flex; align-items: center; gap: 14px; }
  .card-head { display: flex; flex-direction: column; gap: 6px; }
  .card-plan { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--text); }
  .badge {
    align-self: flex-start; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: var(--r-pill);
    background: rgba(124, 140, 240, 0.18); color: #b6bdf0;
  }
  .badge.warn { background: rgba(255, 155, 155, 0.16); color: #ff9b9b; }

  .detail-list { margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .detail-row { display: flex; justify-content: space-between; align-items: baseline; }
  .detail-row dt { font-size: 14px; color: var(--muted); margin: 0; }
  .detail-row dd { font-size: 14px; font-weight: 600; color: var(--text-dim); margin: 0; }

  .free-card { align-items: center; text-align: center; gap: 10px; }
  .free-sub { font-size: 13px; color: var(--muted); line-height: 1.5; max-width: 280px; }

  .primary-btn {
    display: flex; align-items: center; justify-content: center; text-decoration: none;
    padding: 16px; border-radius: var(--r-pill); background: var(--accent-grad); border: none;
    color: var(--on-accent); font-size: 16px; font-weight: 700; cursor: pointer; font-family: var(--font-body);
  }
  .hint { font-size: 12px; color: var(--muted); line-height: 1.5; text-align: center; margin: 0; }
  .ghost-btn {
    padding: 13px; border-radius: var(--r-pill); background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.07); color: var(--text-dim); font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: var(--font-body);
  }
  .ghost-btn:disabled { opacity: 0.6; cursor: default; }
  .notice { font-size: 13px; color: var(--muted); text-align: center; margin: 0; }
</style>
