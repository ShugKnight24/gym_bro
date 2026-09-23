import { describe, it, expect } from "vitest";
import { tempo, meterPos, judge, setQuality, PERFECT, GOOD, MISS } from "../../src/game/rules/timing.js";
import { appeal, targetMembers, memberDelta, capacity, cleanAfterDay } from "../../src/game/rules/members.js";
import { newGame, endDay, clockText, advanceClock, isPastMidnight, DAY_START, DAY_END } from "../../src/game/rules/day.js";
import { resolveEvent, eventScore, eligibility, applyEvent, careerStatus, reqProgress } from "../../src/game/rules/compete.js";
import { placementError, reachable, accessCell } from "../../src/game/rules/build.js";
import { EQUIPMENT } from "../../src/game/data/equipment.js";

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

describe("timing meter", () => {
  it("ping-pongs between 0 and 1", () => {
    expect(meterPos(0)).toBe(0);
    expect(meterPos(0.5)).toBe(0.5);
    expect(meterPos(1)).toBe(1);
    expect(meterPos(1.25)).toBe(0.75);
    expect(meterPos(2)).toBe(0);
  });

  it("judges the sweet spot", () => {
    const t = tempo(1);
    expect(judge(0.5, t)).toBe(PERFECT);
    expect(judge(0.5 + t.perfect + 0.01, t)).toBe(GOOD);
    expect(judge(0.95, t)).toBe(MISS);
  });

  it("tightens with weight", () => {
    expect(tempo(2).speed).toBeGreaterThan(tempo(0).speed);
    expect(tempo(2).perfect).toBeLessThan(tempo(0).perfect);
    expect(tempo(2).good).toBeLessThan(tempo(0).good);
  });

  it("scores sets with a combo bonus", () => {
    expect(setQuality([])).toBe(0);
    expect(setQuality([MISS, MISS])).toBe(0);
    const clean = setQuality([PERFECT, PERFECT, PERFECT, PERFECT]);
    const broken = setQuality([PERFECT, PERFECT, MISS, PERFECT]);
    expect(clean).toBeGreaterThan(1);
    expect(broken).toBeLessThan(clean);
    expect(setQuality([GOOD, GOOD])).toBeLessThan(setQuality([PERFECT, PERFECT]));
  });
});

describe("member appeal", () => {
  const rack = { type: "dumbbell_rack" };
  const bench = { type: "bench_press" };
  it("prefers variety over duplicates", () => {
    const dup = appeal([rack, rack], 100, 0, EQUIPMENT);
    const varied = appeal([rack, bench], 100, 0, EQUIPMENT);
    expect(varied).toBeGreaterThan(dup);
  });
  it("drops with dirt, rises with reputation", () => {
    expect(appeal([rack, bench], 20, 0, EQUIPMENT)).toBeLessThan(appeal([rack, bench], 100, 0, EQUIPMENT));
    expect(appeal([rack], 100, 30, EQUIPMENT)).toBeGreaterThan(appeal([rack], 100, 0, EQUIPMENT));
  });
  it("targets members within capacity and drifts slowly", () => {
    expect(targetMembers(100, 8)).toBe(8);
    expect(targetMembers(22, 99)).toBe(4);
    expect(capacity([rack, bench])).toBe(8);
    expect(memberDelta(2, 20)).toBe(3);
    expect(memberDelta(10, 0)).toBe(-2);
    expect(cleanAfterDay(80, 10)).toBe(65);
  });
});

describe("day rollover", () => {
  it("formats the clock", () => {
    expect(clockText(7 * 60)).toBe("07:00");
    expect(clockText(23 * 60 + 5)).toBe("23:05");
    expect(clockText(24 * 60 + 30)).toBe("00:30");
  });

  it("collects dues, recovers and starts the next morning", () => {
    let g = newGame();
    g = { ...g, time: 20 * 60, stats: { ...g.stats, energy: 5, fat: { ...g.stats.fat, chest: 60 } } };
    const { state, summary } = endDay(g);
    expect(summary.dues).toBe(g.members * g.dues);
    expect(state.money).toBe(g.money + summary.dues);
    expect(state.day).toBe(2);
    expect(state.time).toBe(DAY_START);
    expect(state.stats.energy).toBe(100);
    expect(state.stats.fat.chest).toBeLessThan(60);
    expect(summary.passedOut).toBe(false);
  });

  it("passing out after midnight recovers less", () => {
    const g = advanceClock(newGame(), DAY_END - DAY_START + 10);
    expect(isPastMidnight(g)).toBe(true);
    const { state, summary } = endDay({ ...g, stats: { ...g.stats, energy: 0 } });
    expect(summary.passedOut).toBe(true);
    expect(state.stats.energy).toBeLessThan(100);
  });

  it("grows the roster toward appeal", () => {
    const g = newGame();
    const { state } = endDay(g);
    expect(state.members).toBeGreaterThan(g.members);
  });
});

