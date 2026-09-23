/**
 * First-person arms for the training minigames, inked like the figures.
 *
 * Units: the screen is 400 units wide with the origin at its bottom centre
 * and y up negative (16:9 puts the top edge near y = -225). Forearms run
 * well past the bottom edge so rep motion (a canvas transform, never a
 * re-raster) cannot uncover their ends. Forearms taper toward the wrist the
 * way a near object does, so they read as coming from the camera.
 *
 * Sprites: press (loaded barbell, both hands), squat (loaded bar gripped
 * high), overhead (bare pull-up bar), pulldown (lat bar on a cable), row
 * (rowing handle), handles (leg-press side grips; flip), bike (handlebars),
 * curl (right arm + dumbbell; flip for the left), kettle (right arm +
 * kettlebell; flip), glove (right boxing glove; flip), fist (bare right
 * fist for running; flip), crunch (arms crossed on the chest), fly (right
 * hand on a cable D-handle; flip), sled (both hands on the prowler posts).
 * Forearm girth follows the player's arm development; hands stay hand-sized. Plates
 * and dumbbell heads follow the chosen weight.
 */

import {
  INK, f, P, lerp, capsule, sh, ln, ell, limb, lit, baseDefs, realDefs, withRealisticBuild, mix, spec,
} from "../../engine/ink-kit.js";
import { SKINS, PLAYER_LOOK } from "./figures.js";

const RIM = "#ffe6c8";
const BAND = "#e2362b";

const dark = (skin, k = 0.35) => mix(skin, "#3a1a0a", k);

/** Forearm from elbow E (off-screen) to wrist W: wide near the camera, a belly on the outer edge, a thin sweatband. */
function forearm(E, W, fw, skin, band = BAND) {
  const dk = dark(skin);
  const len = Math.hypot(E[0] - W[0], E[1] - W[1]);
  let s = limb(E, W, fw * 1.5, fw * 0.72, skin, 2);
  // Brachioradialis belly swelling out on the thumb side near the elbow.
  const nx = (W[1] - E[1]) / len;
  const ny = -(W[0] - E[0]) / len;
  const side = Math.sign(E[0] || 1) * Math.sign(nx || 1);
  const b0 = lerp(W, E, 0.3);
  const b1 = lerp(W, E, 0.9);
  const bm = lerp(W, E, 0.62);
  const o = fw * 0.62 * side;
  s += sh(
    `M${P(b0[0] + nx * o * 0.9, b0[1] + ny * o * 0.9)}Q${P(bm[0] + nx * o * 1.45, bm[1] + ny * o * 1.45)} ${P(b1[0] + nx * o * 1.15, b1[1] + ny * o * 1.15)}` +
      `L${P(b1[0], b1[1])}L${P(b0[0], b0[1])}Z`,
    skin, 0,
  );
  s += ln(`M${P(b0[0] + nx * o * 0.9, b0[1] + ny * o * 0.9)}Q${P(bm[0] + nx * o * 1.45, bm[1] + ny * o * 1.45)} ${P(b1[0] + nx * o * 1.15, b1[1] + ny * o * 1.15)}`, INK, 2);
  // Muscle split and a tendon toward the wrist.
  s += ln(`M${P(...lerp(W, E, 0.22))}Q${P(bm[0] + nx * o * 0.35, bm[1] + ny * o * 0.35)} ${P(...lerp(W, E, 0.95))}`, dk, 2, 0.4);
  s += spec(`M${P(lerp(W, E, 0.25)[0] - nx * o * 0.4, lerp(W, E, 0.25)[1] - ny * o * 0.4)}L${P(lerp(W, E, 0.75)[0] - nx * o * 0.55, lerp(W, E, 0.75)[1] - ny * o * 0.55)}`, 0.4, 2.4);
  if (band) {
    // Sweatband: a slice of the taper itself, a touch proud of the skin.
    const a = 12 / len;
    const b = 24 / len;
    const wa = (fw * 0.72 + (fw * 1.5 - fw * 0.72) * a) * 0.56;
    const wb = (fw * 0.72 + (fw * 1.5 - fw * 0.72) * b) * 0.56;
    const A = lerp(W, E, a);
    const B = lerp(W, E, b);
    const ux = (E[0] - W[0]) / len;
    const uy = (E[1] - W[1]) / len;
    const px = -uy;
    const py = ux;
    s += sh(
      `M${P(A[0] + px * wa, A[1] + py * wa)}Q${P(A[0] - ux * 3, A[1] - uy * 3)} ${P(A[0] - px * wa, A[1] - py * wa)}` +
        `L${P(B[0] - px * wb, B[1] - py * wb)}Q${P(B[0] - ux * 3, B[1] - uy * 3)} ${P(B[0] + px * wb, B[1] + py * wb)}Z`,
      band, 2,
    );
    s += ln(`M${P(...lerp(A, B, 0.5))}l${f(px * wa * 0.5)},${f(py * wa * 0.5)}`, "#ffffff", 1.6, 0.4);
  }
  return s;
}

