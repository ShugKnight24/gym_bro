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

/**
 * Sloped pad from (z0, y0) to (z1, y1), `t` thick, spanning x0..x1: right
 * side, top face and the end face at z0.
 */
function slab(x0, x1, z0, y0, z1, y1, t, m, rx = 0) {
  const a = pj(x0, y0, z0);
  const b = pj(x1, y0, z0);
  const c = pj(x1, y1, z1);
  const d = pj(x0, y1, z1);
  let s = poly([b, c, pj(x1, y1 + t, z1), pj(x1, y0 + t, z0)], `url(#${m}S)`);
  s += poly([a, b, c, d], `url(#${m}T)`);
  s += rect(a[0], a[1], b[0] - a[0], pj(x0, y0 + t, z0)[1] - a[1], `url(#${m}F)`, 1.1, rx);
  s += line(`M${f(a[0] + 2)},${f(a[1] + 0.8)}L${f(d[0] + 2)},${f(d[1] + 0.8)}`, "#fff", 0.8, 0.3);
  return s;
}

/** 45° leg press: seat and backrest up front, loaded sled on rails rising into depth. */
function legPress() {
  const hw = 36;
  let s = shadow(40, -14, 120, 30);
  // Base frame and the rear upright holding the rail tops.
  for (const x of [-hw, hw]) s += tube(pj(x, -3, 0), pj(x, -3, 200), 5, "#2a2e36");
  s += tube(pj(-hw, -3, 200), pj(hw, -3, 200), 5, "#2a2e36");
  for (const x of [-hw + 8, hw - 8]) s += tube(pj(x, -3, 196), pj(x, -168, 196), 6, "#39414c");
  // Rails, bottom front to top back.
  for (const x of [-hw + 8, hw - 8]) s += tube(pj(x, -34, 50), pj(x, -176, 200), 5, "#c9d3dc");
  // Sled carriage with weight horns and plates.
  const sz = 140;
  const sy = -34 - (sz - 50) * (142 / 150);
  s += slab(-hw, hw, sz - 30, sy + 28, sz + 22, sy - 22, 8, "bk");
  for (const side of [-1, 1]) {
    s += tube(pj(side * hw, sy, sz), pj(side * (hw + 26), sy, sz), 5, "#c9d3dc");
  }
  s += plate(-hw - 14, sy, sz, 20);
  s += plate(-hw - 8, sy, sz, 25);
  // Footplate: yellow diamond-plate facing the seat.
  const fp = [pj(-hw + 6, sy + 22, sz - 24), pj(hw - 6, sy + 22, sz - 24), pj(hw - 6, sy - 18, sz - 40), pj(-hw + 6, sy - 18, sz - 40)];
  s += poly(fp, "url(#ylF)", 1.2);
  for (let i = 1; i < 5; i++) {
    const k = i / 5;
    const a = [fp[0][0] + (fp[3][0] - fp[0][0]) * k, fp[0][1] + (fp[3][1] - fp[0][1]) * k];
    s += line(`M${f(a[0] + 6)},${f(a[1])}h${f(fp[1][0] - fp[0][0] - 12)}`, "#a87812", 1, 0.7);
  }
  s += plate(hw + 8, sy, sz, 25);
  s += plate(hw + 14, sy, sz, 20);
  // Seat pedestal, seat and reclined backrest.
  s += tube(pj(0, -3, 20), pj(0, -34, 26), 8, "#2a2e36");
  s += slab(-22, 22, 4, -34, 44, -44, 8, "rd", 2);
  s += slab(-22, 22, -34, -112, 4, -44, 8, "rd", 2);
  // Grab handles beside the seat.
  for (const side of [-1, 1]) s += tube(pj(side * 28, -40, 14), pj(side * 30, -44, 40), 4, "#1c1f24", "#6b7280");
  s += rim(`M${f(pj(hw - 8, -176, 200)[0] + 4)},${f(zy(-168, 196))}V${f(zy(-6, 196))}`, 0.35);
  return { box: [-96, -200, 280, 212], layers: [{ markup: `<g>${s}</g>` }] };
}

/** One slotted weight stack between two chrome guide rods. */
function weightStack(x, z, top, n) {
  const [px, py] = pj(x, -8, z);
  const w = 34;
  let s = "";
  for (const gx of [px + 3, px + w - 5]) s += rect(gx, zy(top, z), 2.4, py - zy(top, z), "url(#chrome)", 0.6);
  const ph = 6;
  for (let i = 0; i < n; i++) {
    const y = py - (i + 1) * ph;
    s += block(px, y, w, ph, 18, "bk", { hi: i === n - 1 ? 0.4 : 0, ink: 0.8 });
    s += rect(px + 13, y + 1.8, 8, 2.2, "#e8ecef", 0, 0.5, ` opacity=".75"`);
  }
  s += rect(px + w / 2 + 3, py - 5 * ph + 1, 7, 3, "url(#rdF)", 0.6, 1);
  s += rect(px + w / 2 - 1.5, py - n * ph - 60, 3, 60, "url(#chrome)", 0.5);
  return s;
}

