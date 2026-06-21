<script lang="ts">
  let { count, names, playing, onOpen, onTogglePlay }: {
    count: number;
    names: string;
    playing: boolean;
    onOpen: () => void;
    onTogglePlay: () => void;
  } = $props();
</script>

{#if count > 0}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="now-playing-bar"
    onclick={onOpen}
    role="button"
    tabindex="0"
    aria-label="Open mixer"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
  >
    <button
      class="play-pause"
      aria-label={playing ? 'Pause' : 'Play'}
      onclick={(e) => { e.stopPropagation(); onTogglePlay(); }}
    >
      {#if playing}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
      {:else}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      {/if}
    </button>

    <div class="info">
      <span class="title">Playing · {count} sound{count !== 1 ? 's' : ''}</span>
      <span class="sub">{names}</span>
    </div>

    {#if playing}
      <div class="equalizer" aria-hidden="true">
        <span class="bar bar-1"></span>
        <span class="bar bar-2"></span>
        <span class="bar bar-3"></span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .now-playing-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(35, 40, 74, 0.9);
    backdrop-filter: blur(16px);
    border-radius: 16px;
    cursor: pointer;
  }

  .play-pause {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(124, 140, 240, 0.18);
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
    background: rgba(124, 140, 240, 0.28);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .equalizer {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 18px;
    flex-shrink: 0;
  }

  .bar {
    display: block;
    width: 3px;
    border-radius: 2px;
    background: var(--accent-1);
    transform-origin: bottom;
    animation: wispBar 0.8s ease-in-out infinite alternate;
  }

  .bar-1 { height: 14px; animation-delay: 0s; }
  .bar-2 { height: 18px; animation-delay: 0.18s; }
  .bar-3 { height: 11px; animation-delay: 0.36s; }
</style>
