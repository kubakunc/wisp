<script lang="ts">
  import WispMark from './WispMark.svelte';

  let { playing, soundCount, onPlayPause, onOpen }: {
    playing: boolean;
    soundCount: number;
    onPlayPause: () => void;
    onOpen: () => void;
  } = $props();

  const label = $derived(soundCount === 1 ? '1 sound' : `${soundCount} sounds`);
</script>

<div class="now-playing-bar">
  <button class="open-btn" aria-label="Open mixer" onclick={onOpen}>
    <WispMark size={36} />
    <div class="info">
      <span class="title">Wisp</span>
      <span class="sub">{playing ? label : 'Paused'}</span>
    </div>
  </button>

  <button
    class="play-pause"
    aria-label={playing ? 'Pause' : 'Play'}
    onclick={onPlayPause}
  >
    {#if playing}
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    {:else}
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    {/if}
  </button>
</div>

<style>
  .now-playing-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--surface);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(16px);
  }

  .open-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text);
    text-align: left;
    padding: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }

  .sub {
    font-size: 12px;
    color: var(--muted);
  }

  .play-pause {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--surface-hi-a);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-1);
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .play-pause:hover {
    background: rgba(124, 140, 240, 0.18);
  }
</style>
