<script lang="ts">
  let { size = 44, gradient = true }: { size?: number; gradient?: boolean } = $props();
</script>

<div
  class="wisp-mark"
  style="width:{size}px;height:{size}px;border-radius:{size * 0.3}px;background:{gradient ? 'var(--accent-grad)' : 'var(--accent-1)'}"
  aria-hidden="true"
>
  <svg
    aria-hidden="true"
    width={size * 0.55}
    height={size * 0.55}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--on-accent)"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20.5 14.2A8.2 8.2 0 1 1 10.8 4.3a6.4 6.4 0 0 0 9.7 9.9z" />
  </svg>
</div>

<style>
  .wisp-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
