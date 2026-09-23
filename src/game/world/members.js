/**
 * Visible gym members: a fixed pool of walkers, each one a member of the
 * roster, that come in the street door, path to a free machine (their
 * favourite when it is free and working), work out a while and leave. How many
 * are in at once follows the roster and the time of day (evening rush).
 */

import { accessCell, isOpen, DIRS } from "../rules/build.js";
import { MEMBER_LOOKS } from "../art/figures.js";
import { ENTRANCE } from "./map.js";
import { EQUIPMENT } from "../data/equipment.js";

export const MAX_VISIBLE = 10;
const SPEED = 1.1;

/** Share of the roster in the gym at a given minute of day. */
export function busyness(min) {
  const h = min / 60;
  if (h < 7 || h >= 23) return 0;
  const morning = Math.exp(-(((h - 8) / 1.5) ** 2)) * 0.45;
  const evening = Math.exp(-(((h - 18.5) / 2.2) ** 2)) * 0.8;
  return Math.min(1, 0.15 + morning + evening);
}

export function createCrowd() {
  return {
    agents: Array.from({ length: MAX_VISIBLE }, (_, i) => ({
      on: false, i, look: i % MEMBER_LOOKS.length, member: -1, x: 0, y: 0, state: "", path: null, pi: 0, timer: 0, target: -1, pose: "idle", anim: 0,
    })),
    spawnIn: 1,
  };
}

/** BFS over open floor that is not a machine; returns [[x, y] …] cell centres from a to b, or null. */
function findPath(map, placed, a, b) {
  const { w, h } = map;
  const solid = new Uint8Array(w * h);
  for (const p of placed) solid[p.y * w + p.x] = 1;
  const prev = new Int32Array(w * h).fill(-1);
  const start = a[1] * w + a[0];
  const goal = b[1] * w + b[0];
  prev[start] = start;
  const q = [start];
  for (let i = 0; i < q.length && prev[goal] < 0; i++) {
    const c = q[i];
    const x = c % w;
    const y = (c / w) | 0;
    for (const [dx, dy] of DIRS) {
      const n = (y + dy) * w + x + dx;
      if (isOpen(map, x + dx, y + dy) && !solid[n] && prev[n] < 0) {
        prev[n] = c;
        q.push(n);
      }
    }
  }
  if (prev[goal] < 0) return null;
  const out = [];
  for (let c = goal; c !== start; c = prev[c]) out.push([(c % w) + 0.5, ((c / w) | 0) + 0.5]);
  return out.reverse();
}

const doorCell = () => [Math.floor(ENTRANCE[0]), Math.floor(ENTRANCE[1])];

function sendTo(ag, map, placed, cell, state) {
  const from = [Math.floor(ag.x), Math.floor(ag.y)];
  const path = findPath(map, placed, from, cell);
  if (!path) return false;
  ag.path = path;
  ag.pi = 0;
  ag.state = state;
  return true;
}

/**
 * Advance the crowd. `roster` is the member list, `min` the clock,
 * `placed` the equipment list, `busy` the machine the player is using
 * (no member takes it; anyone on it moves on).
 */
export function updateCrowd(crowd, dt, roster, min, map, placed, busy = -1, rnd = Math.random) {
  const want = Math.min(MAX_VISIBLE, Math.round(roster.length * busyness(min)));
  let active = 0;
  for (const ag of crowd.agents) if (ag.on) active++;
  crowd.spawnIn -= dt;
  if (active < want && crowd.spawnIn <= 0 && placed.length) {
    crowd.spawnIn = 2 + rnd() * 4;
    const ag = crowd.agents.find((a) => !a.on);
    // A free machine whose access cell no one else is heading to.
    const taken = new Set(crowd.agents.filter((a) => a.on).map((a) => a.target));
    taken.add(busy);
    const free = placed.map((_, i) => i).filter((i) => !taken.has(i) && (placed[i].wear || 0) < 100);
    // Someone on the roster who is not already in.
    const inside = new Set(crowd.agents.filter((a) => a.on).map((a) => a.member));
    const away = roster.filter((m) => !inside.has(m.id));
    const who = away.length ? away[(rnd() * away.length) | 0] : null;
    if (ag && who && free.length) {
      const favs = free.filter((i) => placed[i].type === who.fav);
      const pool = favs.length ? favs : free;
      const t = pool[(rnd() * pool.length) | 0];
      ag.x = ENTRANCE[0];
      ag.y = ENTRANCE[1] - 0.1;
      ag.target = t;
      ag.member = who.id;
      ag.look = who.look % MEMBER_LOOKS.length;
      ag.anim = rnd() * 3;
      const p = placed[t];
      if (sendTo(ag, map, placed, accessCell(p.x, p.y, p.rot), "walk")) ag.on = true;
    }
  }
  for (const ag of crowd.agents) {
    if (!ag.on) continue;
    ag.anim += dt;
    if (ag.state === "walk" && ag.target === busy) {
      ag.target = -1;
      if (!sendTo(ag, map, placed, doorCell(), "leave")) ag.on = false;
      continue;
    }
    if (ag.state === "walk" || ag.state === "leave") {
      const next = ag.path[ag.pi];
      if (!next) {
        if (ag.state === "leave") {
          ag.on = false;
          ag.target = -1;
          continue;
        }
        ag.state = "work";
        ag.timer = 14 + rnd() * 20;
        continue;
      }
      const dx = next[0] - ag.x;
      const dy = next[1] - ag.y;
      const d = Math.hypot(dx, dy);
      const step = SPEED * dt;
      if (d <= step) {
        ag.x = next[0];
        ag.y = next[1];
        ag.pi++;
      } else {
        ag.x += (dx / d) * step;
        ag.y += (dy / d) * step;
      }
      ag.pose = (ag.anim * 3.2) % 2 < 1 ? "walkA" : "walkB";
    } else if (ag.state === "work") {
      const p = placed[ag.target];
      // Machine sold under them, or closing time: head out.
      ag.timer -= dt;
      if (!p || ag.timer <= 0 || want < active - 1 || ag.target === busy) {
        ag.target = -1;
        if (!sendTo(ag, map, placed, doorCell(), "leave")) ag.on = false;
        continue;
      }
      // Lift on machines; relax in the sauna, plunge, tanning bed and the rest.
      ag.pose = EQUIPMENT[p.type]?.kind === "amenity" ? "idle" : (ag.anim * 1.4) % 2 < 1 ? "liftA" : "liftB";
      // Stand at the edge of the access cell facing the machine.
      const [ax, ay] = accessCell(p.x, p.y, p.rot);
      ag.x = ax + 0.5 + (p.x - ax) * 0.18;
      ag.y = ay + 0.5 + (p.y - ay) * 0.18;
    }
  }
}

/** Drop everyone (new day, load). */
export function resetCrowd(crowd) {
  for (const ag of crowd.agents) ag.on = false;
  crowd.spawnIn = 1;
}
