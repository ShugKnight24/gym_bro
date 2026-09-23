/**
 * Training equipment sprites in the prop-kit 3/4 projection (centimetres,
 * origin at the footprint centre on the floor, y up negative): squat rack,
 * bench press, treadmill, pull-up station, rowing machine and the rest of the
 * machines, plus the amenities (locker room, sauna, steam room, cold plunge,
 * tanning bed, recovery station, posing room). The dumbbell rack and heavy
 * bag come from ./props.js.
 *
 * Bumper plates are comic-coded by colour (red 25, blue 20, yellow 15,
 * green 10). A plate's face lies in the y-z plane, so in this projection it
 * is an ellipse OX times as wide as it is tall.
 */

import {
  INK, OX, f, zy, pj, poly, rect, path, line, ell, block, shadow, lamp, rim, mat, vents, leaf,
  buildSet, buildRealisticSet, realizeSprite, withRealistic, DEFS,
} from "../../engine/prop-kit.js";
import { BUILDERS as PROP_BUILDERS } from "./props.js";

const EXTRA_DEFS =
  mat("rd", ["#c8323a", "#e0484e"], ["#e04a50", "#b02a32", "#7e1a22", "#520e14"], ["#5e1218", "#300609"]) +
  mat("yl", ["#e8b21e", "#ffd23a"], ["#ffd23a", "#e0a81c", "#a87812", "#6e4c08"], ["#7a5608", "#3e2a04"]) +
  mat("bk", ["#3a3e46", "#4c525c"], ["#4a505a", "#30343c", "#1c1f25", "#0e1014"], ["#16181d", "#08090b"]) +
  // Amenities: white tile, cedar, turf, brushed steel, white shell plastic, violet mat.
  mat("tl", ["#dfeef0", "#f4fbfb"], ["#eef7f8", "#d3e6e9", "#aac6cc", "#86a6ae"], ["#9fbcc2", "#6d8c94"]) +
  mat("cd", ["#d88c4c", "#eba461"], ["#e39a58", "#c27538", "#945424", "#6a3814"], ["#7d4520", "#4a260c"]) +
  mat("tf", ["#3fae4a", "#58c862"], ["#4dbb56", "#349c3f", "#23762c", "#15521c"], ["#1f6a27", "#0f3a14"]) +
  mat("ss", ["#c7d0d8", "#e4eaef"], ["#dfe6ec", "#b4bfc9", "#8a96a2", "#66727e"], ["#7d8995", "#4c5660"]) +
  mat("wh", ["#e9edf2", "#fbfcfd"], ["#f6f8fa", "#dde3e9", "#b7c0ca", "#8f99a4"], ["#a6b0bb", "#707a86"]) +
  mat("vi", ["#5b4aa8", "#7462c4"], ["#6a58bc", "#4f3f9a", "#372a74", "#241a50"], ["#2c2160", "#150f34"]) +
  `<linearGradient id="waterG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8fdff"/>` +
  `<stop offset=".4" stop-color="#7fdcf0"/><stop offset="1" stop-color="#2a8fb8"/></linearGradient>` +
  `<linearGradient id="frostG" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#f4fbff" stop-opacity=".95"/>` +
  `<stop offset=".55" stop-color="#cfe6ee" stop-opacity=".88"/><stop offset="1" stop-color="#9dbfcc" stop-opacity=".92"/></linearGradient>` +
  `<linearGradient id="emberG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1a0a"/>` +
  `<stop offset=".6" stop-color="#6a2a0c"/><stop offset="1" stop-color="#b8480e"/></linearGradient>` +
  `<linearGradient id="uvG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8dcff"/>` +
  `<stop offset=".5" stop-color="#9a7bff"/><stop offset="1" stop-color="#5b3fd8"/></linearGradient>` +
  `<radialGradient id="uvGlow"><stop offset="0" stop-color="#d8c8ff" stop-opacity=".85"/>` +
  `<stop offset=".4" stop-color="#8a5cff" stop-opacity=".4"/><stop offset="1" stop-color="#5a2cff" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="beamG" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity=".75"/>` +
  `<stop offset="1" stop-color="#ffd870" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="foamB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fa8ff"/>` +
  `<stop offset=".35" stop-color="#2f6fd6"/><stop offset="1" stop-color="#153a80"/></linearGradient>` +
  `<linearGradient id="foamO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb070"/>` +
  `<stop offset=".35" stop-color="#f07a22"/><stop offset="1" stop-color="#8a3a08"/></linearGradient>` +
  `<linearGradient id="nightG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1f4a"/>` +
  `<stop offset="1" stop-color="#3a1850"/></linearGradient>` +
  `<radialGradient id="steamG"><stop offset="0" stop-color="#ffffff" stop-opacity=".85"/>` +
  `<stop offset=".6" stop-color="#eef6fa" stop-opacity=".4"/><stop offset="1" stop-color="#e0eef4" stop-opacity="0"/></radialGradient>`;

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

// ---------------------------------------------------------------------------
// Cable crossover, sled lane and the amenities
// ---------------------------------------------------------------------------

/** Oblique box whose front face's top-left corner sits at world (x, y, z). */
function box3(x, y, z, w, h, d, m, o) {
  const [px, py] = pj(x, y, z);
  return block(px, py, w, zy(y + h, z) - py, d, m, o);
}

/** Flat quad at height y spanning x0..x1 and z0..z1. */
const floorQuad = (x0, x1, z0, z1, y, fill, w = 1.1) => poly([pj(x0, y, z0), pj(x1, y, z0), pj(x1, y, z1), pj(x0, y, z1)], fill, w);

/** Straight stroke between two world points. */
const seg = (a, b, color, w, op = 1) => line(`M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`, color, w, op);

/** Horizontal disk (x-z plane) of radius R centred at world (x, y, z). */
function disk(x, y, z, R, fill, sw = 1.1, extra = "") {
  const p = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    p.push(pj(x + Math.cos(a) * R, y, z + Math.sin(a) * R));
  }
  return poly(p, fill, sw, extra);
}

/** Bumper plate lying flat on a horn, top face at height y. */
function flatPlate(x, y, z, kg, t = 6) {
  const [col, R] = PLATE[kg];
  let s = disk(x, y + t, z, R, "#101216", 1);
  for (let k = t - 1.5; k > 0; k -= 1.5) s += disk(x, y + k, z, R, "#15181d", 0);
  s += disk(x, y, z, R, col, 1.1);
  s += disk(x, y, z, R * 0.66, "#000", 0, ` opacity=".22"`);
  const [hx, hy] = pj(x - R * 0.7, y, z - R * 0.35);
  s += line(`M${f(hx)},${f(hy)}q${f(R * 0.5)},${f(-R * 0.35)} ${f(R * 1.1)},${f(-R * 0.3)}`, "#fff", 1, 0.5);
  return s;
}

/** Tile grid on a front-facing wall at depth z: x0..x1, y0..y1 (y0 above). */
function tileFront(x0, x1, y0, y1, z, step, color, op = 0.45) {
  let d = "";
  for (let x = x0 + step; x < x1 - 1; x += step) {
    const a = pj(x, y0, z);
    const b = pj(x, y1, z);
    d += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
  }
  for (let y = y0 + step; y < y1 - 1; y += step) {
    const a = pj(x0, y, z);
    const b = pj(x1, y, z);
    d += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
  }
  return line(d, color, 0.7, op);
}

