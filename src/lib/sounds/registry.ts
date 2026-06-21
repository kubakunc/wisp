import type { SoundDef, SoundCategory } from '$lib/types';
import catalogue from './sounds.json';

/**
 * Raw shape of each entry in sounds.json (the editable catalogue config).
 * `file` is the audio filename under static/sounds/ ; `premium` true = Pro tier.
 */
interface SoundConfig {
  id: string;
  name: string;
  category: SoundCategory;
  premium: boolean;
  file: string;
}

const raw = (catalogue as { sounds: SoundConfig[] }).sounds;

/** Build the typed catalogue from the JSON config (single source of truth). */
export const SOUNDS: SoundDef[] = raw.map((s) => ({
  id: s.id,
  name: s.name,
  category: s.category,
  tier: s.premium ? 'premium' : 'free',
  assetPath: `sounds/${s.file}`
}));

export function getSound(id: string): SoundDef | undefined {
  return SOUNDS.find((s) => s.id === id);
}

export function freeSounds(): SoundDef[] {
  return SOUNDS.filter((s) => s.tier === 'free');
}
