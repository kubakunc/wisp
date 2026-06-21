<script lang="ts">
  let { open, selected, onPick, onStart, onClose }: {
    open: boolean;
    selected: number | 'custom' | 'until' | null;
    onPick: (v: number | 'custom' | 'until') => void;
    onStart: () => void;
    onClose: () => void;
  } = $props();

  const PRESETS = [15, 30, 45, 60, 90] as const;

  const ctaLabel = $derived(
    typeof selected === 'number'
      ? `Start timer · ${selected} min`
      : selected === 'until'
        ? 'Start timer'
        : 'Start timer'
  );
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="scrim"
    onclick={onClose}
    aria-hidden="true"
  ></div>

  <div
    class="sheet"
    role="dialog"
    aria-label="Sleep timer"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }}
  >
    <div class="handle" aria-hidden="true"></div>

    <h2 class="sheet-title">Sleep timer</h2>
    <p class="explainer">Sound fades out gently over the last 30 seconds — you won't wake to silence cutting off.</p>

    <div class="preset-grid">
      {#each PRESETS as preset}
        <button
          class="chip"
          class:chip-selected={selected === preset}
          aria-pressed={selected === preset}
          aria-label="{preset} min"
          onclick={() => onPick(preset)}
        >
          {preset}
        </button>
      {/each}
      <button
        class="chip"
        class:chip-selected={selected === 'custom'}
        aria-pressed={selected === 'custom'}
        aria-label="Custom"
        onclick={() => onPick('custom')}
      >
        Custom
      </button>
    </div>

    <button
      class="until-row"
      onclick={() => onPick('until')}
      aria-pressed={selected === 'until'}
    >
      <span class="until-icon" aria-hidden="true">∞</span>
      Until I stop it
    </button>

    <button
      class="cta"
      onclick={onStart}
    >
      {ctaLabel}
    </button>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(6, 9, 20, 0.6);
    z-index: 10;
  }

  .sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 11;
    background: linear-gradient(180deg, #161c38, #10142a);
    border-radius: 32px 32px 0 0;
    padding: 12px 20px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.15);
    margin-bottom: 4px;
  }

  .sheet-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  .explainer {
    font-size: 13px;
    color: var(--muted);
    text-align: center;
    line-height: 1.5;
    margin: 0;
    max-width: 320px;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
  }

  .chip {
    padding: 14px 8px;
    border-radius: var(--r-row);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.07);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    font-family: var(--font-body);
  }

  .chip-selected {
    background: var(--accent-grad);
    border-color: transparent;
    color: var(--on-accent);
  }

  .until-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 14px 16px;
    border-radius: var(--r-row);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.07);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
    font-family: var(--font-body);
  }

  .until-row[aria-pressed='true'] {
    background: rgba(124, 140, 240, 0.15);
    border-color: rgba(124, 140, 240, 0.4);
  }

  .until-icon {
    font-size: 18px;
    color: var(--muted);
  }

  .cta {
    width: 100%;
    padding: 16px;
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

  .cta:hover {
    opacity: 0.88;
  }
</style>
