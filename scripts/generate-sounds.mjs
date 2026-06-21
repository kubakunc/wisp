// Procedurally synthesizes a seamless-looping WAV for EVERY sound in the
// catalogue (src/lib/sounds/sounds.json) into static/sounds/. Mono, 44.1kHz,
// 16-bit PCM, 10s with an equal-power crossfade at the loop seam.
//
// These are royalty-free, deterministic, offline-generated ambiences — not
// field recordings. To swap in a real recording later, drop the file into
// static/sounds/ and point the catalogue's `file` at it; this generator only
// (re)writes ids whose `file` ends in `.wav`.
//
// Run: node scripts/generate-sounds.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const SR = 44100;
const SECONDS = 10;
const N = SR * SECONDS;
const FADE = Math.floor(SR * 0.08); // 80ms loop crossfade
const WARM = Math.floor(SR * 0.3); // discard 300ms so stateful filters settle

// ---- Deterministic PRNG (no Math.random — reproducible builds) -------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Noise colours ---------------------------------------------------------
const white = (rng) => () => rng() * 2 - 1;
function pink(rng) {
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
  let prev = 0;
  return () => { const w = rng() * 2 - 1; const out = w - prev; prev = w; return out * 0.5; };
}
function grey(rng) {
  let lp = 0;
  return () => { const w = rng() * 2 - 1; lp = 0.85 * lp + 0.15 * w; return w * 0.6 + lp * 0.8; };
}
const NOISE = { white, pink, brown, blue, grey };

// ---- Filters ---------------------------------------------------------------
function onePoleLP(cutoff) {
  const x = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  return (s) => (y = (1 - x) * s + x * y);
}
function onePoleHP(cutoff) {
  const lp = onePoleLP(cutoff);
  return (s) => s - lp(s);
}
// Resonant band-pass (state-variable), q ~ resonance.
function bandpass(freq, q) {
  const f = 2 * Math.sin((Math.PI * freq) / SR);
  const damp = 1 / q;
  let low = 0, band = 0;
  return (s) => {
    low += f * band;
    const high = s - low - damp * band;
    band += f * high;
    return band;
  };
}

// ---- Helpers ---------------------------------------------------------------
const TWO_PI = Math.PI * 2;
function sine(freq, phase = 0) {
  let p = phase;
  const inc = (TWO_PI * freq) / SR;
  return () => { const v = Math.sin(p); p += inc; if (p > TWO_PI) p -= TWO_PI; return v; };
}
// Slow LFO mapped to [0,1] (for amplitude swells / gusts).
function lfo01(freq, phase = 0) {
  const s = sine(freq, phase);
  return () => 0.5 + 0.5 * s();
}

// Random impulse train → triggers a callback that returns per-sample envelope.
// rate = avg events/sec, decay = seconds, makeHit returns a fresh voice fn.
function impulseRain(rng, { rate, makeVoice }) {
  const pPerSample = rate / SR;
  const voices = [];
  return () => {
    if (rng() < pPerSample) voices.push(makeVoice(rng));
    let sum = 0;
    for (let i = voices.length - 1; i >= 0; i--) {
      const r = voices[i]();
      if (r === null) voices.splice(i, 1); else sum += r;
    }
    return sum;
  };
}
// One decaying filtered-noise "tick" (a droplet / crackle / clink).
function noiseTick(rng, { decay, band, q = 6, gain = 1 }) {
  const env = Math.exp(-1 / (decay * SR));
  const bp = band ? bandpass(band * (0.7 + 0.6 * rng()), q) : null;
  let a = 1;
  const n = white(rng);
  return () => {
    a *= env;
    if (a < 0.0008) return null;
    let s = n() * a;
    if (bp) s = bp(s);
    return s * gain;
  };
}
// One decaying sine "ping" (chime / bird / drip-tone).
function sinePing(rng, { freq, decay, gain = 1, fm = 0 }) {
  const env = Math.exp(-1 / (decay * SR));
  const f = freq * (1 + fm * (rng() - 0.5));
  const osc = sine(f);
  let a = 1;
  return () => { a *= env; if (a < 0.0008) return null; return osc() * a * gain; };
}