/**
 * Overhand grip on a horizontal bar of radius r at (x, y), seen from behind:
 * the back of the hand covers the bar, knuckles crest over its top, the
 * thumb curls under it on the inner side. `side` +1 = right hand.
 */
function grip(x, y, hs, skin, side = 1, r = 5) {
  const dk = dark(skin);
  const kw = hs * 0.54;
  const ww = hs * 0.4;
  const top = y - r - hs * 0.1;
  const bot = y + hs * 0.95;
  // Knuckles, index (inner side) highest.
  const xs = [];
  const ys = [];
  for (let i = 0; i < 4; i++) {
    const inner = side > 0 ? i : 3 - i;
    xs.push(x - kw + (kw * 2 * (i + 0.5)) / 4);
    ys.push(top + inner * hs * 0.035);
  }
  const bw = (kw * 2) / 4;
  let d = `M${P(x - ww, bot)}L${P(x - kw, y + hs * 0.08)}L${P(x - kw, ys[0] + hs * 0.1)}`;
  for (let i = 0; i < 4; i++) d += `Q${P(xs[i] - bw * 0.5, ys[i] - hs * 0.1)} ${P(xs[i], ys[i] - hs * 0.1)}Q${P(xs[i] + bw * 0.5, ys[i] - hs * 0.1)} ${P(xs[i] + bw * 0.5, ys[i] + hs * 0.01)}`;
  d += `L${P(x + kw, y + hs * 0.08)}L${P(x + ww, bot)}Z`;
  let s = sh(d, skin, 2.2);
  // Grooves between fingers and tendons fanning to the knuckles.
  for (let i = 0; i < 3; i++) s += ln(`M${P(xs[i] + bw * 0.5, ys[i] + hs * 0.01)}l0,${f(hs * 0.08)}`, dk, 1.8, 0.6);
  // Knuckle ridge: the row of joints where the fingers turn over the bar.
  s += ln(`M${P(xs[0] - bw * 0.3, ys[0] + hs * 0.1)}Q${P(x, (ys[0] + ys[3]) / 2 + hs * 0.16)} ${P(xs[3] + bw * 0.3, ys[3] + hs * 0.1)}`, dk, 1.6, 0.35);
  for (let i = 0; i < 4; i++) s += ln(`M${P(x + (xs[i] - x) * 0.35, bot - hs * 0.15)}L${P(xs[i], ys[i] + hs * 0.14)}`, dk, 1.4, 0.22);
  for (let i = 0; i < 4; i++) s += spec(`M${P(xs[i] - bw * 0.28, ys[i] - hs * 0.08)}Q${P(xs[i], ys[i] - hs * 0.15)} ${P(xs[i] + bw * 0.22, ys[i] - hs * 0.08)}`, 0.55, 1.8);
  // Thumb wrapping under the bar from the inner edge.
  const tx = x - side * kw;
  const t0 = [tx - side * hs * 0.04, y + hs * 0.62];
  const t1 = [tx + side * hs * 0.42, y + r + hs * 0.14];
  s += sh(capsule(t0, t1, hs * 0.34, hs * 0.27), skin, 2);
  s += ln(`M${P(t0[0] + side * hs * 0.12, t0[1] - hs * 0.2)}l${f(side * hs * 0.1)},${f(hs * 0.04)}`, dk, 1.4, 0.4);
  s += ell(t1[0] - side * hs * 0.03, t1[1] - hs * 0.01, hs * 0.08, hs * 0.07, mix(skin, "#ffffff", 0.4), 0);
  return s;
}

