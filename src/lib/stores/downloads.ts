import { writable, get } from 'svelte/store';
import type { SoundCacheService } from '$lib/services/soundCacheService';

export type DownloadStatus = 'idle' | 'downloading' | 'ready' | 'error';
export interface DownloadEntry { status: DownloadStatus; progress: number; }
const IDLE: DownloadEntry = { status: 'idle', progress: 0 };

export function createDownloadsStore(cache: SoundCacheService) {
  const { subscribe, update } = writable<Record<string, DownloadEntry>>({});
  const inflight = new Map<string, Promise<string>>();

  function set(id: string, e: DownloadEntry) {
    update((m) => ({ ...m, [id]: e }));
  }

  function stateOf(id: string): DownloadEntry {
    return get({ subscribe })[id] ?? IDLE;
  }

  function ensure(id: string): Promise<string> {
    const existing = inflight.get(id);
    if (existing) return existing;
    const p = (async () => {
      set(id, { status: 'downloading', progress: 0 });
      try {
        const uri = await cache.resolveUri(id, (prog) => set(id, { status: 'downloading', progress: prog }));
        set(id, { status: 'ready', progress: 1 });
        return uri;
      } catch (e) {
        set(id, { status: 'error', progress: 0 });
        throw e;
      } finally {
        inflight.delete(id);
      }
    })();
    inflight.set(id, p);
    return p;
  }

  return { subscribe, ensure, stateOf };
}
export type DownloadsStore = ReturnType<typeof createDownloadsStore>;
