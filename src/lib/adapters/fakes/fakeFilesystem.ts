import type { FilesystemAdapter, DownloadProgress } from '$lib/adapters/filesystem';

export interface FakeFilesystemState { files: Record<string, number>; } // relativePath -> size bytes
export interface FakeFilesystemOpts { failUrls?: string[]; fileBytes?: number; }

export function createFakeFilesystem(opts?: FakeFilesystemOpts): { adapter: FilesystemAdapter; state: FakeFilesystemState } {
  const fail = new Set(opts?.failUrls ?? []);
  const bytes = opts?.fileBytes ?? 1000;
  const state: FakeFilesystemState = { files: {} };
  const uri = (p: string) => `file:///data/${p}`;

  const adapter: FilesystemAdapter = {
    async download(url, relativePath, onProgress?: (p: DownloadProgress) => void) {
      if (fail.has(url)) throw new Error(`download failed: ${url}`);
      onProgress?.({ loaded: bytes / 2, total: bytes });
      onProgress?.({ loaded: bytes, total: bytes });
      state.files[relativePath] = bytes;
      return uri(relativePath);
    },
    async sizeOf(p) { return p in state.files ? state.files[p] : null; },
    async uriOf(p) { return p in state.files ? uri(p) : null; },
    async move(from, to) {
      if (!(from in state.files)) throw new Error(`no such file: ${from}`);
      state.files[to] = state.files[from];
      delete state.files[from];
    },
    async remove(p) { delete state.files[p]; },
    async removeDir(dir) {
      for (const k of Object.keys(state.files)) if (k.startsWith(dir + '/')) delete state.files[k];
    },
    async dirSize(dir) {
      return Object.entries(state.files)
        .filter(([k]) => k.startsWith(dir + '/'))
        .reduce((sum, [, v]) => sum + v, 0);
    }
  };
  return { adapter, state };
}
