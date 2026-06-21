import type { NativeAudioAdapter, PreloadOptions } from '$lib/adapters/nativeAudio';

export interface FakeTrack {
  assetPath: string;
  loop: boolean;
  useForNotification: boolean;
  playing: boolean;
  volume: number;
}

export interface FakeNativeAudioState {
  /** Sources that exist in the (fake) plugin — created via preload, removed via destroy. */
  tracks: Map<string, FakeTrack>;
}

/**
 * In-memory stand-in for @mediagrid/capacitor-native-audio. Mirrors the real
 * plugin's contract that matters to the engine:
 *  - preload = create+initialize a source
 *  - stop = pause + reset position (source stays alive)
 *  - destroy = release + remove the source; the notification owner must be
 *    destroyed LAST (throws otherwise, like the native DestroyNotAllowedException)
 *  - creating a source that already exists throws (like the native plugin)
 */
export function createFakeNativeAudio(): { adapter: NativeAudioAdapter; state: FakeNativeAudioState } {
  const state: FakeNativeAudioState = { tracks: new Map() };
  const adapter: NativeAudioAdapter = {
    async preload(o: PreloadOptions) {
      if (state.tracks.has(o.audioId)) {
        throw new Error(`An audio source with the ID ${o.audioId} already exists.`);
      }
      state.tracks.set(o.audioId, {
        assetPath: o.assetPath,
        loop: o.loop,
        useForNotification: o.useForNotification,
        playing: false,
        volume: 1
      });
    },
    async play(id) {
      const t = state.tracks.get(id);
      if (t) t.playing = true;
    },
    async pause(id) {
      const t = state.tracks.get(id);
      if (t) t.playing = false;
    },
    async stop(id) {
      const t = state.tracks.get(id);
      if (t) t.playing = false;
    },
    async destroy(id) {
      const t = state.tracks.get(id);
      if (!t) return;
      if (t.useForNotification && state.tracks.size > 1) {
        throw new Error(
          `Audio source ID ${id} is the current notification and cannot be destroyed. Destroy other audio sources first.`
        );
      }
      state.tracks.delete(id);
    },
    async setVolume(id, v) {
      const t = state.tracks.get(id);
      if (t) t.volume = v;
    }
  };
  return { adapter, state };
}
