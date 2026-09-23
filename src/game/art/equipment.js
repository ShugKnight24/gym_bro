/**
 * Training equipment sprites in the prop-kit 3/4 projection (centimetres,
 * origin at the footprint centre on the floor, y up negative): squat rack,
 * bench press, treadmill, pull-up station and rowing machine. The dumbbell
 * rack and heavy bag come from ./props.js.
 *
 * Bumper plates are comic-coded by colour (red 25, blue 20, yellow 15,
 * green 10). A plate's face lies in the y-z plane, so in this projection it
 * is an ellipse OX times as wide as it is tall.
 */

import {
  INK, OX, f, zy, pj, poly, rect, path, line, ell, block, shadow, lamp, rim, mat,
  buildSet, buildRealisticSet, DEFS,
} from "../../engine/prop-kit.js";
import { BUILDERS as PROP_BUILDERS } from "./props.js";

const EXTRA_DEFS =
  mat("rd", ["#c8323a", "#e0484e"], ["#e04a50", "#b02a32", "#7e1a22", "#520e14"], ["#5e1218", "#300609"]) +
  mat("yl", ["#e8b21e", "#ffd23a"], ["#ffd23a", "#e0a81c", "#a87812", "#6e4c08"], ["#7a5608", "#3e2a04"]) +
  mat("bk", ["#3a3e46", "#4c525c"], ["#4a505a", "#30343c", "#1c1f25", "#0e1014"], ["#16181d", "#08090b"]);

export const EQUIP_DEFS = DEFS + EXTRA_DEFS;

const PLATE = { 25: ["#e2362b", 22.5], 20: ["#2f6fd6", 22.5], 15: ["#f2c230", 22.5], 10: ["#3aa655", 22.5], 5: ["#e8ecef", 11] };

/** Thick inked tube between two projected points. */
const tube = (a, b, w, color, hi = "#ffffff") =>
  line(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, INK, w + 2) +
  line(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, color, w) +
  line(`M${f(a[0] - 0.4)},${f(a[1] - w * 0.25)}L${f(b[0] - 0.4)},${f(b[1] - w * 0.25)}`, hi, Math.max(0.5, w * 0.25), 0.45);

/** One bumper plate of thickness `t` centred on the bar at world (x, y, z). */
function plate(x, y, z, kg, t = 5) {
  const [col, R] = PLATE[kg];
  const [cx, cy] = pj(x, y, z);
  const rx = R * OX;
  let s = ell(cx - t / 2, cy, rx, R, "#101216", 1);
  s += rect(cx - t / 2, cy - R, t, R * 2, "#15181d", 0);
  s += ell(cx + t / 2, cy, rx, R, col, 1.1);
  s += ell(cx + t / 2, cy, rx * 0.72, R * 0.72, "#15181d", 0, ` opacity=".35"`);
  s += `<path d="M${f(cx + t / 2 - rx * 0.6)},${f(cy - R * 0.55)}A${f(rx)} ${f(R)} 0 0 1 ${f(cx + t / 2 + rx * 0.2)},${f(cy - R * 0.93)}" fill="none" stroke="#fff" stroke-width="1" stroke-opacity=".55"/>`;
  s += ell(cx + t / 2, cy, 2.2, 2.6, "url(#chrome)", 0.6);
  return s;
}

/** Olympic barbell along x at height y, depth z, loaded symmetrically with `plates` (kg, inner first). */
function barbell(y, z, plates, len = 220) {
  const half = len / 2;
  const a = pj(-half, y, z);
  const b = pj(half, y, z);
  let s = tube(a, b, 2.8, "#c9d3dc");
  // Knurl marks and collars.
  for (const x of [-22, 22]) {
    const [kx, ky] = pj(x, y, z);
    s += line(`M${f(kx - 8)},${f(ky)}h16`, "#6b7886", 2.6, 0.6);
  }
  const ends = [];
  for (const side of [-1, 1]) {
    let x = side * 72;
    const [cx, cy] = pj(x, y, z);
    s += rect(cx - 1.5, cy - 3.5, 3, 7, "url(#chrome)", 0.7, 0.8);
    x += side * 4;
    for (const kg of plates) {
      ends.push([x + side * 3, kg]);
      x += side * 6;
    }
  }
  ends.sort((p, q) => p[0] - q[0]);
  for (const [x, kg] of ends) s += plate(x, y, z, kg);
  // Sleeve tips poke out past the outer plates.
  for (const side of [-1, 1]) {
    const [tx, ty] = pj(side * half, y, z);
    s += rect(tx - (side > 0 ? 6 : 0), ty - 2, 6, 4, "url(#chromeV)", 0.7, 1);
  }
  return s;
}

