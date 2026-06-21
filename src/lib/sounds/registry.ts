import type { SoundDef } from '$lib/types';

const a = (id: string) => `sounds/${id}.mp3`;

export const SOUNDS: SoundDef[] = [
  // free — noise colors
  { id: 'white-noise', name: 'White Noise', category: 'noise', tier: 'free', assetPath: a('white-noise') },
  { id: 'pink-noise', name: 'Pink Noise', category: 'noise', tier: 'free', assetPath: a('pink-noise') },
  { id: 'brown-noise', name: 'Brown Noise', category: 'noise', tier: 'free', assetPath: a('brown-noise') },
  // free — nature
  { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: a('rain') },
  { id: 'ocean', name: 'Ocean', category: 'nature', tier: 'free', assetPath: a('ocean') },
  { id: 'fan', name: 'Fan', category: 'nature', tier: 'free', assetPath: a('fan') },
  { id: 'forest', name: 'Forest', category: 'nature', tier: 'free', assetPath: a('forest') },
  { id: 'stream', name: 'Stream', category: 'nature', tier: 'free', assetPath: a('stream') },
  // premium — noise
  { id: 'blue-noise', name: 'Blue Noise', category: 'noise', tier: 'premium', assetPath: a('blue-noise') },
  { id: 'grey-noise', name: 'Grey Noise', category: 'noise', tier: 'premium', assetPath: a('grey-noise') },
  // premium — nature / soundscapes
  { id: 'thunder', name: 'Thunderstorm', category: 'nature', tier: 'premium', assetPath: a('thunder') },
  { id: 'heavy-rain', name: 'Heavy Rain', category: 'nature', tier: 'premium', assetPath: a('heavy-rain') },
  { id: 'rain-on-tent', name: 'Rain on Tent', category: 'nature', tier: 'premium', assetPath: a('rain-on-tent') },
  { id: 'campfire', name: 'Campfire', category: 'nature', tier: 'premium', assetPath: a('campfire') },
  { id: 'wind', name: 'Wind', category: 'nature', tier: 'premium', assetPath: a('wind') },
  { id: 'waterfall', name: 'Waterfall', category: 'nature', tier: 'premium', assetPath: a('waterfall') },
  { id: 'crickets', name: 'Crickets', category: 'nature', tier: 'premium', assetPath: a('crickets') },
  { id: 'night-frogs', name: 'Night Frogs', category: 'nature', tier: 'premium', assetPath: a('night-frogs') },
  { id: 'birdsong', name: 'Birdsong', category: 'nature', tier: 'premium', assetPath: a('birdsong') },
  { id: 'cafe', name: 'Coffee Shop', category: 'nature', tier: 'premium', assetPath: a('cafe') },
  { id: 'train', name: 'Train', category: 'nature', tier: 'premium', assetPath: a('train') },
  { id: 'heartbeat', name: 'Heartbeat', category: 'nature', tier: 'premium', assetPath: a('heartbeat') },
  { id: 'whale', name: 'Whale Song', category: 'nature', tier: 'premium', assetPath: a('whale') },
  { id: 'wind-chimes', name: 'Wind Chimes', category: 'nature', tier: 'premium', assetPath: a('wind-chimes') },
  { id: 'snow', name: 'Snowfall', category: 'nature', tier: 'premium', assetPath: a('snow') },
  { id: 'underwater', name: 'Underwater', category: 'nature', tier: 'premium', assetPath: a('underwater') },
  { id: 'space', name: 'Deep Space', category: 'nature', tier: 'premium', assetPath: a('space') },
  { id: 'fireplace', name: 'Fireplace', category: 'nature', tier: 'premium', assetPath: a('fireplace') },
  { id: 'dryer', name: 'Clothes Dryer', category: 'nature', tier: 'premium', assetPath: a('dryer') },
  { id: 'highway', name: 'Distant Highway', category: 'nature', tier: 'premium', assetPath: a('highway') },
  { id: 'boat', name: 'Creaking Boat', category: 'nature', tier: 'premium', assetPath: a('boat') },
  { id: 'meadow', name: 'Summer Meadow', category: 'nature', tier: 'premium', assetPath: a('meadow') }
];

export function getSound(id: string): SoundDef | undefined {
  return SOUNDS.find((s) => s.id === id);
}

export function freeSounds(): SoundDef[] {
  return SOUNDS.filter((s) => s.tier === 'free');
}
