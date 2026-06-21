<script lang="ts">
  let { id, size = 24 }: { id: string; size?: number } = $props();

  type PathSet = string[];

  const iconPaths: Record<string, PathSet> = {
    rain: [
      'M7 13.5a3.8 3.8 0 0 1 .5-7.5 4.8 4.8 0 0 1 9.2 1.3A3.4 3.4 0 0 1 16.7 14',
      'M8.5 17l-1 2.2M12 17l-1 2.2M15.5 17l-1 2.2'
    ],
    'heavy-rain': [
      'M7 13.5a3.8 3.8 0 0 1 .5-7.5 4.8 4.8 0 0 1 9.2 1.3A3.4 3.4 0 0 1 16.7 14',
      'M8.5 17l-1 2.2M12 17l-1 2.2M15.5 17l-1 2.2'
    ],
    'rain-on-tent': [
      'M7 13.5a3.8 3.8 0 0 1 .5-7.5 4.8 4.8 0 0 1 9.2 1.3A3.4 3.4 0 0 1 16.7 14',
      'M8.5 17l-1 2.2M12 17l-1 2.2M15.5 17l-1 2.2'
    ],
    ocean: [
      'M2 8.5c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6',
      'M2 13c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6',
      'M2 17.5c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6'
    ],
    fan: ['M4 12h2M8 7v10M12 4v16M16 9v6M20 11v2'],
    forest: [
      'M12 3l3.5 5.5h-2l2.8 4.5h-2.6L18 18H6l4.3-5H8l2.8-4.5h-2z',
      'M12 18v3'
    ],
    thunder: [
      'M7 13a4 4 0 0 1 .5-7.9 5 5 0 0 1 9.5 1.3A3.4 3.4 0 0 1 16.7 13',
      'M12 12l-2 4h3l-2 4'
    ],
    'white-noise': ['M4 12h2M8 7v10M12 4v16M16 9v6M20 11v2'],
    'pink-noise': ['M4 12h2M8 7v10M12 4v16M16 9v6M20 11v2'],
    'brown-noise': ['M4 12h2M8 7v10M12 4v16M16 9v6M20 11v2'],
    'blue-noise': ['M4 12h2M8 7v10M12 4v16M16 9v6M20 11v2'],
    'grey-noise': ['M4 12h2M8 7v10M12 4v16M16 9v6M20 11v2'],
    stream: [
      'M5 19c4-4 4-10 0-14',
      'M12 19c4-4 4-10 0-14',
      'M19 19c4-4 4-10 0-14'
    ],
    campfire: ['M12 3c.6 2.6 3.6 3.7 3.6 7.6a3.6 3.6 0 1 1-7.2 0c0-2 1.4-3 2-4 .8 1 1.6 1.4 1.6 0z'],
    fireplace: ['M12 3c.6 2.6 3.6 3.7 3.6 7.6a3.6 3.6 0 1 1-7.2 0c0-2 1.4-3 2-4 .8 1 1.6 1.4 1.6 0z'],
    wind: [
      'M12 7a3 3 0 1 1 3 3H2',
      'M17 14a4 4 0 1 1 4 4H2',
      'M12 21a3 3 0 0 0 3-3H2'
    ]
  };

  const fallback: PathSet = ['M3 12c3 0 3-4 6-4s3 8 6 8 3-4 6-4'];
  const paths = $derived(iconPaths[id] ?? fallback);
</script>

<svg
  aria-hidden="true"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#each paths as d}
    <path {d} />
  {/each}
</svg>
