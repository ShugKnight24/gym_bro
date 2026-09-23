/**
 * What the player is looking at and what E / F do with it: equipment
 * (train, repair), the desk (clean), the vending machine (shop, quick
 * shake) and the home door (sleep). Targets are reused objects whose text
 * is rebuilt only when something it shows changes.
 */

import { WALL, PROPS } from "./world/map.js";
import { EQUIPMENT, SHOP } from "./data/equipment.js";
import { consume, setCost } from "./rules/stats.js";
import { isBroken } from "./rules/members.js";
import { repair, repairCost } from "./rules/economy.js";
import { hasProduct } from "./rules/supplements.js";
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
  let lastEquip = -1;
  let lastEquipKey = "";
  let lastClean = -1;

  /** Vending prices after supplement-line perks. */
  const prices = () => {
    const out = {};
    for (const id in SHOP) out[id] = id === "shake" && hasProduct(g.state, "whey") ? Math.ceil(SHOP[id].price / 2) : SHOP[id].price;
    return out;
  };

  function findTarget() {
    const p = g.player;
    const map = g.map;
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
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
        const low = g.state.stats.energy < setCost(eq, 0);
        const wear = Math.round(pl.wear || 0);
        const key = `${low}|${wear}|${g.state.money >= repairCost(eq, wear)}`;
        if (idx !== lastEquip || key !== lastEquipKey) {
          lastEquip = idx;
          lastEquipKey = key;
          const broken = isBroken(pl);
          T_EQUIP.label = broken ? `${eq.name}: BROKEN` : `Train: ${eq.name}`;
          T_EQUIP.alt = wear >= 1 ? `Repair $${repairCost(eq, wear)}` : "";
          T_EQUIP.note = broken ? "Members won't touch it until it's fixed." : low ? "Too tired! Eat, drink or sleep."
            : `${setCost(eq, 1)} energy per working set · wear ${wear}%`;
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

  function interact(t, alt) {
    const s = g.state;
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
      g.state = { ...s, time: s.time + 30, stats: { ...s.stats, energy: s.stats.energy - 10 }, gym: { ...s.gym, clean: 100 } };
      pop("SPARKLING!", COLOR.cyan);
    } else if (t.kind === "vending") {
      if (alt) buy("shake");
      else openShop();
    }
  }

  return { findTarget, interact, buy, prices, invalidate: () => (lastEquip = -1) };
}
