<script lang="ts">
  import WispMark from './WispMark.svelte';

  let { isPremium, onUpgrade, onRestore }: {
    isPremium: boolean;
    onUpgrade: () => void;
    onRestore: () => void;
  } = $props();
</script>

<div class="premium-card" class:is-premium={isPremium}>
  <div class="card-left">
    <WispMark size={44} gradient={isPremium} />
    <div class="text-block">
      {#if isPremium}
        <span class="status-label premium">Premium Active</span>
        <span class="status-sub">Enjoy all sounds &amp; features</span>
      {:else}
        <span class="status-label free">Free Plan</span>
        <span class="status-sub">Unlock 30+ premium sounds</span>
      {/if}
    </div>
  </div>

  {#if !isPremium}
    <button class="upgrade-btn" onclick={onUpgrade}>
      Upgrade
    </button>
  {/if}

  {#if isPremium}
    <button class="restore-btn" onclick={onRestore}>
      Restore
    </button>
  {:else}
    <button class="restore-link" onclick={onRestore}>
      Restore purchase
    </button>
  {/if}
</div>

<style>
  .premium-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.05);
    flex-wrap: wrap;
  }

  .premium-card.is-premium {
    background: linear-gradient(135deg, rgba(124, 140, 240, 0.12), rgba(185, 140, 240, 0.12));
    border-color: rgba(124, 140, 240, 0.3);
  }

  .card-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .text-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .status-label {
    font-size: 15px;
    font-weight: 700;
  }

  .status-label.premium {
    background: var(--accent-grad);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .status-label.free {
    color: var(--text);
  }

  .status-sub {
    font-size: 12px;
    color: var(--muted);
  }

  .upgrade-btn {
    padding: 10px 20px;
    border-radius: var(--r-pill);
    background: var(--accent-grad);
    border: none;
    color: var(--on-accent);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .upgrade-btn:hover {
    opacity: 0.88;
  }

  .restore-btn {
    padding: 8px 16px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
  }

  .restore-link {
    width: 100%;
    padding: 4px 0;
    background: none;
    border: none;
    color: var(--muted-2);
    font-size: 12px;
    cursor: pointer;
    text-align: center;
  }

  .restore-link:hover {
    color: var(--muted);
  }
</style>
