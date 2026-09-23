/**
 * The save-state shape, the clock and the day rollover. Pure.
 *
 * A day runs 07:00 to midnight; sleeping at the home door ends it early with
 * full rest, staying up past midnight means passing out (worse recovery).
 */

import { EQUIPMENT } from "../data/equipment.js";
import { newStats, recover, physique, clamp } from "./stats.js";
import { appeal, capacity, targetMembers, memberDelta, cleanAfterDay } from "./members.js";

export const DAY_START = 7 * 60;
export const DAY_END = 24 * 60;
export const SET_MINUTES = 15;
export const DUES = 12;

export const STARTER_GYM = [
  { type: "dumbbell_rack", x: 3, y: 1, rot: 2 },
  { type: "bench_press", x: 6, y: 4, rot: 2 },
  { type: "punching_bag", x: 10, y: 5, rot: 3 },
];

export function newGame() {
  return {
    day: 1, time: DAY_START, money: 400, rep: 0, members: 2, dues: DUES,
    stats: newStats(),
    gym: { placed: STARTER_GYM.map((p) => ({ ...p })), clean: 80 },
    career: { results: [], last: {} },
    today: { sets: 0, str: 0, end: 0, spent: 0, boost: 1 },
  };
}

export const clockText = (min) => {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const advanceClock = (g, minutes) => ({ ...g, time: g.time + minutes });
export const isPastMidnight = (g) => g.time >= DAY_END;

export const gymAppeal = (g) => appeal(g.gym.placed, g.gym.clean, g.rep, EQUIPMENT);

/**
 * Sleep: collect dues, update the roster, age cleanliness, recover the body,
 * and start the next morning. Returns { state, summary }.
 */
export function endDay(g, passedOut = isPastMidnight(g)) {
  const sleep = passedOut ? 0.6 : 1;
  const dues = g.members * g.dues;
  const app = gymAppeal(g);
  const target = targetMembers(app, capacity(g.gym.placed));
  const delta = memberDelta(g.members, target);
  const members = clamp(g.members + delta, 0, 999);
  const physBefore = physique(g.stats);
  const stats = recover(g.stats, sleep);
  const summary = {
    day: g.day, dues, members, joined: delta, appeal: app, passedOut,
    sets: g.today.sets, str: g.today.str, end: g.today.end, spent: g.today.spent,
    phys: physique(stats), physDelta: Math.round((physique(stats) - physBefore) * 10) / 10,
    fatigue: stats.fat,
  };
  const state = {
    ...g,
    day: g.day + 1, time: DAY_START, money: g.money + dues, members, stats,
    gym: { ...g.gym, clean: cleanAfterDay(g.gym.clean, g.members) },
    today: { sets: 0, str: 0, end: 0, spent: 0, boost: 1 },
  };
  return { state, summary };
}
