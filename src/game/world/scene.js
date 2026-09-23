/**
 * The raycaster's sprite list: static props, placed equipment, the member
 * pool and reflected twins of everything near the mirror wall, plus the
 * player's own reflection. Records are allocated once; per frame only their
 * fields change.
 */

import { WORLD_SPRITES, EQUIP_DEFS, realisticWorld } from "../art/equipment.js";
import { figureSprite, MEMBER_LOOKS, lookMuscle, PLAYER_LOOK, buildFromStats } from "../art/figures.js";
import { EQUIPMENT } from "../data/equipment.js";
import { PROPS, MIRROR_X } from "./map.js";
import { MAX_VISIBLE } from "./members.js";

const MAX = 128;
/** Only things this close to the mirror are worth a reflected twin. */
const MIRROR_REACH = 9;

export const worldSet = (modern) => (modern ? realisticWorld() : { sprites: WORLD_SPRITES, defs: EQUIP_DEFS });

const POSE_IDX = { idle: 0, walkA: 1, walkB: 2, liftA: 3, liftB: 4, flex: 5 };
const memberCache = [[], []];
/** Member sprite by look and pose, built on first use (array-indexed: no per-frame keys). */
export function memberSprite(look, pose, modern) {
  const arr = memberCache[modern ? 1 : 0];
  const i = look * 8 + POSE_IDX[pose];
  let s = arr[i];
  if (!s) {
    const L = MEMBER_LOOKS[look];
    const { m, bf } = lookMuscle(L);
    arr[i] = s = figureSprite(L, m, bf, pose, modern);
    s._key = `mem${look}_${pose}`;
  }
  return s;
}

const playerCache = new Map();
/** The player's body, quantised so it re-rasterises only when the build visibly changes. */
export function playerSprite(stats, pose, modern) {
  const { m, bf } = buildFromStats(stats);
  const q = (v) => Math.round(v * 10);
  const k = `${q(m.chest)}${q(m.back)}${q(m.legs)}${q(m.arms)}${q(m.core)}_${q(bf)}_${pose}`;
  const full = `${k}|${modern ? 1 : 0}`;
  let s = playerCache.get(full);
  if (!s) {
    if (playerCache.size > 24) playerCache.delete(playerCache.keys().next().value);
    const qm = {};
    for (const g in m) qm[g] = q(m[g]) / 10;
    playerCache.set(full, (s = figureSprite(PLAYER_LOOK, qm, q(bf) / 10, pose, modern)));
    s._key = `pl_${k}`;
  }
  return s;
}

const rec = () => ({ x: 0, y: 0, z: 0, scale: 1, sprite: null, key: "", defs: "", flip: false, alpha: 1, mirror: false, hidden: false, phase: 0 });

export function createScene() {
  return { recs: Array.from({ length: MAX }, rec), n: 0, members: 0, player: 0 };
}

function put(sc, x, y, sprite, key, defs, mirror) {
  const r = sc.recs[sc.n++];
  r.x = mirror ? 2 * MIRROR_X - x : x;
  r.y = y;
  r.sprite = sprite;
  r.key = key;
  r.defs = defs;
  r.mirror = mirror;
  r.flip = mirror;
  r.hidden = false;
  r.phase = (x * 7.3 + y * 3.1) % 6;
  return r;
}

/** Rebuild the static part of the list (on load, style change or a build edit). */
export function rebuildScene(sc, placed, modern) {
  const set = worldSet(modern);
  sc.n = 0;
  for (const p of PROPS) {
    put(sc, p.x, p.y, set.sprites[p.sprite], p.sprite, set.defs, false);
    if (p.x < MIRROR_REACH) put(sc, p.x, p.y, set.sprites[p.sprite], p.sprite, set.defs, true);
  }
  for (const p of placed) {
    const key = EQUIPMENT[p.type].sprite;
    put(sc, p.x + 0.5, p.y + 0.5, set.sprites[key], key, set.defs, false);
    if (p.x < MIRROR_REACH) put(sc, p.x + 0.5, p.y + 0.5, set.sprites[key], key, set.defs, true);
  }
  sc.members = sc.n;
  for (let i = 0; i < MAX_VISIBLE * 2; i++) put(sc, 0, 0, null, "", "", i >= MAX_VISIBLE).hidden = true;
  sc.player = sc.n;
  put(sc, 0, 0, null, "", "", true);
}

/**
 * Per-frame: member poses and positions, the player's reflection (`body`
 * from playerSprite; `hideSelf` drops it, e.g. during a set).
 */
export function updateScene(sc, crowd, player, body, modern, hideSelf = false) {
  for (let i = 0; i < MAX_VISIBLE; i++) {
    const ag = crowd.agents[i];
    for (let k = 0; k < 2; k++) {
      const r = sc.recs[sc.members + i + k * MAX_VISIBLE];
      r.hidden = !ag.on;
      if (!ag.on) continue;
      const s = memberSprite(ag.look, ag.pose, modern);
      r.sprite = s;
      r.key = s._key;
      r.defs = s.defs;
      r.x = k ? 2 * MIRROR_X - ag.x : ag.x;
      r.y = ag.y;
      r.flip = k === 1;
    }
  }
  const r = sc.recs[sc.player];
  r.hidden = !body || hideSelf;
  if (!body) return;
  r.sprite = body;
  r.key = body._key;
  r.defs = body.defs;
  r.x = 2 * MIRROR_X - player.x;
  r.y = player.y;
}
