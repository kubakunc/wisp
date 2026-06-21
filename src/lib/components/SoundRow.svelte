<script lang="ts">
  import type { SoundDef } from '$lib/types';
  import { formatPercent } from '$lib/theme';
  import SoundIcon from './SoundIcon.svelte';
  import Toggle from './Toggle.svelte';

  let { sound, active, volume = 0, locked, onPrimary }: {
    sound: SoundDef;
    active: boolean;
    volume?: number;
    locked: boolean;
    onPrimary: () => void;
  } = $props();
</script>

<div
  class="sound-row"
  class:active
  class:locked
>
  <button
    class="row-btn"
    aria-pressed={active}
    onclick={onPrimary}
  >
    <div class="icon-tile">
      <SoundIcon id={sound.id} size={24} />
    </div>
    <div class="info">
      <span class="name">{sound.name}</span>
      {#if locked}
        <span class="subtitle premium">Premium</span>
      {:else if active}
        <span class="subtitle active-label">On · {formatPercent(volume)}</span>
      {/if}
    </div>
  </button>
  <div class="trailing">
    {#if locked}
      <button class="lock-chip" aria-label="Locked — Premium" onclick={onPrimary}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </button>
    {:else}
      <Toggle on={active} disabled={false} onToggle={onPrimary} />
    {/if}
  </div>
</div>

<style>
  .sound-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .sound-row.active {
    background: linear-gradient(160deg, #23284a, #1a1f3c);
    border-color: rgba(124, 140, 240, 0.45);
  }

  .row-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    padding: 0;
  }

  .icon-tile {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sound-row.active .icon-tile {
    background: rgba(124, 140, 240, 0.18);
    color: #bcc6ff;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }

  .locked .name {
    color: #aeb4cf;
  }

  .subtitle {
    font-size: 12px;
  }

  .subtitle.premium {
    color: var(--premium);
  }

  .subtitle.active-label {
    color: var(--accent-1);
  }

  .trailing {
    flex-shrink: 0;
  }

  .lock-chip {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(185, 140, 240, 0.14);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