/** Square steel post standing at (x, z), `h` tall and `w` thick. */
function post(x, z, h, m = "bk", w = 7) {
  const [px, py] = pj(x, 0, z);
  const tt = zy(-h, z);
  return block(px, tt, w, py - tt, w * 0.8, m, { hi: 0.3 });
}

/** Power rack with a loaded bar on the J-hooks and safety pins. */
function squatRack() {
  const hw = 58;
  const d = 110;
  const h = 225;
  let s = shadow(22, -10, 120, 26);
  // Floor frame.
  s += tube(pj(-hw, -2, 0), pj(-hw, -2, d), 5, "#2a2e36");
  s += tube(pj(hw, -2, 0), pj(hw, -2, d), 5, "#2a2e36");
  s += tube(pj(-hw, -2, d), pj(hw, -2, d), 5, "#2a2e36");
  // Back posts and top frame.
  s += post(-hw, d, h);
  s += post(hw, d, h);
  s += tube(pj(-hw + 3, -h + 3, d), pj(hw + 3, -h + 3, d), 5, "#2a2e36");
  s += tube(pj(-hw + 3, -h + 3, 0), pj(-hw + 3, -h + 3, d), 5, "#2a2e36");
  s += tube(pj(hw + 3, -h + 3, 0), pj(hw + 3, -h + 3, d), 5, "#2a2e36");
  // Safety pins, front to back.
  for (const x of [-hw + 3, hw + 3]) s += tube(pj(x, -72, -10), pj(x, -72, d + 8), 3.2, "#c9d3dc");
  // Front posts with numbered holes.
  for (const x of [-hw, hw]) {
    s += block(x, -h, 7, h, 6, "bk", { hi: 0.3 });
    for (let yy = -h + 20; yy < -20; yy += 10) s += ell(x + 3.5, yy, 1.2, 1.2, "#05070a");
    s += rect(x - 3, -4, 13, 4, "#15181d", 0.6, 1);
  }
  s += block(-hw - 2, -h - 4, hw * 2 + 11, 7, 6, "yl", { hi: 0.4 });
  s += line(`M${f(-18)},${f(-h - 0.5)}h36`, INK, 1.2, 0.6);
  // J-hooks and the bar on them.
  for (const x of [-hw, hw]) s += path(`M${f(x - 2)},-146h11v8h-4v-4h-7Z`, "url(#ylF)", 0.8);
  s += barbell(-146, -4, [25, 15]);
  s += rim(`M${f(hw + 7)},${-h + 2}V-6`, 0.4);
  return { box: [-128, -250, 290, 262], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Flat bench with rack uprights at the head and a loaded bar racked. */
function benchPress() {
  const d0 = 5;
  const d1 = 135;
  const top = -46;
  const uz = 112;
  let s = shadow(30, -14, 118, 30);
  // Uprights at the head end with a cross brace on the floor.
  s += tube(pj(-52, -2, uz), pj(52, -2, uz), 5, "#2a2e36");
  for (const x of [-52, 52]) {
    const [px, py] = pj(x, 0, uz);
    const tt = zy(-118, uz);
    s += block(px - 3, tt, 6, py - tt, 5, "bk", { hi: 0.3 });
    s += path(`M${f(px - 3)},${f(tt + 6)}h10v6h-4v-3h-6Z`, "url(#ylF)", 0.8);
  }
  // Frame and legs under the pad.
  const [fx0, fy0] = pj(-4, -14, d0 + 10);
  const [fx1, fy1] = pj(-4, -14, d1 - 10);
  s += tube([fx0, fy0], [fx1, fy1], 6, "#2a2e36");
  for (const z of [d0 + 12, d1 - 12]) {
    s += tube(pj(-20, -2, z), pj(20, -2, z), 5, "#2a2e36");
    s += tube(pj(0, -2, z), pj(0, top + 8, z), 5, "#2a2e36");
  }
  // Vinyl pad: a long block running back into depth.
  const [bx, by] = pj(-15, top, d0);
  const dz = d1 - d0;
  s += block(bx, by, 30, 10, dz, "rd", { hi: 0.4, rx: 2 });
  s += line(`M${f(bx + 3)},${f(by + 2.5)}h24`, "#ffb0b0", 1, 0.5);
  s += barbell(-120, uz, [20, 10]);
  s += rim(`M${f(bx + 30 + dz * OX)},${f(zy(top, dz) + 1)}l0,8`, 0.4);
  return { box: [-120, -170, 300, 180], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Treadmill: belt deck running back into depth, console with a lit display. */
function treadmill() {
  const hw = 42;
  const d = 170;
  const deck = -22;
  const cz = 150;
  let s = shadow(38, -14, 110, 30);
  // Console uprights and handrails.
  for (const x of [-hw + 4, hw - 4]) {
    s += tube(pj(x, deck, cz - 10), pj(x, -118, cz - 20), 6, "#39414c");
    s += tube(pj(x, -102, cz - 20), pj(x, -100, cz - 95), 4, "#c9d3dc");
  }
  // Console.
  const [kx, ky] = pj(-36, -150, cz - 22);
  s += path(`M${f(kx)},${f(ky + 10)}L${f(kx + 8)},${f(ky)}H${f(kx + 70)}L${f(kx + 78)},${f(ky + 10)}V${f(ky + 34)}H${f(kx)}Z`, "url(#dkF)", 1.2);
  s += rect(kx + 10, ky + 6, 58, 18, "#061410", 1, 1.5);
  s += rect(kx + 12, ky + 26, 10, 5, "url(#rdF)", 0.6, 1);
  s += rect(kx + 56, ky + 26, 10, 5, "url(#ylF)", 0.6, 1);
  // Motor hood at the front and the deck.
  const [dx0, dy0] = pj(-hw, deck, 0);
  s += block(dx0, dy0, hw * 2, 18, d, "dk", { hi: 0.3 });
  // Belt on top of the deck.
  const b0 = pj(-hw + 8, deck, 4);
  const b1 = pj(hw - 8, deck, 4);
  const b2 = pj(hw - 8, deck, d - 30);
  const b3 = pj(-hw + 8, deck, d - 30);
  s += poly([b0, b1, b2, b3], "#15181d", 1);
  for (let z = 20; z < d - 30; z += 22) {
    const a = pj(-hw + 9, deck, z);
    const b = pj(hw - 9, deck, z);
    s += line(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, "#3a404a", 0.8, 0.8);
  }
  s += rect(dx0 + 4, dy0 + 5, 14, 5, "url(#ylF)", 0.6, 1);
  s += rim(`M${f(dx0 + hw * 2 + d * OX)},${f(zy(deck, d) + 1)}v16`, 0.4);
  const glow =
    `<rect x="${f(kx + 11)}" y="${f(ky + 7)}" width="56" height="16" fill="#3dff8a" opacity=".22"/>` +
    line(`M${f(kx + 14)},${f(ky + 18)}l6,-6l5,4l6,-8l6,5l6,-3l7,6l6,-4`, "#5dffa0", 1.3, 0.95) +
    lamp(kx + 62, ky + 11, 1.2, "#ff5a3a", "#ffd0c0");
  return {
    box: [-72, -172, 220, 184],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.7, max: 1, speed: 3 } },
    ],
  };
}

/** Freestanding pull-up station with dip handles and a foam knee pad. */
function pullupBar() {
  const hw = 56;
  const h = 228;
  const zc = 40;
  let s = shadow(16, -8, 96, 22);
  // Base feet running front to back.
  for (const x of [-hw, hw]) s += tube(pj(x, -3, 0), pj(x, -3, 90), 6, "#2a2e36");
  // Back brace and uprights.
  for (const x of [-hw, hw]) s += tube(pj(x, -4, 88), pj(x, -150, zc), 4, "#39414c");
  for (const x of [-hw, hw]) {
    const [px, py] = pj(x, 0, zc);
    const tt = zy(-h, zc);
    s += block(px - 3.5, tt, 7, py - tt, 6, "bk", { hi: 0.3 });
  }
  // Knee-raise back pad and arm pads between the uprights.
  const [bx, by] = pj(-22, -150, zc + 8);
  s += block(bx, by, 44, 60, 6, "rd", { hi: 0.35, rx: 3 });
  for (const x of [-hw + 5, hw - 26]) {
    const [ax, ay] = pj(x, -128, zc - 30);
    s += block(ax, ay, 21, 7, 30, "rd", { hi: 0.35, rx: 2 });
  }
  // Dip handles angled forward.
  for (const side of [-1, 1]) s += tube(pj(side * hw, -112, zc), pj(side * (hw - 12), -114, zc - 42), 4, "#c9d3dc");
  // The bar with angled grip ends and foam.
  const a = pj(-hw - 10, -h + 6, zc);
  const b = pj(hw + 10, -h + 6, zc);
  s += tube(a, b, 4, "#dfe7ee");
  for (const side of [-1, 1]) {
    const e = pj(side * (hw + 10), -h + 6, zc);
    s += tube(e, [e[0] + side * 10, e[1] + 14], 4, "#dfe7ee");
    s += tube([e[0] + side * 4, e[1] + 5.5], [e[0] + side * 9, e[1] + 12.6], 6, "#1c1f24", "#6b7280");
  }
  s += line(`M${f(a[0] + 30)},${f(a[1])}h20M${f(b[0] - 50)},${f(b[1])}h20`, "#6b7886", 3.4, 0.55);
  s += rim(`M${f(pj(hw, 0, zc)[0] + 4)},${f(zy(-h, zc) + 4)}V${f(zy(-4, zc))}`, 0.4);
  return { box: [-96, -252, 216, 262], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Air rower: flywheel housing in front, monorail back into depth, sliding seat. */
function rowingMachine() {
  const d = 210;
  const rail = -38;
  let s = shadow(44, -12, 112, 22);
  // Rear leg and front stand.
  s += tube(pj(-18, -3, d), pj(18, -3, d), 5, "#2a2e36");
  s += tube(pj(0, -3, d), pj(0, rail, d - 6), 5, "#2a2e36");
  s += tube(pj(-22, -3, 18), pj(22, -3, 18), 5, "#2a2e36");
  // Monorail.
  const r0 = pj(-5, rail, 40);
  const r1 = pj(-5, rail - 8, d);
  s += tube(r0, r1, 8, "#aab6c2");
  // Footrests.
  for (const x of [-20, 8]) {
    const [fx, fy] = pj(x, rail - 4, 52);
    s += path(`M${f(fx)},${f(fy)}l12,-3l2,-14l-11,2Z`, "url(#dkF)", 0.9);
    s += line(`M${f(fx + 2)},${f(fy - 8)}l10,-2`, "#8a96a2", 1.2, 0.8);
  }
  // Seat on the rail.
  const [sx, sy] = pj(-16, rail - 12, 120);
  s += block(sx, sy, 30, 6, 24, "bk", { hi: 0.35, rx: 2 });
  // Flywheel cage (a disk in the y-z plane) and the monitor arm.
  const [cx, cy] = pj(0, -50, 12);
  s += ell(cx + 8, cy, 18, 38, "url(#dkS)", 1.1);
  s += ell(cx, cy, 18, 38, "url(#bkF)", 1.2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += line(`M${f(cx)},${f(cy)}L${f(cx + Math.cos(a) * 15)},${f(cy + Math.sin(a) * 33)}`, "#5a6270", 1.2, 0.8);
  }
  s += ell(cx, cy, 5, 9, "url(#chrome)", 0.8);
  s += tube(pj(0, -84, 12), pj(0, -118, 30), 4, "#39414c");
  const [mx, my] = pj(-13, -140, 30);
  s += rect(mx, my, 26, 20, "url(#dkF)", 1, 2);
  s += rect(mx + 3, my + 3, 20, 12, "#0a2016", 0.7, 1);
  // Handle resting on its hook.
  s += tube(pj(-24, -78, 26), pj(24, -78, 26), 4, "#1c1f24", "#6b7280");
  s += rim(`M${f(cx + 17)},${f(cy - 20)}v40`, 0.35);
  const glow = `<rect x="${f(mx + 4)}" y="${f(my + 4)}" width="18" height="10" fill="#3dff8a" opacity=".35"/>` +
    line(`M${f(mx + 6)},${f(my + 8)}h10M${f(mx + 6)},${f(my + 11)}h6`, "#7dffb0", 1, 0.95);
  return {
    box: [-66, -168, 232, 182],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter" },
    ],
  };
}

export const EQUIP_BUILDERS = {
  squat_rack: squatRack,
  bench_press: benchPress,
  treadmill,
  pullup_bar: pullupBar,
  rowing_machine: rowingMachine,
};

/** Every world sprite (CC props + equipment) in one set sharing EQUIP_DEFS. */
export const WORLD_BUILDERS = { ...PROP_BUILDERS, ...EQUIP_BUILDERS };
export const WORLD_SPRITES = buildSet(WORLD_BUILDERS);

let real = null;
/** Modern set, built on first Modern-style use: { defs, sprites }. */
export const realisticWorld = () => real || (real = buildRealisticSet(WORLD_BUILDERS, EQUIP_DEFS));