/** Functional trainer: two towers with weight stacks, pulleys, cables and a top chin bar. */
function cableStation() {
  const hw = 74;
  const h = 222;
  const z = 40;
  let s = shadow(20, -10, 130, 24);
  for (const x of [-hw, hw]) s += tube(pj(x, -3, 0), pj(x, -3, 80), 6, "#2a2e36");
  s += tube(pj(-hw, -3, 80), pj(hw, -3, 80), 5, "#2a2e36");
  s += tube(pj(-hw + 3, -h + 4, z), pj(hw + 3, -h + 4, z), 6, "#2a2e36");
  // Towers: a rear and a front post each, stack between.
  for (const side of [-1, 1]) {
    const x = side * hw;
    s += post(x - 20, z + 22, h, "bk", 6);
    s += weightStack(x - 17, z + 4, -h + 30, 12);
    s += post(x + 14, z + 22, h, "bk", 6);
  }
  // Top chin bar with grips.
  const a = pj(-hw + 14, -h + 14, z - 14);
  const b = pj(hw - 14, -h + 14, z - 14);
  s += tube(a, b, 4, "#dfe7ee");
  s += line(`M${f(a[0] + 18)},${f(a[1])}h16M${f(b[0] - 34)},${f(b[1])}h16`, "#1c1f24", 5, 1);
  // Adjustable carriages with pulleys, cables and D-handles.
  for (const side of [-1, 1]) {
    const x = side * (hw - 3);
    const [cx, cy] = pj(x, -118, z - 10);
    s += block(cx - 6, cy - 10, 12, 22, 6, "yl", { hi: 0.4 });
    s += ell(cx, cy + 16, 5.5, 5.5, "url(#chrome)", 0.9);
    s += ell(cx, cy + 16, 1.6, 1.6, "#15181d");
    const hx = cx - side * 26;
    const hy = cy + 44;
    s += line(`M${f(cx - side * 4)},${f(cy + 18)}L${f(hx)},${f(hy)}`, INK, 2.2);
    s += line(`M${f(cx - side * 4)},${f(cy + 18)}L${f(hx)},${f(hy)}`, "#9aa6b2", 0.9);
    s += path(`M${f(hx - 5)},${f(hy)}h10l-2,10h-6Z`, "url(#dkF)", 1);
    s += line(`M${f(hx - 3)},${f(hy + 8)}h6`, "#6b7280", 2.4);
  }
  // Header plate.
  const [tx, ty] = pj(-34, -h + 30, z - 8);
  s += rect(tx, ty, 68, 12, "url(#rdF)", 1, 1.5);
  s += line(`M${f(tx + 8)},${f(ty + 6)}h52`, "#ffd0c0", 1.4, 0.55);
  s += rim(`M${f(pj(hw + 14, 0, z + 22)[0] + 6)},${f(zy(-h, z + 22) + 4)}V${f(zy(-6, z + 22))}`, 0.4);
  return { box: [-126, -250, 300, 262], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Upright spin bike: red flywheel shroud up front, saddle behind, lit console. */
function stationaryBike() {
  let s = shadow(30, -10, 84, 22);
  // Stabiliser feet.
  s += tube(pj(-28, -3, 16), pj(28, -3, 16), 6, "#2a2e36");
  s += tube(pj(-26, -3, 118), pj(26, -3, 118), 6, "#2a2e36");
  // Frame: base rail, down tube, seat tube.
  s += tube(pj(0, -6, 16), pj(0, -6, 118), 6, "#39414c");
  s += tube(pj(0, -8, 108), pj(0, -84, 96), 7, "#39414c");
  s += tube(pj(0, -36, 66), pj(0, -104, 22), 7, "#39414c");
  // Saddle on its post.
  s += tube(pj(0, -84, 96), pj(0, -104, 94), 4, "#c9d3dc");
  const [sx, sy] = pj(-9, -110, 80);
  s += path(`M${f(sx)},${f(sy + 2)}C${f(sx + 4)},${f(sy - 4)} ${f(sx + 28)},${f(sy - 5)} ${f(sx + 36)},${f(sy - 2)}C${f(sx + 38)},${f(sy + 4)} ${f(sx + 30)},${f(sy + 8)} ${f(sx + 20)},${f(sy + 7)}C${f(sx + 12)},${f(sy + 7)} ${f(sx + 2)},${f(sy + 8)} ${f(sx)},${f(sy + 2)}Z`, "url(#bkF)", 1.2);
  s += line(`M${f(sx + 5)},${f(sy - 1)}C${f(sx + 14)},${f(sy - 4)} ${f(sx + 26)},${f(sy - 4)} ${f(sx + 32)},${f(sy - 2)}`, "#fff", 0.8, 0.35);
  // Far pedal.
  const [cx, cy] = pj(0, -36, 66);
  s += tube([cx, cy], [cx - 9, cy - 16], 3.5, "#2a2e36");
  s += rect(cx - 16, cy - 20, 12, 4, "#15181d", 0.8, 1);
  // Flywheel shroud (disk in the y-z plane) with a chrome hub.
  const [fx, fy] = pj(0, -44, 34);
  const R = 32;
  s += ell(fx + 7, fy, R * OX + 2, R, "#15181d", 1);
  s += ell(fx, fy, R * OX + 2, R, "url(#rdF)", 1.2);
  s += ell(fx, fy, (R * OX + 2) * 0.72, R * 0.72, "#000", 0, ` opacity=".18"`);
  s += `<path d="M${f(fx - R * OX * 0.7)},${f(fy - R * 0.6)}A${f(R * OX)} ${f(R)} 0 0 1 ${f(fx + 2)},${f(fy - R * 0.95)}" fill="none" stroke="#fff" stroke-width="1.2" stroke-opacity=".5"/>`;
  s += ell(fx, fy, 3.2, 5, "url(#chrome)", 0.8);
  // Crank and near pedal.
  s += ell(cx + 1, cy, 4, 6, "url(#chrome)", 0.8);
  s += tube([cx + 1, cy], [cx + 10, cy + 16], 3.5, "#2a2e36");
  s += rect(cx + 6, cy + 14, 14, 4.5, "#15181d", 0.8, 1);
  // Handlebars: a crossbar with grips sweeping back toward the rider.
  const hb0 = pj(-24, -112, 18);
  const hb1 = pj(24, -112, 18);
  s += tube(hb0, hb1, 4.5, "#39414c");
  for (const side of [-1, 1]) {
    const e = pj(side * 24, -112, 18);
    const g = pj(side * 22, -118, 44);
    s += tube(e, g, 5.5, "#1c1f24", "#6b7280");
  }
  // Console.
  const [kx, ky] = pj(-12, -134, 14);
  s += path(`M${f(kx)},${f(ky + 16)}L${f(kx + 3)},${f(ky)}H${f(kx + 27)}L${f(kx + 30)},${f(ky + 16)}Z`, "url(#dkF)", 1.1);
  s += rect(kx + 5, ky + 3, 20, 9, "#061410", 0.8, 1);
  s += rim(`M${f(fx + R * OX + 3)},${f(fy - R * 0.6)}v${f(R * 1.2)}`, 0.4);
  const glow =
    `<rect x="${f(kx + 6)}" y="${f(ky + 4)}" width="18" height="7" fill="#3dff8a" opacity=".3"/>` +
    line(`M${f(kx + 8)},${f(ky + 9)}l3,-3l3,2l3,-3l3,2l3,-1`, "#5dffa0", 0.9, 0.95);
  return {
    box: [-62, -156, 190, 168],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.7, max: 1, speed: 3 } },
    ],
  };
}

