import { writable } from 'svelte/store';

/**
 * Whether a blocking UI overlay (e.g. the sleep-timer sheet) is open. While
 * true, the ad card + native banner are suppressed so they can't show through
 * or beneath a modal sheet.
 */
export const modalOpen = writable<boolean>(false);
