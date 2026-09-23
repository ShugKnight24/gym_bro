/**
 * The save-state shape, the clock and the day rollover. Pure.
 *
 * A day runs 07:00 to midnight; sleeping at the home door ends it early with
 * full rest, staying up past midnight means passing out (worse recovery).
 */

import { EQUIPMENT } from "../data/equipment.js";
import { newStats, recover, physique, clamp } from "./stats.js";
import {
  appeal, capacity, targetMembers, cleanAfterDay, fairDues, priceDemand, satisfaction, satisfactionReasons,
  rosterChange, isBroken,
} from "./members.js";
import { dailyCosts, wearAfterDay } from "./economy.js";
import { nightlySales, hasProduct } from "./supplements.js";
import { rollHappening } from "./happenings.js";
import { promote } from "./compete.js";
import { rngFor, newSeed, SALT } from "./rng.js";

export const DAY_START = 7 * 60;
export const DAY_END = 24 * 60;
export const SET_MINUTES = 15;
export const DUES = 12;

export const STARTER_GYM = [
  { type: "dumbbell_rack", x: 3, y: 1, rot: 2, wear: 0 },
  { type: "bench_press", x: 6, y: 4, rot: 2, wear: 0 },
  { type: "punching_bag", x: 10, y: 5, rot: 3, wear: 0 },
];

export function newGame(seed = newSeed()) {
  return {
    day: 1, time: DAY_START, money: 400, rep: 0, members: 2, dues: DUES, sat: 65, seed,
    stats: newStats(),
    gym: { placed: STARTER_GYM.map((p) => ({ ...p })), clean: 80, upgrades: {} },
    career: { results: [], last: {}, best: {}, legends: [] },
    supps: { launched: [], ads: 0 },
    today: { sets: 0, str: 0, end: 0, spent: 0, boost: 1, perfect: 0 },
  };
}

export const clockText = (min) => {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const advanceClock = (g, minutes) => ({ ...g, time: g.time + minutes });
export const isPastMidnight = (g) => g.time >= DAY_END;

export const gymAppeal = (g) => appeal(g.gym.placed, g.gym.clean, g.rep, EQUIPMENT);

/** Everything the gym panel and the night need about the business right now. */
export function gymReport(g) {
  const app = gymAppeal(g);
  const cap = capacity(g.gym.placed);
  const fair = fairDues(app, g.rep);
  const broken = g.gym.placed.filter(isBroken).length;
  const distinct = new Set(g.gym.placed.filter((p) => !isBroken(p)).map((p) => p.type)).size;
  const inputs = { members: g.members, cap, clean: g.gym.clean, broken, dues: g.dues, fair, distinct };
  const sat = satisfaction(inputs);
  return {
    appeal: app, cap, fair, broken, sat, demand: priceDemand(g.dues, fair),
    target: targetMembers(app, cap, priceDemand(g.dues, fair)),
    reasons: satisfactionReasons(inputs, sat), costs: dailyCosts(g),
  };
}

/**
 * Sleep: collect dues and sales, pay the bills, wear the machines, move the
 * roster by satisfaction, maybe a happening, recover the body, record rank
 * ups, and start the next morning. Returns { state, summary }.
 */
export function endDay(g0, passedOut = isPastMidnight(g0)) {
  // Ranks reached during the day count even if the night takes the numbers back down.
  const pre = promote(g0);
  const g = pre.state;
  const sleep = passedOut ? 0.6 : 1;
  const rep = gymReport(g);
  // Satisfaction moves toward today's conditions rather than jumping.
  const sat = Math.round(g.sat + (rep.sat - g.sat) * 0.6);
  const dues = g.members * g.dues;
  const sales = nightlySales(g, rngFor(g.seed, g.day, SALT.supps));
  const costs = rep.costs;
  const { join, quit } = rosterChange(g.members, rep.target, sat);
  const members = clamp(g.members + join - quit, 0, 999);
  const worn = wearAfterDay(g.gym.placed, g.members, EQUIPMENT);
  const physBefore = physique(g.stats);
  const bonus = (g.gym.upgrades.bed ? 12 : 0) + (hasProduct(g, "fishoil") ? 5 : 0);
  let clean = cleanAfterDay(g.gym.clean, g.members);
  if (g.gym.upgrades.cleaner) clean = Math.max(clean, 85);
  let state = {
    ...g,
    day: g.day + 1, time: DAY_START, money: g.money + dues + sales.revenue - costs.total, members, sat,
    stats: recover(g.stats, sleep, bonus),
    gym: { ...g.gym, placed: worn.placed, clean },
    today: { sets: 0, str: 0, end: 0, spent: 0, boost: 1, perfect: 0 },
  };
  const hap = rollHappening(state, rngFor(g.seed, g.day, SALT.happening));
  state = hap.state;
  const promo = promote(state);
  state = promo.state;
  const summary = {
    day: g.day, dues, members: state.members, joined: join, quit, appeal: rep.appeal, passedOut,
    sets: g.today.sets, str: g.today.str, end: g.today.end, spent: g.today.spent,
    phys: physique(state.stats), physDelta: Math.round((physique(state.stats) - physBefore) * 10) / 10,
    fatigue: state.stats.fat, sat, reasons: rep.reasons, costs, sales,
    net: dues + sales.revenue - costs.total, broke: worn.broke, news: hap.news, ups: [...pre.ups, ...promo.ups],
  };
  return { state, summary };
}
