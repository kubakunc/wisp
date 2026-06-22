// Real adapter: @capacitor/filesystem wrapper. Coverage-excluded (exercised via fake + E2E).
// .d.ts: node_modules/@capacitor/filesystem/dist/esm/definitions.d.ts
// Note: downloadFile + addListener('progress') are deprecated since v7.1.0 in favour of
// @capacitor/file-transfer, but remain fully functional in v8 and are used here to avoid
// an additional dependency. If/when file-transfer is adopted, this is the only file to change.
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { ProgressListener } from '@capacitor/filesystem';

export interface DownloadProgress { loaded: number; total: number; }
export interface FilesystemAdapter {
  /** Download url → Data dir at relativePath; reports progress; resolves to the file's native uri. */
  download(url: string, relativePath: string, onProgress?: (p: DownloadProgress) => void): Promise<string>;
  /** Bytes of a file, or null if it doesn't exist. */
  sizeOf(relativePath: string): Promise<number | null>;
  /** Native uri (file://…) for a relative path, or null if it doesn't exist. */
  uriOf(relativePath: string): Promise<string | null>;
  /** Move within the Data dir (used for temp→final rename). */
  move(fromRelative: string, toRelative: string): Promise<void>;
  /** Delete a single file (no-op if absent). */
  remove(relativePath: string): Promise<void>;
  /** Recursively delete a directory (no-op if absent). */
  removeDir(relativePath: string): Promise<void>;
  /** Total bytes across files directly inside a directory (0 if absent). */
  dirSize(relativeDir: string): Promise<number>;
}

export const filesystemAdapter: FilesystemAdapter = {
  async download(url, relativePath, onProgress) {
    let handle: { remove: () => Promise<void> } | undefined;
    if (onProgress) {
      // ProgressListener is typed as (progress: ProgressStatus) => void; cast to the same shape.
      const listener: ProgressListener = (e) => {
        if (e.url === url) onProgress({ loaded: e.bytes, total: e.contentLength });
      };
      handle = await Filesystem.addListener('progress', listener);
    }
    try {
      // downloadFile does NOT create parent directories — ensure the target's
      // parent exists first (e.g. the `sounds/` cache subdir), or the write
      // fails with ENOENT.
      const slash = relativePath.lastIndexOf('/');
      if (slash > 0) {
        const parent = relativePath.slice(0, slash);
        try {
          await Filesystem.mkdir({ path: parent, directory: Directory.Data, recursive: true });
        } catch { /* already exists */ }
      }
      const res = await Filesystem.downloadFile({ url, path: relativePath, directory: Directory.Data, progress: true });
      // DownloadFileResult.path is optional (undefined on web/when blob is returned instead).
      const uri = res.path ?? (await Filesystem.getUri({ path: relativePath, directory: Directory.Data })).uri;
      return uri;
    } finally {
      await handle?.remove();
    }
  },

  async sizeOf(relativePath) {
    try {
      const s = await Filesystem.stat({ path: relativePath, directory: Directory.Data });
      return s.size;
    } catch {
      return null;
    }
  },

  async uriOf(relativePath) {
    try {
      await Filesystem.stat({ path: relativePath, directory: Directory.Data });
      return (await Filesystem.getUri({ path: relativePath, directory: Directory.Data })).uri;
    } catch {
      return null;
    }
  },

  async move(fromRelative, toRelative) {
    await Filesystem.rename({ from: fromRelative, to: toRelative, directory: Directory.Data });
  },

  async remove(relativePath) {
    try {
      await Filesystem.deleteFile({ path: relativePath, directory: Directory.Data });
    } catch { /* no-op if absent */ }
  },

  async removeDir(relativeDir) {
    try {
      await Filesystem.rmdir({ path: relativeDir, directory: Directory.Data, recursive: true });
    } catch { /* no-op if absent */ }
  },

  async dirSize(relativeDir) {
    try {
      const { files } = await Filesystem.readdir({ path: relativeDir, directory: Directory.Data });
      let total = 0;
      for (const f of files) {
        if (typeof f !== 'string' && f.type === 'directory') continue;
        // ReaddirResult.files is FileInfo[] in v8 (objects with .name), not strings.
        // The brief includes a typeof guard for forward-compat; we keep it as a documented narrow cast.
        const name = typeof f === 'string' ? f : f.name;
        const s = await this.sizeOf(`${relativeDir}/${name}`);
        if (s) total += s;
      }
      return total;
    } catch {
      return 0;
    }
  }
};
