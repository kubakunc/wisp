import type { FilesystemAdapter } from '$lib/adapters/filesystem';
import { getSound } from '$lib/sounds/registry';
import { remoteUrl } from '$lib/sounds/remote';

const CACHE_DIR = 'sounds';
const finalPath = (file: string) => `${CACHE_DIR}/${file}`;
const tempPath = (file: string) => `${CACHE_DIR}/.dl-${file}`;

export interface SoundCacheService {
  resolveUri(soundId: string, onProgress?: (p: number) => void): Promise<string>;
  isReady(soundId: string): Promise<boolean>;
  usageBytes(): Promise<number>;
  clear(): Promise<void>;
}

export function createSoundCacheService(fs: FilesystemAdapter): SoundCacheService {
  return {
    async resolveUri(soundId, onProgress) {
      const def = getSound(soundId);
      if (!def) throw new Error(`Unknown sound: ${soundId}`);
      if (def.bundled) { onProgress?.(1); return def.assetPath; }

      const cached = await fs.uriOf(finalPath(def.file));
      if (cached) { onProgress?.(1); return cached; }

      // Download to a temp name, then rename, so isReady is only ever true for a complete file.
      const tmp = tempPath(def.file);
      try {
        await fs.download(remoteUrl(def.file), tmp, (p) => {
          onProgress?.(p.total > 0 ? Math.min(1, p.loaded / p.total) : 0);
        });
        await fs.move(tmp, finalPath(def.file));
      } catch (e) {
        await fs.remove(tmp); // clean partial
        throw e;
      }
      onProgress?.(1);
      const uri = await fs.uriOf(finalPath(def.file));
      if (!uri) throw new Error(`download did not produce a file: ${soundId}`);
      return uri;
    },
    async isReady(soundId) {
      const def = getSound(soundId);
      if (!def) return false;
      if (def.bundled) return true;
      return (await fs.sizeOf(finalPath(def.file))) !== null;
    },
    async usageBytes() { return fs.dirSize(CACHE_DIR); },
    async clear() { await fs.removeDir(CACHE_DIR); }
  };
}
