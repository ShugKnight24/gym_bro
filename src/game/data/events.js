/**
 * Competitions and career milestones. Rival `base` scores are on the same
 * scale as the player's event score (physique for shows, lift total for meets,
 * gym score for awards). Awards have no minigame: they resolve on entry.
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
  national_show: {
    kind: "show", name: "National Physique Championship", entry: 200, req: { phys: 45, rep: 45 }, cooldown: 10,
    prizes: [5000, 2500, 1000], rep: [45, 25, 12],
    rivals: [["Adonis Ray", 62], ["Carla Cuts", 57], ["Iron Ivan", 53], ["The Mountain", 49], ["Juice Lee", 44]],
  },
  pro_show: {
    kind: "show", name: "Pro Invitational", entry: 500, req: { phys: 55, rep: 60 }, cooldown: 14,
    prizes: [20000, 8000, 3000], rep: [80, 40, 20],
    rivals: [["Mr. Universe", 74], ["Adonis Ray", 68], ["Big Tony Sr.", 64], ["Carla Cuts", 60], ["Iron Ivan", 57]],
  },
  garage: {
    kind: "meet", name: "Garage Open Meet", entry: 20, req: { str: 18 }, cooldown: 5,
    prizes: [300, 150, 60], rep: [10, 6, 3],
    rivals: [["Deadlift Dan", 30], ["Squatzilla", 25], ["Benchy B.", 20], ["Lil' Kev", 14]],
  },
  state_meet: {
    kind: "meet", name: "State Powerlifting Championship", entry: 60, req: { str: 32, end: 20 }, cooldown: 7,
    prizes: [1200, 600, 250], rep: [25, 14, 7],
    rivals: [["Squatzilla", 49], ["Deadlift Dan", 44], ["Hammer Hana", 40], ["Big Sal", 35], ["Benchy B.", 29]],
  },
  national_meet: {
    kind: "meet", name: "National Strength Open", entry: 150, req: { str: 50, end: 38, rep: 40 }, cooldown: 12,
    prizes: [6000, 3000, 1200], rep: [50, 28, 14],
    rivals: [["The Mountain", 72], ["Hammer Hana", 66], ["Viking Olaf", 61], ["Squatzilla", 55], ["Big Sal", 48]],
  },
  gym_award: {
    kind: "award", name: "Gym of the Year Awards", entry: 100, req: { members: 18, rep: 25 }, cooldown: 14,
    prizes: [3000, 1200, 400], rep: [35, 18, 8],
    rivals: [["Planet Fatness", 62], ["Iron Temple", 54], ["CrossBox HQ", 47], ["Muscle Barn", 38]],
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
    events: ["garage", "state_meet", "national_meet"],
  },
  competitor: {
    name: "Competitor", blurb: "Physique shows judge size, symmetry and definition.",
    ranks: [
      { name: "Hopeful", req: {} },
      { name: "Local Contender", req: { phys: 12 } },
      { name: "Regional Threat", req: { phys: 32, rep: 20 } },
      { name: "Pro Card", req: { phys: 55, rep: 60 } },
    ],
    events: ["county", "regional", "national_show", "pro_show"],
  },
  owner: {
    name: "Gym Owner", blurb: "Buy equipment, keep it clean, members pay daily dues.",
    perks: ["", "Hire a cleaner", "Open the east annex", "Legend status"],
    ranks: [
      { name: "Garage Gym", req: {} },
      { name: "Neighbourhood Gym", req: { members: 8 } },
      { name: "Popular Spot", req: { members: 18, rep: 25 } },
      { name: "Franchise Ready", req: { members: 35, rep: 60 } },
    ],
    events: ["gym_award"],
  },
  supplements: {
    name: "Supplement Co.", blurb: "Your own label. Unlocks once the bank says so.",
    ranks: [
      { name: "Locked", req: {} },
      { name: "Startup", req: { money: 5000 } },
      { name: "Brand", req: { money: 15000, rep: 50 } },
    ],
    events: [],
    perks: ["", "Launch products, buy ads", "Creatine Crunch Bars"],
  },
};

export const CAREER_IDS = Object.keys(CAREERS);
