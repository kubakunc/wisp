import { describe, it, expect } from 'vitest';
import { createFakeNativeAudio } from './fakeNativeAudio';

describe('fakeNativeAudio', () => {
  it('records preloaded, playing and volume state', async () => {
    const { adapter, state } = createFakeNativeAudio();
    await adapter.preload({ audioId: 'rain', assetPath: 'sounds/rain.mp3', loop: true, useForNotification: true });
    await adapter.play('rain');
    await adapter.setVolume('rain', 0.5);
    expect(state.tracks.get('rain')).toMatchObject({ playing: true, volume: 0.5, loop: true });
  });

  it('stop pauses but keeps the track; destroy removes it', async () => {
    const { adapter, state } = createFakeNativeAudio();
    await adapter.preload({ audioId: 'fan', assetPath: 'sounds/fan.mp3', loop: true, useForNotification: false });
    await adapter.play('fan');
    await adapter.stop('fan');
    expect(state.tracks.get('fan')).toMatchObject({ playing: false });
    await adapter.destroy('fan');
    expect(state.tracks.has('fan')).toBe(false);
  });

  it('preload throws if the source already exists', async () => {
    const { adapter } = createFakeNativeAudio();
    await adapter.preload({ audioId: 'rain', assetPath: 'sounds/rain.mp3', loop: true, useForNotification: true });
    await expect(
      adapter.preload({ audioId: 'rain', assetPath: 'sounds/rain.mp3', loop: true, useForNotification: true })
    ).rejects.toThrow(/already exists/);
  });

  it('refuses to destroy the notification owner while other sources exist', async () => {
    const { adapter } = createFakeNativeAudio();
    await adapter.preload({ audioId: 'rain', assetPath: 'sounds/rain.mp3', loop: true, useForNotification: true });
    await adapter.preload({ audioId: 'fan', assetPath: 'sounds/fan.mp3', loop: true, useForNotification: false });
    await expect(adapter.destroy('rain')).rejects.toThrow(/cannot be destroyed/);
  });
});
