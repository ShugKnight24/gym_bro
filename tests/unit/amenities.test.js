import { describe, it, expect } from "vitest";
import { newGame, endDay, gymReport } from "../../src/game/rules/day.js";
import { amenityStatus, useAmenity, practise, showBonus, amenityEffect, amenityUpkeep, tanningFees, LOCKER_ROOM_AT } from "../../src/game/rules/amenities.js";
import { capacity, BROKEN } from "../../src/game/rules/members.js";
import { dailyCosts } from "../../src/game/rules/economy.js";
import { eventScore } from "../../src/game/rules/compete.js";
import { normalizeState } from "../../src/game/rules/save-state.js";
import { EQUIPMENT } from "../../src/game/data/equipment.js";

const withAmenity = (type, extra = {}) => {
  const g = newGame(7);
  return { ...g, ...extra, gym: { ...g.gym, placed: [...g.gym.placed, { type, x: 12, y: 2, rot: 2, wear: 0 }] } };
};
const idx = (g) => g.gym.placed.length - 1;

describe("amenities", () => {
  it("recover sore muscles, pass time, and only once a day", () => {
    let g = withAmenity("sauna");
    g = { ...g, stats: { ...g.stats, fat: { ...g.stats.fat, chest: 60, legs: 40 } } };
    expect(amenityStatus(g, idx(g), EQUIPMENT).ok).toBe(true);
    const r = useAmenity(g, idx(g), EQUIPMENT);
    expect(r.state.stats.fat.chest).toBe(42);
    expect(r.state.time).toBe(g.time + EQUIPMENT.sauna.use.minutes);
    expect(r.gains.recovered).toBeGreaterThan(0);
    expect(amenityStatus(r.state, idx(g), EQUIPMENT)).toEqual({ ok: false, reason: "Already used today" });
    expect(endDay(r.state).state.today.used).toEqual([]);
  });

  it("recovery tools focus on sore groups", () => {
    let g = withAmenity("recovery_station");
    g = { ...g, stats: { ...g.stats, fat: { ...g.stats.fat, chest: 60, legs: 20 } } };
    const f = useAmenity(g, idx(g), EQUIPMENT).state.stats.fat;
    expect(60 - f.chest).toBeGreaterThan(20 - f.legs);
  });

  it("broken amenities can't be used", () => {
    const g = withAmenity("cold_plunge");
    g.gym.placed[idx(g)].wear = BROKEN;
    expect(amenityStatus(g, idx(g), EQUIPMENT).reason).toBe("Out of order");
  });

  it("a tan and posing practice lift show scores; the tan fades nightly", () => {
    const g = withAmenity("tanning_bed");
    const tanned = useAmenity(g, idx(g), EQUIPMENT).state;
    expect(tanned.stats.tan).toBe(4);
    const s = { ...g.stats, mus: { chest: 30, back: 30, legs: 30, arms: 30, core: 30 }, bf: 12 };
    expect(eventScore("show", { ...s, tan: 3 }, 1)).toBeGreaterThan(eventScore("show", s, 1));
    const practised = practise(s, 1);
    expect(practised.posing).toBeGreaterThan(0);
    expect(showBonus(practised)).toBeGreaterThan(showBonus(s));
    expect(endDay(tanned).state.stats.tan).toBe(3);
  });

  it("add satisfaction and fair dues but no capacity, and cost upkeep", () => {
    const base = newGame(7);
    const g = withAmenity("steam_room");
    expect(capacity(g.gym.placed, EQUIPMENT)).toBe(capacity(base.gym.placed, EQUIPMENT));
    expect(gymReport(g).fair).toBeGreaterThan(gymReport(base).fair);
    expect(amenityEffect(g.gym.placed, 2, EQUIPMENT).sat).toBe(2);
    expect(dailyCosts(g).total).toBe(dailyCosts(base).total + 3 + EQUIPMENT.steam_room.upkeep);
    expect(amenityUpkeep(g.gym.placed, EQUIPMENT)).toBe(EQUIPMENT.steam_room.upkeep);
  });

  it("big gyms without a locker room lose satisfaction", () => {
    const g = newGame(7);
    const e = amenityEffect(g.gym.placed, LOCKER_ROOM_AT, EQUIPMENT);
    expect(e.sat).toBeLessThan(0);
    expect(e.reason).toMatch(/locker room/);
    const lk = withAmenity("locker_room");
    expect(amenityEffect(lk.gym.placed, LOCKER_ROOM_AT, EQUIPMENT).reason).toBe("");
  });

  it("members pay for tanning sessions", () => {
    const g = withAmenity("tanning_bed", { members: 12 });
    expect(tanningFees(g.gym.placed, 12, EQUIPMENT)).toBe(12);
    const { summary } = endDay(g);
    expect(summary.fees).toBe(12);
  });

  it("saves keep the new fields and drop junk", () => {
    const s = normalizeState({ ...newGame(3), stats: { ...newGame(3).stats, tan: 99, posing: 5 }, today: { ...newGame(3).today, used: ["sauna", "nope", 3] } });
    expect(s.stats.tan).toBe(14);
    expect(s.stats.posing).toBe(1);
    expect(s.today.used).toEqual(["sauna"]);
  });
});
