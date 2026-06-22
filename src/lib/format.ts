/** Human MB string for a byte count (1 decimal under 10 MB, whole above). */
export function formatBytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb === 0) return '0 MB';
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : Math.round(mb)} MB`;
}
