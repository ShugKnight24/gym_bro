/**
 * Overnight happenings: at most one surprise per night, rolled from the
 * save's seed so a reload replays it. Each returns the changed state and a
 * news line for the day summary. Pure.
 */

import { clamp } from "./stats.js";
import { BROKEN, isBroken } from "./members.js";

export const CHANCE = 0.35;

/** Each: when(g) gates it, apply(g, rng) → { state, text, tone: "good"|"bad"|"meh", sound? }. */
export const HAPPENINGS = {
  influencer: {
    title: "Influencer visit",
    when: (g) => g.day >= 3,
    apply(g) {
      const good = g.gym.clean >= 60;
      return good
        ? { state: { ...g, rep: g.rep + 6 }, text: "A fitness influencer filmed a set in your gym. The comments love it. +6 rep", tone: "good" }
        : { state: { ...g, rep: Math.max(0, g.rep - 3) }, text: "A fitness influencer posted your dirty floor. -3 rep", tone: "bad" };
    },
  },
  breakdown: {
    title: "Breakdown",
    when: (g) => g.gym.placed.some((p) => !isBroken(p) && (p.wear || 0) >= 40),
    apply(g, rng) {
      const worn = g.gym.placed.map((p, i) => [p, i]).filter(([p]) => !isBroken(p) && (p.wear || 0) >= 40);
      const [, i] = worn[Math.floor(rng() * worn.length)];
      const placed = g.gym.placed.map((p, k) => (k === i ? { ...p, wear: BROKEN } : p));
      return { state: { ...g, gym: { ...g.gym, placed } }, text: "A worn machine gave out overnight. Repair it before members notice.", tone: "bad", sound: "break", broke: g.gym.placed[i].type };
    },
  },
  inspection: {
    title: "Health inspection",
    when: (g) => g.day >= 4,
    apply(g) {
      return g.gym.clean < 50
        ? { state: { ...g, money: g.money - 100 }, text: "Surprise health inspection: failed. $100 fine.", tone: "bad" }
        : { state: { ...g, rep: g.rep + 3 }, text: "Surprise health inspection: spotless. +3 rep", tone: "good" };
    },
  },
  viral: {
    title: "Viral clip",
    when: (g) => g.members >= 4,
    apply(g) {
      return { state: { ...g, members: g.members + 2 }, text: "A member's PR clip went viral. 2 new sign-ups walked in.", tone: "good" };
    },
  },
  heatwave: {
    title: "Heatwave",
    when: () => true,
    apply(g) {
      return { state: { ...g, stats: { ...g.stats, energy: Math.min(g.stats.energy, 80) } }, text: "Heatwave. You wake up sluggish: energy capped at 80 this morning.", tone: "meh" };
    },
  },
  sponsor: {
    title: "Sponsor",
    when: (g) => g.rep >= 30,
    apply(g, rng) {
      const cash = 200 + Math.round(rng() * 4) * 50;
      return { state: { ...g, money: g.money + cash }, text: `A local sponsor liked your numbers: +$${cash}.`, tone: "good", sound: "cash" };
    },
  },
  rival: {
    title: "Rival gym",
    when: (g) => g.members >= 10,
    apply(g) {
      return { state: { ...g, sat: clamp(g.sat - 12, 0, 100) }, text: "A shiny rival gym opened down the road. Members are tempted (-12 satisfaction).", tone: "bad" };
    },
  },
};
export const HAPPENING_IDS = Object.keys(HAPPENINGS);

/** Maybe roll one happening. Returns { state, news: null | { id, title, text, tone, sound } }. */
export function rollHappening(g, rng) {
  if (rng() >= CHANCE) return { state: g, news: null };
  const pool = HAPPENING_IDS.filter((id) => HAPPENINGS[id].when(g));
  if (!pool.length) return { state: g, news: null };
  const id = pool[Math.floor(rng() * pool.length)];
  const h = HAPPENINGS[id];
  const r = h.apply(g, rng);
  return { state: r.state, news: { id, title: h.title, text: r.text, tone: r.tone, sound: r.sound || null } };
}
