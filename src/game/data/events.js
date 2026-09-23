/**
 * Competitions and career milestones. Rival `base` scores are on the same
 * scale as the player's event score (physique for shows, lift total for meets).
 */

export const EVENTS = {
  county: {
    kind: "show", name: "County Classic", entry: 25, req: { phys: 12 }, cooldown: 5,
    prizes: [400, 200, 100], rep: [12, 7, 4],
    rivals: [["Big Tony", 26], ["Marcus V.", 21], ["Dee Swole", 17], ["Kenji", 13], ["Rob the Slob", 8]],
  },
  regional: {
    kind: "show", name: "Regional Physique Open", entry: 80, req: { phys: 32, rep: 20 }, cooldown: 7,
    prizes: [1500, 700, 300], rep: [30, 18, 10],
    rivals: [["Iron Ivan", 48], ["Carla Cuts", 42], ["Big Tony", 36], ["Juice Lee", 33], ["Marcus V.", 28]],
  },
  garage: {
    kind: "meet", name: "Garage Open Meet", entry: 20, req: { str: 18 }, cooldown: 5,
    prizes: [300, 150, 60], rep: [10, 6, 3],
    rivals: [["Deadlift Dan", 30], ["Squatzilla", 25], ["Benchy B.", 20], ["Lil' Kev", 14]],
  },
};

export const EVENT_IDS = Object.keys(EVENTS);

/** Career ladders: each rank lists the thresholds to reach it. */
export const CAREERS = {
  athlete: {
    name: "Athlete", blurb: "Lift heavy, run far. Ranks unlock powerlifting meets.",
    ranks: [
      { name: "Gym Rat", req: {} },
      { name: "Amateur Lifter", req: { str: 18, end: 14 } },
      { name: "Semi-Pro", req: { str: 35, end: 28 } },
      { name: "Pro Athlete", req: { str: 60, end: 50 } },
    ],
    events: ["garage"],
  },
  competitor: {
    name: "Competitor", blurb: "Physique shows judge size, symmetry and definition.",
    ranks: [
      { name: "Hopeful", req: {} },
      { name: "Local Contender", req: { phys: 12 } },
      { name: "Regional Threat", req: { phys: 32, rep: 20 } },
      { name: "Pro Card", req: { phys: 55, rep: 60 } },
    ],
    events: ["county", "regional"],
  },
  owner: {
    name: "Gym Owner", blurb: "Buy equipment, keep it clean, members pay daily dues.",
    ranks: [
      { name: "Garage Gym", req: {} },
      { name: "Neighbourhood Gym", req: { members: 8 } },
      { name: "Popular Spot", req: { members: 18, rep: 25 } },
      { name: "Franchise Ready", req: { members: 35, rep: 60 } },
    ],
    events: [],
  },
  supplements: {
    name: "Supplement Co.", blurb: "Your own label. Unlocks once the bank says so.",
    ranks: [
      { name: "Locked", req: {} },
      { name: "Startup", req: { money: 5000 } },
      { name: "Brand", req: { money: 15000, rep: 50 } },
    ],
    events: [],
    products: ["Whey Hey! Protein", "Pump Juice Pre-Workout", "Bro-Mega Fish Oil", "Creatine Crunch Bars"],
  },
};

export const CAREER_IDS = Object.keys(CAREERS);