// Periodic event scheduler (heartbeat, train clack, crickets) — period locked
// to an integer divisor of N so it loops seamlessly.
function periodic(periodSec, makeVoice, rng) {
  const period = Math.max(1, Math.round(periodSec * SR));
  const voices = [];
  let t = 0;
  return () => {
    if (t % period === 0) voices.push(makeVoice(rng, t / SR));
    t++;
    let sum = 0;
    for (let i = voices.length - 1; i >= 0; i--) {
      const r = voices[i]();
      if (r === null) voices.splice(i, 1); else sum += r;
    }
    return sum;
  };
}

// ---- Recipes: each returns a per-sample generator -------------------------
// Every recipe is a sum of layers. Output is normalised afterwards.
const RECIPES = {
  // Pure colours
  'white-noise': (rng) => white(rng),
  'pink-noise': (rng) => pink(rng),
  'brown-noise': (rng) => brown(rng),
  'blue-noise': (rng) => blue(rng),
  'grey-noise': (rng) => grey(rng),

  rain: (rng) => {
    const hiss = pink(rng); const hp = onePoleHP(900);
    const drops = impulseRain(rng, { rate: 420, makeVoice: (r) => noiseTick(r, { decay: 0.012, band: 2600, q: 4, gain: 1.6 }) });
    return () => 0.5 * hp(hiss()) + 0.6 * drops();
  },
  'heavy-rain': (rng) => {
    const hiss = pink(rng); const hp = onePoleHP(700);
    const drops = impulseRain(rng, { rate: 1100, makeVoice: (r) => noiseTick(r, { decay: 0.01, band: 2200, q: 3, gain: 1.3 }) });
    const rumble = brown(rng); const lp = onePoleLP(180);
    return () => 0.7 * hp(hiss()) + 0.5 * drops() + 0.4 * lp(rumble());
  },
  'rain-on-tent': (rng) => {
    const hiss = pink(rng); const hp = onePoleHP(1100);
    const taps = impulseRain(rng, { rate: 300, makeVoice: (r) => noiseTick(r, { decay: 0.02, band: 1500, q: 9, gain: 1.8 }) });
    return () => 0.35 * hp(hiss()) + 0.8 * taps();
  },
  ocean: (rng) => {
    const surf = brown(rng); const lp = onePoleLP(500);
    const foam = pink(rng); const hp = onePoleHP(1500);
    const swell = lfo01(0.09); const swell2 = lfo01(0.13, 1.7);
    return () => { const w = 0.4 + 0.6 * swell() * swell2(); return (1.1 * lp(surf()) + 0.25 * hp(foam()) * w) * w; };
  },
  waterfall: (rng) => {
    const roar = white(rng); const hp = onePoleHP(600); const lp = onePoleLP(7000);
    const low = brown(rng); const llp = onePoleLP(220);
    return () => 0.6 * lp(hp(roar())) + 0.5 * llp(low());
  },
  stream: (rng) => {
    const water = pink(rng); const hp = onePoleHP(1300);
    const bubbles = impulseRain(rng, { rate: 70, makeVoice: (r) => sinePing(r, { freq: 700 + r() * 1400, decay: 0.03, gain: 0.5, fm: 0.3 }) });
    return () => 0.5 * hp(water()) + 0.7 * bubbles();
  },
  underwater: (rng) => {
    const muffle = brown(rng); const lp = onePoleLP(380);
    const drone = sine(70); const dlfo = lfo01(0.07);
    const blips = impulseRain(rng, { rate: 8, makeVoice: (r) => sinePing(r, { freq: 300 + r() * 600, decay: 0.06, gain: 0.5, fm: 0.4 }) });
    return () => 0.9 * lp(muffle()) + 0.18 * drone() * dlfo() + 0.5 * blips();
  },
  fan: (rng) => {
    const air = brown(rng); const bp = bandpass(320, 1.2); const lp = onePoleLP(1400);
    const hum = sine(112); const hum2 = sine(224);
    const wobble = lfo01(7.5);
    return () => (0.9 * lp(air()) + 0.5 * bp(air())) * (0.85 + 0.15 * wobble()) + 0.05 * (hum() + 0.4 * hum2());
  },
  dryer: (rng) => {
    const motor = brown(rng); const lp = onePoleLP(900);
    const hum = sine(95);
    const tumble = periodic(1.25, (r) => noiseTick(r, { decay: 0.09, band: 240, q: 2, gain: 2.2 }), rng);
    return () => 0.7 * lp(motor()) + 0.06 * hum() + 0.6 * tumble();
  },
  highway: (rng) => {
    const roar = pink(rng); const bp = bandpass(500, 0.8); const lp = onePoleLP(2200);
    const swell = lfo01(0.05);
    const pass = impulseRain(rng, { rate: 0.4, makeVoice: (r) => {
      const dur = 1.2; const env = Math.exp(-1 / (dur * SR)); const n = pink(r); const f = onePoleHP(800); let a = 0, up = true;
      return () => { if (up) { a += 1 / (0.4 * SR); if (a >= 1) up = false; } else a *= env; if (!up && a < 0.002) return null; return f(n()) * a * 0.6; };
    } });
    return () => (0.7 * lp(bp(roar()))) * (0.7 + 0.3 * swell()) + 0.4 * pass();
  },
  thunder: (rng) => {
    const rumble = brown(rng); const lp = onePoleLP(140);
    const hiss = pink(rng); const hp = onePoleHP(800);
    const drops = impulseRain(rng, { rate: 280, makeVoice: (r) => noiseTick(r, { decay: 0.012, band: 2400, q: 4, gain: 1.2 }) });
    const cracks = periodic(3.333, (r) => {
      const dur = 1.8; const env = Math.exp(-1 / (dur * SR)); const n = white(r); const f = onePoleLP(2000); let a = 1;
      return () => { a *= env; if (a < 0.001) return null; return f(n()) * a * 2.4; };
    }, rng);
    return () => 0.6 * lp(rumble()) + 0.3 * hp(hiss()) + 0.4 * drops() + 0.7 * cracks();
  },
  campfire: (rng) => fireRecipe(rng),
  fireplace: (rng) => fireRecipe(rng, 1),
  wind: (rng) => {
    const air = pink(rng); const lp = onePoleLP(700);
    const gust = lfo01(0.08); const gust2 = lfo01(0.05, 2.1);
    const whistle = bandpass(900, 4);
    return () => { const g = 0.3 + 0.7 * gust() * gust2(); return (1.0 * lp(air()) + 0.25 * whistle(air()) * g) * g; };
  },
  snow: (rng) => {
    const soft = pink(rng); const hp = onePoleHP(1400); const lp = onePoleLP(6000);
    const breath = lfo01(0.06);
    return () => 0.32 * lp(hp(soft())) * (0.7 + 0.3 * breath());
  },
  crickets: (rng) => {
    const night = pink(rng); const lp = onePoleLP(500);
    const chirp = periodic(0.5, (r) => {
      // trill: amplitude-gated ~4.6kHz tone for ~0.25s
      const osc = sine(4600 + r() * 400); const dur = 0.25; const total = Math.round(dur * SR); let t = 0;
      return () => { if (t >= total) return null; const trill = 0.5 + 0.5 * Math.sin((TWO_PI * 28 * t) / SR); const env = Math.sin((Math.PI * t) / total); t++; return osc() * trill * env * 0.4; };
    }, rng);
    return () => 0.12 * lp(night()) + 0.7 * chirp();
  },
  'night-frogs': (rng) => {
    const night = pink(rng); const lp = onePoleLP(450);
    const croak = periodic(1.0, (r) => {
      const base = 180 + r() * 80; const osc = sine(base); const fm = sine(22); const dur = 0.3; const total = Math.round(dur * SR); let t = 0;
      return () => { if (t >= total) return null; const env = Math.sin((Math.PI * t) / total); t++; return Math.sin(TWO_PI * base * (t / SR) + 3 * fm()) * env * 0.5; };
    }, rng);
    const crick = periodic(0.625, (r) => sinePing(r, { freq: 4200, decay: 0.05, gain: 0.12 }), rng);
    return () => 0.16 * lp(night()) + 0.7 * croak() + crick();
  },
  birdsong: (rng) => {
    const amb = pink(rng); const lp = onePoleLP(2500); const hp = onePoleHP(400);
    const birds = impulseRain(rng, { rate: 1.6, makeVoice: (r) => {
      const notes = 2 + (r() * 4 | 0); let n = 0; let voice = null; let gap = 0;
      const newNote = () => sinePing(r, { freq: 2200 + r() * 2400, decay: 0.08, gain: 0.5, fm: 0.05 });
      voice = newNote();
      return () => {
        if (gap > 0) { gap--; return 0; }
        if (!voice) return null;
        const s = voice();
        if (s === null) { n++; if (n >= notes) return null; gap = Math.round(0.04 * SR); voice = newNote(); return 0; }
        return s;
      };
    } });
    return () => 0.18 * lp(hp(amb())) + 0.8 * birds();
  },
  meadow: (rng) => {
    const breeze = pink(rng); const lp = onePoleLP(800); const gust = lfo01(0.07);
    const birds = impulseRain(rng, { rate: 0.8, makeVoice: (r) => sinePing(r, { freq: 2600 + r() * 1800, decay: 0.09, gain: 0.4, fm: 0.05 }) });
    const insects = periodic(0.5, (r) => sinePing(r, { freq: 5200, decay: 0.04, gain: 0.08 }), rng);
    return () => 0.5 * lp(breeze()) * (0.6 + 0.4 * gust()) + 0.7 * birds() + insects();
  },
  forest: (rng) => {
    const windy = pink(rng); const lp = onePoleLP(650); const gust = lfo01(0.06);
    const rustle = impulseRain(rng, { rate: 60, makeVoice: (r) => noiseTick(r, { decay: 0.02, band: 3500, q: 2, gain: 0.5 }) });
    const birds = impulseRain(rng, { rate: 0.5, makeVoice: (r) => sinePing(r, { freq: 2400 + r() * 2000, decay: 0.08, gain: 0.35, fm: 0.05 }) });
    return () => 0.55 * lp(windy()) * (0.6 + 0.4 * gust()) + 0.4 * rustle() + 0.7 * birds();
  },
  cafe: (rng) => {
    const murmur = brown(rng); const lp = onePoleLP(700); const bp = bandpass(420, 0.7);
    const clinks = impulseRain(rng, { rate: 1.2, makeVoice: (r) => sinePing(r, { freq: 1800 + r() * 2600, decay: 0.12, gain: 0.35, fm: 0.1 }) });
    const swell = lfo01(0.1);
    return () => (0.8 * lp(murmur()) + 0.3 * bp(murmur())) * (0.7 + 0.3 * swell()) + 0.5 * clinks();
  },
  train: (rng) => {
    const rumble = brown(rng); const lp = onePoleLP(260);
    const hiss = pink(rng); const hp = onePoleHP(2000);
    const clack = periodic(0.5, (r) => {
      const a = noiseTick(r, { decay: 0.05, band: 180, q: 2, gain: 2.4 });
      const b = noiseTick(r, { decay: 0.05, band: 180, q: 2, gain: 1.8 }); let t = 0; const off = Math.round(0.12 * SR);
      return () => { t++; const x = a() ?? 0; const y = t > off ? (b() ?? 0) : 0; if (t > off + 0.2 * SR) return null; return x + y; };
    }, rng);
    return () => 0.7 * lp(rumble()) + 0.12 * hp(hiss()) + 0.5 * clack();
  },
  heartbeat: (rng) => {
    const beat = periodic(1.0, (r) => {
      const lub = sinePing(r, { freq: 52, decay: 0.09, gain: 1.0 });
      const dub = sinePing(r, { freq: 46, decay: 0.11, gain: 0.7 }); let t = 0; const off = Math.round(0.22 * SR); const end = Math.round(0.5 * SR);
      return () => { t++; const a = lub() ?? 0; const b = t > off ? (dub() ?? 0) : 0; if (t > end) return null; return a + b; };
    }, rng);
    const lp = onePoleLP(160);
    return () => lp(1.4 * beat());
  },
  whale: (rng) => {
    const sea = brown(rng); const lp = onePoleLP(400);
    const calls = periodic(5.0, (r) => {
      const base = 180 + r() * 140; const dur = 3.5; const total = Math.round(dur * SR); let t = 0;
      return () => { if (t >= total) return null; const k = t / total; const f = base * (1 + 0.6 * Math.sin(Math.PI * k)); const env = Math.sin(Math.PI * k); t++; return Math.sin((TWO_PI * f * t) / SR) * env * 0.5; };
    }, rng);
    return () => 0.5 * lp(sea()) + 0.8 * calls();
  },
  'wind-chimes': (rng) => {
    const breeze = pink(rng); const lp = onePoleLP(600); const gust = lfo01(0.08);
    const scale = [523.25, 587.33, 698.46, 783.99, 880.0, 1046.5];
    const chimes = impulseRain(rng, { rate: 1.8, makeVoice: (r) => {
      const f = scale[(r() * scale.length) | 0];
      const o1 = sinePing(r, { freq: f, decay: 1.6, gain: 0.5 });
      const o2 = sinePing(r, { freq: f * 2.76, decay: 1.2, gain: 0.18 });
      return () => { const a = o1(); const b = o2(); if (a === null && b === null) return null; return (a ?? 0) + (b ?? 0); };
    } });
    return () => 0.25 * lp(breeze()) * (0.5 + 0.5 * gust()) + 0.8 * chimes();
  },
  space: (rng) => {
    const drone1 = sine(55); const drone2 = sine(55.4); const drone3 = sine(82.5);
    const sweepN = pink(rng); const bp = bandpass(300, 3); const sweep = lfo01(0.03);
    const shimmer = impulseRain(rng, { rate: 0.3, makeVoice: (r) => sinePing(r, { freq: 900 + r() * 1500, decay: 1.4, gain: 0.18, fm: 0.02 }) });
    return () => 0.3 * (drone1() + drone2() + 0.5 * drone3()) + 0.25 * bp(sweepN()) * sweep() + shimmer();
  },
  boat: (rng) => {
    const lap = brown(rng); const lp = onePoleLP(360); const swell = lfo01(0.12);
    const creak = periodic(2.5, (r) => {
      const f = 120 + r() * 120; const dur = 0.8; const total = Math.round(dur * SR); let t = 0; const bp = bandpass(f, 8); const n = pink(r);
      return () => { if (t >= total) return null; const env = Math.sin((Math.PI * t) / total); t++; return bp(n()) * env * 2.0; };
    }, rng);
    return () => 0.8 * lp(lap()) * (0.5 + 0.5 * swell()) + 0.6 * creak();
  }
};

