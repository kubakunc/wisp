export const WispEvent = {
  soundPlay: 'sound_play',
  soundStop: 'sound_stop',
  mixSave: 'mix_save',
  mixPlay: 'mix_play',
  timerStart: 'timer_start',
  paywallView: 'paywall_view',
  purchase: 'purchase',
  restore: 'restore'
} as const;

export type WispEventName = typeof WispEvent[keyof typeof WispEvent];
