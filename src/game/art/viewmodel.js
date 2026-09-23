/**
 * First-person arms for the training minigames, inked like the figures.
 *
 * Units: the screen is 400 units wide with the origin at its bottom centre
 * and y up negative (16:9 puts the top edge near y = -225). Forearms run
 * well past the bottom edge so rep motion (a canvas transform, never a
 * re-raster) cannot uncover their ends.
 *
 * Sprites: press (barbell, both hands), curl (right arm + dumbbell; flip for
 * the left), glove (right boxing glove; flip), fist (bare right fist for
 * running; flip), overhead (bar gripped above: pull-ups and squats), row
 * (rowing handle). Arm girth follows the player's arm development.
 */

import {
  INK, f, P, lerp, capsule, sh, ln, ell, limb, lit, baseDefs, realDefs, withRealisticBuild, mix, spec,
} from "../../engine/ink-kit.js";
import { SKINS, PLAYER_LOOK } from "./figures.js";

const RIM = "#ffe6c8";

/** Forearm from elbow E (off-screen) to wrist W with a wristband and muscle belly. */
function forearm(E, W, w, skin, band = "#e2362b") {
  const dk = mix(skin, "#3a1a0a", 0.35);
  let s = limb(E, W, w * 1.18, w * 0.78, skin, 2);
  const b0 = lerp(W, E, 0.28);
  const b1 = lerp(W, E, 0.72);
  s += sh(capsule(b0, b1, w * 1.05, w * 1.2), skin, 0);
  s += ln(`M${P(...lerp(W, E, 0.25))}Q${P(lerp(W, E, 0.5)[0] + w * 0.25, lerp(W, E, 0.5)[1])} ${P(...lerp(W, E, 0.8))}`, dk, 2, 0.45);
  s += spec(`M${P(...lerp(W, E, 0.2))}L${P(...lerp(W, E, 0.7))}`, 0.45, 2);
  const len = Math.hypot(E[0] - W[0], E[1] - W[1]);
  const w0 = lerp(W, E, 10 / len);
  const w1 = lerp(W, E, 30 / len);
  s += sh(capsule(w0, w1, w * 0.95, w * 1.02), band, 2);
  s += ln(`M${P(...lerp(w0, w1, 0.5))}l${f(w * 0.3)},0`, "#ffffff", 2, 0.5);
  return s;
}

/** A fist wrapped over a horizontal bar at (x, y): knuckles on top, fingers down its front. */
function grip(x, y, w, skin, flip = 1) {
  const dk = mix(skin, "#3a1a0a", 0.35);
  const hw = w * 0.62;
  let s = sh(`M${P(x - hw, y - w * 0.35)}Q${P(x - hw, y - w * 0.85)} ${P(x, y - w * 0.85)}Q${P(x + hw, y - w * 0.85)} ${P(x + hw, y - w * 0.35)}V${f(y + w * 0.5)}Q${P(x, y + w * 0.75)} ${P(x - hw, y + w * 0.5)}Z`, skin, 2);
  for (let i = 1; i < 4; i++) {
    const fx = x - hw + (i * hw * 2) / 4;
    s += ln(`M${P(fx, y - w * 0.05)}V${f(y + w * 0.55)}`, dk, 1.8, 0.7);
  }
  s += ln(`M${P(x - hw + 3, y - w * 0.1)}H${f(x + hw - 3)}`, dk, 1.6, 0.5);
  // Thumb wraps under from the inside edge.
  const tx = x - flip * hw;
  s += sh(capsule([tx - flip * 2, y - w * 0.2], [tx + flip * w * 0.35, y + w * 0.45], w * 0.38, w * 0.3), skin, 1.8);
  s += spec(`M${P(x - hw + 4, y - w * 0.62)}Q${P(x, y - w * 0.82)} ${P(x + hw - 6, y - w * 0.6)}`, 0.5, 2);
  return s;
}

/** Chrome bar from x0 to x1 at y with knurling. */
function bar(x0, x1, y, r = 6) {
  let s = sh(`M${P(x0, y - r)}H${f(x1)}V${f(y + r)}H${f(x0)}Z`, "url(#vmChrome)", 2);
  s += ln(`M${P(x0, y - r * 0.35)}H${f(x1)}`, "#ffffff", 1.6, 0.7);
  for (let x = x0 + 8; x < x1; x += 7) s += ln(`M${P(x, y - r + 1)}l3,${f(r * 2 - 2)}`, "#56606c", 0.9, 0.35);
  return s;
}

