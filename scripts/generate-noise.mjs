// Generates seamless-looping noise-colour WAV files into static/sounds/.
// White/Pink/Brown/Blue/Grey. Mono, 44.1kHz, 16-bit PCM, ~8s with an
// equal-power crossfade at the loop seam so they loop without a click.
// Run: node scripts/generate-noise.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 44100;
const SECONDS = 8;
const N = SR * SECONDS;
const FADE = Math.floor(SR * 0.05); // 50ms loop crossfade

// Deterministic PRNG (no Math.random — reproducible builds).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const white = (rng) => () => rng() * 2 - 1;

function pink(rng) {
  // Paul Kellet's refined pink-noise filter.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out * 0.11;
  };
}
function brown(rng) {
  let last = 0;
  return () => {
    const w = rng() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    return last * 3.5;
  };
}
function blue(rng) {
  // Differentiated white (rising spectrum).
  let prev = 0;
  return () => {
    const w = rng() * 2 - 1;
    const out = w - prev;
    prev = w;
    return out * 0.5;
  };
}
function grey(rng) {
  // Approximate perceptual-flat: gentle band tilt of white.
  let lp = 0;
  return () => {
    const w = rng() * 2 - 1;
    lp = 0.85 * lp + 0.15 * w;
    return (w * 0.6 + lp * 0.8);
  };
}

function render(genFactory, seed) {
  const gen = genFactory(mulberry32(seed));
  const buf = new Float32Array(N + FADE);
  for (let i = 0; i < N + FADE; i++) buf[i] = gen();
  // Equal-power crossfade: blend the tail (last FADE of the N-region) with the
  // FADE samples that follow N, so sample N connects smoothly back to sample 0.
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = buf[i];
  for (let k = 0; k < FADE; k++) {
    const t = k / FADE;
    const a = Math.cos((t * Math.PI) / 2);
    const b = Math.sin((t * Math.PI) / 2);
    out[N - FADE + k] = buf[N - FADE + k] * a + buf[k] * b;
  }
  // Normalise to -3 dBFS.
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.708 / peak : 1;
  for (let i = 0; i < N; i++) out[i] *= gain;
  return out;
}

function toWav(samples) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s < 0 ? s * 0x8000 : s * 0x7fff) | 0, 44 + i * 2);
  }
  return buf;
}

const SOUNDS = [
  ['white-noise', white, 1],
  ['pink-noise', pink, 2],
  ['brown-noise', brown, 3],
  ['blue-noise', blue, 4],
  ['grey-noise', grey, 5]
];

mkdirSync('static/sounds', { recursive: true });
for (const [name, gen, seed] of SOUNDS) {
  const wav = toWav(render(gen, seed));
  writeFileSync(`static/sounds/${name}.wav`, wav);
  console.log(`wrote static/sounds/${name}.wav (${(wav.length / 1024).toFixed(0)} KB)`);
}
console.log('done');
