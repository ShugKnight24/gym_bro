/**
 * Gym membership: how appealing the gym is, how many members it can hold,
 * what they will pay, how happy they are and how the roster moves each night.
 */

import { clamp } from "./stats.js";

/** A machine at 100% wear is broken: no appeal, no capacity, no training. */
export const BROKEN = 100;
export const isBroken = (p) => (p.wear || 0) >= BROKEN;

/** Appeal from working equipment (duplicates and worn machines count less), variety, cleanliness and reputation. */
export function appeal(placed, clean, rep, catalog) {
  const counts = {};
  const cond = {};
  for (const p of placed) {
    if (isBroken(p)) continue;
    counts[p.type] = (counts[p.type] || 0) + 1;
    cond[p.type] = (cond[p.type] || 0) + (1 - (0.3 * (p.wear || 0)) / BROKEN);
  }
  let a = 0;
  let distinct = 0;
  for (const type in counts) {
    const e = catalog[type];
    if (!e) continue;
    distinct++;
    a += e.appeal * (1 + 0.35 * (counts[type] - 1)) * (cond[type] / counts[type]);
  }
  a += 4 * distinct;
  a *= 0.6 + (0.4 * clamp(clean, 0, 100)) / 100;
  a += rep * 0.4;
  return Math.round(a);
}

export const working = (placed) => placed.filter((p) => !isBroken(p));
/** Four members per working machine; amenities (given the catalog) add none. */
export const capacity = (placed, catalog) => working(placed).filter((p) => catalog?.[p.type]?.kind !== "amenity").length * 4;
export const targetMembers = (app, cap, demand = 1) => Math.min(cap, Math.floor((app / 5) * demand));

/** Overnight roster change: at most 3 join and 2 quit per day. */
export const memberDelta = (members, target) => clamp(target - members, -2, 3);

/** Members make a mess; 1.5 points per member per day. */
export const cleanAfterDay = (clean, members) => clamp(Math.round(clean - members * 1.5), 0, 100);

/** Daily dues the market accepts: better-known, better-kitted gyms charge more. */
export const fairDues = (app, rep) => Math.round(8 + app * 0.12 + rep * 0.08);
/** Join-demand multiplier from price against the fair rate: cheap draws crowds, pricey scares them. */
export const priceDemand = (dues, fair) => clamp(1 + (fair - dues) / fair, 0.25, 1.6);
export const DUES_MIN = 4;
export const DUES_MAX = 60;

/**
 * Member satisfaction 0-100 from crowding, cleanliness, broken machines,
 * price against the fair rate and equipment variety.
 */
export function satisfaction({ members, cap, clean, broken, dues, fair, distinct, unmet = 0, desk = false }) {
  const crowd = cap ? members / cap : members ? 2 : 0;
  let s = 66;
  s -= Math.max(0, crowd - 0.75) * 120;
  s += (clean - 60) * 0.4;
  s -= broken * 8;
  s += clamp((fair - dues) * 1.5, -30, 12);
  s += Math.min(distinct, 8) * 2 - 6;
  // Members whose favourite machine is missing or broken drag the mood down.
  s -= unmet * 14;
  if (desk) s += 4;
  return clamp(Math.round(s), 0, 100);
}

/** Why members feel the way they do, worst first. */
export function satisfactionReasons({ members, cap, clean, broken, dues, fair, unmet = 0, wanted = "" }, sat) {
  const r = [];
  if (unmet >= 0.25 && wanted) r.push(`Members keep asking for a ${wanted}`);
  if (cap && members / cap > 0.9) r.push("Too crowded: add equipment");
  if (broken) r.push(`${broken} broken machine${broken > 1 ? "s" : ""}: repair at the machine (F)`);
  if (clean < 50) r.push("The gym is dirty: clean at the desk");
  if (dues > fair * 1.2) r.push(`Dues feel steep (fair is ~$${fair})`);
  if (sat >= 80) r.push("Members love it: word of mouth is bringing friends");
  return r;
}

/**
 * Overnight roster: unhappy members quit, new ones join toward the target,
 * happy gyms grow a little faster. Returns { join, quit }.
 */
export function rosterChange(members, target, sat, extraJoins = 0) {
  const unhappy = Math.min(members, Math.max(0, Math.round((members * (55 - sat)) / 150)));
  const left = members - unhappy;
  const room = target - left;
  const join = room > 0 ? Math.min(room, (sat >= 80 ? 4 : 3) + extraJoins) : 0;
  const trim = room < 0 ? Math.min(-room, 2) : 0;
  return { join, quit: unhappy + trim };
}
