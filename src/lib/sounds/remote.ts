/** Normalize a CDN base URL: remove trailing slashes then add exactly one.
 *  '' (falsy input) returns ''; non-empty input gets trailing slash.
 *  This is extracted for testability. */
export function normalizeCdnBase(raw: string): string {
  return raw === '' ? '' : raw.replace(/\/+$/, '') + '/';
}

/** Pure URL builder. base = raw CDN base ('' = none); returns an absolute URL or
 *  a relative `sounds/<file>` path when no CDN is configured. */
export function buildRemoteUrl(base: string, file: string): string {
  const cleanFile = file.replace(/^\/+/, '');
  const normBase = normalizeCdnBase(base);
  return normBase === '' ? `sounds/${cleanFile}` : `${normBase}${cleanFile}`;
}

/** Raw CDN base from the build env ('' = use local static/ in dev). */
const RAW_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_SOUND_CDN ?? '';
/** Normalized base (trailing slash) for display/consumers; '' when no CDN. */
export const SOUND_CDN_BASE: string = normalizeCdnBase(RAW_BASE);
/** URL (or relative path) for a downloadable sound file. */
export function remoteUrl(file: string): string {
  return buildRemoteUrl(RAW_BASE, file);
}
