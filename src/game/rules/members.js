/**
 * Gym membership: how appealing the gym is, how many members it can hold and
 * how the roster drifts toward that each night.
 */

import { clamp } from "./stats.js";

/** Appeal from equipment (duplicates count less), variety, cleanliness and reputation. */
export function appeal(placed, clean, rep, catalog) {
  const counts = {};
  for (const p of placed) counts[p.type] = (counts[p.type] || 0) + 1;
  let a = 0;
  let distinct = 0;
  for (const type in counts) {
    const e = catalog[type];
    if (!e) continue;
    distinct++;
    a += e.appeal * (1 + 0.35 * (counts[type] - 1));
  }
  a += 4 * distinct;
  a *= 0.6 + (0.4 * clamp(clean, 0, 100)) / 100;
  a += rep * 0.4;
  return Math.round(a);
}

export const capacity = (placed) => placed.length * 4;
export const targetMembers = (app, cap) => Math.min(cap, Math.floor(app / 5));

/** Overnight roster change: at most 3 join and 2 quit per day. */
export const memberDelta = (members, target) => clamp(target - members, -2, 3);

/** Members make a mess; 1.5 points per member per day. */
export const cleanAfterDay = (clean, members) => clamp(Math.round(clean - members * 1.5), 0, 100);
