export const WispEvent = {
  soundPlay: 'sound_play',
  soundStop: 'sound_stop',
  /** How long a single sound was played (params: sound_id, premium, seconds). */
  soundPlayed: 'sound_played',
  /** How long a multi-sound combination was played (params: sounds = the sound
   *  ids sorted alphabetically + joined with '+', count, premium_count, seconds). */
  mixPlayed: 'mix_played',
  mixSave: 'mix_save',
  mixPlay: 'mix_play',
  timerStart: 'timer_start',
  paywallView: 'paywall_view',
  purchase: 'purchase',
  restore: 'restore'
} as const;

export type WispEventName = typeof WispEvent[keyof typeof WispEvent];
