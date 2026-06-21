# Wisp audio files

The catalogue lives in `src/lib/sounds/sounds.json` — the `file` field of each
entry is the filename expected in THIS folder, and `premium` controls Pro vs free.

After adding/replacing files: `npm run build && npx cap sync android`.

## Generated (do not hand-edit — run `node scripts/generate-sounds.mjs`)

Every catalogue sound is procedurally synthesized into a seamless-looping,
44.1 kHz / 16-bit mono **WAV** (~10 s) by `scripts/generate-sounds.mjs`. The
generator reads `sounds.json` and (re)writes one `.wav` per entry, so the set
here always matches the catalogue. These are royalty-free, deterministic,
offline-generated ambiences — not field recordings.

## Swapping in a real recording

To replace a synthesized sound with a real loop, drop the file in this folder
and point that catalogue entry's `file` at it. The generator only (re)writes
entries whose `file` ends in `.wav`, so an entry pointing at e.g. `rain.mp3`
is left untouched. Real recordings should be CC0/royalty-free, loudness-
normalized (~−14 LUFS), and loop-verified (seamless tail→head crossfade).
