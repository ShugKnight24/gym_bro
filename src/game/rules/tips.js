/**
 * First-days checklist: a handful of steps that teach the loop. Each is done
 * when the state shows it (sets trained, a new machine) or when the game
 * records the act in `g.tips` (cleaned, opened the office, chatted). Pure.
 */

export const TIPS = [
  { id: "train", text: "Walk up to a machine, {use} to train", done: (g) => g.today.sets > 0 || g.day > 1 },
  { id: "chat", text: "Face a member, {use} to chat", done: (g) => g.tips.includes("chat") },
  { id: "clean", text: "{use} at the front desk to clean", done: (g) => g.tips.includes("clean") },
  { id: "build", text: "{build} to buy a new machine", done: (g) => g.gym.placed.length > 3 },
  { id: "office", text: "{gym} for the office: dues, members", done: (g) => g.tips.includes("office") },
  { id: "sleep", text: "{use} at the HOME door to end the day", done: (g) => g.day > 1 },
];

/** The next `n` unfinished steps (empty when the checklist is done). */
export const nextTips = (g, n = 2) => TIPS.filter((t) => !t.done(g)).slice(0, n);

/** Fill in the key names for the player's current device: {use} → "E". */
export const tipText = (t, key) => t.text.replace(/\{(\w+)\}/g, (_, a) => key(a));

/** Record a one-off act for the checklist. */
export const markTip = (g, id) => (g.tips.includes(id) ? g : { ...g, tips: [...g.tips, id] });