/** Chrome bar from x0 to x1 at y with knurling. */
function bar(x0, x1, y, r = 5) {
  let s = sh(`M${P(x0, y - r)}H${f(x1)}V${f(y + r)}H${f(x0)}Z`, "url(#vmChrome)", 2);
  s += ln(`M${P(x0, y - r * 0.35)}H${f(x1)}`, "#ffffff", 1.4, 0.7);
  for (let x = x0 + 6; x < x1; x += 6) s += ln(`M${P(x, y - r + 1)}l2.4,${f(r * 2 - 2)}`, "#56606c", 0.8, 0.3);
  return s;
}

const PLATE_COLORS = ["#2f6fd6", "#e2362b", "#1c2025"];

/**
 * Plates on one end of a bar at y: edge-on from behind, so tall rounded
 * slabs with a hint of their inner face. `k` = -1 left end, 1 right end.
 */
function plates(xIn, y, k, load, big = 1) {
  const sizes = load === 0 ? [[30, 8]] : load === 1 ? [[40, 11], [28, 7]] : [[44, 12], [44, 12], [30, 8]];
  let s = "";
  let x = xIn;
  // Collar first.
  s += sh(`M${P(x, y - 9)}h${f(k * 8)}v18h${f(-k * 8)}Z`, "url(#vmChrome)", 2);
  x += k * 9;
  sizes.forEach(([hh, ww], i) => {
    const h = hh * big;
    const c = load === 2 ? PLATE_COLORS[i === 2 ? 0 : 2] : PLATE_COLORS[load === 1 ? (i ? 0 : 1) : 0];
    s += sh(`M${P(x, y - h)}h${f(k * ww)}q${f(k * 3)},0 ${f(k * 3)},6v${f(h * 2 - 12)}q0,6 ${f(-k * 3)},6h${f(-k * ww)}q${f(-k * 3)},0 ${f(-k * 3)},-6v${f(-h * 2 + 12)}q0,-6 ${f(k * 3)},-6Z`, c, 2);
    s += ln(`M${P(x + k * ww * 0.3, y - h + 5)}V${f(y + h - 5)}`, "#ffffff", 1.6, 0.35);
    s += ln(`M${P(x + k * ww * 0.75, y - h + 7)}V${f(y + h - 7)}`, "#000000", 1.4, 0.25);
    x += k * (ww + 2);
  });
  s += sh(`M${P(x, y - 4)}h${f(k * 30)}v8h${f(-k * 30)}Z`, "url(#vmChrome)", 1.6);
  return s;
}

const DEFS =
  `<linearGradient id="vmChrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8894a0"/><stop offset=".3" stop-color="#f4f8fb"/>` +
  `<stop offset=".62" stop-color="#6b7886"/><stop offset="1" stop-color="#232a33"/></linearGradient>` +
  `<linearGradient id="vmGlove" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7060"/><stop offset=".4" stop-color="#e2231a"/>` +
  `<stop offset="1" stop-color="#6e0a08"/></linearGradient>` +
  `<linearGradient id="vmRubber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset=".4" stop-color="#1c2025"/>` +
  `<stop offset="1" stop-color="#07090b"/></linearGradient>` +
  `<radialGradient id="vmBell" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5a6068"/><stop offset=".45" stop-color="#23272d"/>` +
  `<stop offset="1" stop-color="#07090b"/></radialGradient>`;