const DEFS =
  `<linearGradient id="vmChrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8894a0"/><stop offset=".3" stop-color="#f4f8fb"/>` +
  `<stop offset=".62" stop-color="#6b7886"/><stop offset="1" stop-color="#232a33"/></linearGradient>` +
  `<linearGradient id="vmGlove" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7060"/><stop offset=".4" stop-color="#e2231a"/>` +
  `<stop offset="1" stop-color="#6e0a08"/></linearGradient>` +
  `<linearGradient id="vmRubber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset=".4" stop-color="#1c2025"/>` +
  `<stop offset="1" stop-color="#07090b"/></linearGradient>`;

function press(w, skin) {
  let s = "";
  for (const k of [-1, 1]) s += forearm([k * 175, 150], [k * 92, -118], w, skin);
  s += bar(-260, 260, -140, 7);
  for (const k of [-1, 1]) s += grip(k * 92, -140, w, skin, k);
  return { box: [-260, -190, 520, 360], markup: s };
}

function curl(w, skin) {
  const W = [96, -96];
  let s = forearm([170, 120], W, w, skin);
  // Hex dumbbell held vertical in the fist: handle through the hand, heads above and below.
  const head = (y) =>
    sh(`M${P(W[0] - 30, y - 16)}L${P(W[0] - 18, y - 24)}H${f(W[0] + 18)}L${P(W[0] + 30, y - 16)}V${f(y + 16)}L${P(W[0] + 18, y + 24)}H${f(W[0] - 18)}L${P(W[0] - 30, y + 16)}Z`, "url(#vmRubber)", 2.2) +
    ln(`M${P(W[0] - 16, y - 20)}H${f(W[0] + 14)}`, "#9aa4ae", 1.6, 0.6);
  s += sh(`M${P(W[0] - 6, W[1] - 44)}h12v88h-12Z`, "url(#vmChrome)", 2);
  s += head(W[1] - 56) + head(W[1] + 56);
  s += ell(W[0], W[1], w * 0.7, w * 0.62, skin, 2);
  s += ln(`M${P(W[0] - w * 0.5, W[1] - 4)}q${f(w * 0.5)},-5 ${f(w)},0M${P(W[0] - w * 0.5, W[1] + 6)}q${f(w * 0.5)},-5 ${f(w)},0`, mix(skin, "#3a1a0a", 0.4), 1.8, 0.6);
  return { box: [0, -190, 250, 360], markup: s };
}

function glove(w, skin) {
  const W = [92, -70];
  let s = forearm([180, 140], [W[0] + 18, W[1] + 34], w, skin, "#f2f2f2");
  const r = w * 1.3;
  s += sh(`M${P(W[0] - r, W[1])}Q${P(W[0] - r, W[1] - r * 1.25)} ${P(W[0], W[1] - r * 1.25)}Q${P(W[0] + r * 1.1, W[1] - r * 1.2)} ${P(W[0] + r, W[1] + r * 0.1)}Q${P(W[0] + r * 0.9, W[1] + r)} ${P(W[0] + 8, W[1] + r)}Q${P(W[0] - r, W[1] + r)} ${P(W[0] - r, W[1])}Z`, "url(#vmGlove)", 2.4);
  s += sh(capsule([W[0] - r * 0.95, W[1] + 4], [W[0] - r * 0.3, W[1] + r * 0.55], r * 0.55, r * 0.45), "url(#vmGlove)", 2);
  s += spec(`M${P(W[0] - r * 0.7, W[1] - r * 0.6)}Q${P(W[0] - r * 0.2, W[1] - r * 1.1)} ${P(W[0] + r * 0.4, W[1] - r * 1)}`, 0.7, 3);
  s += ln(`M${P(W[0] - r * 0.4, W[1] - r * 0.2)}Q${P(W[0] + r * 0.2, W[1] - r * 0.5)} ${P(W[0] + r * 0.7, W[1] - r * 0.2)}`, INK, 1.6, 0.5);
  s += sh(`M${P(W[0] - r * 0.6, W[1] + r * 0.72)}H${f(W[0] + r * 0.75)}V${f(W[1] + r * 1.08)}H${f(W[0] - r * 0.6)}Z`, "#f2f2f2", 2);
  return { box: [-10, -150, 260, 320], markup: s };
}

