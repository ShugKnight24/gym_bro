/**
 * Running the business: nightly costs, machine wear and repairs, and the
 * one-off upgrades (cleaner, annex, bed). Pure.
 */

import { clamp } from "./stats.js";
import { BROKEN, isBroken } from "./members.js";

/** One-off purchases. `owner` is the Gym Owner rank that unlocks it. */
export const UPGRADES = {
  cleaner: { name: "Hire a cleaner", cost: 0, daily: 30, owner: 1, desc: "Keeps the gym at least 85% clean every morning. $30/day." },
  annex: { name: "Open the east annex", cost: 3000, daily: 45, owner: 2, desc: "Knock through the east wall: a whole new training room. +$45/day rent." },
  bed: { name: "Memory foam bed", cost: 1200, daily: 0, owner: 0, desc: "Sleep deeper: muscles recover faster every night." },
};
export const UPGRADE_IDS = Object.keys(UPGRADES);

/** Daily ad budgets for the supplement line: cost per day and demand multiplier. */
export const ADS = [
  { name: "None", cost: 0, mult: 1 },
  { name: "Flyers", cost: 40, mult: 1.5 },
  { name: "Social", cost: 120, mult: 2.2 },
  { name: "Billboard", cost: 350, mult: 3.2 },
];

/** Nightly outgoings. */
export function dailyCosts(g) {
  const rent = 10 + 3 * g.gym.placed.length;
  let staff = 0;
  let upkeep = 0;
  for (const id of UPGRADE_IDS) {
    if (!g.gym.upgrades[id]) continue;
    if (id === "cleaner") staff += UPGRADES[id].daily;
    else upkeep += UPGRADES[id].daily;
  }
  const ads = ADS[g.supps.ads]?.cost || 0;
  return { rent: rent + upkeep, staff, ads, total: rent + upkeep + staff + ads };
}

/** Can the player buy this upgrade now? { ok, reason }. */
export function upgradeStatus(g, id, ownerRank) {
  const u = UPGRADES[id];
  if (g.gym.upgrades[id]) return { ok: false, reason: id === "cleaner" ? "Hired" : "Owned" };
  if (ownerRank < u.owner) return { ok: false, reason: `Needs Gym Owner rank ${u.owner}` };
  if (g.money < u.cost) return { ok: false, reason: `Need $${u.cost}` };
  return { ok: true, reason: "" };
}

export function buyUpgrade(g, id) {
  const u = UPGRADES[id];
  return { ...g, money: g.money - u.cost, gym: { ...g.gym, upgrades: { ...g.gym.upgrades, [id]: true } } };
}

/**
 * Overnight wear: each member-day spreads over the working machines, and a
 * machine's `wear` rating scales how fast it goes. Returns { placed, broke: [types] }.
 */
export function wearAfterDay(placed, members, catalog) {
  const n = placed.filter((p) => !isBroken(p)).length;
  const use = n ? members / n : 0;
  const broke = [];
  const next = placed.map((p) => {
    if (isBroken(p)) return p;
    const rate = catalog[p.type]?.wear ?? 1.5;
    const wear = clamp(Math.round(((p.wear || 0) + rate * use) * 10) / 10, 0, BROKEN);
    if (wear >= BROKEN) broke.push(p.type);
    return { ...p, wear };
  });
  return { placed: next, broke };
}

/** Repair price: a quarter of the machine's cost at full wear, pro rata. */
export const repairCost = (eq, wear) => Math.max(5, Math.ceil((eq.cost * 0.25 * clamp(wear, 0, BROKEN)) / BROKEN));

export function repair(g, index, catalog) {
  const p = g.gym.placed[index];
  const cost = repairCost(catalog[p.type], p.wear || 0);
  const placed = g.gym.placed.map((q, i) => (i === index ? { ...q, wear: 0 } : q));
  return { ...g, money: g.money - cost, gym: { ...g.gym, placed } };
}
