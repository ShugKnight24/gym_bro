/**
 * The members as people: each has a name, a training goal, a favourite
 * machine and a mood. The roster count still comes from the nightly rules in
 * ./members.js; this module decides *who* joins and who leaves (the
 * unhappiest first) and what they would tell you if you asked. Pure.
 */

import { clamp } from "./stats.js";
import { isBroken } from "./members.js";

const FIRST = [
  "Alex", "Sam", "Jordan", "Taylor", "Chris", "Dana", "Marco", "Priya", "Keisha", "Tomás", "Yuki", "Omar", "Lena", "Dev",
  "Rosa", "Jamal", "Mei", "Viktor", "Ava", "Noah", "Zoe", "Ibrahim", "Carmen", "Luca", "Nia", "Ben", "Sofia", "Kofi",
];
const LAST = "ABCDEFGHJKLMNOPRSTVWZ";
/** Number of member looks in art/figures.js MEMBER_LOOKS (rules do not import art; a test keeps them in step). */
export const LOOK_COUNT = 10;

/** Goals, and the machines each goal loves (first is most wanted). */
export const GOALS = {
  strength: { name: "Strength", loves: ["squat_rack", "bench_press", "leg_press", "dumbbell_rack", "pullup_bar"] },
  cardio: { name: "Cardio", loves: ["treadmill", "stationary_bike", "rowing_machine", "punching_bag"] },
  physique: { name: "Physique", loves: ["cable_station", "dumbbell_rack", "kettlebell_rack", "ab_bench", "pullup_bar"] },
};
export const GOAL_IDS = Object.keys(GOALS);

export function newMember(id, day, rng, looks = LOOK_COUNT) {
  const goal = GOAL_IDS[Math.floor(rng() * GOAL_IDS.length)];
  const loves = GOALS[goal].loves;
  return {
    id,
    name: `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}.`,
    look: Math.floor(rng() * looks),
    goal,
    fav: loves[Math.floor(rng() * Math.min(3, loves.length))],
    since: day,
    mood: 65,
  };
}

/** What the gym offers a member's favourite machine: "ok" | "missing" | "broken". */
export function favStatus(m, placed) {
  const mine = placed.filter((p) => p.type === m.fav);
  if (!mine.length) return "missing";
  return mine.some((p) => !isBroken(p)) ? "ok" : "broken";
}

/**
 * A member's mood 0-100 tonight: the gym-wide satisfaction, then their own
 * machine, a trainer for lifters, a chat with the owner today, and loyalty.
 */
export function memberMood(m, g, sat) {
  let mood = sat;
  const fav = favStatus(m, g.gym.placed);
  mood += fav === "ok" ? 8 : fav === "broken" ? -22 : -15;
  if (g.gym.upgrades.trainer && m.goal !== "cardio") mood += 10;
  if (g.today.chats?.includes(m.id)) mood += 8;
  mood += Math.min(10, (g.day - m.since) / 3);
  return clamp(Math.round(mood), 0, 100);
}

/** Share of the roster whose favourite machine is missing or broken. */
export const unmetShare = (roster, placed) => (roster.length ? roster.filter((m) => favStatus(m, placed) !== "ok").length / roster.length : 0);

/** What they would say if you walked up to them. */
export function memberLine(m, g, catalog, dues, fair) {
  const fav = catalog[m.fav]?.name || "gear";
  const st = favStatus(m, g.gym.placed);
  if (st === "broken") return `The ${fav} is broken again. That's why I'm here!`;
  if (st === "missing") return `Any chance of a ${fav}? It's the one thing I need.`;
  if (g.gym.clean < 45) return "No offence, but this place could use a mop.";
  if (dues > fair * 1.2) return `$${dues} a day is steep. I'm thinking about it.`;
  if (m.mood >= 80) return `Love this place. Told three friends about it.`;
  if (m.goal === "strength") return `Chasing a new PR on the ${fav} today.`;
  if (m.goal === "cardio") return `Just getting my miles in on the ${fav}.`;
  return `Sculpting season. The ${fav} is my best friend.`;
}

/**
 * Bring the roster to `count`: the unhappiest leave first (with their
 * reason), newcomers join. Returns { roster, nextId, joined: [m], left: [{ m, why }] }.
 */
export function reconcileRoster(g, count, rng, catalog, fair) {
  let roster = g.roster.map((m) => ({ ...m, mood: memberMood(m, g, g.sat) }));
  let nextId = g.nextId;
  const left = [];
  const joined = [];
  if (roster.length > count) {
    const order = [...roster].sort((a, b) => a.mood - b.mood || a.since - b.since);
    const leaving = new Set(order.slice(0, roster.length - count).map((m) => m.id));
    for (const m of roster) if (leaving.has(m.id)) left.push({ m, why: memberLine(m, g, catalog, g.dues, fair) });
    roster = roster.filter((m) => !leaving.has(m.id));
  }
  while (roster.length < count) {
    const m = newMember(nextId++, g.day, rng);
    roster.push(m);
    joined.push(m);
  }
  return { roster, nextId, joined, left };
}
