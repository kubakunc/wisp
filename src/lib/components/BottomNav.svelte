<script lang="ts">
  type Tab = 'sounds' | 'mixes' | 'settings';

  let { active }: { active: Tab } = $props();

  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: 'sounds', label: 'Sounds', href: '/' },
    { id: 'mixes', label: 'Mixes', href: '/mixes' },
    { id: 'settings', label: 'Settings', href: '/settings' }
  ];
</script>

<nav class="bottom-nav" aria-label="Main navigation">
  {#each tabs as tab}
    <a
      href={tab.href}
      class="nav-item"
      class:active={active === tab.id}
      aria-current={active === tab.id ? 'page' : undefined}
    >
      {#if tab.id === 'sounds'}
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12c3 0 3-4 6-4s3 8 6 8 3-4 6-4"/>
        </svg>
      {:else if tab.id === 'mixes'}
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="3" x2="12" y2="8"/>
          <line x1="12" y1="16" x2="12" y2="21"/>
          <line x1="3" y1="12" x2="8" y2="12"/>
          <line x1="16" y1="12" x2="21" y2="12"/>
        </svg>
      {:else}
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      {/if}
      <span class="nav-label">{tab.label}</span>
    </a>
  {/each}
</nav>

<style>
  .bottom-nav {
    display: flex;
    align-items: stretch;
    background: var(--surface);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 0 12px;
    color: var(--locked);
    transition: color 0.15s;
    text-decoration: none;
  }

  .nav-item.active {
    color: #b6bdf0;
  }

  .nav-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
</style>