const KB = { 8: "#e86aa8", 12: "#2f6fd6", 16: "#f2c230", 20: "#8a4fd0", 24: "#3aa655", 32: "#e2362b" };

/** Competition kettlebell: coloured bell with a flat base and a black handle. */
function kettlebell(cx, by, kg) {
  const r = 7 + kg * 0.18;
  const cy = by - r * 0.92;
  const hw = r * 0.62;
  const ht = cy - r * 0.8 - r * 0.9;
  const handle = `M${f(cx - hw)},${f(cy - r * 0.6)}C${f(cx - hw)},${f(ht)} ${f(cx + hw)},${f(ht)} ${f(cx + hw)},${f(cy - r * 0.6)}`;
  let s = line(handle, INK, r * 0.42 + 2);
  s += line(handle, "#2a2e36", r * 0.42);
  s += line(`M${f(cx - hw * 0.5)},${f(ht + r * 0.25)}Q${f(cx)},${f(ht - 0.4)} ${f(cx + hw * 0.4)},${f(ht + r * 0.3)}`, "#9aa4ae", 0.8, 0.6);
  s += ell(cx, cy, r, r, KB[kg], 1.1);
  s += path(`M${f(cx - r * 0.75)},${f(by - 1)}h${f(r * 1.5)}`, INK, 1.4);
  s += ell(cx + r * 0.25, cy + r * 0.25, r * 0.78, r * 0.72, "#000", 0, ` opacity=".22"`);
  s += `<path d="M${f(cx - r * 0.7)},${f(cy - r * 0.2)}A${f(r * 0.75)} ${f(r * 0.75)} 0 0 1 ${f(cx - r * 0.05)},${f(cy - r * 0.78)}" fill="none" stroke="#fff" stroke-width="1.1" stroke-opacity=".55"/>`;
  s += rect(cx - 3, cy - 1.5, 6, 3.4, "#f4f4f4", 0.5, 0.6);
  return s;
}

