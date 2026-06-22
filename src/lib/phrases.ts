// Short, calming bedtime phrases shown as the home title — one per day,
// rotating deterministically so it's stable all day and different each day.
export const BEDTIME_PHRASES: readonly string[] = [
  'Drift away',
  'Rest easy',
  'Let the day go',
  'Soft and slow',
  'Breathe out',
  'Sink into calm',
  'Quiet the mind',
  'Sweet dreams',
  'Unwind',
  'Settle in',
  'Let go',
  'Peace, at last',
  'Slow your breath',
  'Calm waters',
  'Gentle night',
  'Ease into sleep',
  'Hush now',
  'Find your calm',
  'Wrapped in quiet',
  'Stillness',
  'Let sleep find you',
  'Soften',
  'The day is done',
  'Rest your eyes',
  'Float into sleep',
  'A quiet mind',
  'Slow down',
  'Be still',
  'Night settles in',
  'Dream gently',
  'Tender night',
  'Lay it down',
  'Release the day',
  'Calm descends',
  'Whispered quiet',
  'Sleep is near',
  'Melt into rest',
  'Surrender to sleep',
  'Soft landings',
  'Cradle of calm',
  'Deep and slow',
  'Let it fade',
  'Wander into dreams',
  'Easeful night',
  'The world goes quiet',
  'Close your eyes',
  'Slumber awaits',
  'Here, breathe',
  'Gentle drift',
  'Good night'
];

/**
 * Deterministic phrase for a given date: stable for the whole calendar day,
 * advancing by one each day. Uses days-since-epoch so there's no randomness.
 */
export function phraseForDate(date: Date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const n = BEDTIME_PHRASES.length;
  return BEDTIME_PHRASES[((dayIndex % n) + n) % n];
}