/** Rubber-sleeved grip bar from x0 to x1 at y. */
function rubberBar(x0, x1, y, r = 6) {
  return sh(`M${P(x0, y - r)}H${f(x1)}V${f(y + r)}H${f(x0)}Z`, "url(#vmRubber)", 2) + ln(`M${P(x0 + 3, y - r * 0.4)}H${f(x1 - 3)}`, "#8a939c", 1.4, 0.45);
}

function press(fw, hs, skin, load) {
  const Y = -138;
  let s = bar(-150, 150, Y);
  for (const k of [-1, 1]) s += plates(k * 150, Y, k, load);
  for (const k of [-1, 1]) s += forearm([k * 170, 160], [k * 84, Y + hs * 0.85], fw, skin);
  for (const k of [-1, 1]) s += grip(k * 84, Y, hs, skin, k);
  return { box: [-260, -215, 520, 400], markup: s };
}

function squat(fw, hs, skin, load) {
  const Y = -206;
  let s = bar(-155, 155, Y);
  for (const k of [-1, 1]) s += plates(k * 155, Y, k, load, 1.1);
  for (const k of [-1, 1]) s += forearm([k * 250, -10], [k * 118, Y + hs * 0.85], fw, skin);
  for (const k of [-1, 1]) s += grip(k * 118, Y, hs, skin, k);
  return { box: [-275, -290, 550, 330], markup: s };
}

function overhead(fw, hs, skin) {
  const Y = -206;
  let s = bar(-270, 270, Y, 5);
  for (const k of [-1, 1]) s += forearm([k * 250, -10], [k * 112, Y + hs * 0.85], fw, skin);
  for (const k of [-1, 1]) s += grip(k * 112, Y, hs, skin, k);
  return { box: [-275, -250, 550, 290], markup: s };
}

function pulldown(fw, hs, skin) {
  const Y = -200;
  let s = ln(`M0,${Y - 4}V-420`, INK, 6) + ln(`M0,${Y - 4}V-420`, "#8a939c", 3);
  s += sh(`M-18,${Y - 14}h36v12h-36Z`, "url(#vmChrome)", 2);
  s += bar(-150, 150, Y, 5);
  // Ends bent down into rubber-sleeved drops.
  for (const k of [-1, 1]) {
    s += ln(`M${k * 148},${Y}Q${k * 172},${Y} ${k * 180},${Y + 26}`, INK, 13) + ln(`M${k * 148},${Y}Q${k * 172},${Y} ${k * 180},${Y + 26}`, "#c3cbd3", 8);
    s += sh(capsule([k * 180, Y + 22], [k * 190, Y + 70], 16, 16), "url(#vmRubber)", 2);
  }
  for (const k of [-1, 1]) s += forearm([k * 250, -10], [k * 110, Y + hs * 0.85], fw, skin);
  for (const k of [-1, 1]) s += grip(k * 110, Y, hs, skin, k);
  return { box: [-275, -430, 550, 470], markup: s };
}

function row(fw, hs, skin) {
  const Y = -60;
  let s = rubberBar(-72, 72, Y, 7);
  s += sh("M-16,-66h32v20h-32Z", "url(#vmChrome)", 2);
  for (const k of [-1, 1]) s += forearm([k * 175, 170], [k * 44, Y + hs * 0.85], fw, skin);
  for (const k of [-1, 1]) s += grip(k * 44, Y, hs * 0.92, skin, k, 7);
  return { box: [-220, -100, 440, 300], markup: s };
}

