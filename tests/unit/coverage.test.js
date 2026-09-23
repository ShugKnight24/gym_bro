import { describe, it, expect } from "vitest";
import { sellValue, isOpen, findAt, inBounds } from "../../src/game/rules/build.js";
import { metrics, meets, reqText } from "../../src/game/rules/compete.js";
import { newStats, physique, canTrain, freshness, consume, recover, setCost, TIERS, MAX_ENERGY } from "../../src/game/rules/stats.js";
import { newGame, gymAppeal } from "../../src/game/rules/day.js";
import { EQUIPMENT, SHOP } from "../../src/game/data/equipment.js";

/** 3x3 map: a wall at (0,0), a static prop at (1,0), everything else open. */
function tinyMap() {
  const w = 3;
  const h = 3;
  const walls = new Uint8Array(w * h);
  const blocked = new Uint8Array(w * h);
  walls[0] = 1;
  blocked[1] = 1;
  return { w, h, walls, blocked, reserved: new Uint8Array(w * h), spawn: [1, 1], keep: [] };
}

describe("build helpers", () => {
  it("inBounds accepts cells inside the map only", () => {
    const m = tinyMap();
    expect(inBounds(m, 0, 0)).toBe(true);
    expect(inBounds(m, 2, 2)).toBe(true);
    expect(inBounds(m, -1, 0)).toBe(false);
    expect(inBounds(m, 0, -1)).toBe(false);
    expect(inBounds(m, 3, 0)).toBe(false);
    expect(inBounds(m, 0, 3)).toBe(false);
  });

  it("isOpen rejects walls, static props and out-of-bounds cells", () => {
    const m = tinyMap();
    expect(isOpen(m, 0, 0)).toBe(false); // wall
    expect(isOpen(m, 1, 0)).toBe(false); // blocked prop
    expect(isOpen(m, 2, 0)).toBe(true);
    expect(isOpen(m, 1, 1)).toBe(true);
    expect(isOpen(m, 3, 1)).toBe(false);
    expect(isOpen(m, -1, 1)).toBe(false);
  });

  it("findAt returns the index of the piece on a cell, or -1", () => {
    const placed = [{ x: 1, y: 2 }, { x: 4, y: 4 }];
    expect(findAt(placed, 4, 4)).toBe(1);
    expect(findAt(placed, 1, 2)).toBe(0);
    expect(findAt(placed, 2, 1)).toBe(-1);
    expect(findAt([], 0, 0)).toBe(-1);
  });

  it("sellValue refunds part of the cost, never more, as a whole number", () => {
    for (const eq of Object.values(EQUIPMENT)) {
      const v = sellValue(eq.cost);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(eq.cost);
    }
    expect(sellValue(0)).toBe(0);
    expect(sellValue(1000)).toBeGreaterThan(sellValue(100));
  });
});

describe("career requirements", () => {
  it("metrics expose the values requirements can reference", () => {
    const g = { ...newGame(), rep: 7, members: 5, money: 321 };
    const m = metrics(g);
    expect(m).toEqual({ str: g.stats.str, end: g.stats.end, phys: physique(g.stats), rep: 7, members: 5, money: 321 });
  });

  it("meets needs every requirement satisfied", () => {
    const m = { str: 30, end: 10, phys: 20, rep: 5, members: 3, money: 100 };
    expect(meets({}, m)).toBe(true);
    expect(meets({ str: 30 }, m)).toBe(true);
    expect(meets({ str: 20, money: 100 }, m)).toBe(true);
    expect(meets({ str: 31 }, m)).toBe(false);
    expect(meets({ str: 20, rep: 6 }, m)).toBe(false);
  });

  it("reqText lists each requirement and handles money and empty sets", () => {
    const t = reqText({ str: 20, money: 500 });
    expect(t).toContain("20");
    expect(t).toContain("$500");
    expect(t).toMatch(/STR/);
    expect(reqText({ phys: 15 })).toMatch(/Physique 15/);
    expect(reqText({})).not.toBe("");
  });
});