function fist(w, skin) {
  const W = [110, -34];
  const dk = mix(skin, "#3a1a0a", 0.35);
  let s = forearm([175, 150], W, w, skin);
  s += sh(`M${P(W[0] - w * 0.75, W[1] - w * 0.3)}Q${P(W[0] - w * 0.8, W[1] - w * 1)} ${P(W[0] - w * 0.1, W[1] - w * 1.05)}Q${P(W[0] + w * 0.8, W[1] - w * 1)} ${P(W[0] + w * 0.8, W[1] - w * 0.2)}Q${P(W[0] + w * 0.75, W[1] + w * 0.6)} ${P(W[0], W[1] + w * 0.55)}Q${P(W[0] - w * 0.8, W[1] + w * 0.5)} ${P(W[0] - w * 0.75, W[1] - w * 0.3)}Z`, skin, 2.2);
  for (let i = 0; i < 4; i++) s += ln(`M${P(W[0] - w * 0.6 + i * w * 0.38, W[1] - w * 0.95)}q${f(w * 0.1)},${f(w * 0.3)} 0,${f(w * 0.55)}`, dk, 1.6, 0.6);
  s += sh(capsule([W[0] - w * 0.7, W[1] + w * 0.1], [W[0] + w * 0.1, W[1] + w * 0.25], w * 0.42, w * 0.36), skin, 1.8);
  return { box: [-10, -110, 260, 290], markup: s };
}

function overhead(w, skin) {
  let s = "";
  for (const k of [-1, 1]) s += forearm([k * 245, -40], [k * 110, -196], w, skin);
  s += bar(-260, 260, -214, 7);
  for (const k of [-1, 1]) s += grip(k * 110, -214, w, skin, k);
  return { box: [-270, -250, 540, 240], markup: s };
}

function row(w, skin) {
  let s = "";
  for (const k of [-1, 1]) s += forearm([k * 160, 160], [k * 52, -54], w, skin);
  s += sh(`M${P(-100, -60)}H100V-48H-100Z`, "url(#vmRubber)", 2);
  s += ln("M0,-48V-20", INK, 5) + ln("M0,-48V-20", "#6b7886", 2.5);
  for (const k of [-1, 1]) s += grip(k * 52, -54, w * 0.95, skin, k);
  return { box: [-200, -100, 400, 300], markup: s };
}

const BUILDERS = { press, curl, glove, fist, overhead, row };

const cache = new Map();
/**
 * Viewmodel sprite set for an arm-size tier (0..3) and style: { sprites, defs }.
 * Each sprite carries its own box-sized defs in `defs`.
 */
export function viewmodelSet(tier, modern) {
  const key = `${tier}|${modern ? 1 : 0}`;
  let set = cache.get(key);
  if (set) return set;
  const skin = SKINS[PLAYER_LOOK.skin];
  const w = 38 + tier * 7;
  const sprites = {};
  for (const name in BUILDERS) {
    const build = () => {
      const { box, markup } = BUILDERS[name](w, skin);
      return { box, markup: lit(markup, box, RIM, { ink: 3.2, rimX: 3, rimY: 2.4, rimOp: 0.5 }) };
    };
    const { box, markup } = modern ? withRealisticBuild(build) : build();
    // At screen size the Realistic grime reads as dirty skin: an empty filter
    // ahead of realDefs wins the id and turns it off.
    const defs = DEFS + baseDefs(box) + (modern ? `<filter id="rwear"><feFlood flood-opacity="0"/></filter>${realDefs(box)}` : "");
    sprites[name] = { box, layers: [{ markup }], defs, realistic: modern || undefined, _key: `vm${tier}_${name}` };
  }
  set = { sprites, tier };
  cache.set(key, set);
  return set;
}

/** Arm tier 0..3 from the arms muscle value (0..100). */
export const armTier = (arms) => (arms < 12 ? 0 : arms < 25 ? 1 : arms < 40 ? 2 : 3);
