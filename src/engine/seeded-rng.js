/**
 * Seeded pseudo-random number generator (Mulberry32).
 *
 * Deterministic: given the same seed, produces the same sequence.
 * Game rules reach it through src/game/rules/rng.js, which keys a stream
 * by the save's seed and what the roll is for.
 *
 * Usage:
 *   const rng = new SeededRNG(42);
 *   rng.next();          // 0 <= n < 1  (like Math.random())
 *   rng.nextInt(0, 10);  // 0 <= n <= 10
 *   rng.pick(array);     // random element
 *   rng.shuffle(array);  // Fisher–Yates in-place shuffle
 */

export class SeededRNG {
  /**
   * @param {number} seed — integer seed value
   */
  constructor(seed) {
    this._state = seed | 0;
  }

  /**
   * Returns a float in [0, 1) — drop-in replacement for Math.random().
   * Mulberry32 algorithm — fast, 32-bit, good distribution.
   */
  next() {
    let t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] (inclusive).
   * @param {number} min
   * @param {number} max
   */
  nextInt(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Pick a random element from an array.
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Fisher–Yates in-place shuffle.
   * @template T
   * @param {T[]} arr
   * @returns {T[]} the same array, shuffled
   */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
