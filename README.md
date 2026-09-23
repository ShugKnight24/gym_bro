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
npm run build    # production build into dist/
```

Headless checks against a running dev server:

```sh
node scripts/shot.mjs http://localhost:3100/ shots/title.png 2000
node scripts/drive.mjs path/to/scenario.mjs   # scenario gets (page, { shot, wait, game })
```

`window.__game` is the game object (`newGame()`, `train(type, tier)`, `rep()`,
`openBuild()`, `applyBuild(action)`, `enterEvent(id)`, `sleep()`,
`toggleStyle()`, `teleport(x, y, angle)`, `setState(patch)`, …).

## Controls

| Key | Action |
| --- | --- |
| Click the view | lock the mouse for mouse look |
| WASD, Shift | move, jog |
| Mouse / ← → | look / turn |
| E | use: train on equipment, clean at the desk, buy a shake, sleep at the HOME door |
| F | buy an energy bar at the vending machine |
| 1 2 3 | pick the weight before a set |
| Space / click | hit the rep when the cursor is in the gold zone |
| Tab | build mode (LMB place, RMB sell, R or wheel rotate) |
| C | careers (enter shows and meets) |
| P | physique and fatigue |
| Esc | pause: style toggle, save, controls |

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
  reputation), work out on your machines and pay dues every night.
- Careers: Athlete (strength/endurance ranks, powerlifting meets), Competitor
  (physique shows with a posing round), Gym Owner (member milestones),
  Supplement Co. (locked until $5000; product line stub).
- The west wall is a mirror: stand still facing it and your reflection flexes.

## Layout

```
index.html, style.css      page shell and DOM screens (Comic/Modern via <html data-art-style>)
src/main.js                entry: create the game, start the loop, expose window.__game
src/engine/                generic engine, vendored from Clockwork Carnage (no game logic)
  raycaster.js             DDA walls, floor/ceiling casting, baked fog, mirrors, ink edges, clipped SVG billboards
  raster.js, sprite.js     SVG → bitmap cache and layered sprite blitter
  ink-kit.js, prop-kit.js  inked figure primitives and the 3/4 prop projection
  loop.js, input.js, save.js, art-style.js, …
src/game/game.js           orchestrator: modes, interaction, applying rules to state
src/game/train.js          training and competition minigame, first-person viewmodel
src/game/rules/            pure, unit-tested rules: stats, timing, members, day, compete, build
src/game/data/             equipment catalog and shop, competitions and career ladders
src/game/art/              SVG builders: props, equipment, figures (members, portrait), viewmodel arms
src/game/world/            map, procedural textures, player, members, sprite scene
src/game/ui/               canvas UI kit, HUD, callouts, build mode, DOM overlays
tests/unit/                vitest suites for the rules
scripts/                   headless screenshot and scenario drivers
```
