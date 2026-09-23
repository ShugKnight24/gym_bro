import { describe, it, expect } from "vitest";
import { newGame, endDay, gymReport } from "../../src/game/rules/day.js";
import { appeal, capacity, satisfaction, rosterChange, fairDues, priceDemand, BROKEN } from "../../src/game/rules/members.js";
import { dailyCosts, wearAfterDay, repairCost, repair, upgradeStatus, buyUpgrade } from "../../src/game/rules/economy.js";
import { nightlySales, launchStatus, launch, setAds } from "../../src/game/rules/supplements.js";
import { rollHappening } from "../../src/game/rules/happenings.js";
import { promote, careerRank, careerStatus, awardScore } from "../../src/game/rules/compete.js";
import { normalizeState, migrateSave, SAVE_VERSION } from "../../src/game/rules/save-state.js";
import { rngFor, hash } from "../../src/game/rules/rng.js";
import { EQUIPMENT } from "../../src/game/data/equipment.js";

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const base = () => newGame(42);

describe("seeded rng", () => {
  it("replays the same stream for the same keys", () => {
    const a = rngFor(7, 3, 1);
    const b = rngFor(7, 3, 1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hash(7, 3, 1)).not.toBe(hash(7, 3, 2));
  });

  it("makes the whole night reproducible", () => {
    const g = { ...base(), members: 12 };
    expect(endDay(g).state).toEqual(endDay(g).state);
  });
});

describe("costs and wear", () => {
  it("charges rent per machine plus staff, annex and ads", () => {
    const g = base();
    const c = dailyCosts(g);
    expect(c.total).toBe(10 + 3 * g.gym.placed.length);
    const staffed = { ...g, gym: { ...g.gym, upgrades: { cleaner: true, annex: true } }, supps: { ...g.supps, ads: 2 } };
    expect(dailyCosts(staffed).total).toBeGreaterThan(c.total + 30 + 45);
  });

  it("wears machines by use and breaks them at 100", () => {
    const placed = [{ type: "treadmill", x: 1, y: 1, rot: 0, wear: 99 }, { type: "bench_press", x: 2, y: 1, rot: 0, wear: 0 }];
    const r = wearAfterDay(placed, 10, EQUIPMENT);
    expect(r.placed[0].wear).toBe(BROKEN);
    expect(r.broke).toEqual(["treadmill"]);
    expect(r.placed[1].wear).toBeGreaterThan(0);
    expect(wearAfterDay(placed, 0, EQUIPMENT).placed[1].wear).toBe(0);
  });

  it("broken machines give no appeal or capacity", () => {
    const ok = [{ type: "bench_press", wear: 0 }, { type: "treadmill", wear: 0 }];
    const bad = [{ type: "bench_press", wear: 0 }, { type: "treadmill", wear: BROKEN }];
    expect(capacity(bad)).toBe(4);
    expect(appeal(bad, 100, 0, EQUIPMENT)).toBeLessThan(appeal(ok, 100, 0, EQUIPMENT));
  });

  it("repairs for a share of the machine's price", () => {
    const g = { ...base(), money: 1000 };
    g.gym.placed[0].wear = BROKEN;
    const eq = EQUIPMENT[g.gym.placed[0].type];
    expect(repairCost(eq, BROKEN)).toBe(Math.ceil(eq.cost * 0.25));
    expect(repairCost(eq, 50)).toBeLessThan(repairCost(eq, BROKEN));
    const r = repair(g, 0, EQUIPMENT);
    expect(r.gym.placed[0].wear).toBe(0);
    expect(r.money).toBe(1000 - repairCost(eq, BROKEN));
  });

  it("gates upgrades on owner rank and money", () => {
    const g = { ...base(), money: 5000 };
    expect(upgradeStatus(g, "annex", 1).ok).toBe(false);
    expect(upgradeStatus(g, "annex", 2).ok).toBe(true);
    expect(upgradeStatus({ ...g, money: 10 }, "annex", 2).ok).toBe(false);
    const bought = buyUpgrade(g, "annex");
    expect(bought.gym.upgrades.annex).toBe(true);
    expect(upgradeStatus(bought, "annex", 3).ok).toBe(false);
  });
});

describe("members", () => {
  const inputs = { members: 10, cap: 20, clean: 80, broken: 0, dues: 12, fair: 14, distinct: 4 };
  it("are happier in clean, roomy, fairly priced gyms", () => {
    const s = satisfaction(inputs);
    expect(satisfaction({ ...inputs, members: 20 })).toBeLessThan(s);
    expect(satisfaction({ ...inputs, clean: 20 })).toBeLessThan(s);
    expect(satisfaction({ ...inputs, broken: 2 })).toBeLessThan(s);
    expect(satisfaction({ ...inputs, dues: 30 })).toBeLessThan(s);
  });

  it("quit when unhappy, join toward the target when happy", () => {
    expect(rosterChange(20, 20, 20).quit).toBeGreaterThan(0);
    expect(rosterChange(20, 20, 70).quit).toBe(0);
    expect(rosterChange(5, 20, 70).join).toBe(3);
    expect(rosterChange(5, 20, 90).join).toBe(4);
  });

  it("price demand: cheaper than fair draws more", () => {
    const fair = fairDues(40, 10);
    expect(priceDemand(fair - 5, fair)).toBeGreaterThan(1);
    expect(priceDemand(fair * 3, fair)).toBe(0.25);
  });

  it("dues pricing changes the nightly target", () => {
    const g = { ...base(), rep: 20 };
    expect(gymReport({ ...g, dues: 4 }).target).toBeGreaterThanOrEqual(gymReport({ ...g, dues: 40 }).target);
  });
});

