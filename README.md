# Gym Bro

A first-person gym builder and life sim in the browser. Train to build a better
physique, grow into an athlete or a physique competitor, buy equipment and fill
your gym with paying members. Rendered by a grid raycaster with inked comic
vector art (runtime SVG rasterised to bitmaps), plus an optional Modern style
(same sprites, no ink, graded materials, filmic grade), matching Clockwork
Carnage.

## Run

```sh
npm install
npm run dev      # http://localhost:3100
npm test         # vitest: tests/unit/**/*.test.js
npm run test:e2e # Playwright smoke + business flows (starts or reuses the dev server)
npm run build    # production build into dist/
```

Headless checks against a running dev server:

```sh
node scripts/shot.mjs http://localhost:3100/ shots/title.png 2000
node scripts/drive.mjs path/to/scenario.mjs   # scenario gets (page, { shot, wait, game })
```

`window.__game` is the game object (`newGame()`, `train(type, tier)`, `rep()`,
`openBuild()`, `applyBuild(action)`, `enterEvent(id)`, `sleep()`, `openGym()`,
`openShop()`, `openSettings()`, `toggleStyle()`, `teleport(x, y, angle)`,
`setState(patch)`, …).

## Controls

| Key | Action |
| --- | --- |
| Click the view | lock the mouse for mouse look |
| WASD, Shift | move, jog |
| Mouse / ← → | look / turn |
| E | use: train on equipment, clean at the desk, open the vending shop, sleep at the HOME door |
| F | repair a worn machine; quick-buy a shake at the vending machine |
| 1 2 3 | pick the weight before a set |
| Space / click | hit the rep when the cursor is in the gold zone |
| Tab | build mode (LMB place, RMB sell, R or wheel rotate, 1-9 pick, Q next page) |
| C | careers (enter shows, meets and awards; run the supplement line) |
| G | gym office: dues, satisfaction, repairs, upgrades |
| P | physique and fatigue |
| Esc | pause: gym office, settings, style toggle, save |

Keys can be rebound in Settings. Gamepads (standard mapping) work too: left
stick move, right stick look, A use/rep, X alt, Y careers, LB build, Back
physique, Start pause, d-pad picks weights and catalog items. Touch devices
get an on-screen stick and buttons.

## How it plays

- A day runs 07:00 to midnight (2 game minutes per second). A set costs energy
  and 15 minutes; sleeping at the HOME door collects member dues, recovers
  energy and muscle fatigue, and autosaves. Staying up past midnight means
  passing out with poor recovery.
- Every set works muscle groups (chest, back, legs, arms, core). Fatigue on a
  group cuts its gains until it recovers overnight, so varied training wins.
  Physique is mean development, punished for weak links and body fat.
- Heavier weights gain more but cost more energy and tighten the timing.
- Members come in based on gym appeal (equipment variety, cleanliness,
  reputation) and your daily dues against the fair price, work out on your
  machines and pay every night. Satisfaction (crowding, dirt, broken
  machines, price) decides who quits; the nightly summary says why.
- Amenities (locker room, sauna, steam room, cold plunge, tanning bed,
  recovery station, posing room) are built like machines. They add appeal,
  satisfaction and the dues members will accept but no capacity, and cost
  daily upkeep. Each one can be used once a day (E) for faster muscle
  recovery, energy, a stage tan or posing practice; tan and posing skill
  raise physique-show scores. Past ten members, people expect a locker room.
- Every night pays rent (per machine), staff and ads. Machines wear with use
  and break at 100%: repair them with F or in the gym office.
- About one night in three brings a happening: an influencer visit, an
  inspection, a breakdown, a viral clip, a sponsor, a heatwave, a rival gym.
- Careers: Athlete (three powerlifting meets up to the National Strength
  Open), Competitor (four physique shows up to the Pro Invitational), Gym
  Owner (hire a cleaner, open the east annex, Gym of the Year awards) and
  Supplement Co. (unlocks at $5000: launch products with perks, buy ads,
  nightly sales). Ranks are sticky; topping a ladder shows a Legend finale.
- Settings: music/effects volume, easier rep timing, reduced motion.
- The west wall is a mirror: stand still facing it and your reflection flexes.

## Layout

```
index.html, style.css      page shell and DOM screens (Comic/Modern via <html data-art-style>)
src/main.js                entry: create the game, start the loop, expose window.__game
src/engine/                generic engine, vendored from Clockwork Carnage (no game logic)
  raycaster.js             DDA walls, floor/ceiling casting, baked fog, mirrors, ink edges, clipped SVG billboards
  raster.js, sprite.js     SVG → bitmap cache and layered sprite blitter
  ink-kit.js, prop-kit.js  inked figure primitives and the 3/4 prop projection
  input.js, touch-controls.js  actions from keys, mouse, gamepad and touch; rebinding
  audio.js                 procedural Web Audio SFX and adaptive music
  loop.js, save.js, art-style.js, …
src/game/game.js           orchestrator: modes, interaction, applying rules to state
src/game/train.js          training and competition minigame, first-person viewmodel
src/game/rules/            pure, unit-tested rules: stats, timing, members, day, compete, build,
                           economy, supplements, happenings, save-state (normalise/migrate), rng
src/game/persist.js        save slot and settings storage
src/game/data/             equipment catalog and shop, competitions and career ladders
src/game/art/              SVG builders: props, equipment, figures (members, portrait), viewmodel arms
src/game/world/            map, procedural textures, player, members, sprite scene
src/game/ui/               canvas UI kit, HUD, callouts, build mode, DOM overlays
tests/unit/                vitest suites for the rules
tests/e2e/                 Playwright flows against the dev server
scripts/                   headless screenshot and scenario drivers
```
