/**
 * Rep timing meter. A cursor ping-pongs across 0..1; the sweet spot is the
 * centre. Heavier tiers speed the tempo up and narrow the windows.
 */

import { clamp } from "./stats.js";

export const PERFECT = 2;
export const GOOD = 1;
export const MISS = 0;

/** Tempo for a weight tier (0-2): cursor sweeps per second and window half-widths. */
export function tempo(tier) {
  return { speed: 0.8 + 0.3 * tier, perfect: 0.06 - 0.012 * tier, good: 0.17 - 0.03 * tier };
}

/** Cursor position 0..1 after `sweeps` (one sweep = one edge-to-edge pass). */
export function meterPos(sweeps) {
  const p = ((sweeps % 2) + 2) % 2;
  return p < 1 ? p : 2 - p;
}

export function judge(pos, t) {
  const d = Math.abs(pos - 0.5);
  return d <= t.perfect ? PERFECT : d <= t.good ? GOOD : MISS;
}

/** Set quality 0-1.25 from rep results: perfect 1, good 0.6, plus a combo bonus. */
export function setQuality(hits) {
  if (!hits.length) return 0;
  let sum = 0;
  let combo = 0;
  let best = 0;
  for (const h of hits) {
    sum += h === PERFECT ? 1 : h === GOOD ? 0.6 : 0;
    combo = h ? combo + 1 : 0;
    if (combo > best) best = combo;
  }
  return clamp(sum / hits.length + Math.min(best, 8) * 0.025 * (best === hits.length ? 1.5 : 1), 0, 1.25);
}
