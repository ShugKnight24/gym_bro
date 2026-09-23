/**
 * Amenities: the rooms that are not trained on. The player can use each kind
 * once a day (recovery, energy, a tan, posing practice); for members they add
 * satisfaction, and a big gym without a locker room loses some. Pure.
 */

import { GROUPS } from "../data/equipment.js";
import { clamp, MAX_ENERGY } from "./stats.js";
import { isBroken } from "./members.js";

export const isAmenity = (eq) => eq?.kind === "amenity";

/** Members start asking for a locker room at this roster size. */
export const LOCKER_ROOM_AT = 10;

/** Can the player use the amenity at `index` now? { ok, reason }. */
export function amenityStatus(g, index, catalog) {
  const p = g.gym.placed[index];
  const eq = catalog[p.type];
  if (isBroken(p)) return { ok: false, reason: "Out of order" };
  if (g.today.used.includes(p.type)) return { ok: false, reason: "Already used today" };
  const cost = -(eq.use.energy || 0);
  if (cost > 0 && g.stats.energy < cost) return { ok: false, reason: "Too tired" };
  return { ok: true, reason: "" };
}

/**
 * Use it: time passes, energy and fatigue change, maybe a tan. Returns
 * { state, gains: { energy, recovered, tan } }. Posing practice only marks
 * the day and passes time here; its effect comes from the minigame (see practise()).
 */
export function useAmenity(g, index, catalog) {
  const type = g.gym.placed[index].type;
  const u = catalog[type].use;
  const fat = { ...g.stats.fat };
  let recovered = 0;
  if (u.recover) {
    for (const k of GROUPS) {
      // Recovery tools target sore muscles; heat and cold ease everything.
      const amt = u.worked ? (fat[k] >= 30 ? u.recover * 1.6 : u.recover * 0.4) : u.recover;
      const next = Math.max(0, Math.round(fat[k] - amt));
      recovered += fat[k] - next;
      fat[k] = next;
    }
  }
  const energy = clamp(g.stats.energy + (u.energy || 0), 0, MAX_ENERGY);
  const tan = u.tan ? Math.max(g.stats.tan || 0, u.tan) : g.stats.tan || 0;
  return {
    state: {
      ...g,
      time: g.time + u.minutes,
      stats: { ...g.stats, fat, energy, tan },
      today: { ...g.today, used: [...g.today.used, type] },
    },
    gains: { energy: energy - g.stats.energy, recovered, tan: u.tan || 0 },
  };
}

/** A posing practice round: skill rises with execution, with diminishing returns. */
export const practise = (stats, quality) => ({
  ...stats,
  posing: Math.round(clamp((stats.posing || 0) + 0.06 * clamp(quality, 0, 1.25) * (1 - (stats.posing || 0)), 0, 1) * 1000) / 1000,
});

/** Show-day multiplier: stage colour from a tan, and posing skill. */
export const showBonus = (stats) => 1 + ((stats.tan || 0) > 0 ? 0.04 : 0) + 0.1 * (stats.posing || 0);

/** Working amenity types in the gym. */
export const amenityTypes = (placed, catalog) => new Set(placed.filter((p) => isAmenity(catalog[p.type]) && !isBroken(p)).map((p) => p.type));

/**
 * What the amenities do for members: satisfaction and fair-dues bonuses, and a
 * complaint when a big gym has no locker room. { sat, fair, reason }.
 */
export function amenityEffect(placed, members, catalog) {
  const have = amenityTypes(placed, catalog);
  const noLockers = members >= LOCKER_ROOM_AT && !have.has("locker_room");
  return {
    sat: Math.min(10, have.size * 2) - (noLockers ? 8 : 0),
    fair: have.size * 1.5,
    reason: noLockers ? "Members want a locker room with showers" : "",
  };
}

/** Nightly upkeep of placed amenities. */
export const amenityUpkeep = (placed, catalog) => placed.reduce((n, p) => n + (catalog[p.type]?.upkeep || 0), 0);

/** Members pay per tanning session: about a quarter of the roster, $4 each, per working bed. */
export const tanningFees = (placed, members, catalog) =>
  placed.some((p) => p.type === "tanning_bed" && !isBroken(p) && isAmenity(catalog[p.type])) ? Math.round(members * 0.25) * 4 : 0;
