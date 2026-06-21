import type { NativeAudioAdapter, PreloadOptions } from '$lib/adapters/nativeAudio';

export interface FakeTrack {
  assetPath: string;
  loop: boolean;
  useForNotification: boolean;
  playing: boolean;
  volume: number;
}

export interface FakeNativeAudioState {
  tracks: Map<string, FakeTrack>;
}

export function createFakeNativeAudio(): { adapter: NativeAudioAdapter; state: FakeNativeAudioState } {
  const state: FakeNativeAudioState = { tracks: new Map() };
  const adapter: NativeAudioAdapter = {
    async preload(o: PreloadOptions) {
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
      state.tracks.delete(id);
    },
    async setVolume(id, v) {
      const t = state.tracks.get(id);
      if (t) t.volume = v;
    }
  };
  return { adapter, state };
}
