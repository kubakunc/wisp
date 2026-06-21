<script lang="ts">
  import WispMark from './WispMark.svelte';

  let { premium }: { premium: boolean } = $props();
</script>

<div class="premium-card" class:is-premium={premium}>
  <WispMark size={44} />
  <div class="text-block">
    {#if premium}
      <span class="status-label">Premium</span>
      <span class="status-sub">Enjoy all sounds &amp; features</span>
    {:else}
      <span class="status-label free">Free — upgrade</span>
      <span class="status-sub">Unlock 30+ premium sounds</span>
    {/if}
  </div>
</div>

<style>
  .premium-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .premium-card.is-premium {
    background: var(--accent-grad);
    border-color: transparent;
  }

  .text-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .status-label {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--on-accent);
  }

  .status-label.free {
    color: var(--text);
  }

  .status-sub {
    font-size: 12px;
    color: rgba(12, 18, 38, 0.85);
  }

  .premium-card:not(.is-premium) .status-sub {
    color: var(--muted);
  }
</style>