function bike(fw, hs, skin) {
  const Y = -62;
  // Stem, bars sweeping back, rubber grips.
  let s = sh("M-14,-66h28l8,90h-44Z", "#23272d", 2);
  s += ln(`M-140,${Y}Q-70,${Y - 16} 0,${Y - 16}Q70,${Y - 16} 140,${Y}`, INK, 14) + ln(`M-140,${Y}Q-70,${Y - 16} 0,${Y - 16}Q70,${Y - 16} 140,${Y}`, "#3a4048", 9);
  s += sh("M-26,-92h52v18h-52Z", "#1c2025", 2) + sh("M-20,-89h40v12h-40Z", "#2a3a2a", 1.2) + ln("M-16,-83l8,-3 6,5 8,-6 8,4", "#6dff8a", 1.4);
  for (const k of [-1, 1]) s += rubberBar(k > 0 ? 88 : -150, k > 0 ? 150 : -88, Y, 7);
  for (const k of [-1, 1]) s += forearm([k * 195, 170], [k * 118, Y + hs * 0.85], fw, skin);
  for (const k of [-1, 1]) s += grip(k * 118, Y, hs, skin, k, 7);
  return { box: [-240, -120, 480, 320], markup: s };
}

function handles(fw, hs, skin) {
  const W = [132, -70];
  let s = sh(`M${P(W[0] - 70, W[1] + 2)}l-8,40h14l6,-34Z`, "#23272d", 2);
  s += rubberBar(W[0] - 70, W[0] + 90, W[1], 7);
  s += forearm([190, 170], [W[0], W[1] + hs * 0.85], fw, skin);
  s += grip(W[0], W[1], hs, skin, 1, 7);
  return { box: [0, -80, 260, 280], markup: s };
}

/** Right fist around a vertical handle at W, back of the hand toward the camera, knuckles to the centre. */
function fistAt(W, hs, skin) {
  const dk = dark(skin);
  const hw = hs * 0.5;
  let s = sh(`M${P(W[0] - hw, W[1] - hs * 0.45)}Q${P(W[0] - hw, W[1] - hs * 0.62)} ${P(W[0] - hw * 0.4, W[1] - hs * 0.62)}H${f(W[0] + hw * 0.6)}Q${P(W[0] + hw, W[1] - hs * 0.6)} ${P(W[0] + hw, W[1] - hs * 0.2)}V${f(W[1] + hs * 0.4)}Q${P(W[0] + hw, W[1] + hs * 0.6)} ${P(W[0] + hw * 0.4, W[1] + hs * 0.6)}H${f(W[0] - hw * 0.5)}Q${P(W[0] - hw * 1.05, W[1] + hs * 0.58)} ${P(W[0] - hw * 1.05, W[1] + hs * 0.2)}Z`, skin, 2.2);
  // Curled fingers stacked on the inner face.
  for (let i = 0; i < 4; i++) {
    const y = W[1] - hs * 0.42 + i * hs * 0.26;
    s += sh(capsule([W[0] - hw * 1.08, y + hs * 0.1], [W[0] - hw * 0.35, y + hs * 0.1], hs * 0.26, hs * 0.26), skin, 1.8);
  }
  s += spec(`M${P(W[0] - hw * 0.2, W[1] - hs * 0.5)}H${f(W[0] + hw * 0.6)}`, 0.5, 2);
  // Thumb across the index finger.
  s += sh(capsule([W[0] + hw * 0.45, W[1] - hs * 0.52], [W[0] - hw * 0.75, W[1] - hs * 0.22], hs * 0.3, hs * 0.26), skin, 1.8);
  s += ln(`M${P(W[0] + hw * 0.2, W[1] + hs * 0.05)}Q${P(W[0] + hw * 0.5, W[1] + hs * 0.2)} ${P(W[0] + hw * 0.55, W[1] + hs * 0.45)}`, dk, 1.4, 0.3);
  return s;
}

