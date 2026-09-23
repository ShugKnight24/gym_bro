/**
 * Equipment catalog. Every piece occupies one 2 m floor cell and is used from
 * its access cell (the neighbour its `rot` faces). `groups` weights which
 * muscles a set works, `gains` scales strength/endurance per set, `game` picks
 * the training minigame and viewmodel pose, `wear` is durability lost per
 * member-day.
 */

export const GROUPS = ["chest", "back", "legs", "arms", "core"];

export const EQUIPMENT = {
  dumbbell_rack: {
    name: "Dumbbell Rack", cost: 300, sprite: "weight_rack", game: "curl",
    groups: { arms: 1, chest: 0.25, core: 0.15 }, gains: { str: 1, end: 0.2 },
    energy: 8, fatigue: 24, appeal: 6, wear: 1, desc: "Curls and presses. The heart of any bro's arm day.",
  },
  bench_press: {
    name: "Bench Press", cost: 450, sprite: "bench_press", game: "press",
    groups: { chest: 1, arms: 0.45, core: 0.1 }, gains: { str: 1.4, end: 0.1 },
    energy: 10, fatigue: 26, appeal: 8, wear: 1.5, desc: "International chest day starts here.",
  },
  squat_rack: {
    name: "Squat Rack", cost: 600, sprite: "squat_rack", game: "squat",
    groups: { legs: 1, core: 0.45, back: 0.3 }, gains: { str: 1.6, end: 0.3 },
    energy: 14, fatigue: 30, appeal: 9, wear: 1.5, desc: "Never skip it. Members respect a rack.",
  },
  treadmill: {
    name: "Treadmill", cost: 700, sprite: "treadmill", game: "run",
    groups: { legs: 0.5, core: 0.2 }, gains: { str: 0.1, end: 1.6 },
    energy: 12, fatigue: 12, appeal: 8, wear: 3, desc: "Cardio. Burns fat, builds endurance.",
  },
  punching_bag: {
    name: "Heavy Bag", cost: 250, sprite: "punching_bag", game: "punch",
    groups: { arms: 0.55, core: 0.5, back: 0.3 }, gains: { str: 0.5, end: 1 },
    energy: 10, fatigue: 16, appeal: 7, wear: 2, desc: "Conditioning with attitude.",
  },
  pullup_bar: {
    name: "Pull-up Station", cost: 200, sprite: "pullup_bar", game: "pull",
    groups: { back: 1, arms: 0.55 }, gains: { str: 1.2, end: 0.3 },
    energy: 10, fatigue: 24, appeal: 5, wear: 1, desc: "Cheap, brutal, builds the V-taper.",
  },
  rowing_machine: {
    name: "Rowing Machine", cost: 550, sprite: "rowing_machine", game: "row",
    groups: { back: 0.8, legs: 0.45, arms: 0.3 }, gains: { str: 0.4, end: 1.3 },
    energy: 11, fatigue: 16, appeal: 7, wear: 3, desc: "Full-body cardio that also grows a back.",
  },
  leg_press: {
    name: "Leg Press", cost: 800, sprite: "leg_press", game: "squat",
    groups: { legs: 1, core: 0.2 }, gains: { str: 1.5, end: 0.2 },
    energy: 13, fatigue: 28, appeal: 9, wear: 1.5, desc: "Stack the sled. Quads for days.",
  },
  cable_station: {
    name: "Cable Station", cost: 900, sprite: "cable_station", game: "pull",
    groups: { back: 0.8, chest: 0.6, arms: 0.6, core: 0.15 }, gains: { str: 1.2, end: 0.35 },
    energy: 10, fatigue: 20, appeal: 10, wear: 2, desc: "Pulleys for everything. Pros live here.",
  },
  stationary_bike: {
    name: "Stationary Bike", cost: 500, sprite: "stationary_bike", game: "run",
    groups: { legs: 0.7, core: 0.1 }, gains: { str: 0.15, end: 1.4 },
    energy: 10, fatigue: 12, appeal: 6, wear: 3, desc: "Spin to win. Easy on the knees.",
  },
  kettlebell_rack: {
    name: "Kettlebell Rack", cost: 350, sprite: "kettlebell_rack", game: "curl",
    groups: { arms: 0.6, core: 0.6, legs: 0.5, back: 0.2 }, gains: { str: 0.8, end: 0.8 },
    energy: 11, fatigue: 20, appeal: 6, wear: 1, desc: "Swings, snatches, cannonball grip.",
  },
  ab_bench: {
    name: "Ab Bench", cost: 220, sprite: "ab_bench", game: "row",
    groups: { core: 1, legs: 0.1 }, gains: { str: 0.6, end: 0.6 },
    energy: 7, fatigue: 18, appeal: 5, wear: 1, desc: "Decline crunches. Carve the six-pack.",
  },
};

export const EQUIPMENT_IDS = Object.keys(EQUIPMENT);

/** Consumables at the vending machine. `boost` multiplies gains for the rest of the day. */
export const SHOP = {
  shake: { name: "Protein Shake", price: 9, energy: 10, bf: 0, boost: 1.15 },
  snack: { name: "Energy Bar", price: 4, energy: 18, bf: 0.06, boost: 1 },
  preworkout: { name: "Pre-Workout", price: 15, energy: 25, bf: 0, boost: 1.1 },
};