/** Tile grid on a side wall at x running z0..z1. */
function tileSide(x, z0, z1, y0, y1, step, color, op = 0.45) {
  let d = "";
  for (let z = z0 + step; z < z1 - 1; z += step) {
    const a = pj(x, y0, z);
    const b = pj(x, y1, z);
    d += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
  }
  for (let y = y0 + step; y < y1 - 1; y += step) {
    const a = pj(x, y, z0);
    const b = pj(x, y, z1);
    d += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
  }
  return line(d, color, 0.7, op);
}

/** Foam roller lying along x: rounded body, end cap on the left, texture nubs. */
function foamRoller(x0, x1, y, z, r, fill, end) {
  const a = pj(x0, y, z);
  const b = pj(x1, y, z);
  let s = rect(a[0], a[1] - r, b[0] - a[0], r * 2, fill, 1.1, r);
  for (let x = a[0] + r + 3; x < b[0] - r; x += 6) s += line(`M${f(x)},${f(a[1] - r * 0.7)}v${f(r * 1.4)}`, "#000", 1.1, 0.18);
  s += ell(a[0] + r * 0.45, a[1], r * 0.45, r, end, 1);
  s += ell(a[0] + r * 0.45, a[1], r * 0.18, r * 0.4, "#15181d", 0);
  s += line(`M${f(a[0] + r + 2)},${f(a[1] - r * 0.55)}H${f(b[0] - r)}`, "#fff", 1, 0.4);
  return s;
}