describe("competition", () => {
  const strong = () => {
    const g = newGame();
    return { ...g, rep: 5, stats: { ...g.stats, bf: 10, mus: { chest: 40, back: 40, legs: 40, arms: 40, core: 40 } } };
  };

  it("places a big physique first and pays the prize", () => {
    const r = resolveEvent("county", eventScore("show", strong().stats, 1), seq(0.5));
    expect(r.place).toBe(1);
    expect(r.prize).toBe(400);
    expect(r.field[0].you).toBe(true);
  });

  it("places a beginner last", () => {
    const r = resolveEvent("county", eventScore("show", newGame().stats, 0.5), seq(0.5));
    expect(r.place).toBe(6);
    expect(r.prize).toBe(0);
  });

  it("posing execution matters", () => {
    const s = strong().stats;
    expect(eventScore("show", s, 1)).toBeGreaterThan(eventScore("show", s, 0));
  });

  it("checks eligibility and cooldown", () => {
    expect(eligibility(newGame(), "county").ok).toBe(false);
    const g = strong();
    expect(eligibility(g, "county").ok).toBe(true);
    const after = applyEvent(g, "county", { place: 1, prize: 400, rep: 12 });
    expect(after.money).toBe(g.money - 25 + 400);
    expect(after.rep).toBe(g.rep + 12);
    expect(eligibility(after, "county").ok).toBe(false);
    expect(eligibility({ ...after, day: after.day + 5 }, "county").ok).toBe(true);
  });

  it("reports career ranks and progress", () => {
    const st = careerStatus(newGame());
    expect(st.map((c) => c.id)).toEqual(["athlete", "competitor", "owner", "supplements"]);
    expect(st.find((c) => c.id === "supplements").locked).toBe(true);
    const rich = careerStatus({ ...newGame(), money: 6000 });
    expect(rich.find((c) => c.id === "supplements").locked).toBe(false);
    expect(reqProgress({ str: 20 }, { str: 10 })).toBe(0.5);
  });
});

describe("placement", () => {
  // 6×5 room, walls on the border, spawn bottom-left inside.
  const room = () => {
    const w = 6, h = 5;
    const walls = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!x || !y || x === w - 1 || y === h - 1) walls[y * w + x] = 1;
    return { w, h, walls, blocked: new Uint8Array(w * h), reserved: new Uint8Array(w * h), spawn: [1, 3], keep: [[1, 3]] };
  };

  it("accepts open floor with a clear access side", () => {
    expect(placementError(room(), [], 2, 1, 2)).toBeNull();
    expect(accessCell(2, 1, 2)).toEqual([2, 2]);
  });

  it("rejects walls, occupied cells, reserved cells and walled-in access", () => {
    const m = room();
    expect(placementError(m, [], 0, 0, 2)).toBe("Not open floor");
    expect(placementError(m, [{ x: 2, y: 1, rot: 2 }], 2, 1, 2)).toBe("Occupied");
    expect(placementError(m, [], 2, 1, 0)).toBe("Needs a clear access side");
    m.reserved[1 * m.w + 3] = 1;
    expect(placementError(m, [], 3, 1, 2)).toBe("Keep this area clear");
  });

  it("never blocks another machine's access cell", () => {
    expect(placementError(room(), [{ x: 2, y: 1, rot: 2 }], 2, 2, 2)).toBe("Blocks another machine");
  });

  it("keeps every access cell reachable", () => {
    const m = room();
    // A wall of machines across column 3 would cut the right side off.
    const placed = [{ x: 3, y: 1, rot: 1 }, { x: 3, y: 2, rot: 1 }];
    expect(placementError(m, placed, 3, 3, 1)).toBe("Blocks the walkway");
    expect(reachable(m, placed)[2 * m.w + 4]).toBe(1);
  });
});