function curl(fw, hs, skin, load) {
  const W = [96, -92];
  let s = forearm([175, 150], [W[0] + 6, W[1] + hs * 0.55], fw, skin);
  // Hex dumbbell held upright in the fist: handle through the hand, heads above and below.
  const hr = [18, 22, 26][load];
  const hh = [13, 16, 19][load];
  const head = (y) =>
    sh(`M${P(W[0] - hr * 1.3, y - hh * 0.7)}L${P(W[0] - hr * 0.8, y - hh)}H${f(W[0] + hr * 0.8)}L${P(W[0] + hr * 1.3, y - hh * 0.7)}V${f(y + hh * 0.7)}L${P(W[0] + hr * 0.8, y + hh)}H${f(W[0] - hr * 0.8)}L${P(W[0] - hr * 1.3, y + hh * 0.7)}Z`, "url(#vmRubber)", 2.2) +
    ln(`M${P(W[0] - hr * 0.7, y - hh * 0.8)}H${f(W[0] + hr * 0.6)}`, "#9aa4ae", 1.6, 0.6);
  const gap = hs * 0.55 + hh;
  s += sh(`M${P(W[0] - 5, W[1] - gap)}h10v${f(gap * 2)}h-10Z`, "url(#vmChrome)", 2);
  s += head(W[1] - gap) + head(W[1] + gap);
  s += fistAt(W, hs, skin);
  return { box: [0, -210, 260, 380], markup: s };
}

function kettle(fw, hs, skin, load) {
  const W = [96, -150];
  const R = [26, 32, 38][load];
  let s = forearm([175, 150], [W[0] + 6, W[1] + hs * 0.55], fw, skin);
  // Bell hangs below the fist from a thick handle.
  const by = W[1] + hs * 0.45 + R * 0.95;
  s += ln(`M${P(W[0] - R * 0.7, by - R * 0.6)}Q${P(W[0] - R * 0.75, W[1] - hs * 0.2)} ${P(W[0], W[1] - hs * 0.2)}Q${P(W[0] + R * 0.75, W[1] - hs * 0.2)} ${P(W[0] + R * 0.7, by - R * 0.6)}`, INK, 13);
  s += ln(`M${P(W[0] - R * 0.7, by - R * 0.6)}Q${P(W[0] - R * 0.75, W[1] - hs * 0.2)} ${P(W[0], W[1] - hs * 0.2)}Q${P(W[0] + R * 0.75, W[1] - hs * 0.2)} ${P(W[0] + R * 0.7, by - R * 0.6)}`, "#2a2f36", 8);
  s += ell(W[0], by, R, R * 0.95, "url(#vmBell)", 2.4);
  s += sh(`M${P(W[0] - R * 0.5, by + R * 0.84)}h${f(R)}v${f(R * 0.14)}h${f(-R)}Z`, "#15181c", 1.6);
  s += spec(`M${P(W[0] - R * 0.6, by - R * 0.3)}Q${P(W[0] - R * 0.5, by - R * 0.7)} ${P(W[0] - R * 0.05, by - R * 0.75)}`, 0.5, 2.4);
  s += fistAt(W, hs, skin);
  return { box: [0, -230, 260, 400], markup: s };
}

function glove(fw, hs, skin) {
  const W = [96, -78];
  const r = hs * 0.95;
  let s = forearm([185, 150], [W[0] + 14, W[1] + r * 1.1], fw * 0.9, skin, false);
  // Cuff.
  s += sh(`M${P(W[0] - r * 0.72, W[1] + r * 0.62)}H${f(W[0] + r * 0.82)}L${P(W[0] + r * 0.9, W[1] + r * 1.35)}H${f(W[0] - r * 0.6)}Z`, "#f2f2f2", 2);
  s += ln(`M${P(W[0] - r * 0.66, W[1] + r * 0.95)}H${f(W[0] + r * 0.84)}`, "#c9ced4", 2);
  s += sh(`M${P(W[0] - r, W[1] + r * 0.05)}Q${P(W[0] - r * 1.05, W[1] - r * 1.25)} ${P(W[0] + r * 0.05, W[1] - r * 1.25)}Q${P(W[0] + r * 1.1, W[1] - r * 1.2)} ${P(W[0] + r * 1.02, W[1] + r * 0.05)}Q${P(W[0] + r * 0.95, W[1] + r * 0.78)} ${P(W[0] + r * 0.1, W[1] + r * 0.78)}Q${P(W[0] - r * 0.95, W[1] + r * 0.78)} ${P(W[0] - r, W[1] + r * 0.05)}Z`, "url(#vmGlove)", 2.4);
  // Thumb on the inner side, knuckle crease, logo patch.
  s += sh(capsule([W[0] - r * 0.95, W[1] - r * 0.05], [W[0] - r * 0.45, W[1] + r * 0.55], r * 0.5, r * 0.42), "url(#vmGlove)", 2);
  s += ln(`M${P(W[0] - r * 0.55, W[1] - r * 0.35)}Q${P(W[0] + r * 0.1, W[1] - r * 0.6)} ${P(W[0] + r * 0.8, W[1] - r * 0.35)}`, INK, 1.8, 0.45);
  s += ln(`M${P(W[0] - r * 0.05, W[1] + r * 0.05)}Q${P(W[0] + r * 0.45, W[1] - r * 0.02)} ${P(W[0] + r * 0.85, W[1] + r * 0.12)}`, "#ffffff", 3, 0.7);
  s += spec(`M${P(W[0] - r * 0.7, W[1] - r * 0.7)}Q${P(W[0] - r * 0.25, W[1] - r * 1.15)} ${P(W[0] + r * 0.4, W[1] - r * 1.05)}`, 0.75, 3);
  return { box: [-10, -150, 270, 320], markup: s };
}

