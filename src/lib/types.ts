export type Tier = 'free' | 'premium';
export type SoundCategory = 'noise' | 'nature';

export interface SoundDef {
  id: string;
  name: string;
  category: SoundCategory;
  tier: Tier;
  /** Path to a bundled seamless-loop file. Real files dropped in later. */
  assetPath: string;
  /** True if shipped in the app; false if downloaded from CDN. */
  bundled: boolean;
  /** Bare filename (e.g. 'rain.wav') for downloading from remote CDN. */
  file: string;
}

export interface MixLayer {
  soundId: string;
  /** 0..1 */
  volume: number;
}

export interface Mix {
  id: string;
  name: string;
  layers: MixLayer[];
}

export type TimerPreset = 15 | 30 | 45 | 60 | 90;
export type TimerMode = 'off' | 'preset' | 'custom' | 'until-stop';

export interface TimerState {
  mode: TimerMode;
  /** total seconds for preset/custom; null for off/until-stop */
  durationSec: number | null;
  /** epoch ms when the timer will fire; null if off, until-stop, or PAUSED */
  endsAt: number | null;
  /** frozen ms remaining while the timer is paused (playback paused); null when
   *  running or off. The timer only counts down while a sound is playing. */
  remainingMs: number | null;
}
