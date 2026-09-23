/**
 * Equipment catalog. Every piece occupies one 2 m floor cell and is used from
 * its access cell (the neighbour its `rot` faces). `groups` weights which
 * muscles a set works, `gains` scales strength/endurance per set, `game` picks
 * the training minigame and viewmodel pose.
 */

export const GROUPS = ["chest", "back", "legs", "arms", "core"];

export const EQUIPMENT = {
  dumbbell_rack: {
    name: "Dumbbell Rack", cost: 300, sprite: "weight_rack", game: "curl",
    groups: { arms: 1, chest: 0.25, core: 0.15 }, gains: { str: 1, end: 0.2 },
    energy: 8, fatigue: 24, appeal: 6, desc: "Curls and presses. The heart of any bro's arm day.",
  },
  bench_press: {
    name: "Bench Press", cost: 450, sprite: "bench_press", game: "press",
    groups: { chest: 1, arms: 0.45, core: 0.1 }, gains: { str: 1.4, end: 0.1 },
    energy: 10, fatigue: 26, appeal: 8, desc: "International chest day starts here.",
  },
  squat_rack: {
    name: "Squat Rack", cost: 600, sprite: "squat_rack", game: "squat",
    groups: { legs: 1, core: 0.45, back: 0.3 }, gains: { str: 1.6, end: 0.3 },
    energy: 14, fatigue: 30, appeal: 9, desc: "Never skip it. Members respect a rack.",
  },
  treadmill: {
    name: "Treadmill", cost: 700, sprite: "treadmill", game: "run",
    groups: { legs: 0.5, core: 0.2 }, gains: { str: 0.1, end: 1.6 },
    energy: 12, fatigue: 12, appeal: 8, desc: "Cardio. Burns fat, builds endurance.",
  },
  punching_bag: {
    name: "Heavy Bag", cost: 250, sprite: "punching_bag", game: "punch",
    groups: { arms: 0.55, core: 0.5, back: 0.3 }, gains: { str: 0.5, end: 1 },
    energy: 10, fatigue: 16, appeal: 7, desc: "Conditioning with attitude.",
  },
  pullup_bar: {
    name: "Pull-up Station", cost: 200, sprite: "pullup_bar", game: "pull",
    groups: { back: 1, arms: 0.55 }, gains: { str: 1.2, end: 0.3 },
    energy: 10, fatigue: 24, appeal: 5, desc: "Cheap, brutal, builds the V-taper.",
  },
  rowing_machine: {
    name: "Rowing Machine", cost: 550, sprite: "rowing_machine", game: "row",
    groups: { back: 0.8, legs: 0.45, arms: 0.3 }, gains: { str: 0.4, end: 1.3 },
    energy: 11, fatigue: 16, appeal: 7, desc: "Full-body cardio that also grows a back.",
  },
};

export const EQUIPMENT_IDS = Object.keys(EQUIPMENT);

/** Consumables at the vending machine. `boost` multiplies gains for the rest of the day. */
export const SHOP = {
  shake: { name: "Protein Shake", price: 9, energy: 10, bf: 0, boost: 1.15 },
  snack: { name: "Energy Bar", price: 4, energy: 18, bf: 0.06, boost: 1 },
};