function fist(fw, hs, skin) {
  const W = [112, -52];
  let s = forearm([180, 150], [W[0] + 8, W[1] + hs * 0.5], fw, skin);
  s += fistAt(W, hs, skin);
  return { box: [0, -110, 260, 290], markup: s };
}

function crunch(fw, hs, skin) {
  let s = "";
  // Right arm under, left arm over: fists rest on the opposite shoulders.
  for (const k of [1, -1]) {
    const W = [-k * 52, -70];
    s += forearm([k * 150, 170], [W[0] + k * 6, W[1] + hs * 0.5], fw, skin);
    const m = fistAt([0, 0], hs, skin);
    s += `<g transform="translate(${f(W[0])} ${f(W[1])}) scale(${-k} 1) rotate(-25)">${m}</g>`;
  }
  return { box: [-220, -130, 440, 330], markup: s };
}

/** Where the fly handle's ring sits relative to the sprite origin (right hand): the cable leaves from here. */
export const flyRing = (tier) => [FLY_W[0] + (38 + tier * 2) * 0.95, FLY_W[1] - (38 + tier * 2) * 1.2];
const FLY_W = [40, -104];

/** Cable fly: right fist around a D-handle's vertical grip, the strap running up-outward to the cable ring. */
function fly(fw, hs, skin) {
  const W = FLY_W;
  const [rx, ry] = [W[0] + hs * 0.95, W[1] - hs * 1.2];
  let s = forearm([190, 170], [W[0] + 8, W[1] + hs * 0.55], fw, skin);
  // Strap from both grip ends to the ring, drawn behind the fist.
  const strap = `M${P(W[0] + 2, W[1] - hs * 0.78)}Q${P(W[0] + hs * 0.2, ry)} ${P(rx, ry)}M${P(W[0] + 2, W[1] + hs * 0.78)}Q${P(W[0] + hs * 1.1, W[1] + hs * 0.3)} ${P(rx, ry)}`;
  s += ln(strap, INK, 9) + ln(strap, "#3a4048", 5.5) + ln(strap, "#8a939c", 1.4, 0.5);
  s += sh(`M${P(W[0] - 6, W[1] - hs * 0.82)}h12v${f(hs * 1.64)}h-12Z`, "url(#vmRubber)", 2);
  s += ln(`M${P(rx + 7, ry)}A7 7 0 1 0 ${P(rx - 7, ry)}A7 7 0 1 0 ${P(rx + 7, ry)}`, INK, 6) + ln(`M${P(rx + 7, ry)}A7 7 0 1 0 ${P(rx - 7, ry)}A7 7 0 1 0 ${P(rx + 7, ry)}`, "#dfe7ee", 3);
  s += fistAt(W, hs, skin);
  return { box: [-40, -200, 300, 400], markup: s };
}

