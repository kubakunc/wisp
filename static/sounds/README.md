# Wisp audio files

Drop each sound's audio file here. The catalogue lives in
`src/lib/sounds/sounds.json` — the `file` field of each entry is the filename
expected in THIS folder, and `premium` controls Pro vs free.

After adding/replacing files: `npm run build && npx cap sync android`.

## Generated (do not hand-edit — run `node scripts/generate-noise.mjs`)
- white-noise.wav, pink-noise.wav, brown-noise.wav, blue-noise.wav, grey-noise.wav

## You provide (royalty-free, seamless loops, 128–192 kbps mp3)
rain.mp3, ocean.mp3, fan.mp3, forest.mp3, stream.mp3, thunder.mp3,
heavy-rain.mp3, rain-on-tent.mp3, campfire.mp3, wind.mp3, waterfall.mp3,
crickets.mp3, night-frogs.mp3, birdsong.mp3, cafe.mp3, train.mp3,
heartbeat.mp3, whale.mp3, wind-chimes.mp3, snow.mp3, underwater.mp3,
space.mp3, fireplace.mp3, dryer.mp3, highway.mp3, boat.mp3, meadow.mp3

A sound whose file is missing simply won't play (its toggle won't engage);
the rest of the app is unaffected.
