/**
 * Loading saves safely. A save is merged field by field onto a fresh game,
 * so old saves pick up new fields, and anything missing, mistyped or out of
 * range falls back to the default instead of crashing the game later. Pure.
 */

import { newGame } from "./day.js";
import { EQUIPMENT } from "../data/equipment.js";
import { EVENTS, CAREERS } from "../data/events.js";
import { PRODUCTS } from "./supplements.js";
import { UPGRADES } from "./economy.js";
import { BROKEN, DUES_MIN, DUES_MAX } from "./members.js";
import { clamp } from "./stats.js";

export const SAVE_VERSION = 2;

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v, d, lo = -Infinity, hi = Infinity) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : d);

/** Merge `raw` onto `def`: same-typed leaves win, objects recurse, arrays are validated by the caller. */
function merge(def, raw) {
  if (!isObj(raw)) return def;
  const out = {};
  for (const k in def) {
    const d = def[k];
    const r = raw[k];
    if (isObj(d)) out[k] = merge(d, r);
    else if (Array.isArray(d)) out[k] = Array.isArray(r) ? r : d;
    else if (typeof d === "number") out[k] = num(r, d);
    else out[k] = typeof r === typeof d ? r : d;
  }
  return out;
}

/** Keep only { key: number } entries whose key is in `valid`. */
function numMap(raw, valid) {
  const out = {};
  if (isObj(raw)) for (const k in raw) if (k in valid && typeof raw[k] === "number" && Number.isFinite(raw[k])) out[k] = raw[k];
  return out;
}

/** A playable state from anything a save slot might hold, or null if it is not a save at all. */
export function normalizeState(raw) {
  if (!isObj(raw)) return null;
  const def = newGame(typeof raw.seed === "number" ? raw.seed | 0 : undefined);
  const s = merge(def, raw);
  s.day = Math.max(1, Math.floor(s.day));
  s.members = Math.max(0, Math.floor(s.members));
  s.rep = Math.max(0, s.rep);
  s.sat = clamp(s.sat, 0, 100);
  s.dues = clamp(Math.round(s.dues), DUES_MIN, DUES_MAX);
  s.stats.energy = clamp(s.stats.energy, 0, 100);
  s.gym.clean = clamp(s.gym.clean, 0, 100);
  const seen = new Set();
  s.gym.placed = s.gym.placed.filter((p) => {
    if (!isObj(p) || !EQUIPMENT[p.type] || !Number.isInteger(p.x) || !Number.isInteger(p.y)) return false;
    const k = `${p.x},${p.y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map((p) => ({ type: p.type, x: p.x, y: p.y, rot: Number.isInteger(p.rot) ? p.rot & 3 : 0, wear: num(p.wear, 0, 0, BROKEN) }));
  s.gym.upgrades = Object.fromEntries(Object.keys(UPGRADES).filter((k) => raw.gym?.upgrades?.[k] === true).map((k) => [k, true]));
  s.career.results = s.career.results.filter((r) => isObj(r) && EVENTS[r.id] && Number.isFinite(r.place)).slice(-20);
  s.career.last = numMap(raw.career?.last, EVENTS);
  s.career.best = Object.fromEntries(Object.entries(numMap(raw.career?.best, CAREERS))
    .map(([id, r]) => [id, clamp(Math.floor(r), 0, CAREERS[id].ranks.length - 1)]));
  s.career.legends = s.career.legends.filter((id) => typeof id === "string" && CAREERS[id]);
  s.supps.launched = [...new Set(s.supps.launched.filter((id) => PRODUCTS[id]))];
  s.supps.ads = clamp(Math.floor(s.supps.ads), 0, 3);
  return s;
}

/** Save-slot migration hook: every version goes through normalisation. */
export const migrateSave = (data) => (isObj(data) ? { ...data, state: normalizeState(data.state), v: SAVE_VERSION } : null);
