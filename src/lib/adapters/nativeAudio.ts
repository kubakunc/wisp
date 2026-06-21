// Real adapter: native-plugin wrapper, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
// Targets @mediagrid/capacitor-native-audio@3 — API: AudioPlayer.create() + initialize(), not preload().
// .d.ts: node_modules/@mediagrid/capacitor-native-audio/dist/esm/definitions.d.ts
import { AudioPlayer } from '@mediagrid/capacitor-native-audio';

export interface PreloadOptions {
  audioId: string;
  assetPath: string;
  isUrl?: boolean;
  loop: boolean;
  useForNotification: boolean;
  /** Mapped to AudioPlayerPrepareParams.friendlyTitle; defaults to audioId if omitted. */
  title?: string;
  artist?: string;
}

export interface NativeAudioAdapter {
  preload(o: PreloadOptions): Promise<void>;
  play(audioId: string): Promise<void>;
  pause(audioId: string): Promise<void>;
  stop(audioId: string): Promise<void>;
  setVolume(audioId: string, volume: number): Promise<void>;
}

export const nativeAudioAdapter: NativeAudioAdapter = {
  async preload(o) {
    // v3 API: create() configures the source, initialize() buffers it.
    // 'source' field in the brief mapped to 'audioSource' in v3.
    // 'title' maps to 'friendlyTitle' (required in v3); fall back to audioId.
    // 'artist' maps to 'artistName' (optional).
    // 'isUrl' is not a separate flag in v3; audioSource accepts both URIs and local paths.
    await AudioPlayer.create({
      audioId: o.audioId,
      audioSource: o.assetPath,
      friendlyTitle: o.title ?? o.audioId,
      useForNotification: o.useForNotification,
      loop: o.loop,
      ...(o.artist ? { artistName: o.artist } : {})
    });
    await AudioPlayer.initialize({ audioId: o.audioId });
  },
  async play(audioId) {
    await AudioPlayer.play({ audioId });
  },
  async pause(audioId) {
    await AudioPlayer.pause({ audioId });
  },
  async stop(audioId) {
    await AudioPlayer.stop({ audioId });
  },
  async setVolume(audioId, volume) {
    await AudioPlayer.setVolume({ audioId, volume });
  }
};