describe("supplements", () => {
  it("need the rank, then sell nightly with ads multiplying", () => {
    const g = { ...base(), money: 6000, rep: 20, members: 10 };
    expect(launchStatus(g, "whey", 0).ok).toBe(false);
    expect(launchStatus(g, "whey", 1).ok).toBe(true);
    expect(launchStatus(g, "crunch", 1).ok).toBe(false);
    const l = launch(g, "whey");
    expect(l.money).toBe(4500);
    expect(launchStatus(l, "whey", 1).ok).toBe(false);
    const plain = nightlySales(l, seq(0.5));
    const adv = nightlySales(setAds(l, 3), seq(0.5));
    expect(plain.revenue).toBeGreaterThan(0);
    expect(adv.revenue).toBeGreaterThan(plain.revenue * 2);
  });

  it("the night pays out sales", () => {
    const g = launch({ ...base(), money: 2000, members: 5 }, "whey");
    const { summary } = endDay(g);
    expect(summary.sales.revenue).toBeGreaterThan(0);
  });
});

describe("happenings", () => {
  it("usually nothing happens", () => {
    const g = base();
    expect(rollHappening(g, seq(0.9)).news).toBeNull();
  });

  it("an inspection fines a dirty gym", () => {
    const g = { ...base(), day: 10, gym: { ...base().gym, clean: 10 } };
    // Roll under the chance, then pick "inspection" from the eligible pool.
    let r = null;
    for (let i = 0; i < 20 && r?.news?.id !== "inspection"; i++) r = rollHappening(g, seq(0.1, i / 20));
    expect(r.news.id).toBe("inspection");
    expect(r.state.money).toBe(g.money - 100);
  });
});

describe("careers", () => {
  it("ranks are sticky once earned", () => {
    const rich = { ...base(), money: 6000 };
    const { state, ups } = promote(rich);
    expect(ups.map((u) => u.id)).toContain("supplements");
    const spent = { ...state, money: 10 };
    expect(careerRank(spent, "supplements")).toBe(1);
    expect(careerStatus(spent).find((c) => c.id === "supplements").locked).toBe(false);
    expect(promote(spent).ups).toEqual([]);
  });

  it("flags the top rank", () => {
    const g = { ...base(), members: 40, rep: 70 };
    const top = promote(g).ups.find((u) => u.id === "owner");
    expect(top.top).toBe(true);
  });

  it("awards judge the gym", () => {
    expect(awardScore({ members: 30, sat: 80 }, 60)).toBeGreaterThan(awardScore({ members: 5, sat: 40 }, 20));
  });
});

describe("save normalisation", () => {
  it("round-trips a fresh game", () => {
    const g = base();
    expect(normalizeState(JSON.parse(JSON.stringify(g)))).toEqual(g);
  });

  it("fills missing fields and fixes bad ones", () => {
    const s = normalizeState({ day: 3, money: "lots", gym: { placed: [{ type: "nope", x: 1, y: 1 }, { type: "bench_press", x: 2, y: 2, rot: 5 }] } });
    expect(s.day).toBe(3);
    expect(s.money).toBe(400);
    expect(s.stats.mus.chest).toBeGreaterThan(0);
    expect(s.gym.placed).toEqual([{ type: "bench_press", x: 2, y: 2, rot: 1, wear: 0 }]);
    expect(s.career.best).toEqual({});
  });

  it("clamps ranks and dues into range", () => {
    const s = normalizeState({ dues: 5000, career: { best: { owner: 99, athlete: -3, nope: 1 } } });
    expect(s.dues).toBe(60);
    expect(s.career.best).toEqual({ owner: 3, athlete: 0 });
  });

  it("rejects non-saves and migrates v1", () => {
    expect(normalizeState(null)).toBeNull();
    expect(normalizeState("garbage")).toBeNull();
    const v1 = { v: 1, state: { day: 5, time: 500, money: 900, rep: 3, members: 4, dues: 12, stats: base().stats, gym: { placed: [], clean: 50 }, career: { results: [], last: {} }, today: {} } };
    const m = migrateSave(v1);
    expect(m.v).toBe(SAVE_VERSION);
    expect(m.state.day).toBe(5);
    expect(m.state.supps).toEqual({ launched: [], ads: 0 });
    expect(typeof m.state.seed).toBe("number");
  });
});
