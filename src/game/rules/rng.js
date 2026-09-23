/**
 * Seeded randomness for rules: every roll is keyed by the save's seed plus
 * what it is for (day, event count, salt), so a reloaded save replays the
 * same results and tests can pin them.
 */

import { SeededRNG } from "../../engine/seeded-rng.js";

/** 32-bit FNV-1a style mix of integers. */
export function hash(...keys) {
  let h = 0x811c9dc5;
  for (const k of keys) {
    h ^= k | 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
  }
  return h | 0;
}

/** rng() → 0..1 for this seed and key path. */
export function rngFor(seed, ...keys) {
  const r = new SeededRNG(hash(seed, ...keys));
  return () => r.next();
}

export const newSeed = () => (Math.random() * 2 ** 31) | 0;

/** Salts, so two rolls on the same day never share a stream. */
export const SALT = { night: 1, event: 2, happening: 3, supps: 4 };
