/**
 * Competitions and career progress. Pure; randomness comes in as an rng()
 * returning 0..1 so results are reproducible in tests.
 */

import { EVENTS, CAREERS, CAREER_IDS } from "../data/events.js";
import { physique, clamp } from "./stats.js";

/** Values a requirement can reference. */
export function metrics(g) {
  return { str: g.stats.str, end: g.stats.end, phys: physique(g.stats), rep: g.rep, members: g.members, money: g.money };
}

const LABEL = { str: "STR", end: "END", phys: "Physique", rep: "Rep", members: "Members", money: "$" };
export const reqText = (req) =>
  Object.entries(req).map(([k, v]) => (k === "money" ? `$${v}` : `${LABEL[k]} ${v}`)).join(" · ") || "—";

/** Fraction 0..1 of the way to a requirement set (the weakest stat decides). */
export function reqProgress(req, m) {
  let p = 1;
  for (const k in req) p = Math.min(p, clamp(m[k] / req[k], 0, 1));
  return p;
}
export const meets = (req, m) => reqProgress(req, m) >= 1;

/** Highest rank whose thresholds the player meets right now. */
function liveRank(c, m) {
  let rank = 0;
  while (rank + 1 < c.ranks.length && meets(c.ranks[rank + 1].req, m)) rank++;
  return rank;
}

/** Ranks are sticky: once earned, spending the money or losing members never takes one away. */
export function careerRank(g, id) {
  return Math.max(g.career.best?.[id] || 0, liveRank(CAREERS[id], metrics(g)));
}

export const isTopRank = (id, rank) => rank === CAREERS[id].ranks.length - 1;

/**
 * Record any newly earned ranks. Returns { state, ups: [{ id, career, rank, name, perk, top }] }.
 */
export function promote(g) {
  const best = { ...g.career.best };
  const ups = [];
  for (const id of CAREER_IDS) {
    const c = CAREERS[id];
    const rank = careerRank(g, id);
    const was = best[id] || 0;
    if (rank <= was) continue;
    best[id] = rank;
    ups.push({ id, career: c.name, rank, name: c.ranks[rank].name, perk: c.perks?.[rank] || "", top: isTopRank(id, rank) });
  }
  if (!ups.length) return { state: g, ups };
  return { state: { ...g, career: { ...g.career, best } }, ups };
}

/** Career ladder status for the panel. */
export function careerStatus(g) {
  const m = metrics(g);
  return CAREER_IDS.map((id) => {
    const c = CAREERS[id];
    const rank = careerRank(g, id);
    const next = c.ranks[rank + 1] || null;
    return {
      id, name: c.name, blurb: c.blurb, rank, rankName: c.ranks[rank].name,
      next: next && { name: next.name, req: next.req, text: reqText(next.req), progress: reqProgress(next.req, m) },
      locked: id === "supplements" && rank === 0,
      events: c.events, perks: c.perks || [],
    };
  });
}

/** Can the player enter this event today? { ok, reason }. */
export function eligibility(g, id) {
  const e = EVENTS[id];
  const last = g.career.last[id];
  if (last != null && g.day - last < e.cooldown) return { ok: false, reason: `Next one in ${e.cooldown - (g.day - last)} days` };
  if (!meets(e.req, metrics(g))) return { ok: false, reason: `Needs ${reqText(e.req)}` };
  if (g.money < e.entry) return { ok: false, reason: `Entry is $${e.entry}` };
  if (g.stats.energy < 20) return { ok: false, reason: "Too tired (needs 20 energy)" };
  return { ok: true, reason: "" };
}

/** Player's event score: shows judge physique and posing, meets judge strength and lift execution. */
export function eventScore(kind, stats, execution) {
  const q = clamp(execution, 0, 1.25);
  return kind === "show" ? physique(stats) * (0.8 + 0.25 * q) : stats.str * (0.75 + 0.3 * q) + stats.end * 0.1;
}

/** Awards judge the gym itself: appeal, membership and how happy members are. */
export const awardScore = (g, appeal) => appeal * 0.55 + g.members * 0.6 + g.sat * 0.15;

/**
 * Score everyone and place the player. Rivals vary ±8% per event.
 * Returns { place, field: [{ name, score, you }], prize, rep }.
 */
export function resolveEvent(id, playerScore, rng) {
  const e = EVENTS[id];
  const field = e.rivals.map(([name, base]) => ({ name, score: Math.round(base * (0.92 + rng() * 0.16) * 10) / 10, you: false }));
  field.push({ name: "You", score: Math.round(playerScore * 10) / 10, you: true });
  // Ties go to the player: the crowd loves a local.
  field.sort((a, b) => b.score - a.score || (b.you ? 1 : 0) - (a.you ? 1 : 0));
  const place = field.findIndex((f) => f.you) + 1;
  return { place, field, prize: e.prizes[place - 1] || 0, rep: e.rep[place - 1] || 1 };
}

/** Apply a finished event to the save state. */
export function applyEvent(g, id, result) {
  const e = EVENTS[id];
  return {
    ...g,
    money: g.money - e.entry + result.prize,
    rep: g.rep + result.rep,
    stats: { ...g.stats, energy: Math.max(0, g.stats.energy - 20) },
    time: g.time + 120,
    career: {
      results: [...g.career.results, { id, day: g.day, place: result.place, prize: result.prize }].slice(-20),
      last: { ...g.career.last, [id]: g.day },
    },
  };
}
