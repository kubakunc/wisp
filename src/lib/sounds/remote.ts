/** Base URL for downloadable sounds. Empty = use the local static/ copy (dev). */
const RAW = (import.meta as { env?: Record<string, string> }).env?.VITE_SOUND_CDN ?? '';
export const SOUND_CDN_BASE: string = RAW === '' ? '' : RAW.replace(/\/+$/, '') + '/';

/** Absolute (or, when no CDN configured, relative `sounds/<file>`) URL for a file. */
export function remoteUrl(file: string): string {
  const clean = file.replace(/^\/+/, '');
  return SOUND_CDN_BASE === '' ? `sounds/${clean}` : `${SOUND_CDN_BASE}${clean}`;
}
