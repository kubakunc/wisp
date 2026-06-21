<script lang="ts">
  let { on, disabled = false, onToggle }: {
    on: boolean;
    disabled?: boolean;
    onToggle: () => void;
  } = $props();
</script>

<button
  class="toggle"
  class:on
  role="switch"
  aria-checked={on}
  aria-label={on ? 'On' : 'Off'}
  {disabled}
  onclick={() => { if (!disabled) onToggle(); }}
>
  <span class="knob"></span>
</button>

<style>
  .toggle {
    position: relative;
    width: 42px;
    height: 26px;
    border-radius: var(--r-pill);
    border: none;
    background: #262b46;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .toggle.on {
    background: var(--accent-1);
  }

  .toggle:disabled {
    pointer-events: none;
    opacity: 0.4;
  }

  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--locked);
    transition: left 0.2s, right 0.2s, background 0.2s;
  }

  .toggle.on .knob {
    left: auto;
    right: 3px;
    background: var(--on-accent);
  }
</style>
