import { describe, it, expect } from 'vitest';
import { createPlaybackMetrics } from './playbackMetrics';

type Call = { event: string; params: Record<string, string | number | boolean> };

function setup(isPremium: (id: string) => boolean = () => false, minSeconds = 1) {
  const calls: Call[] = [];
  let t = 0;
  const m = createPlaybackMetrics({
    track: (event, params) => calls.push({ event, params: params ?? {} }),
    now: () => t,
    isPremium,
    minSeconds
  });
  const at = (ms: number) => { t = ms; };
  const sound = (id: string) => calls.find((c) => c.event === 'sound_played' && c.params.sound_id === id);
  const mixes = () => calls.filter((c) => c.event === 'mix_played');
  return { m, calls, at, sound, mixes };
}

describe('playbackMetrics', () => {
  it('emits a single sound\'s play duration when playback stops', () => {
    const { m, calls, at, sound } = setup();
    m.sync(['rain'], true);            // t=0 start
    at(5000); m.sync([], false);       // stop → flush
    expect(calls).toHaveLength(1);
    expect(sound('rain')!.params).toEqual({ sound_id: 'rain', premium: false, seconds: 5 });
  });

  it('tracks a mix combination + each sound, with premium flags', () => {
    const { m, at, sound, mixes } = setup((id) => id === 'thunder');
    m.sync(['thunder', 'rain'], true); // t=0
    at(10000); m.sync([], false);      // stop
    expect(sound('rain')!.params).toMatchObject({ premium: false, seconds: 10 });
    expect(sound('thunder')!.params).toMatchObject({ premium: true, seconds: 10 });
    expect(mixes()).toHaveLength(1);
    expect(mixes()[0].params).toEqual({ sounds: 'rain+thunder', count: 2, premium_count: 1, seconds: 10 });
  });

  it('keys a combination alphabetically regardless of add order', () => {
    const a = setup(); a.m.sync(['thunder', 'rain'], true); a.at(3000); a.m.sync([], false);
    const b = setup(); b.m.sync(['rain', 'thunder'], true); b.at(3000); b.m.sync([], false);
    expect(a.mixes()[0].params.sounds).toBe('rain+thunder');
    expect(b.mixes()[0].params.sounds).toBe('rain+thunder');
  });

  it('does not count paused time', () => {
    const { m, at, sound } = setup();
    m.sync(['rain'], true);            // 0: playing
    at(5000); m.sync(['rain'], false); // paused at 5s (5s counted)
    at(8000); m.sync(['rain'], true);  // resumed at 8s (3s pause NOT counted)
    at(10000); m.sync([], false);      // stop at 10s (+2s)
    expect(sound('rain')!.params.seconds).toBe(7);
  });

  it('does not emit a single-sound session as a mix', () => {
    const { m, at, mixes } = setup();
    m.sync(['rain'], true); at(4000); m.sync([], false);
    expect(mixes()).toHaveLength(0);
  });

  it('ignores segments shorter than the minimum', () => {
    const { m, at, calls } = setup();
    m.sync(['rain'], true); at(500); m.sync([], false); // 0.5s < 1s
    expect(calls).toHaveLength(0);
  });

  it('flush() emits accumulated totals and keeps counting afterwards', () => {
    const { m, at, calls } = setup();
    m.sync(['rain'], true);            // 0
    at(3000); m.flush();               // emit 3s, keep going
    at(5000); m.sync([], false);       // emit remaining 2s
    const secs = calls.filter((c) => c.event === 'sound_played').map((c) => c.params.seconds);
    expect(secs).toEqual([3, 2]);
  });
});