/** Two-shelf kettlebell rack, heaviest bells on the bottom. */
function kettlebellRack() {
  const w = 118;
  const d = 48;
  const x = -(w + d * OX) / 2;
  let s = shadow(4, -8, 74, 16);
  for (const ux of [x, x + w - 6]) s += rect(ux + d * OX, zy(-84, d), 6, zy(0, d) - zy(-84, d), "url(#dkS)", 0.8);
  const tiers = [[-14, [32, 24, 24, 20]], [-58, [16, 12, 12, 8]]];
  for (const [ty, bells] of tiers) {
    s += block(x + 3, ty, w - 6, 4, d, "dk", { hi: 0.2 });
    const gap = (w - 12) / bells.length;
    for (let i = 0; i < bells.length; i++) s += kettlebell(x + 6 + gap * (i + 0.5) + d * OX * 0.3, zy(ty, d * 0.3), bells[i]);
  }
  for (const ux of [x, x + w - 6]) {
    s += block(ux, -88, 6, 88, 6, "dk", { hi: 0.25 });
    s += rect(ux - 3, -3, 12, 3, "#1a1f26", 0.6, 1);
  }
  s += rect(x - 1, -92, w + 2, 6, "url(#ylF)", 0.9, 1);
  s += rim(`M${f(x + w + d * OX)},${f(zy(-84, d))}V${f(zy(-6, d))}`, 0.3);
  return { box: [-74, -116, 148, 124], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Decline sit-up bench: pad sloping down toward the front, foam leg rollers at the high end. */
function abBench() {
  let s = shadow(30, -10, 90, 22);
  // Frame: floor rail, rear A-leg up to the roller post, front foot.
  s += tube(pj(0, -3, 6), pj(0, -3, 150), 6, "#2a2e36");
  s += tube(pj(-24, -3, 6), pj(24, -3, 6), 5, "#2a2e36");
  s += tube(pj(-24, -3, 148), pj(24, -3, 148), 5, "#2a2e36");
  s += tube(pj(0, -3, 146), pj(0, -86, 136), 7, "#39414c");
  s += tube(pj(0, -3, 12), pj(0, -24, 16), 7, "#39414c");
  // Upper roller pair on its post, behind the pad.
  const roller = (y, z) => {
    const a = pj(-26, y, z);
    const b = pj(26, y, z);
    const r = 7;
    let o = rect(a[0], a[1] - r, b[0] - a[0], r * 2, "url(#rubberV)", 1.1, r);
    o += ell(a[0] + 1, a[1], 3.4, r, "#2d3238", 1);
    o += line(`M${f(a[0] + 5)},${f(a[1] - r + 2)}H${f(b[0] - 5)}`, "#9aa4ae", 1, 0.4);
    return o;
  };
  s += tube(pj(0, -86, 136), pj(0, -112, 150), 5, "#c9d3dc");
  s += roller(-116, 150);
  s += roller(-94, 130);
  // Sloped pad.
  s += slab(-17, 17, 4, -30, 124, -84, 9, "rd", 2);
  s += line(`M${f(pj(-12, -30, 60)[0])},${f(zy(-57, 60))}l${f(24)},0`, "#7e1a22", 0.8, 0.6);
  // Lower rollers under the front edge for the flat position.
  s += roller(-18, 0);
  s += rim(`M${f(pj(17, -84, 124)[0] + 1)},${f(zy(-84, 124) + 2)}l0,8`, 0.4);
  return { box: [-70, -140, 200, 150], layers: [{ markup: `<g>${s}</g>` }] };
}

export const EQUIP_BUILDERS = {
  squat_rack: squatRack,
  bench_press: benchPress,
  treadmill,
  pullup_bar: pullupBar,
  rowing_machine: rowingMachine,
  leg_press: legPress,
  cable_station: cableStation,
  stationary_bike: stationaryBike,
  kettlebell_rack: kettlebellRack,
  ab_bench: abBench,
};

/** Every world sprite (CC props + equipment) in one set sharing EQUIP_DEFS. */
export const WORLD_BUILDERS = { ...PROP_BUILDERS, ...EQUIP_BUILDERS };
export const WORLD_SPRITES = buildSet(WORLD_BUILDERS);

let real = null;
/** Modern set, built on first Modern-style use: { defs, sprites }. */
export const realisticWorld = () => real || (real = buildRealisticSet(WORLD_BUILDERS, EQUIP_DEFS));