/** Cable crossover: twin stack towers with high pulleys, a top bar with grips, D-handles hanging in. */
function cableCrossover() {
  const hw = 86;
  const h = 232;
  const z = 64;
  let s = shadow(26, -10, 146, 28);
  // Rubber platform between the towers and the floor feet.
  s += floorQuad(-hw - 10, hw + 10, z - 34, z + 70, -1, "#1c2025", 1);
  for (let x = -hw + 20; x < hw; x += 34) s += seg(pj(x, -1, z - 34), pj(x, -1, z + 70), "#2e343c", 0.8, 0.8);
  for (const x of [-hw, hw]) s += tube(pj(x, -3, z - 34), pj(x, -3, z + 70), 6, "#2a2e36");
  s += tube(pj(-hw, -3, z + 70), pj(hw, -3, z + 70), 5, "#2a2e36");
  for (const side of [-1, 1]) {
    const x = side * hw;
    s += post(x - 22, z + 24, h, "bk", 6);
    s += weightStack(x - 17, z + 6, -h + 32, 13);
    s += post(x + 16, z + 24, h, "bk", 6);
  }
  // Top bar joining the towers, with a blue header and angled grips.
  s += tube(pj(-hw - 20, -h + 4, z), pj(hw + 20, -h + 4, z), 7, "#2a2e36");
  const [tx, ty] = pj(-44, -h + 12, z - 4);
  s += rect(tx, ty, 88, 13, "url(#bvF)", 1, 1.5);
  s += line(`M${f(tx + 8)},${f(ty + 6.5)}h72`, "#cfe0ff", 1.4, 0.55);
  for (const side of [-1, 1]) {
    const g0 = pj(side * 58, -h + 6, z - 6);
    s += tube(g0, [g0[0] + side * 8, g0[1] + 18], 4, "#dfe7ee");
    s += tube([g0[0] + side * 3, g0[1] + 7], [g0[0] + side * 7.5, g0[1] + 16], 6, "#1c1f24", "#6b7280");
  }
  // High pulleys on the inner faces, cables and D-handles swinging in; low pulleys at the feet.
  for (const side of [-1, 1]) {
    const x = side * (hw - 26);
    const [px, py] = pj(x, -h + 30, z - 2);
    s += block(px - 5, py - 12, 10, 12, 6, "bv", { hi: 0.4 });
    s += ell(px, py + 5, 6.5, 6.5, "url(#chrome)", 0.9);
    s += ell(px, py + 5, 1.8, 1.8, "#15181d");
    const hx = px - side * 34;
    const hy = py + 92;
    s += line(`M${f(px - side * 5)},${f(py + 7)}L${f(hx)},${f(hy)}`, INK, 2.2);
    s += line(`M${f(px - side * 5)},${f(py + 7)}L${f(hx)},${f(hy)}`, "#9aa6b2", 0.9);
    s += ell(hx, hy + 1, 2.2, 2.2, "url(#chrome)", 0.7);
    s += path(`M${f(hx - 7)},${f(hy + 4)}Q${f(hx)},${f(hy)} ${f(hx + 7)},${f(hy + 4)}L${f(hx + 5)},${f(hy + 17)}H${f(hx - 5)}Z`, "none", 2.4);
    s += line(`M${f(hx - 5)},${f(hy + 15)}h10`, "#1c1f24", 4.5);
    s += line(`M${f(hx - 3.5)},${f(hy + 14)}h7`, "#6b7280", 1, 0.6);
    const [lx, ly] = pj(x, -14, z - 2);
    s += ell(lx, ly, 5, 5, "url(#chrome)", 0.9);
    s += ell(lx, ly, 1.5, 1.5, "#15181d");
  }
  s += rim(`M${f(pj(hw + 16, 0, z + 24)[0] + 6)},${f(zy(-h, z + 24) + 4)}V${f(zy(-6, z + 24))}`, 0.4);
  return { box: [-132, -254, 300, 270], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Prowler sled loaded with flat plates on a strip of green turf with yard lines. */
function sledTurf() {
  const tw = 74;
  const z0 = -6;
  const z1 = 204;
  let s = shadow(40, -12, 130, 28, 0.7);
  // Turf: a thin mat with mowing bands, white side lines and yard lines.
  const [ex, ey] = pj(-tw, 0, z0);
  s += rect(ex, ey - 2.5, tw * 2, 3, "#0f3a14", 0.9);
  s += floorQuad(-tw, tw, z0, z1, -2.5, "url(#tfT)", 1.1);
  for (let z = z0; z < z1; z += 42) s += floorQuad(-tw + 1, tw - 1, z, Math.min(z1, z + 21), -2.5, "#000", 0, ` opacity=".09"`);
  for (const x of [-tw + 5, tw - 5]) s += seg(pj(x, -2.6, z0 + 2), pj(x, -2.6, z1 - 2), "#f4f8f0", 1.8, 0.9);
  for (let z = z0 + 21; z < z1; z += 42) {
    s += seg(pj(-tw + 5, -2.6, z), pj(tw - 5, -2.6, z), "#f4f8f0", 1.5, 0.85);
    for (const x of [-tw + 18, tw - 18]) s += seg(pj(x, -2.6, z - 8), pj(x, -2.6, z + 8), "#f4f8f0", 1, 0.6);
  }
  // Sled: skids with upturned noses, base plate, centre horn with plates.
  const sz = 92;
  for (const x of [-40, 34]) {
    s += tube(pj(x, -5, sz - 42), pj(x, -5, sz + 48), 7, "#1c1f24", "#6b7280");
    s += tube(pj(x, -5, sz - 42), pj(x - 2, -14, sz - 54), 7, "#1c1f24", "#6b7280");
  }
  s += floorQuad(-44, 40, sz - 34, sz + 42, -12, "url(#bkT)", 1.1);
  const [bx, by] = pj(-44, -12, sz - 34);
  s += rect(bx, by, 84, 5, "url(#bkF)", 0.9);
  s += rect(bx + 4, by + 1.5, 16, 2, "url(#ylF)", 0.4);
  s += rect(bx + 64, by + 1.5, 16, 2, "url(#ylF)", 0.4);
  const hz = sz + 8;
  const [hx, hy] = pj(0, -12, hz);
  s += rect(hx - 4, zy(-30, hz), 8, hy - zy(-30, hz), "url(#chrome)", 0.8);
  s += flatPlate(0, -19, hz, 25);
  s += flatPlate(0, -27, hz, 25);
  s += flatPlate(0, -35, hz, 20);
  s += flatPlate(0, -43, hz, 15);
  const [tx, ty] = pj(0, -43, hz);
  s += rect(tx - 4, zy(-66, hz), 8, ty - zy(-66, hz), "url(#chromeV)", 0.8, 1);
  // Low handles and two tall push posts leaning back toward the pusher.
  s += tube(pj(-38, -60, sz - 38), pj(32, -60, sz - 38), 4.5, "#2a2e36");
  for (const side of [-1, 1]) {
    const x = side * 35 - 3;
    const b = pj(x, -12, sz - 30);
    const t = pj(x, -142, sz - 52);
    s += tube(b, t, 7, "#2a2e36");
    s += tube(pj(x, -44, sz - 34), pj(x + side * 14, -48, sz - 50), 5.5, "#2a2e36");
    s += tube(pj(x + side * 8, -46.5, sz - 43), pj(x + side * 14, -48, sz - 50), 7, "#1c1f24", "#6b7280");
    s += tube(pj(x, -104, sz - 45), t, 9, "#1c1f24", "#6b7280");
    s += ell(t[0], t[1], 4.5, 2.6, "#0c0e12", 0.8);
  }
  s += rim(`M${f(pj(tw, 0, z0)[0] + 1)},${f(pj(tw, 0, z0)[1] - 3)}L${f(pj(tw, 0, z1)[0])},${f(pj(tw, 0, z1)[1] - 3)}`, 0.35);
  return { box: [-92, -172, 272, 184], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Locker room corner: a bank of three lockers and a tiled shower stall with a towel. */
function lockerRoom() {
  let s = shadow(30, -8, 150, 28);
  const lz = 44;
  const lh = 186;
  // Lockers.
  s += box3(-100, -8, lz + 4, 90, 8, 38, "dk", { top: false, hi: 0 });
  s += box3(-102, -lh - 8, lz, 94, lh, 44, "bv", { top: false });
  for (let i = 0; i < 3; i++) {
    const [dx, dy] = pj(-99 + i * 30.3, -lh - 5, lz);
    const dw = 27.5;
    s += rect(dx, dy, dw, lh - 7, "none", 0.7, 0, ` stroke-opacity=".8"`);
    s += line(`M${f(dx + 0.8)},${f(dy + lh - 8)}V${f(dy + 0.8)}H${f(dx + dw - 0.8)}`, "#cfe0ff", 0.6, 0.4);
    s += vents(dx + 5, dy + 10, dw - 10, 5, 4.4);
    s += vents(dx + 5, dy + lh - 46, dw - 10, 3, 4.4);
    s += rect(dx + dw - 7, dy + 82, 3.2, 18, "url(#chrome)", 0.6, 1.5);
    s += rect(dx + 5, dy + 36, 12, 6, "#e8ecef", 0.5, 0.8);
    s += line(`M${f(dx + 8)},${f(dy + 39)}h${i + 2}`, "#1a232c", 0.9, 0.9);
  }
  s += rect(pj(-102, 0, lz)[0] + 0.6, zy(-lh - 8, lz) + 0.6, 92.8, 6, "url(#ao)", 0);
  // Shower stall: back wall, side wall (tile inside), tray.
  const sx0 = 2;
  const sx1 = 98;
  const zf = 30;
  const zb = 168;
  const top = -206;
  const [bx, by] = pj(sx0, top, zb);
  s += rect(bx, by, sx1 - sx0, zy(0, zb) - by, "url(#tlF)", 1.1);
  s += tileFront(sx0, sx1, top, 0, zb, 16, "#6d8c94");
  s += poly([pj(sx0, top, zf), pj(sx0, top, zb), pj(sx0, 0, zb), pj(sx0, 0, zf)], "url(#tlS)", 1.1);
  s += tileSide(sx0, zf, zb, top, 0, 16, "#4c6a72");
  s += poly([pj(sx0, top, zf), pj(sx0 - 5, top, zf), pj(sx0 - 5, 0, zf), pj(sx0, 0, zf)], "url(#tlF)", 1);
  s += floorQuad(sx0, sx1, zf, zb, -5, "url(#tlT)", 1.1);
  s += rect(pj(sx0, -5, zf)[0], pj(sx0, -5, zf)[1], sx1 - sx0, 5, "url(#tlF)", 0.9);
  const [gx, gy] = pj(56, -5, 110);
  s += ell(gx, gy, 6, 2.2, "#2a3238", 0.8);
  s += line(`M${f(gx - 3.5)},${f(gy)}h7`, "#9aa6b2", 0.8, 0.8);
  // Shower riser, arm and head, plus a valve.
  const r0 = pj(64, -60, zb);
  const r1 = pj(64, -186, zb);
  s += tube(r0, r1, 3.5, "#c9d3dc");
  const hd = pj(64, -186, zb - 34);
  s += tube(r1, hd, 3.5, "#c9d3dc");
  s += path(`M${f(hd[0] - 10)},${f(hd[1] + 7)}L${f(hd[0] - 4)},${f(hd[1] - 1)}H${f(hd[0] + 4)}L${f(hd[0] + 10)},${f(hd[1] + 7)}Z`, "url(#chrome)", 1);
  s += ell(r0[0], r0[1] + 8, 6, 6, "url(#chrome)", 0.9) + rect(r0[0] - 1.2, r0[1] + 1, 2.4, 7, "#e2362b", 0.5);
  // Curtain rod and a striped curtain bunched at the open end.
  const c0 = pj(sx0, top + 12, zf + 2);
  const c1 = pj(sx1 + 2, top + 12, zf + 2);
  s += tube(c0, c1, 2.6, "#dfe7ee");
  const cx = c1[0] - 26;
  let cur = `M${f(cx)},${f(c1[1] + 1)}`;
  cur += `C${f(cx - 6)},${f(c1[1] + 60)} ${f(cx - 2)},${f(c1[1] + 120)} ${f(cx - 8)},${f(c1[1] + 176)}`;
  cur += `Q${f(cx + 8)},${f(c1[1] + 182)} ${f(cx + 28)},${f(c1[1] + 174)}C${f(cx + 25)},${f(c1[1] + 110)} ${f(cx + 26)},${f(c1[1] + 50)} ${f(c1[0] - 1)},${f(c1[1] + 1)}Z`;
  s += path(cur, "#f4f6f8", 1.1);
  for (let k = 0; k < 4; k++) {
    const x = cx - 2 + k * 7;
    s += line(`M${f(x + 2)},${f(c1[1] + 2)}C${f(x - 3)},${f(c1[1] + 60)} ${f(x + 2)},${f(c1[1] + 120)} ${f(x - 3 + k)},${f(c1[1] + 176)}`, "#e2362b", 2.8, 0.85);
  }
  for (let k = 0; k < 5; k++) s += ell(cx + k * 6.5, c1[1], 1.6, 2.4, "none", 0.8);
  // Towel over the stall's side wall.
  const tw = pj(sx0 - 5, top + 2, zf + 4);
  s += path(`M${f(tw[0] - 12)},${f(tw[1])}h24l1,52q-12,5 -24,0Z`, "#ffffff", 1.1);
  s += path(`M${f(tw[0] - 12)},${f(tw[1])}h24l1,52q-12,5 -24,0Z`, "#22c4d8", 0, ` opacity=".55"`);
  s += line(`M${f(tw[0] - 11)},${f(tw[1] + 40)}h23M${f(tw[0] - 11)},${f(tw[1] + 44)}h23`, "#ffffff", 1.4, 0.9);
  s += line(`M${f(tw[0] - 9)},${f(tw[1] + 4)}v34`, "#ffffff", 1.2, 0.35);
  // Bath mat and slides in front of the stall.
  s += floorQuad(24, 76, 4, 26, -1, "#e8a23a", 1);
  for (let x = 30; x < 74; x += 7) s += seg(pj(x, -1.2, 6), pj(x, -1.2, 24), "#b8741a", 0.9, 0.6);
  for (const x of [-60, -40]) {
    const [fx, fy] = pj(x, -2, 16);
    s += path(`M${f(fx)},${f(fy)}h14q4,-3 0,-6h-14q-4,3 0,6Z`, "#1c1f24", 0.9);
    s += line(`M${f(fx + 2)},${f(fy - 5)}h8`, "#e2362b", 2.2, 0.9);
  }
  s += rim(`M${f(pj(sx1, top, zb)[0] + 1)},${f(zy(top, zb) + 2)}V${f(zy(-4, zb))}`, 0.35);
  const spray =
    line(`M${f(hd[0] - 7)},${f(hd[1] + 10)}l-6,40M${f(hd[0] - 2)},${f(hd[1] + 10)}l-2,46M${f(hd[0] + 3)},${f(hd[1] + 10)}l2,44M${f(hd[0] + 8)},${f(hd[1] + 10)}l6,38`, "#bff4ff", 1.1, 0.65);
  return {
    box: [-122, -226, 312, 238],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${spray}</g>`, shade: false, anim: { type: "flicker", min: 0.5, max: 1, speed: 3 } },
    ],
  };
}

/** Cedar sauna cabin: plank walls, a glass door onto the bench and glowing heater stones. */
function sauna() {
  const x0 = -94;
  const w = 188;
  const zf = 40;
  const d = 140;
  const top = -214;
  let s = shadow(34, -10, 150, 30);
  s += box3(x0, top, zf, w, -top, d, "cd", { top: false, hi: 0.3 });
  // Planks on the front and side.
  const [fx, fy] = pj(x0, top, zf);
  const fb = zy(0, zf);
  let pl = "";
  for (let x = fx + 11; x < fx + w - 2; x += 11) pl += `M${f(x)},${f(fy + 1)}V${f(fb - 1)}`;
  s += line(pl, "#7a3e14", 0.9, 0.55);
  let sp = "";
  for (let k = 12; k < d; k += 14) {
    const a = pj(x0 + w, top, zf + k);
    sp += `M${f(a[0])},${f(a[1] + 1)}L${f(a[0])},${f(zy(0, zf + k) - 1)}`;
  }
  s += line(sp, "#3a1a08", 0.9, 0.5);
  // Top and base trim.
  s += rect(fx - 2, fy - 2, w + 4, 10, "url(#wnF)", 1.1);
  s += rect(fx - 2, fb - 8, w + 4, 8, "url(#wnF)", 1.1);
  // Door: cedar frame, bronze glass showing the bench and heater inside.
  const dx = fx + 18;
  const dy = fy + 18;
  const dw = 62;
  const dh = fb - 10 - dy;
  s += rect(dx - 5, dy - 5, dw + 10, dh + 6, "url(#wnF)", 1.2);
  s += rect(dx, dy, dw, dh, "url(#emberG)", 1.1);
  const inner =
    rect(dx + 3, dy + dh * 0.55, dw - 6, 5, "url(#cdF)", 0.7) +
    rect(dx + 3, dy + dh * 0.55 + 5, dw - 6, dh * 0.45 - 5, "#2a1206", 0) +
    rect(dx + 3, dy + dh * 0.28, dw - 6, 4, "url(#cdF)", 0.7) +
    line(`M${f(dx + 8)},${f(dy + dh * 0.28 + 4)}V${f(dy + dh * 0.55)}M${f(dx + dw - 8)},${f(dy + dh * 0.28 + 4)}V${f(dy + dh * 0.55)}`, "#6a3410", 2, 0.8);
  s += inner;
  // Heater: steel box with a pile of stones, behind the glass.
  const hx = dx + dw - 26;
  const hy = dy + dh - 38;
  s += rect(hx, hy, 22, 34, "url(#ssF)", 0.9, 1);
  s += vents(hx + 4, hy + 10, 14, 4, 5);
  for (const [ox, oy, r] of [[4, -1, 4.5], [11, -3, 5], [17, 0, 4], [8, -6, 4], [14, -8, 3.5]]) s += ell(hx + ox, hy + oy, r, r * 0.8, "#4a4642", 0.8);
  s += rect(dx, dy, dw, dh, "#e89a4a", 0, 0, ` opacity=".18"`);
  s += line(`M${f(dx + 8)},${f(dy + 8)}l18,-0M${f(dx + 6)},${f(dy + 14)}l10,0`, "#fff", 1.6, 0.35);
  s += line(`M${f(dx + dw - 14)},${f(dy + 6)}L${f(dx + dw - 40)},${f(dy + dh - 6)}`, "#fff", 3, 0.12);
  // Wooden handle bar.
  s += rect(dx + dw - 8, dy + dh * 0.35, 5, 34, "url(#wnF)", 0.9, 2);
  // Window with the warm interior.
  const wx = fx + 104;
  const wy = fy + 34;
  s += rect(wx - 5, wy - 5, 70, 50, "url(#wnF)", 1.2);
  s += rect(wx, wy, 60, 40, "url(#emberG)", 1.1);
  s += rect(wx + 2, wy + 24, 56, 4, "url(#cdF)", 0.6);
  s += line(`M${f(wx + 6)},${f(wy + 6)}h16`, "#fff", 1.4, 0.35);
  // Sign with a flame, a hygrometer dial by the door.
  s += rect(wx + 4, fy + 12, 52, 12, "url(#wnF)", 1, 2);
  s += path(`M${f(wx + 30)},${f(fy + 22)}c-5,0 -6,-5 -3,-8c0,2 2,3 3,1c0,-2 1,-3 2,-4c1,3 4,5 3,8c0,2 -2,3 -5,3Z`, "#ffd23a", 0.7);
  for (const k of [-1, 1]) s += line(`M${f(wx + 30 + k * 10)},${f(fy + 18)}h${k * 12}`, "#3a1a08", 1.4, 0.7);
  const [mx, my] = [wx + 30, wy + 62];
  s += ell(mx, my, 9, 9, "url(#wnF)", 1.1);
  s += ell(mx, my, 6.5, 6.5, "#f6ecd8", 0.7);
  s += line(`M${f(mx)},${f(my)}l4,-3`, "#e2362b", 1.2);
  // Bucket and ladle outside.
  const [bx, by] = pj(70, 0, 16);
  s += path(`M${f(bx - 12)},${f(by - 24)}h24l-3,24h-18Z`, "url(#cdF)", 1.1);
  s += ell(bx, by - 24, 12, 3.2, "#5a2a0c", 1);
  s += line(`M${f(bx - 11)},${f(by - 16)}h22M${f(bx - 10)},${f(by - 6)}h20`, "#8a8e94", 1.6, 0.9);
  s += line(`M${f(bx + 4)},${f(by - 24)}L${f(bx + 16)},${f(by - 48)}`, INK, 3.4) + line(`M${f(bx + 4)},${f(by - 24)}L${f(bx + 16)},${f(by - 48)}`, "#c98a4a", 2);
  s += rim(`M${f(pj(x0 + w, top, zf + d)[0])},${f(zy(top, zf + d) + 2)}V${f(zy(-4, zf + d))}`, 0.35);
  const glow =
    `<rect x="${f(dx)}" y="${f(dy)}" width="${dw}" height="${f(dh)}" fill="#ff9a30" opacity=".22"/>` +
    `<rect x="${f(wx)}" y="${f(wy)}" width="60" height="40" fill="#ff9a30" opacity=".22"/>` +
    lamp(hx + 11, hy - 4, 3, "#ff7a20", "#ffd080");
  return {
    box: [-120, -232, 320, 246],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "flicker", min: 0.65, max: 1, speed: 1.4 } },
    ],
  };
}

/** Tiled steam pod: mosaic walls, a frosted glass door, control panel, eucalyptus, steam. */
function steamRoom() {
  const x0 = -90;
  const w = 180;
  const zf = 44;
  const d = 136;
  const top = -214;
  let s = shadow(30, -10, 146, 28);
  s += box3(x0, top, zf, w, -top, d, "tl", { top: false, hi: 0.3 });
  s += tileFront(x0, x0 + w, top, 0, zf, 12, "#5a8e98", 0.5);
  s += tileSide(x0 + w, zf, zf + d, top, 0, 12, "#3e6a74", 0.5);
  // Teal accent band and a steel crown.
  const [fx, fy] = pj(x0, top, zf);
  const fb = zy(0, zf);
  s += rect(fx, fy + 96, w, 12, "#1fa0a8", 1, 0, ` opacity=".9"`);
  s += rect(fx - 2, fy - 3, w + 4, 9, "url(#ssF)", 1.1);
  s += rect(fx - 1, fb - 7, w + 2, 7, "url(#ssF)", 1);
  // Frosted door in a steel frame, droplets and a long pull handle.
  const dx = fx + 46;
  const dy = fy + 14;
  const dw = 66;
  const dh = fb - 9 - dy;
  s += rect(dx - 4, dy - 4, dw + 8, dh + 5, "url(#ssF)", 1.2, 2);
  s += rect(dx, dy, dw, dh, "url(#frostG)", 1, 2);
  s += `<rect x="${f(dx + 4)}" y="${f(dy + dh * 0.3)}" width="${dw - 8}" height="${f(dh * 0.55)}" fill="#fff" opacity=".28" rx="8" filter="url(#soft)"/>`;
  for (const [ox, oy] of [[10, 30], [18, 62], [50, 44], [40, 92], [14, 120], [54, 140], [28, 150], [46, 20]]) {
    s += ell(dx + ox, dy + oy, 1.4, 2, "#8fb2c0", 0, ` opacity=".7"`);
    s += line(`M${f(dx + ox)},${f(dy + oy + 2)}v${6 + (ox % 7)}`, "#8fb2c0", 0.8, 0.5);
  }
  s += line(`M${f(dx + 8)},${f(dy + 10)}L${f(dx + 30)},${f(dy + 70)}`, "#fff", 3, 0.35);
  s += rect(dx + dw - 12, dy + dh * 0.3, 5, 62, "url(#chrome)", 0.9, 2);
  // Control panel with a lit readout.
  const px = dx + dw + 18;
  const py = dy + 48;
  s += rect(px, py, 26, 36, "url(#dkF)", 1.1, 2);
  s += rect(px + 4, py + 5, 18, 10, "#04141a", 0.7, 1);
  s += ell(px + 8, py + 25, 3, 3, "url(#chrome)", 0.7) + ell(px + 18, py + 25, 3, 3, "url(#chrome)", 0.7);
  // Eucalyptus bunch hanging left of the door.
  const [ex, ey] = [dx - 22, dy + 40];
  s += line(`M${f(ex)},${f(ey - 12)}V${f(ey)}`, "#6a4a2a", 1.4);
  s += leaf(ex, ey, 170, 26, 5, 0.05, "url(#leafA)") + leaf(ex, ey, 200, 24, 5, 0.05, "url(#leafB)") + leaf(ex, ey, 150, 22, 4.5, 0.05, "url(#leafB)") + leaf(ex, ey, 185, 30, 4, 0.05, "url(#leafA)");
  s += rect(ex - 4, ey - 2, 8, 4, "#e2362b", 0.6, 1);
  // A towel stack on a teak stool beside the door.
  const [kx, ky] = pj(-78, -40, 22);
  s += box3(-78, -40, 22, 30, 40, 16, "wn", { hi: 0.3 });
  for (let i = 0; i < 3; i++) s += rect(kx + 2, ky - 8 - i * 7, 26, 7, i === 1 ? "#22c4d8" : "#ffffff", 0.9, 3);
  s += rim(`M${f(pj(x0 + w, top, zf + d)[0])},${f(zy(top, zf + d) + 2)}V${f(zy(-4, zf + d))}`, 0.35);
  const lamps = `<rect x="${f(px + 5)}" y="${f(py + 6)}" width="16" height="8" fill="#22e6ff" opacity=".45"/>` +
    line(`M${f(px + 7)},${f(py + 10)}h5M${f(px + 14)},${f(py + 10)}h4`, "#bff8ff", 1.2, 0.95);
  // Steam: soft puffs escaping from the door gaps and the roof vent.
  let steam = "";
  for (const [ox, oy, r] of [[dx + 10, dy - 8, 14], [dx + 34, dy - 16, 18], [dx + 58, dy - 10, 13], [dx + 24, dy - 34, 20], [dx + 50, dy - 38, 16]]) {
    steam += `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${r}" ry="${f(r * 0.7)}" fill="url(#steamG)"/>`;
  }
  for (const [ox, r] of [[dx + 6, 10], [dx + 30, 13], [dx + dw - 4, 11]]) {
    steam += `<ellipse cx="${f(ox)}" cy="${f(fb - 12)}" rx="${r * 1.4}" ry="${f(r * 0.6)}" fill="url(#steamG)"/>`;
  }
  return {
    box: [-120, -254, 312, 266],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${lamps}</g>`, shade: false, blend: "lighter" },
      { markup: `<g opacity=".85">${steam}</g>`, shade: false, anim: { type: "float", amp: 3, speed: 1.3 } },
    ],
  };
}

/** Steel cold-plunge tub: icy water with floating ice, entry steps, thermometer and a chiller. */
function coldPlunge() {
  const x0 = -72;
  const w = 136;
  const zf = 44;
  const d = 128;
  const top = -86;
  let s = shadow(34, -10, 132, 28);
  // Chiller unit behind on the right, with hoses into the tub.
  s += box3(46, -62, zf + d - 30, 34, 62, 34, "dk", { hi: 0.3 });
  const [cx, cy] = pj(46, -62, zf + d - 30);
  s += vents(cx + 5, cy + 18, 24, 5, 5);
  s += rect(cx + 6, cy + 5, 14, 8, "#04121e", 0.7, 1);
  // Tub body: brushed steel with a rolled rim.
  s += box3(x0, top, zf, w, -top, d, "ss", { hi: 0.4 });
  const [fx, fy] = pj(x0, top, zf);
  s += line(`M${f(fx + 10)},${f(fy + 16)}h${w - 20}M${f(fx + 10)},${f(fy + 70)}h${w - 20}`, "#fff", 0.8, 0.3);
  for (let x = fx + 16; x < fx + w - 8; x += 24) s += line(`M${f(x)},${f(fy + 6)}v${-top - 14}`, "#66727e", 0.6, 0.25);
  // Water surface inset in the top.
  const wy = top + 4;
  s += floorQuad(x0 + 7, x0 + w - 7, zf + 7, zf + d - 7, wy, "url(#waterG)", 1);
  s += poly([pj(x0 + 7, wy, zf + 7), pj(x0 + w - 7, wy, zf + 7), pj(x0 + w - 7, wy + 1, zf + 16), pj(x0 + 7, wy + 1, zf + 16)], "#1b6f96", 0, ` opacity=".35"`);
  // Ripples and floating ice.
  for (const [x, z, r] of [[-30, 90, 14], [18, 130, 11], [40, 80, 9]]) {
    const [rx, ry] = pj(x, wy, z);
    s += ell(rx, ry, r, r * 0.3, "none", 0, ` stroke="#fff" stroke-width=".9" stroke-opacity=".6"`);
  }
  for (const [x, z, k] of [[-44, 72, 9], [-18, 118, 8], [8, 70, 10], [30, 108, 7], [-2, 146, 6], [44, 140, 7]]) {
    const [ix, iy] = pj(x, wy - 2, z);
    s += path(`M${f(ix - k)},${f(iy)}l${f(k * 0.4)},${f(-k * 0.55)}h${f(k * 1.3)}l${f(k * 0.5)},${f(k * 0.5)}l${f(-k * 0.45)},${f(k * 0.5)}h${f(-k * 1.3)}Z`, "#f4fdff", 0.8);
    s += line(`M${f(ix - k * 0.4)},${f(iy - k * 0.3)}h${f(k * 0.9)}`, "#9ae0f4", 1, 0.8);
  }
  // Hoses from the chiller over the rim.
  s += line(`M${f(cx + 4)},${f(cy + 30)}C${f(cx - 10)},${f(cy + 26)} ${f(cx - 14)},${f(cy + 4)} ${f(cx - 22)},${f(cy + 2)}`, INK, 5) +
    line(`M${f(cx + 4)},${f(cy + 30)}C${f(cx - 10)},${f(cy + 26)} ${f(cx - 14)},${f(cy + 4)} ${f(cx - 22)},${f(cy + 2)}`, "#2a2e36", 3);
  // Entry steps with rubber treads on the left front.
  s += box3(x0 + 6, -28, zf - 34, 46, 28, 34, "ss", { hi: 0.3 });
  s += box3(x0 + 6, -56, zf - 16, 46, 28, 16, "ss", { hi: 0.3 });
  s += floorQuad(x0 + 9, x0 + 49, zf - 32, zf - 18, -28.5, "#1c2025", 0.7);
  s += floorQuad(x0 + 9, x0 + 49, zf - 14, zf - 2, -56.5, "#1c2025", 0.7);
  // Grab rail and a clip-on thermometer at the front right.
  s += tube(pj(x0 + 58, top, zf + 2), pj(x0 + 58, top - 46, zf + 2), 3.5, "#dfe7ee");
  s += tube(pj(x0 + 58, top - 46, zf + 2), pj(x0 + 58, top - 46, zf + 30), 3.5, "#dfe7ee");
  s += tube(pj(x0 + 58, top - 46, zf + 30), pj(x0 + 58, top + 2, zf + 30), 3.5, "#dfe7ee");
  const [tx, ty] = pj(x0 + w - 22, top - 38, zf);
  s += rect(tx - 5, ty, 10, 44, "#ffffff", 1.1, 5);
  s += rect(tx - 1.6, ty + 5, 3.2, 30, "#e8f4fa", 0.6, 1.6);
  s += rect(tx - 1.6, ty + 26, 3.2, 9, "#2f6fd6", 0);
  s += ell(tx, ty + 38, 3.6, 3.6, "#2f6fd6", 0.7);
  for (let k = 0; k < 5; k++) s += line(`M${f(tx + 2)},${f(ty + 8 + k * 5)}h2.4`, INK, 0.6, 0.7);
  s += rim(`M${f(pj(x0 + w, top, zf + d)[0])},${f(zy(top, zf + d) + 2)}V${f(zy(-4, zf + d))}`, 0.35);
  const glow =
    lamp(cx + 13, cy + 9, 1.8, "#22a0ff", "#d0f0ff") +
    line(`M${f(cx + 9)},${f(cy + 9)}h8`, "#9ae0ff", 1.4, 0.9);
  const shimmer = line(
    `M${f(pj(-40, wy, 110)[0])},${f(pj(-40, wy, 110)[1])}q10,-2 20,0t20,0M${f(pj(10, wy, 90)[0])},${f(pj(10, wy, 90)[1])}q8,-2 16,0t16,0`,
    "#ffffff", 1.2, 0.7,
  );
  return {
    box: [-96, -150, 262, 162],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.6, max: 1, speed: 2 } },
      { markup: `<g>${shimmer}</g>`, shade: false, anim: { type: "float", amp: 1.2, speed: 2.2 } },
    ],
  };
}

/** Clamshell tanning bed, lid open: violet UV tubes in the bed and the canopy. */
function tanningBed() {
  const hw = 48;
  const z0 = 16;
  const z1 = 186;
  const bt = -46;
  const L = 164;
  const th = (62 * Math.PI) / 180;
  const hz = z1 - 4;
  const edge = (x, t, n = 0) => pj(x, bt - t * L * Math.sin(th) - n * Math.cos(th), hz - t * L * Math.cos(th) + n * Math.sin(th));
  let s = shadow(40, -10, 130, 30);
  // Canopy: outer shell, its edges, then the underside with tubes.
  const n = 12;
  s += poly([edge(-hw, 0, n), edge(hw, 0, n), edge(hw, 1, n), edge(-hw, 1, n)], "url(#whS)", 1.1);
  s += poly([edge(hw, 0), edge(hw, 1), edge(hw, 1, n), edge(hw, 0, n)], "url(#whS)", 1.1);
  s += poly([edge(-hw, 1), edge(hw, 1), edge(hw, 1, n), edge(-hw, 1, n)], "url(#whT)", 1.1);
  s += poly([edge(-hw, 0), edge(hw, 0), edge(hw, 1), edge(-hw, 1)], "#20163e", 1.2);
  s += poly([edge(-hw + 5, 0.05), edge(hw - 5, 0.05), edge(hw - 5, 0.95), edge(-hw + 5, 0.95)], "url(#viF)", 0.8);
  for (let x = -hw + 11; x <= hw - 10; x += 9.6) s += seg(edge(x, 0.08), edge(x, 0.92), INK, 5.4) + seg(edge(x, 0.08), edge(x, 0.92), "url(#uvG)", 3.6);
  s += seg(edge(-hw, 1, n * 0.5), edge(hw, 1, n * 0.5), "#6a58bc", 3, 0.9);
  // Hinge arms.
  for (const x of [-hw - 2, hw + 2]) s += tube(pj(x, bt + 4, hz), edge(x, 0.35), 4, "#9aa6b2");
  // Base: white shell with a violet stripe and a timer panel.
  s += box3(-hw, bt, z0, hw * 2, -bt, z1 - z0, "wh", { hi: 0.4 });
  const [fx, fy] = pj(-hw, bt, z0);
  s += rect(fx, fy + 18, hw * 2, 8, "url(#viF)", 0.9);
  const sa = pj(hw, bt + 18, z0);
  const sb = pj(hw, bt + 18, z1);
  s += poly([sa, sb, [sb[0], sb[1] + 7], [sa[0], sa[1] + 8]], "url(#viS)", 0.9);
  s += rect(fx + 30, fy + 30, 36, 11, "#0a0a18", 0.9, 2);
  // Acrylic bed with its tubes and a headrest.
  s += floorQuad(-hw + 6, hw - 6, z0 + 8, z1 - 10, bt - 0.5, "#241a50", 1);
  for (let x = -hw + 12; x <= hw - 11; x += 9.6) s += seg(pj(x, bt - 1, z0 + 12), pj(x, bt - 1, z1 - 14), INK, 4.6) + seg(pj(x, bt - 1, z0 + 12), pj(x, bt - 1, z1 - 14), "url(#uvG)", 3);
  s += floorQuad(-hw + 6, hw - 6, z0 + 8, z1 - 10, bt - 1.5, "#c8e8ff", 0, ` opacity=".16"`);
  s += box3(-24, bt - 9, z1 - 38, 48, 8, 22, "wh", { hi: 0.3, rx: 3 });
  // Goggles on the bed.
  const [gx, gy] = pj(18, bt - 3, 60);
  s += ell(gx, gy, 5, 3, "#2a2e36", 1) + ell(gx + 12, gy, 5, 3, "#2a2e36", 1) + line(`M${f(gx + 4)},${f(gy)}h4`, INK, 1.4);
  s += rim(`M${f(pj(hw, bt, z1)[0])},${f(zy(bt, z1) + 2)}V${f(zy(-4, z1))}`, 0.35);
  const glow =
    `<ellipse cx="${f(pj(0, bt - 30, 110)[0])}" cy="${f(pj(0, bt - 30, 110)[1])}" rx="92" ry="70" fill="url(#uvGlow)"/>` +
    `<rect x="${f(fx + 33)}" y="${f(fy + 33)}" width="30" height="5" fill="#b89aff" opacity=".8"/>`;
  return {
    box: [-96, -232, 290, 244],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.7, max: 1, speed: 2.6 } },
    ],
  };
}

/** Recovery corner on a violet mat: shelf of foam rollers, massage gun, compression boots and pump. */
function recoveryStation() {
  let s = shadow(34, -8, 140, 26, 0.8);
  // Mat.
  const [mx, my] = pj(-94, 0, 8);
  s += rect(mx, my - 3, 188, 3, "#241a50", 0.9);
  s += floorQuad(-94, 94, 8, 188, -3, "url(#viT)", 1.1);
  s += seg(pj(-88, -3.1, 14), pj(88, -3.1, 14), "#9a8ae0", 0.8, 0.5);
  // Shelf at the back left.
  const sx = -90;
  const sz = 132;
  for (const x of [sx, sx + 84]) s += box3(x, -118, sz, 5, 115, 40, "dk", { hi: 0.2, top: false });
  for (const y of [-114, -64, -14]) s += box3(sx + 2, y, sz, 84, 4, 40, "wd", { hi: 0.3 });
  s += foamRoller(sx + 6, sx + 84, -64 - 9, sz + 18, 9, "url(#foamB)", "#6fa8ff");
  s += foamRoller(sx + 6, sx + 50, -14 - 8, sz + 22, 8, "url(#foamO)", "#ffb070");
  s += foamRoller(sx + 52, sx + 84, -14 - 6, sz + 18, 6, "#1c2025", "#3a4048");
  // Massage gun on the top shelf.
  const [gx, gy] = pj(sx + 30, -114, sz + 20);
  s += path(`M${f(gx)},${f(gy - 20)}h30q5,0 5,5v6q0,5 -5,5h-18l-3,4h-9Z`, "#2a3440", 1.1);
  s += path(`M${f(gx + 8)},${f(gy - 4)}h9l-2,-5h-7Z`, "#1c1f24", 0.9);
  s += ell(gx - 4, gy - 14, 5, 5, "#22c4d8", 1);
  s += line(`M${f(gx + 4)},${f(gy - 17)}h22`, "#8a96a2", 1, 0.6);
  // Compression boots lying on the mat, zipped chambers.
  for (const x of [8, 42]) {
    s += box3(x, -16, 40, 26, 14, 118, "bk", { hi: 0.3, rx: 6 });
    for (let z = 58; z < 156; z += 18) s += seg(pj(x + 2, -16.5, z), pj(x + 24, -16.5, z), "#6b7280", 1, 0.7);
    const [tx, ty] = pj(x, -16, 40);
    s += rect(tx + 3, ty + 3, 20, 4, "#e2362b", 0.6, 1);
  }
  // Pump with a lit screen and hoses to the boots.
  s += box3(74, -34, 64, 22, 34, 20, "wh", { hi: 0.4, rx: 2 });
  const [px, py] = pj(74, -34, 64);
  s += rect(px + 4, py + 5, 14, 8, "#08121a", 0.7, 1);
  for (const x of [20, 54]) {
    const a = pj(x, -16, 150);
    s += line(`M${f(a[0])},${f(a[1])}C${f(a[0] + 10)},${f(a[1] - 20)} ${f(px + 30)},${f(py - 10)} ${f(px + 12)},${f(py)}`, INK, 3.6) +
      line(`M${f(a[0])},${f(a[1])}C${f(a[0] + 10)},${f(a[1] - 20)} ${f(px + 30)},${f(py - 10)} ${f(px + 12)},${f(py)}`, "#39414c", 2);
  }
  // Big roller and a lacrosse ball on the mat up front.
  s += foamRoller(-82, -12, -11, 40, 11, "url(#foamB)", "#6fa8ff");
  const [bx, by] = pj(-4, -5, 26);
  s += ell(bx, by, 5, 5, "#e2362b", 1) + ell(bx - 1.5, by - 1.5, 1.6, 1.6, "#fff", 0, ` opacity=".6"`);
  s += rim(`M${f(pj(sx + 89, -118, sz + 40)[0])},${f(zy(-118, sz + 40) + 2)}V${f(zy(-4, sz + 40))}`, 0.35);
  const glow = `<rect x="${f(px + 5)}" y="${f(py + 6)}" width="12" height="6" fill="#3dff8a" opacity=".45"/>` +
    lamp(gx - 4, gy - 14, 1.2, "#22e6ff", "#d8fdff");
  return {
    box: [-110, -150, 300, 162],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.7, max: 1, speed: 2 } },
    ],
  };
}

/** Five-point star path centred at (x, y). */
function star(x, y, r) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.45 : r;
    d += `${i ? "L" : "M"}${f(x + Math.cos(a) * k)},${f(y + Math.sin(a) * k)}`;
  }
  return d + "Z";
}

/** Posing room: carpeted riser with footlights, mirror panel, star backdrop and a spotlight on a stand. */
function posingRoom() {
  const x0 = -92;
  const w = 184;
  const zf = 36;
  const d = 150;
  const st = -26;
  let s = shadow(36, -8, 148, 28);
  // Backdrop banner stand (right) and the mirror panel (left) standing on the riser's back edge.
  const bz = zf + d - 10;
  const [kx, ky] = pj(-4, -214, bz);
  const kb = zy(st, bz);
  s += rect(kx, ky, 92, kb - ky, "url(#nightG)", 1.2);
  for (const [ox, oy, r] of [[18, 26, 9], [60, 18, 6], [74, 60, 10], [30, 76, 5], [52, 104, 7], [14, 122, 6], [78, 130, 5]]) s += path(star(kx + ox, ky + oy, r), "#ffd23a", 0.8);
  s += rect(kx, ky, 92, 8, "#e2362b", 1);
  s += tube([kx - 2, ky - 2], [kx + 94, ky - 2], 3, "#9aa6b2");
  const [rx, ry] = pj(x0 + 6, -208, bz - 6);
  const rb = zy(st, bz - 6);
  s += rect(rx - 4, ry - 4, 86, rb - ry + 4, "url(#chrome)", 1.2, 2);
  s += rect(rx, ry, 78, rb - ry - 2, "url(#glass)", 1);
  s += line(`M${f(rx + 10)},${f(ry + 20)}L${f(rx + 40)},${f(ry + 4)}M${f(rx + 12)},${f(ry + 44)}L${f(rx + 64)},${f(ry + 14)}`, "#fff", 3.4, 0.45);
  s += line(`M${f(rx + 30)},${f(rb - 10)}L${f(rx + 76)},${f(rb - 38)}`, "#fff", 2, 0.3);
  s += `<ellipse cx="${f(rx + 40)}" cy="${f(ry + 70)}" rx="16" ry="34" fill="#1a2a40" opacity=".18"/>`;
  // Riser: black carpet top, red skirt, footlights.
  s += box3(x0, st, zf, w, -st, d, "bk", { hi: 0.3 });
  const [fx, fy] = pj(x0, st, zf);
  s += rect(fx, fy, w, -st, "url(#rdF)", 1.1);
  s += line(`M${f(fx + 2)},${f(fy + 3)}h${w - 4}`, "#ffb0b0", 1, 0.45);
  const sa = pj(x0 + w, st, zf);
  s += poly([sa, pj(x0 + w, st, zf + d), pj(x0 + w, 0, zf + d), pj(x0 + w, 0, zf)], "url(#rdS)", 1.1);
  for (let x = fx + 14; x < fx + w; x += 26) s += rect(x - 5, fy + 12, 10, 6, "#15181d", 0.7, 1);
  // Tape mark centre stage and a small step.
  const tm = pj(8, st - 0.5, zf + 70);
  s += line(`M${f(tm[0] - 10)},${f(tm[1] - 3)}l20,6M${f(tm[0] - 10)},${f(tm[1] + 3)}l20,-6`, "#ffd23a", 2.4, 0.9);
  s += box3(-50, -12, zf - 22, 60, 12, 22, "bk", { hi: 0.3 });
  // Spotlight on a tripod stand at the front right, aimed at the stage.
  const [lx, ly] = pj(78, 0, 18);
  for (const k of [-14, 0, 14]) s += line(`M${f(lx)},${f(ly - 40)}L${f(lx + k)},${f(ly + (k ? 0 : 2))}`, INK, 2.6) + line(`M${f(lx)},${f(ly - 40)}L${f(lx + k)},${f(ly + (k ? 0 : 2))}`, "#39414c", 1.4);
  s += line(`M${f(lx)},${f(ly - 40)}V${f(ly - 150)}`, INK, 4) + line(`M${f(lx)},${f(ly - 40)}V${f(ly - 150)}`, "#9aa6b2", 2.2);
  const hx = lx - 4;
  const hy = ly - 160;
  s += `<g transform="rotate(-24 ${f(hx)} ${f(hy)})">` +
    rect(hx - 14, hy - 10, 26, 20, "url(#bkF)", 1.2, 3) +
    ell(hx - 14, hy, 5, 10, "#fff6d0", 1.1) +
    line(`M${f(hx - 8)},${f(hy - 10)}l3,-5M${f(hx + 2)},${f(hy - 10)}l3,-5`, INK, 1.4) + `</g>`;
  s += line(`M${f(lx - 8)},${f(ly - 150)}h8`, INK, 3);
  s += rim(`M${f(pj(x0 + w, st, zf + d)[0])},${f(zy(st, zf + d) + 1)}V${f(zy(-3, zf + d))}`, 0.35);
  let glow = `<path d="M${f(hx - 18)},${f(hy - 6)}L${f(fx + 40)},${f(fy - 24)}L${f(fx + 120)},${f(fy - 4)}L${f(hx - 16)},${f(hy + 8)}Z" fill="url(#beamG)" opacity=".5"/>`;
  glow += `<ellipse cx="${f(tm[0])}" cy="${f(tm[1])}" rx="46" ry="12" fill="url(#warmG)" opacity=".55"/>`;
  for (let x = fx + 14; x < fx + w; x += 26) glow += lamp(x, fy + 15, 1.6, "#ffc040", "#fff4d0");
  return {
    box: [-116, -234, 316, 246],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.75, max: 1, speed: 1.6 } },
    ],
  };
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
  cable_crossover: cableCrossover,
  sled_turf: sledTurf,
  locker_room: lockerRoom,
  sauna,
  steam_room: steamRoom,
  cold_plunge: coldPlunge,
  tanning_bed: tanningBed,
  recovery_station: recoveryStation,
  posing_room: posingRoom,
};

/** Every world sprite (CC props + equipment) in one set sharing EQUIP_DEFS. */
export const WORLD_BUILDERS = { ...PROP_BUILDERS, ...EQUIP_BUILDERS };
export const WORLD_SPRITES = buildSet(WORLD_BUILDERS);

/** Big clean surfaces (tile, steel, shell plastic, mirror) read as filthy under the default Modern grime. */
const POLISHED = ["locker_room", "steam_room", "cold_plunge", "tanning_bed", "posing_room", "recovery_station"];

let real = null;
/** Modern set, built on first Modern-style use: { defs, sprites }. */
export function realisticWorld() {
  if (real) return real;
  const rough = { ...WORLD_BUILDERS };
  for (const k of POLISHED) delete rough[k];
  real = buildRealisticSet(rough, EQUIP_DEFS);
  for (const k of POLISHED) real.sprites[k] = realizeSprite(withRealistic(WORLD_BUILDERS[k]), 0.85, { grime: 0.1, scuff: 0.08 });
  return real;
}