function fireRecipe(rng, seedShift = 0) {
  const roar = brown(rng); const lp = onePoleLP(420);
  const crackle = impulseRain(rng, { rate: 22 + seedShift * 6, makeVoice: (r) => noiseTick(r, { decay: 0.006, band: 2600, q: 5, gain: 2.4 }) });
  const pops = impulseRain(rng, { rate: 2.5, makeVoice: (r) => noiseTick(r, { decay: 0.03, band: 700, q: 6, gain: 2.0 }) });
  return () => 0.7 * lp(roar()) + 0.5 * crackle() + 0.6 * pops();
}

// ---- Render + WAV ----------------------------------------------------------
function render(genFactory, seed) {
  const gen = genFactory(mulberry32(seed));
  const total = WARM + N + FADE;
  const raw = new Float32Array(total);
  for (let i = 0; i < total; i++) raw[i] = gen();
  // DC blocker (removes drift from brown/integrator layers).
  const hp = onePoleHP(12);
  for (let i = 0; i < total; i++) raw[i] = hp(raw[i]);
  const buf = raw.subarray(WARM); // length N + FADE, filters settled
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = buf[i];
  for (let k = 0; k < FADE; k++) {
    const t = k / FADE;
    const a = Math.cos((t * Math.PI) / 2);
    const b = Math.sin((t * Math.PI) / 2);
    out[N - FADE + k] = buf[N - FADE + k] * a + buf[k] * b;
  }
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

// ---- Drive from the catalogue ----------------------------------------------
const catalogue = JSON.parse(readFileSync('src/lib/sounds/sounds.json', 'utf8')).sounds;
mkdirSync('static/sounds', { recursive: true });

let seed = 1;
let written = 0;
const missing = [];
for (const s of catalogue) {
  seed++;
  if (!s.file.endsWith('.wav')) continue; // only generate .wav targets
  const recipe = RECIPES[s.id];
  if (!recipe) { missing.push(s.id); continue; }
  const wav = toWav(render(recipe, seed));
  writeFileSync(`static/sounds/${s.file}`, wav);
  written++;
  console.log(`wrote static/sounds/${s.file} (${(wav.length / 1024).toFixed(0)} KB)`);
}
if (missing.length) {
  console.error(`\nNO RECIPE for: ${missing.join(', ')} — add one to RECIPES.`);
  process.exit(1);
}
console.log(`\ndone — ${written} sounds`);
