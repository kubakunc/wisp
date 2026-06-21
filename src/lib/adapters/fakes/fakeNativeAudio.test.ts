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

  it('stop removes the track', async () => {
    const { adapter, state } = createFakeNativeAudio();
    await adapter.preload({ audioId: 'fan', assetPath: 'sounds/fan.mp3', loop: true, useForNotification: false });
    await adapter.play('fan');
    await adapter.stop('fan');
    expect(state.tracks.has('fan')).toBe(false);
  });
});
