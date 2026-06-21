// Real adapter: native-plugin wrapper, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
// Targets @mediagrid/capacitor-native-audio@3 — API: AudioPlayer.create() + initialize(), not preload().
// .d.ts: node_modules/@mediagrid/capacitor-native-audio/dist/esm/definitions.d.ts
import { AudioPlayer } from '@mediagrid/capacitor-native-audio';
import { Capacitor } from '@capacitor/core';

/**
 * Resolve a bundled-asset path to a URI the native player (ExoPlayer / AVPlayer)
 * can open. The plugin passes the string straight to MediaItem.setUri, so a bare
 * relative path is treated as a filesystem path (FileNotFound). Capacitor copies
 * web assets into the native 'public/' dir, reachable on Android via the
 * asset:/// scheme. Absolute URLs (http/https/file/asset/content) pass through.
 */
function resolveAudioUri(assetPath: string): string {
  if (/^(https?|file|asset|content):/.test(assetPath)) return assetPath;
  const clean = assetPath.replace(/^\/+/, '');
  if (Capacitor.getPlatform() === 'android') return `asset:///public/${clean}`;
  // iOS: web assets live in the app bundle's public/ folder (AVPlayer reads via
  // the served WebView URL). convertFileSrc maps public/<path> appropriately.
  return Capacitor.convertFileSrc(clean);
}

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
  /** Pause + reset position (source stays alive). */
  stop(audioId: string): Promise<void>;
  /** Release + remove the source. The notification owner must be destroyed LAST. */
  destroy(audioId: string): Promise<void>;
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
      audioSource: resolveAudioUri(o.assetPath),
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
  async destroy(audioId) {
    await AudioPlayer.destroy({ audioId });
  },
  async setVolume(audioId, volume) {
    await AudioPlayer.setVolume({ audioId, volume });
  }
};
