<script lang="ts">
  let { size = 44, gradient = true }: { size?: number; gradient?: boolean } = $props();
</script>

<div
  class="wisp-mark"
  style="width:{size}px;height:{size}px;background:{gradient ? 'var(--accent-grad)' : 'var(--accent-1)'}"
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
    <path d="M3 12c3 0 3-4 6-4s3 8 6 8 3-4 6-4" />
  </svg>
</div>

<style>
  .wisp-mark {
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
