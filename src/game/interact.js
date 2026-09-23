/**
 * What the player is looking at and what E / F do with it: a member (chat),
 * equipment (train, repair), the desk (clean), the vending machine (shop, quick
 * shake) and the home door (sleep). Targets are reused objects whose text
 * is rebuilt only when something it shows changes.
 */

import { WALL, PROPS } from "./world/map.js";
import { EQUIPMENT, SHOP } from "./data/equipment.js";
import { consume, setCost } from "./rules/stats.js";
import { isBroken } from "./rules/members.js";
import { repair, repairCost } from "./rules/economy.js";
import { hasProduct } from "./rules/supplements.js";
import { GOALS, memberLine } from "./rules/roster.js";
import { gymReport } from "./rules/day.js";
import { markTip } from "./rules/tips.js";
import { isAmenity, amenityStatus, useAmenity } from "./rules/amenities.js";
import { startTrainer } from "./train.js";
import { COLOR } from "./ui/kit.js";

/**
 * @param {object} g    the game (reads g.state, g.player, g.map, g.occ, g.keyLabel)
 * @param {{ audio: object, pop: Function, sleep: Function, openShop: Function }} env
 */
export function createInteraction(g, { audio, pop, sleep, openShop }) {
  const T_EQUIP = { kind: "equip", index: -1, label: "", alt: "", note: "" };
  const T_DOOR = { kind: "door", label: "Sleep: end the day", alt: "", note: "Collect dues, pay the bills, recover, autosave" };
  const T_DESK = { kind: "desk", label: "Clean the gym (10 energy)", alt: "", note: "" };
  const T_VEND = { kind: "vending", label: "Shop", alt: "", note: "" };
  const T_MEMBER = { kind: "member", id: -1, label: "", alt: "", note: "" };
  let lastMemberKey = "";
  let lastEquip = -1;
  let lastEquipKey = "";
  let lastClean = -1;

  /** Vending prices after supplement-line perks. */
  const prices = () => {
    const out = {};
    for (const id in SHOP) out[id] = id === "shake" && hasProduct(g.state, "whey") ? Math.ceil(SHOP[id].price / 2) : SHOP[id].price;
    return out;
  };

  /** The closest walker roughly under the crosshair, within chatting range. */
  function memberAhead(p, dx, dy) {
    let best = null;
    let bestD = 1.9;
    for (const ag of g.crowd.agents) {
      if (!ag.on || ag.member < 0) continue;
      const vx = ag.x - p.x;
      const vy = ag.y - p.y;
      const d = Math.hypot(vx, vy);
      if (d < 0.3 || d > bestD) continue;
      const along = vx * dx + vy * dy;
      if (along <= 0 || Math.abs(vx * dy - vy * dx) > 0.35) continue;
      best = ag;
      bestD = d;
    }
    return best;
  }

  function memberTarget(ag) {
    const s = g.state;
    const m = s.roster.find((r) => r.id === ag.member);
    if (!m) return null;
    const chatted = s.today.chats.includes(m.id);
    // Rebuild the words only when who, or what they would complain about, changes.
    const key = `${m.id}|${chatted}|${s.gym.clean >> 3}|${s.dues}|${s.gym.placed.length}|${s.gym.placed.reduce((n, p) => n + (p.wear >= 100 ? 1 : 0), 0)}`;
    if (key !== lastMemberKey) {
      lastMemberKey = key;
      T_MEMBER.id = m.id;
      T_MEMBER.label = chatted ? `${m.name} · ${GOALS[m.goal].name}` : `Chat: ${m.name} · ${GOALS[m.goal].name}`;
      T_MEMBER.note = `"${memberLine(m, s, EQUIPMENT, s.dues, gymReport(s).fair)}"`;
    }
    return T_MEMBER;
  }

  function findTarget() {
    const p = g.player;
    const map = g.map;
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
    const ag = memberAhead(p, dx, dy);
    if (ag) {
      const t = memberTarget(ag);
      if (t) return t;
    }
    for (let d = 0.3; d <= 1.9; d += 0.1) {
      const cx = Math.floor(p.x + dx * d);
      const cy = Math.floor(p.y + dy * d);
      const i = cy * map.w + cx;
      const wall = map.walls[i];
      if (wall) return wall === WALL.DOOR && d < 1.5 ? T_DOOR : null;
      if (g.occ[i]) {
        const idx = g.occ[i] - 1;
        const pl = g.state.gym.placed[idx];
        const eq = EQUIPMENT[pl.type];
        const amenity = isAmenity(eq);
        const status = amenity ? amenityStatus(g.state, idx, EQUIPMENT) : null;
        const low = !amenity && g.state.stats.energy < setCost(eq, 0);
        const wear = Math.round(pl.wear || 0);
        const key = `${low}|${status?.reason}|${wear}|${g.state.money >= repairCost(eq, wear)}`;
        if (idx !== lastEquip || key !== lastEquipKey) {
          lastEquip = idx;
          lastEquipKey = key;
          const broken = isBroken(pl);
          T_EQUIP.label = broken ? `${eq.name}: BROKEN` : amenity ? `${eq.use.label}: ${eq.name}` : `Train: ${eq.name}`;
          T_EQUIP.alt = wear >= 1 ? `Repair $${repairCost(eq, wear)}` : "";
          T_EQUIP.note = broken ? "Members won't touch it until it's fixed." : amenity ? (status.ok ? amenityNote(eq) : status.reason)
            : low ? "Too tired! Eat, drink or sleep." : `${setCost(eq, 1)} energy per working set · wear ${wear}%`;
        }
        T_EQUIP.index = idx;
        return T_EQUIP;
      }
      if (map.blocked[i]) {
        for (const pr of PROPS) {
          if (!pr.act || Math.floor(pr.x) !== cx || Math.floor(pr.y) !== cy) continue;
          if (pr.act === "vending") {
            T_VEND.alt = `${SHOP.shake.name} $${prices().shake}`;
            return T_VEND;
          }
          if (lastClean !== g.state.gym.clean) {
            lastClean = g.state.gym.clean;
            T_DESK.note = `Cleanliness ${g.state.gym.clean}% · members like a clean gym`;
          }
          return T_DESK;
        }
        return null;
      }
    }
    return null;
  }

  function buy(id) {
    const s = g.state;
    const item = SHOP[id];
    const price = prices()[id];
    if (s.money < price) {
      audio.play("error");
      return pop("BROKE!", "#a8b0bc");
    }
    let it = item;
    if (id === "preworkout" && hasProduct(s, "pump")) it = { ...it, energy: it.energy + 10 };
    if (id === "snack" && hasProduct(s, "crunch")) it = { ...it, bf: 0 };
    g.state = {
      ...s, money: s.money - price, stats: consume(s.stats, it),
      today: { ...s.today, spent: s.today.spent + price, boost: Math.max(s.today.boost, it.boost) },
    };
    audio.play("buy");
    pop(`+${it.energy} ENERGY`, COLOR.green);
  }

  /** One line on what an amenity does for you. */
  function amenityNote(eq) {
    const u = eq.use;
    const bits = [`${u.minutes} min`];
    if (u.recover) bits.push(u.worked ? "eases sore muscles" : "faster recovery");
    if (u.energy) bits.push(`${u.energy > 0 ? "+" : ""}${u.energy} energy`);
    if (u.tan) bits.push(`${u.tan}-day stage tan`);
    if (u.practice) bits.push("better posing at shows");
    return `${bits.join(" · ")} · once a day`;
  }

  /** Use an amenity: posing practice is a minigame, the rest apply at once. */
  function enjoy(index, eq) {
    const st = amenityStatus(g.state, index, EQUIPMENT);
    if (!st.ok) {
      audio.play("error");
      return pop(st.reason.toUpperCase(), "#a8b0bc");
    }
    if (eq.use.practice) {
      startTrainer(g.trainer, "practice", g.state.gym.placed[index].type);
      g.trainIndex = index;
      g.mode = "train";
      return;
    }
    const r = useAmenity(g.state, index, EQUIPMENT);
    g.state = r.state;
    lastEquip = -1;
    audio.play("sleep");
    const msg = r.gains.tan ? "BRONZED!" : r.gains.recovered > 20 ? "RECOVERED!" : r.gains.energy > 0 ? `+${r.gains.energy} ENERGY` : "AHHH...";
    pop(msg, COLOR.cyan);
  }

  function interact(t, alt) {
    const s = g.state;
    if (t.kind === "member") {
      if (alt || s.today.chats.includes(t.id)) return;
      g.state = markTip({ ...s, today: { ...s.today, chats: [...s.today.chats, t.id] } }, "chat");
      audio.play("ui");
      pop("GOOD VIBES!", COLOR.green);
      return;
    }
    if (t.kind === "equip") {
      const pl = s.gym.placed[t.index];
      const eq = EQUIPMENT[pl.type];
      if (alt) {
        if (!(pl.wear >= 1)) return;
        if (s.money < repairCost(eq, pl.wear)) {
          audio.play("error");
          return pop("BROKE!", "#a8b0bc");
        }
        g.state = repair(s, t.index, EQUIPMENT);
        audio.play("clank");
        pop("GOOD AS NEW!", COLOR.cyan);
        lastEquip = -1;
        return;
      }
      if (isBroken(pl)) {
        audio.play("error");
        return pop("BROKEN! PRESS " + g.keyLabel("alt"), "#a8b0bc");
      }
      if (isAmenity(eq)) return enjoy(t.index, eq);
      if (s.stats.energy < setCost(eq, 0)) {
        audio.play("error");
        return pop("TOO TIRED!", "#a8b0bc");
      }
      startTrainer(g.trainer, "train", pl.type);
      g.trainIndex = t.index;
      g.mode = "train";
    } else if (t.kind === "door" && !alt) {
      sleep(false);
    } else if (t.kind === "desk" && !alt) {
      if (s.stats.energy < 10) return pop("TOO TIRED!", "#a8b0bc");
      g.state = markTip({ ...s, time: s.time + 30, stats: { ...s.stats, energy: s.stats.energy - 10 }, gym: { ...s.gym, clean: 100 } }, "clean");
      pop("SPARKLING!", COLOR.cyan);
    } else if (t.kind === "vending") {
      if (alt) buy("shake");
      else openShop();
    }
  }

  return { findTarget, interact, buy, prices, invalidate: () => (lastEquip = -1) };
}
