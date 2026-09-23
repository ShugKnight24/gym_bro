import { describe, it, expect } from "vitest";
import { newStats, trainSet, recover, physique, freshness, setCost, consume, TIERS } from "../../src/game/rules/stats.js";
import { EQUIPMENT, SHOP } from "../../src/game/data/equipment.js";

const bench = EQUIPMENT.bench_press;
const squat = EQUIPMENT.squat_rack;

describe("trainSet", () => {
  it("grows strength and the worked muscles, costs energy, adds fatigue", () => {
    const s = newStats();
    const r = trainSet(s, bench, 1, 1);
    expect(r.stats.str).toBeGreaterThan(s.str);
    expect(r.stats.mus.chest).toBeGreaterThan(s.mus.chest);
    expect(r.stats.mus.legs).toBe(s.mus.legs);
    expect(r.stats.energy).toBe(s.energy - setCost(bench, 1));
    expect(r.stats.fat.chest).toBeGreaterThan(0);
    expect(s.fat.chest).toBe(0); // pure
  });

  it("scales with quality and tier", () => {
    const s = newStats();
    const miss = trainSet(s, bench, 0, 1);
    const good = trainSet(s, bench, 1, 1);
    const heavy = trainSet(s, bench, 1, 2);
    expect(miss.gains.str).toBe(0);
    expect(heavy.gains.str).toBeGreaterThan(good.gains.str);
    expect(heavy.gains.energy).toBeGreaterThan(good.gains.energy);
  });

  it("refuses when too tired", () => {
    expect(trainSet({ ...newStats(), energy: 3 }, bench, 1, 1)).toBeNull();
  });

  it("rewards varied training: a fatigued muscle gains less than a fresh one", () => {
    let s = newStats();
    const first = trainSet(s, bench, 1, 1);
    s = first.stats;
    const again = trainSet(s, bench, 1, 1);
    const varied = trainSet(s, squat, 1, 1);
    expect(again.gains.mus.chest).toBeLessThan(first.gains.mus.chest);
    expect(varied.gains.mus.legs).toBeGreaterThan(again.gains.mus.chest);
  });

  it("has diminishing returns", () => {
    const weak = trainSet(newStats(), bench, 1, 1);
    const strong = trainSet({ ...newStats(), str: 80 }, bench, 1, 1);
    expect(strong.gains.str).toBeLessThan(weak.gains.str);
  });

  it("cardio burns more fat than lifting", () => {
    const run = trainSet(newStats(), EQUIPMENT.treadmill, 1, 1);
    const lift = trainSet(newStats(), bench, 1, 1);
    expect(run.gains.bf).toBeGreaterThan(lift.gains.bf);
  });
});

describe("recovery", () => {
  it("drains fatigue overnight and restores energy", () => {
    const tired = { ...newStats(), energy: 10, fat: { chest: 80, back: 20, legs: 0, arms: 50, core: 5 } };
    const r = recover(tired, 1);
    expect(r.energy).toBe(100);
    expect(r.fat.chest).toBe(30);
    expect(r.fat.back).toBe(0);
    expect(r.fat.legs).toBe(0);
  });

  it("recovers less after passing out", () => {
    const tired = { ...newStats(), energy: 0, fat: { chest: 80, back: 80, legs: 80, arms: 80, core: 80 } };
    const good = recover(tired, 1);
    const bad = recover(tired, 0.6);
    expect(bad.energy).toBeLessThan(good.energy);
    expect(bad.fat.chest).toBeGreaterThan(good.fat.chest);
  });

  it("freshness drops with fatigue", () => {
    expect(freshness(0)).toBe(1);
    expect(freshness(100)).toBe(0.25);
  });

  it("food restores energy up to the cap", () => {
    expect(consume({ ...newStats(), energy: 50 }, SHOP.snack).energy).toBe(68);
    expect(consume({ ...newStats(), energy: 95 }, SHOP.snack).energy).toBe(100);
  });
});

describe("physique", () => {
  it("rewards balance and low body fat", () => {
    const base = newStats();
    const balanced = { ...base, bf: 12, mus: { chest: 30, back: 30, legs: 30, arms: 30, core: 30 } };
    const lopsided = { ...base, bf: 12, mus: { chest: 60, back: 30, legs: 5, arms: 45, core: 10 } };
    const fat = { ...balanced, bf: 30 };
    expect(physique(balanced)).toBeGreaterThan(physique(lopsided));
    expect(physique(balanced)).toBeGreaterThan(physique(fat));
  });

  it("tiers are ordered", () => {
    expect(TIERS[2].gain).toBeGreaterThan(TIERS[0].gain);
  });
});

describe("progression pace", () => {
  // A committed player: varied machines, working weight, good timing, rests nightly.
  const ROT = ["bench_press", "squat_rack", "pullup_bar", "dumbbell_rack", "treadmill", "rowing_machine", "punching_bag"];
  const daysTo = (pred, cap = 150) => {
    let s = newStats();
    for (let d = 1; d <= cap; d++) {
      for (let n = 0; n < 12; n++) {
        const eq = EQUIPMENT[ROT[(d * 3 + n) % ROT.length]];
        if (s.energy - setCost(eq, 1) < 15) break;
        s = trainSet(s, eq, 0.95, 1).stats;
      }
      s = recover(s, 1);
      if (pred(s)) return d;
    }
    return Infinity;
  };

  it("opens the first meet within the first week or so", () => {
    expect(daysTo((s) => s.str >= 18)).toBeLessThanOrEqual(10);
    expect(daysTo((s) => physique(s) >= 12)).toBeLessThanOrEqual(14);
  });

  it("keeps the national and pro tiers a long-term goal", () => {
    expect(daysTo((s) => s.str >= 50)).toBeGreaterThanOrEqual(30);
    expect(daysTo((s) => physique(s) >= 55)).toBeGreaterThanOrEqual(40);
    expect(daysTo((s) => physique(s) >= 55)).toBeLessThan(120);
  });
});
