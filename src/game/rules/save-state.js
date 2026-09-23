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
import { GOALS, LOOK_COUNT, newMember } from "./roster.js";
import { rngFor, SALT } from "./rng.js";

export const SAVE_VERSION = 3;

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
  s.today.chats = s.today.chats.filter((id) => Number.isInteger(id));
  s.today.used = [...new Set(s.today.used.filter((t) => typeof t === "string" && EQUIPMENT[t]))];
  s.stats.tan = clamp(Math.floor(s.stats.tan), 0, 14);
  s.stats.posing = clamp(s.stats.posing, 0, 1);
  s.tips = [...new Set(s.tips.filter((id) => typeof id === "string"))];
  normalizeRoster(s, raw);
  return s;
}

/** Valid, unique members, as many as the member count (older saves had only a count). */
function normalizeRoster(s, raw) {
  const ids = new Set();
  s.roster = (Array.isArray(raw.roster) ? raw.roster : []).filter((m) => {
    if (!isObj(m) || !Number.isInteger(m.id) || ids.has(m.id) || typeof m.name !== "string" || !GOALS[m.goal] || !EQUIPMENT[m.fav]) return false;
    ids.add(m.id);
    return true;
  }).map((m) => ({
    id: m.id, name: m.name.slice(0, 24), look: clamp(Math.floor(num(m.look, 0)), 0, LOOK_COUNT - 1), goal: m.goal, fav: m.fav,
    since: Math.max(1, Math.floor(num(m.since, 1))), mood: clamp(num(m.mood, 65), 0, 100),
  }));
  let next = Math.max(num(raw.nextId, 1), ...s.roster.map((m) => m.id + 1), 1);
  if (s.roster.length > s.members) s.roster = s.roster.slice(0, s.members);
  const rng = rngFor(s.seed, s.day, SALT.roster, 99);
  while (s.roster.length < s.members) s.roster.push(newMember(next++, s.day, rng));
  s.nextId = next;
}

/** Save-slot migration hook: every version goes through normalisation. */
export const migrateSave = (data) => (isObj(data) ? { ...data, state: normalizeState(data.state), v: SAVE_VERSION } : null);
