<script lang="ts">
  import type { SoundDef } from '$lib/types';
  import { formatPercent } from '$lib/theme';
  import SoundIcon from './SoundIcon.svelte';
  import Toggle from './Toggle.svelte';

  let { sound, active, volume = 0, locked, downloading = false, progress = 0, error = false, needsDownload = false, featured = false, onPrimary }: {
    sound: SoundDef;
    active: boolean;
    volume?: number;
    locked: boolean;
    downloading?: boolean;
    progress?: number;
    /** Last download attempt failed (e.g. offline / sound unavailable). */
    error?: boolean;
    /** Not on the device yet — tapping will download it first (vs. instant play). */
    needsDownload?: boolean;
    /** This week's free featured premium sound — highlight it as special. */
    featured?: boolean;
    onPrimary: () => void;
  } = $props();
</script>

<div
  class="sound-row"
  class:active
  class:locked
  class:error={error && !downloading}
  class:featured
>
  <button
    class="row-btn"
    aria-pressed={active}
    onclick={onPrimary}
  >
    <div class="icon-tile">
      <SoundIcon id={sound.id} size={24} />
      {#if downloading}
        <svg class="dl-ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(124,140,240,0.25)" stroke-width="3"/>
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent-1)" stroke-width="3"
            stroke-linecap="round" stroke-dasharray={2*Math.PI*18}
            stroke-dashoffset={2*Math.PI*18*(1-Math.max(0,Math.min(1,progress)))}
            transform="rotate(-90 22 22)"/>
        </svg>
      {:else if error}
        <span class="dl-error-badge" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
          </svg>
        </span>
      {:else if needsDownload && !locked}
        <span class="dl-cloud" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 13v8M8 17l4 4 4-4"/>
            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
          </svg>
        </span>
      {/if}
    </div>
    <div class="info">
      <span class="name-row">
        <span class="name">{sound.name}</span>
        {#if featured}
          <span class="featured-badge">✨ Free this week</span>
        {/if}
      </span>
      {#if locked}
        <span class="subtitle premium">Premium</span>
      {:else if downloading}
        <span class="subtitle dl-label">Downloading… {Math.round(Math.max(0, Math.min(1, progress)) * 100)}%</span>
      {:else if error}
        <span class="subtitle error-label">Couldn’t download · tap to retry</span>
      {:else if active}
        <span class="subtitle active-label">On · {formatPercent(volume)}</span>
      {:else if needsDownload}
        <span class="subtitle dl-hint">Tap to download</span>
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
    position: relative;
  }

  .dl-ring {
    position: absolute;
    inset: 0;
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

  .subtitle.dl-label {
    color: var(--accent-1);
  }

  .subtitle.error-label {
    color: #ff9b9b;
  }

  .subtitle.dl-hint {
    color: var(--muted);
  }

  .dl-cloud {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--surface-hi-a);
    border: 1px solid rgba(124, 140, 240, 0.4);
    color: #9aa6f5;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sound-row.error {
    border-color: rgba(255, 107, 107, 0.45);
  }

  /* This week's free featured premium sound — warm gold so it reads as special,
     distinct from the blue accent and purple Premium styling. */
  .sound-row.featured {
    border-color: rgba(245, 196, 81, 0.55);
    background: linear-gradient(160deg, rgba(245, 196, 81, 0.10), rgba(26, 31, 60, 0.6));
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .name-row .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .featured-badge {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #1a1206;
    background: linear-gradient(135deg, #f5d77e, #e9b949);
    padding: 2px 8px;
    border-radius: 6px;
  }

  .dl-error-badge {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff9b9b;
    background: rgba(255, 107, 107, 0.12);
    border-radius: 14px;
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