/** One sled push post seen from behind: steel tube, rubber sleeve up top. */
function sledPost(x0, y0, x1, y1) {
  const g = lerp([x0, y0], [x1, y1], 0.55);
  let s = sh(capsule([x0, y0], [x1, y1], 18, 15), "#2a2e36", 2.4);
  s += ln(`M${P(x0 - 4, y0)}L${P(x1 - 3, y1 + 6)}`, "#6b7280", 2.4, 0.6);
  s += sh(capsule(g, [x1, y1], 24, 21), "url(#vmRubber)", 2.4);
  s += ln(`M${P(g[0] - 6, g[1])}L${P(x1 - 5, y1 + 8)}`, "#8a939c", 2, 0.4);
  return s;
}

/** Sled push: both hands on the tall posts, the plate stack and crossbar below between the arms. */
function sled(fw, hs, skin, load) {
  let s = "";
  // Crossbar and the loaded horn, low in the middle between the arms.
  s += rubberBar(-122, 122, -30, 8);
  const n = [2, 3, 4][load];
  const cols = ["#e2362b", "#2f6fd6", "#f2c230", "#3aa655"];
  for (let i = 0; i < n; i++) {
    const y = -4 - i * 15;
    s += sh(`M-70,${y}a70,17 0 0 0 140,0v10a70,17 0 0 1 -140,0Z`, "#101216", 2);
    s += ell(0, y, 70, 17, cols[i], 2.2);
    s += ell(0, y, 46, 11, "#000000", 0, ` opacity=".2"`);
    s += ln(`M-50,${y - 11}Q-10,${y - 19} 28,${y - 15}`, "#ffffff", 1.6, 0.45);
  }
  const ht = -4 - (n - 1) * 15;
  s += sh(`M-8,${ht}v-34h16v34Z`, "url(#vmChrome)", 2);
  s += ell(0, ht - 34, 8, 3, "#c9d3dc", 1.6);
  for (const k of [-1, 1]) s += sledPost(k * 132, 240, k * 112, -170);
  // Hands: right as drawn, left mirrored.
  const W = [116, -92];
  const hand = forearm([205, 190], [W[0] + 8, W[1] + hs * 0.55], fw, skin) + fistAt(W, hs, skin);
  s += hand + `<g transform="scale(-1 1)">${hand}</g>`;
  return { box: [-270, -200, 540, 400], markup: s };
}

const BUILDERS = { press, squat, overhead, pulldown, row, bike, handles, curl, kettle, glove, fist, crunch, fly, sled };

const cache = new Map();
/**
 * Viewmodel sprite set for an arm-size tier (0..3), style and weight tier
 * (0..2): { sprites }. Each sprite carries its own box-sized defs in `defs`.
 */
export function viewmodelSet(tier, modern, load = 1) {
  const key = `${tier}|${modern ? 1 : 0}|${load}`;
  let set = cache.get(key);
  if (set) return set;
  const skin = SKINS[PLAYER_LOOK.skin];
  const fw = 30 + tier * 7;
  const hs = 38 + tier * 2;
  const sprites = {};
  for (const name in BUILDERS) {
    const build = () => {
      const { box, markup } = BUILDERS[name](fw, hs, skin, load);
      return { box, markup: lit(markup, box, RIM, { ink: 3, rimX: 3, rimY: 2.4, rimOp: 0.5 }) };
    };
    const { box, markup } = modern ? withRealisticBuild(build) : build();
    // At screen size the Realistic grime reads as dirty skin: an empty filter
    // ahead of realDefs wins the id and turns it off.
    const defs = DEFS + baseDefs(box) + (modern ? `<filter id="rwear"><feFlood flood-opacity="0"/></filter>${realDefs(box)}` : "");
    sprites[name] = { box, layers: [{ markup }], defs, realistic: modern || undefined, _key: `vm${tier}_${load}_${name}` };
  }
  set = { sprites, tier };
  cache.set(key, set);
  return set;
}

/** Arm tier 0..3 from the arms muscle value (0..100). */
export const armTier = (arms) => (arms < 12 ? 0 : arms < 25 ? 1 : arms < 40 ? 2 : 3);