describe("stats helpers", () => {
  const bench = EQUIPMENT.bench_press;

  it("setCost grows with tier", () => {
    expect(setCost(bench, 0)).toBeLessThan(setCost(bench, 1));
    expect(setCost(bench, 1)).toBeLessThan(setCost(bench, 2));
    expect(setCost(bench)).toBe(setCost(bench, 1));
    expect(Number.isInteger(setCost(bench, 2))).toBe(true);
  });

  it("canTrain checks energy against the set cost for the tier", () => {
    const s = newStats();
    expect(canTrain(s, bench, 2)).toBe(true);
    const cost = setCost(bench, 1);
    expect(canTrain({ ...s, energy: cost }, bench, 1)).toBe(true);
    expect(canTrain({ ...s, energy: cost - 1 }, bench, 1)).toBe(false);
    // Just enough for a light set is not enough for a heavy one.
    const light = setCost(bench, 0);
    expect(canTrain({ ...s, energy: light }, bench, 0)).toBe(true);
    expect(canTrain({ ...s, energy: light }, bench, 2)).toBe(false);
  });

  it("freshness falls monotonically with fatigue and clamps out-of-range input", () => {
    expect(freshness(50)).toBeLessThan(freshness(10));
    expect(freshness(50)).toBeGreaterThan(freshness(90));
    expect(freshness(-20)).toBe(freshness(0));
    expect(freshness(150)).toBe(freshness(100));
    expect(freshness(100)).toBeGreaterThan(0);
  });

  it("consume is pure and adds body fat only for fatty items", () => {
    const s = { ...newStats(), energy: 40 };
    const shake = consume(s, SHOP.shake);
    expect(shake.energy).toBe(40 + SHOP.shake.energy);
    expect(shake.bf).toBe(s.bf);
    expect(consume(s, SHOP.snack).bf).toBeGreaterThan(s.bf);
    expect(s.energy).toBe(40);
    expect(consume({ ...s, energy: MAX_ENERGY }, SHOP.preworkout).energy).toBe(MAX_ENERGY);
  });

  it("recover is pure, never leaves negative fatigue, and scales with sleep", () => {
    const s = { ...newStats(), energy: 5, fat: { chest: 10, back: 0, legs: 60, arms: 100, core: 3 } };
    const r = recover(s);
    for (const k of Object.keys(s.fat)) {
      expect(r.fat[k]).toBeGreaterThanOrEqual(0);
      expect(r.fat[k]).toBeLessThanOrEqual(s.fat[k]);
    }
    expect(r.energy).toBeLessThanOrEqual(MAX_ENERGY);
    expect(recover(s, 0).energy).toBeLessThan(recover(s, 0.5).energy);
    expect(s.energy).toBe(5);
    expect(s.fat.arms).toBe(100);
    expect(r.str).toBe(s.str);
    expect(r.mus).toEqual(s.mus);
  });

  it("TIERS cost more energy as they get heavier", () => {
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].cost).toBeGreaterThan(TIERS[i - 1].cost);
  });
});

describe("gymAppeal", () => {
  it("rises with more equipment, cleanliness and reputation", () => {
    const g = newGame();
    const base = gymAppeal(g);
    expect(typeof base).toBe("number");
    const more = { ...g, gym: { ...g.gym, placed: [...g.gym.placed, { type: "squat_rack", x: 8, y: 6, rot: 2 }] } };
    expect(gymAppeal(more)).toBeGreaterThan(base);
    expect(gymAppeal({ ...g, gym: { ...g.gym, clean: 10 } })).toBeLessThan(gymAppeal({ ...g, gym: { ...g.gym, clean: 100 } }));
    expect(gymAppeal({ ...g, rep: 40 })).toBeGreaterThan(base);
  });

  it("is lower for an empty gym than for the starter gym", () => {
    const g = newGame();
    expect(gymAppeal({ ...g, gym: { ...g.gym, placed: [] } })).toBeLessThan(gymAppeal(g));
  });
});
