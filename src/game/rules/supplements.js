/**
 * Supplement Co.: launch products, pick an ad budget, and sell every night.
 * Sales grow with reputation and membership; ads multiply them. Pure.
 */

import { ADS } from "./economy.js";

/** `rank` is the Supplement Co. rank that unlocks the product. */
export const PRODUCTS = {
  whey: { name: "Whey Hey! Protein", launch: 1500, margin: 6, base: 8, rank: 1, perk: "Shakes cost half at your vending machine" },
  fishoil: { name: "Bro-Mega Fish Oil", launch: 1000, margin: 4, base: 10, rank: 1, perk: "Muscles recover a little faster" },
  pump: { name: "Pump Juice Pre-Workout", launch: 2500, margin: 9, base: 6, rank: 1, perk: "Pre-workout gives +10 more energy" },
  crunch: { name: "Creatine Crunch Bars", launch: 4000, margin: 7, base: 12, rank: 2, perk: "Energy bars no longer add body fat" },
};
export const PRODUCT_IDS = Object.keys(PRODUCTS);

export const hasProduct = (g, id) => g.supps.launched.includes(id);

export function launchStatus(g, id, suppRank) {
  const p = PRODUCTS[id];
  if (hasProduct(g, id)) return { ok: false, reason: "On shelves" };
  if (suppRank < p.rank) return { ok: false, reason: p.rank === 1 ? "Unlocks at $5000" : "Needs the Brand rank" };
  if (g.money < p.launch) return { ok: false, reason: `Launch costs $${p.launch}` };
  return { ok: true, reason: "" };
}

export const launch = (g, id) => ({ ...g, money: g.money - PRODUCTS[id].launch, supps: { ...g.supps, launched: [...g.supps.launched, id] } });

export const setAds = (g, level) => ({ ...g, supps: { ...g.supps, ads: Math.max(0, Math.min(ADS.length - 1, level | 0)) } });

/** One night's sales: { units, revenue, lines: [{ id, units, revenue }] }. */
export function nightlySales(g, rng) {
  const mult = ADS[g.supps.ads]?.mult || 1;
  const reach = (1 + g.rep / 50) * (1 + g.members / 40) * mult;
  const lines = g.supps.launched.map((id) => {
    const p = PRODUCTS[id];
    const units = Math.max(0, Math.round(p.base * reach * (0.85 + rng() * 0.3)));
    return { id, units, revenue: units * p.margin };
  });
  return {
    units: lines.reduce((a, l) => a + l.units, 0),
    revenue: lines.reduce((a, l) => a + l.revenue, 0),
    lines,
  };
}
