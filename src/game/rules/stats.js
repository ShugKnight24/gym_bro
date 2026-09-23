/**
 * Body rules: strength, endurance, per-muscle development and fatigue, body
 * fat and energy. Pure: every function returns new objects.
 *
 * Fatigue is what rewards varied training: a set's gains on a muscle scale by
 * how fresh that muscle is, and fatigue only drains overnight.
 */

import { GROUPS } from "../data/equipment.js";

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const r2 = (v) => Math.round(v * 100) / 100;
/** Diminishing returns: 1 at zero, 0.5 at `k`. */
const dim = (v, k) => k / (k + v);
const byGroup = (v) => Object.fromEntries(GROUPS.map((g) => [g, v]));

/** Weight tiers picked before a set: heavier = more gain, more energy, tighter timing. */
export const TIERS = [
  { name: "Light", gain: 0.7, cost: 0.75, reps: 8 },
  { name: "Working", gain: 1, cost: 1, reps: 8 },
  { name: "Heavy", gain: 1.45, cost: 1.35, reps: 6 },
];

export const MAX_ENERGY = 100;

/**
 * Progression pace. Gains per set are rate × quality × freshness ×
 * diminishing(value, half); tuned so a committed player reaches the top
 * meets and shows around days 50-60 rather than in the first two weeks.
 */
export const PACE = { strRate: 0.4, strHalf: 30, musRate: 1.1, musHalf: 45 };

export function newStats() {
  return { str: 10, end: 10, bf: 22, energy: MAX_ENERGY, mus: byGroup(4), fat: byGroup(0) };
}

/** 0-100 score: mean development, punished for weak links and for body fat. */
export function physique(s) {
  let sum = 0;
  let min = Infinity;
  for (const g of GROUPS) {
    sum += s.mus[g];
    if (s.mus[g] < min) min = s.mus[g];
  }
  const avg = sum / GROUPS.length;
  const balance = avg > 0 ? min / avg : 1;
  const def = clamp((28 - s.bf) / 20, 0, 1);
  return Math.round(avg * (0.6 + 0.4 * balance) * (0.55 + 0.45 * def) * 10) / 10;
}

/** Freshness multiplier of a muscle group: 1 rested, 0.25 fully fatigued. */
export const freshness = (fat) => 1 - (0.75 * clamp(fat, 0, 100)) / 100;

export const setCost = (eq, tier = 1) => Math.round(eq.energy * TIERS[tier].cost);
export const canTrain = (s, eq, tier = 1) => s.energy >= setCost(eq, tier);

/**
 * Apply one finished set. `quality` 0-1.25 from the timing meter, `boost`
 * from supplements. Returns { stats, gains } or null when too tired.
 */
export function trainSet(s, eq, quality, tier = 1, boost = 1) {
  if (!canTrain(s, eq, tier)) return null;
  const T = TIERS[tier];
  const q = clamp(quality, 0, 1.25) * T.gain * boost;
  const mus = { ...s.mus };
  const fat = { ...s.fat };
  const gm = {};
  let wSum = 0;
  let wFresh = 0;
  for (const g of GROUPS) {
    const w = eq.groups[g] || 0;
    if (!w) continue;
    const fr = freshness(s.fat[g]);
    wSum += w;
    wFresh += w * fr;
    const d = w * q * fr * PACE.musRate * dim(s.mus[g], PACE.musHalf);
    mus[g] = r2(Math.min(100, s.mus[g] + d));
    gm[g] = r2(d);
    fat[g] = Math.min(100, Math.round(s.fat[g] + w * eq.fatigue * T.cost));
  }
  const fr = wSum ? wFresh / wSum : 1;
  const str = eq.gains.str * q * fr * PACE.strRate * dim(s.str, PACE.strHalf);
  const end = eq.gains.end * q * fr * PACE.strRate * dim(s.end, PACE.strHalf);
  const bf = eq.gains.end * q * 0.12 + 0.02 * q;
  const cost = setCost(eq, tier);
  return {
    stats: {
      ...s, mus, fat,
      str: r2(s.str + str), end: r2(s.end + end),
      bf: r2(Math.max(6, s.bf - bf)),
      energy: s.energy - cost,
    },
    gains: { str: r2(str), end: r2(end), bf: r2(bf), energy: cost, mus: gm },
  };
}

/** Overnight recovery. `sleep` 0-1 (passing out on the floor is ~0.6), `bonus` extra fatigue shed (bed, fish oil). */
export function recover(s, sleep = 1, bonus = 0) {
  const fat = {};
  for (const g of GROUPS) fat[g] = Math.max(0, Math.round(s.fat[g] - 45 * sleep - 5 - bonus));
  return { ...s, fat, energy: Math.round(clamp(40 + 60 * sleep, 0, MAX_ENERGY)), bf: r2(clamp(s.bf + 0.05, 6, 40)) };
}

/** Eat or drink a shop item: energy up (capped), maybe a little fat. */
export function consume(s, item) {
  return { ...s, energy: Math.min(MAX_ENERGY, s.energy + item.energy), bf: r2(s.bf + (item.bf || 0)) };
}
