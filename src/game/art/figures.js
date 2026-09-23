/**
 * Front-facing humanoids in centimetres (feet at y=0, y up negative): gym
 * members, the player's reflection and the physique portrait.
 *
 * One rig (`rig`) places joints for a pose; `body` dresses it. Limbs are one
 * continuous outline per chain (hip-knee-ankle, shoulder-elbow-wrist) swept
 * from a width profile with muscle bellies, so knees and elbows bend without
 * joint discs. Muscle per group (0..1) swells those bellies — chest and back
 * widen the shoulders, pecs and lats, arms the delts, biceps and forearms,
 * legs the quads and calves — and body fat (0..1) softens the waist and hides
 * the abs. Every solid part gets form shading: its shadow tone, then its base
 * tone shifted toward the key light and clipped to the part, which leaves a
 * crescent of shadow that follows the part's own contour. Comic keeps that
 * crescent hard and wraps the figure in a `lit`-style ink ring; Modern
 * blurs it (smooth skin, no ink) under a softer grade than props get.
 */

import { INK, f, P, polar, lerp, sh, ln, ell, baseDefs, realDefs, withRealisticBuild, mix, spec } from "../../engine/ink-kit.js";
import { GROUPS } from "../data/equipment.js";

export const FIG_BOX = [-62, -196, 124, 202];

export const SKINS = ["#f1c7a5", "#dcaa80", "#b97c52", "#8d5836", "#5f3a24"];

/**
 * Member looks. skin: SKINS index; style: tank | tee | bra | crop | none;
 * legs: leggings | capri; cut: crop | buzz | fade | curly | messy | cap |
 * bald | pony | bun | long | bob; beard: stubble | full | goatee | mous;
 * face: grin | smile | set | smirk; build 0..1; bf overrides body fat.
 */
export const MEMBER_LOOKS = [
  { skin: 0, top: "#e2362b", style: "tank", shorts: "#1c2230", shoes: "#f2f2f2", hair: "#4a2c16", cut: "crop", beard: "stubble", face: "grin", build: 0.55 },
  { skin: 3, top: "#2f6fd6", style: "tee", shorts: "#2a2a2e", shoes: "#ff5a3a", hair: "#0b0b0d", cut: "fade", beard: "full", face: "set", build: 0.35 },
  { skin: 1, top: "#ffd23a", style: "bra", shorts: "#6b2fa6", shoes: "#ffffff", hair: "#b8742a", cut: "pony", face: "smile", eyes: "#3f6b3a", build: 0.3, fem: true },
  { skin: 4, top: "#3aa655", style: "tank", shorts: "#1e2a44", shoes: "#20242a", hair: "#0b0b0d", cut: "bald", beard: "goatee", face: "set", build: 0.85 },
  { skin: 2, top: "#f2f2f2", style: "tee", shorts: "#c8323a", shoes: "#2f6fd6", hair: "#1a1410", cut: "cap", beard: "mous", face: "grin", build: 0.45 },
  { skin: 0, top: "#ff7ab8", style: "bra", shorts: "#1c1f26", legs: "leggings", shoes: "#f2f2f2", hair: "#e8c26a", cut: "long", face: "smile", eyes: "#3b6ea8", build: 0.4, fem: true },
  { skin: 3, top: "#1c1f26", style: "tank", shorts: "#8a8f98", shoes: "#ffd23a", hair: "#0b0b0d", cut: "curly", beard: "stubble", face: "smirk", build: 0.7 },
  { skin: 1, top: "#22b8c8", style: "tee", shorts: "#26303e", shoes: "#e2362b", hair: "#6a4424", cut: "messy", glasses: true, face: "smile", build: 0.2, bf: 0.7 },
  { skin: 4, top: "#ff8a2a", style: "crop", shorts: "#20242c", legs: "capri", shoes: "#f2f2f2", hair: "#0b0b0d", cut: "bun", face: "grin", build: 0.55, fem: true },
  { skin: 2, top: "#8a6cf0", style: "bra", shorts: "#2a2f3a", shoes: "#22b8c8", hair: "#2a1a12", cut: "bob", face: "smirk", build: 0.25, bf: 0.45, fem: true },
];

/** Arm poses: sh = upper arm swing (deg off straight down, outward positive), el = elbow bend. */
const POSES = {
  idle: { armL: { sh: 11, el: 10 }, armR: { sh: 11, el: 10 } },
  walkA: { armL: { sh: 14, el: 16 }, armR: { sh: 7, el: 5 }, liftL: 7 },
  walkB: { armL: { sh: 7, el: 5 }, armR: { sh: 14, el: 16 }, liftR: 7 },
  liftA: { armL: { sh: 100, el: 60 }, armR: { sh: 100, el: 60 }, bell: true, face: "effort" },
  liftB: { armL: { sh: 160, el: 8 }, armR: { sh: 160, el: 8 }, bell: true, face: "effort" },
  flex: { armL: { sh: 92, el: 100 }, armR: { sh: 92, el: 100 }, face: "grin" },
};

function rig(m, bf, pose, fem) {
  const P0 = POSES[pose] || POSES.idle;
  const hipY = -94;
  const shY = -143;
  const sw = (fem ? 15 : 17.5) + m.back * 4 + m.chest * 2.5;
  const hipW = fem ? 11.5 : 10;
  const legs = {};
  for (const s of [-1, 1]) {
    const lift = (s < 0 ? P0.liftL : P0.liftR) || 0;
    const H = [s * hipW, hipY];
    const A = [s * (hipW + 2.5), -9 - lift];
    const L = 86;
    const D = Math.hypot(A[0] - H[0], A[1] - H[1]);
    const bend = Math.sqrt(Math.max(0, L * L - D * D)) / 2;
    const M = lerp(H, A, 0.52);
    legs[s] = { H, K: [M[0] + s * bend * 0.35, M[1] - bend * 0.1], A };
  }
  const arms = {};
  for (const s of [-1, 1]) {
    const ap = s < 0 ? P0.armL : P0.armR;
    const S = [s * (sw - 3.5), shY + 5];
    const E = polar(S, s * ap.sh, 29);
    const W = polar(E, s * (ap.sh + ap.el), 25);
    arms[s] = { S, E, W };
  }
  return { hipY, shY, sw, hipW, legs, arms, head: [0, -166], bell: !!P0.bell, flex: pose === "flex", pose, face: P0.face, fem };
}

/* ── Geometry ─────────────────────────────────────────────────────────── */

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scl = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const unit = (v) => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
/** Toward the key light (upper left). */
const LIGHT = unit([-0.55, -0.83]);

/** Cubic Béziers through `pts` (Catmull-Rom), continuing from the current point pts[0]. */
function through(pts, closed) {
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = "";
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${P(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${P(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${P(...p2)}`;
  }
  return d;
}
/** Smooth path through points: closed shape, or an open stroke. */
const spline = (pts, closed = true) => `M${P(...pts[0])}${through(pts, closed)}${closed ? "Z" : ""}`;
/** Points given relative to (ox, oy), x mirrored by `k`. */
const rel = (pts, ox, oy, k = 1) => pts.map(([x, y]) => [ox + x * k, oy + y]);
/** Left-right symmetric closed outline from its right half (top to bottom). */
const mirrored = (half) => [...half, ...half.slice().reverse().filter(([x]) => x !== 0).map(([x, y]) => [-x, y])];

/**
 * Samples along a joint chain from profile rows [seg, u, out, in] (half
 * widths on the outer / inner side). The tangent blends across each joint so
 * the outline bends smoothly.
 */
function chain(J, prof, outIsA) {
  const dirs = [];
  for (let i = 0; i < J.length - 1; i++) dirs.push(unit(sub(J[i + 1], J[i])));
  return prof.map(([seg, u, wo, wi]) => {
    const p = lerp(J[seg], J[seg + 1], u);
    let t = dirs[seg];
    if (u < 0.35 && seg > 0) t = add(t, scl(dirs[seg - 1], 1 - u / 0.35));
    if (u > 0.65 && seg < dirs.length - 1) t = add(t, scl(dirs[seg + 1], (u - 0.65) / 0.35));
    t = unit(t);
    return { p, t, n: [-t[1], t[0]], wa: outIsA ? wo : wi, wb: outIsA ? wi : wo };
  });
}

/** One side of a sampled chain; points that fold back inside a bent joint are dropped (a crease). */
function sidePts(S, sgn) {
  const out = [];
  for (const s of S) {
    const q = add(s.p, scl(s.n, sgn > 0 ? s.wa : -s.wb));
    const last = out[out.length - 1];
    if (last && dot(sub(q, last), s.t) < 0.4) continue;
    out.push(q);
  }
  return out;
}

/** Closed limb outline, optionally with rounded caps at either end. */
function limbD(S, capStart = true, capEnd = true) {
  const e = S[S.length - 1];
  const s0 = S[0];
  const pts = sidePts(S, 1);
  if (capEnd) pts.push(add(e.p, add(scl(e.t, (e.wa + e.wb) * 0.42), scl(e.n, (e.wa - e.wb) / 2))));
  pts.push(...sidePts(S, -1).reverse());
  if (capStart) pts.push(add(s0.p, add(scl(s0.t, -(s0.wa + s0.wb) * 0.42), scl(s0.n, (s0.wa - s0.wb) / 2))));
  return spline(pts);
}

const key = (r) => r[0] + r[1];
/** Profile row interpolated at (seg, u). */
function profAt(prof, seg, u) {
  const x = seg + u;
  for (let i = 1; i < prof.length; i++) {
    const a = prof[i - 1];
    const b = prof[i];
    if (x <= key(b)) {
      const t = (x - key(a)) / (key(b) - key(a) || 1);
      return [seg, u, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  const l = prof[prof.length - 1];
  return [seg, u, l[2], l[3]];
}
/** The part of a profile between two (seg, u) stations, widened by `grow`. */
const cut = (prof, from, to, grow = 0) =>
  [profAt(prof, ...from), ...prof.filter((r) => key(r) > from[0] + from[1] && key(r) < to[0] + to[1]), profAt(prof, ...to)].map((r) => [r[0], r[1], r[2] + grow, r[3] + grow]);

/* ── Paint ────────────────────────────────────────────────────────────── */

/** Build-time mode: modern (soft shading, no ink), bare (plain silhouette for the Modern mask). */
let X = { modern: false, bare: false, n: 0 };

/**
 * A solid part with form shading: the shadow tone, then the base tone moved
 * toward the key light and clipped to the part, then its line.
 */
function form(d, fill, shade, o = {}) {
  const { off = 2.4, w = 1.1, lineOp = 1 } = o;
  if (X.bare) return `<path d="${d}" fill="#fff"/>`;
  const id = `fc${X.n++}`;
  let s = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${shade}"/>`;
  if (X.modern) {
    const k = off * 1.9;
    s += `<g clip-path="url(#${id})"><path d="${d}" fill="${fill}" transform="translate(${f(LIGHT[0] * k)} ${f(LIGHT[1] * k)})" filter="url(#fsoft)"/></g>`;
    if (w) s += `<path d="${d}" fill="none" stroke="${mix(shade, "#000000", 0.4)}" stroke-width="${f(w * 0.55)}" stroke-opacity=".55"/>`;
  } else {
    s += `<g clip-path="url(#${id})"><path d="${d}" fill="${fill}" transform="translate(${f(LIGHT[0] * off)} ${f(LIGHT[1] * off)})"/></g>`;
    if (w) s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-opacity="${lineOp}" stroke-linejoin="round"/>`;
  }
  return s;
}

/** Markup clipped to a part's outline (cast shadows, muscle shading). */
function clipped(d, inner) {
  if (X.bare || !inner) return "";
  const id = `fc${X.n++}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

/** Soft tonal shape: flat in Comic, blurred in Modern. */
const tone = (d, color, op) =>
  X.bare ? "" : `<path d="${d}" fill="${color}" opacity="${f(op * 100) / 100}"${X.modern ? ` filter="url(#fsoft2)"` : ""}/>`;

/** Anatomy line: a crisp hairline in Comic, a soft crease in Modern. */
const crease = (d, color, w, op) => {
  if (X.bare || op < 0.03) return "";
  if (!X.modern) return ln(d, color, w, f(Math.min(1, op) * 100) / 100);
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 1.5)}" stroke-opacity="${f(Math.min(1, op) * 70) / 100}" stroke-linecap="round" filter="url(#fline)"/>`;
};

/** Plain flat shape without form shading (small details). */
const flat = (d, fill, w = 0, op = 1) => (X.bare ? `<path d="${d}" fill="#fff"/>` : sh(d, fill, w, op < 1 ? ` opacity="${op}"` : ""));

/* ── Parts ────────────────────────────────────────────────────────────── */

function legProfile(g, bf, fem) {
  const T = 7.3 + g * 3.3 + bf * 2.6 + (fem ? 1.3 : 0);
  const C = (g * 1.9 + bf * 0.5) * (fem ? 0.7 : 1);
  return [
    [0, 0, T * 1.02, T * 0.98],
    [0, 0.28, T * 1.06 + g * 0.8, T * 0.82],
    [0, 0.55, T * 0.93 + g * 0.4, T * 0.68],
    [0, 0.8, T * 0.72, T * 0.62 + g * 0.9],
    [0, 1, 4.6 + g * 0.4, 4.8 + g * 0.5],
    [1, 0.1, 4.5 + g * 0.3, 4.8 + g * 0.3],
    [1, 0.3, 4.9 + C * 0.8, 5.3 + C],
    [1, 0.5, 4.3 + C * 0.5, 4.8 + C * 0.7],
    [1, 0.75, 3.3, 3.4],
    [1, 1, 3.0, 3.0],
  ];
}

function armProfile(a, bf, fem, flexing) {
  const U = 4.2 + a * 2.5 + bf * 1.3 - (fem ? 0.6 : 0);
  const peak = flexing === "flex" ? U * (0.2 + a * 0.5) : flexing === "liftA" ? U * a * 0.15 : 0;
  return [
    [0, 0, U * 1.05, U * 1.05],
    [0, 0.3, U * 1.02, U * 1.02],
    [0, 0.55, U * (1.05 + a * 0.2) + peak, U * 0.97],
    [0, 0.8, U * 0.85 + peak * 0.4, U * 0.86],
    [0, 1, 3.1 + a * 0.7, 3.5 + a * 0.8],
    [1, 0.18, 3.9 + a * 1.9, 3.6 + a * 1.2],
    [1, 0.45, 3.4 + a * 1.1, 3.1 + a * 0.7],
    [1, 1, 2.3 + a * 0.3, 2.3 + a * 0.3],
  ];
}

/** A fist at the wrist (or gripping, centred on the grip point), thumb toward the body. */
function fist(W, t, k, a, c, grip) {
  const nA = [-t[1], t[0]];
  const u = k < 0 ? nA : scl(nA, -1);
  const z = 1 + a * 0.08;
  const v0 = grip ? -5 : -0.6;
  const at = ([x, y]) => add(W, add(scl(u, x * z), scl(t, (y + v0) * z)));
  const pts = [[-3.4, -0.4], [3.3, -0.4], [4.5, 3], [4.6, 6.6], [3.2, 9.2], [-0.6, 9.8], [-3.9, 8.2], [-4.5, 3.6]].map(at);
  const L = (list) => list.map(at);
  let s = form(spline(pts), c.skin, c.skinSh, { off: 1.6, w: 1 });
  s += crease(spline(L([[-4.2, 3.2], [-1.4, 4.4], [1.4, 6.2]]), false), c.line, 0.9, 0.8);
  s += crease(spline(L([[3.9, 6.6], [2.4, 7.4], [2, 9.2]]), false), c.line, 0.7, 0.55);
  s += crease(spline(L([[1.6, 7.6], [0.5, 8.2], [0.2, 9.6]]), false), c.line, 0.7, 0.45);
  return s;
}

function dumbbell(W) {
  let s = flat(`M${P(W[0] - 11, W[1] - 1.8)}h22v3.6h-22Z`, "#9aa6b2", 0.9);
  for (const k of [-1, 1]) {
    const x = W[0] + k * 11.5;
    s += form(`M${P(x - 2.6, W[1] - 7)}h5.2q1,0 1,1v12q0,1 -1,1h-5.2q-1,0 -1,-1v-12q0,-1 1,-1Z`, "#2a3038", "#12151a", { off: 1.4, w: 1 });
    s += spec(`M${P(x - 1.6, W[1] - 5)}v7`, 0.4, 0.9);
  }
  return s;
}

function shoe(A, k, color) {
  const [x, y] = [A[0] + k * 1, A[1] - 0.6];
  const light = parseInt(color.slice(1, 3), 16) + parseInt(color.slice(3, 5), 16) + parseInt(color.slice(5, 7), 16) > 600;
  const sole = light ? "#cfd4db" : "#f3f3ee";
  const accent = light ? "#2a3140" : "#f6f6f2";
  const R = (pts) => rel(pts.map(([u, v]) => [u * 1.1, v * 1.1]), x, y, k);
  let s = flat(`M${P(x - 3.4, y - 5)}h6.8l0.3,4.4h-7.4Z`, "#f4f4f0", 1);
  s += form(spline(R([[-4.4, -2.6], [0, -2.2], [4.6, -2.6], [6.4, 0.6], [8, 4.2], [8.4, 6.8], [4.6, 7.6], [-4, 7.6], [-7.8, 6.8], [-7.6, 3.8], [-6, 0.4]])), color, mix(color, "#000000", 0.38), { off: 1.8 });
  s += tone(spline(R([[-4.6, 3.6], [0.6, 2.6], [6, 3.8], [6.6, 6.4], [0.6, 7], [-5.4, 6.4]])), mix(color, "#ffffff", 0.3), 0.55);
  s += flat(spline(R([[-2.7, -2.6], [2.7, -2.6], [1.3, 2.8], [-1.3, 2.8]])), mix(color, "#000000", 0.3), 0.8);
  s += ln(`M${P(...R([[-2.4, -1.2]])[0])}L${P(...R([[2.4, -1.2]])[0])}M${P(...R([[-1.8, 0.6]])[0])}L${P(...R([[1.8, 0.6]])[0])}M${P(...R([[-1.2, 2.1]])[0])}L${P(...R([[1.2, 2.1]])[0])}`, light ? "#7c8490" : "#ffffff", 0.9, 0.9);
  s += ln(spline(R([[3.2, 0.2], [5.6, 2.8], [7.6, 5.4]]), false), accent, 1.5, 0.9);
  s += form(spline(R([[-8.2, 6.2], [8.8, 6.2], [9.4, 7.8], [8.6, 9.6], [-7.8, 9.6], [-8.8, 7.8]])), sole, mix(sole, "#000000", 0.28), { off: 1 });
  s += crease(`M${P(...R([[-7.4, 8]])[0])}L${P(...R([[8.2, 8]])[0])}`, mix(sole, "#000000", 0.4), 0.7, 0.6);
  return s;
}

/** Hair shapes: `back` goes behind the head (and the body, for long hair), `front` over it. */
function hairParts(cut, hx, hy) {
  const H = (pts) => spline(rel(pts, hx, hy));
  switch (cut) {
    case "crop":
      return { front: H([[-10.9, 0.5], [-11.4, -7], [-9.6, -14], [-4, -17.8], [3, -18.2], [9, -15.2], [11.4, -8], [11, 0.5], [9.9, -3.5], [8.4, -8.6], [5.2, -9.4], [3.2, -7.6], [1, -9.8], [-1.8, -8.2], [-4.2, -10.2], [-6.6, -8.8], [-8.8, -9.2], [-9.9, -4]]) };
    case "fade":
      return {
        front: H([[-10.4, -3], [-10.8, -11], [-9, -18.2], [-3, -20.6], [4, -20.6], [9.4, -18.2], [10.8, -11], [10.4, -3], [9.6, -7], [8.6, -10.6], [4, -11.4], [0, -10.8], [-4, -11.4], [-8.6, -10.6], [-9.6, -7]]),
        sides: H([[-10.7, 1], [-10.9, -7], [-8, -9], [8, -9], [10.9, -7], [10.7, 1], [9.6, -2], [-9.6, -2]]),
      };
    case "buzz":
      return { front: H([[-10.5, -2.5], [-10.7, -9], [-8, -14.6], [0, -16.3], [8, -14.6], [10.7, -9], [10.5, -2.5], [9.4, -7.2], [5, -10.4], [0, -10.8], [-5, -10.4], [-9.4, -7.2]]), thin: true };
    case "curly": {
      const pts = [];
      const N = 15;
      for (let i = 0; i <= N; i++) {
        const a = Math.PI * (1.02 + (0.96 * i) / N);
        const r = i % 2 ? 1 : 1.1;
        pts.push([Math.cos(a) * 13.2 * r, -9 + Math.sin(a) * 11.4 * r]);
      }
      return { front: H([[-10.8, 0], ...pts, [10.8, 0], [9.8, -5], [8.2, -8.4], [4, -9.8], [0, -9.2], [-4, -9.8], [-8.2, -8.4], [-9.8, -5]]), curls: true };
    }
    case "messy":
      return { front: H([[-10.9, 0.5], [-11.6, -8], [-9, -15.8], [-2, -19], [6, -18.2], [11, -12.8], [11.7, -5], [11, 0.5], [10.1, -5], [8.8, -7.2], [6.4, -4.6], [5, -8.4], [0.4, -9.6], [-4, -10.2], [-8, -9.6], [-9.8, -5]]) };
    case "pony":
      return {
        back: H([[5, -13], [13.5, -11.5], [17.5, -3], [17.8, 7], [15.6, 16], [12.6, 24], [12.2, 14], [11.4, 3], [8.4, -5]]),
        tie: [hx + 12.4, hy - 10.4],
        front: H([[-10.9, 1.5], [-11.4, -7], [-9.2, -14.6], [-3, -17.8], [4, -17.8], [9.6, -14.4], [11.5, -7], [10.9, 1.5], [10, -3.6], [8.6, -9], [4.2, -11.8], [-1.4, -11.4], [-5.2, -9.8], [-8.8, -7.6], [-10, -3]]),
      };
    case "bun":
      return {
        bun: [hx + 0.6, hy - 19.6],
        front: H([[-10.9, 1.5], [-11.4, -7], [-9.2, -14.6], [-3, -17.8], [4, -17.8], [9.6, -14.4], [11.5, -7], [10.9, 1.5], [10, -3.4], [8.2, -8.8], [3.8, -11.4], [0, -11.8], [-3.8, -11.4], [-8.2, -8.8], [-10, -3.4]]),
      };
    case "long":
      return {
        back: H([[-11.5, -8], [-13.4, 4], [-14.4, 16], [-16, 27], [-12.2, 33], [-6.5, 27], [6.5, 27], [12.2, 33], [16, 27], [14.4, 16], [13.4, 4], [11.5, -8], [6, -17.5], [-6, -17.5]]),
        locks: true,
        front: H([[-10.9, 8], [-11.9, -4], [-9.6, -14.6], [-3, -17.8], [4, -17.8], [9.9, -14.2], [11.9, -4], [10.9, 8], [9.6, 2], [9, -5], [6.6, -10], [2, -11.8], [-3, -10.2], [-7.6, -6.6], [-9.4, 1]]),
      };
    case "bob":
      return {
        back: H([[-12.8, -7], [-14.2, 5], [-13, 12.6], [-9.2, 14.4], [0, 12], [9.2, 14.4], [13, 12.6], [14.2, 5], [12.8, -7], [8, -16.4], [0, -18.4], [-8, -16.4]]),
        front: H([[-11.2, 4], [-12.4, -6], [-9.6, -15], [-3, -18.6], [4, -18.6], [9.6, -15], [12.4, -6], [11.2, 4], [10.1, -1], [9.1, -6.6], [6, -7.8], [3, -6.6], [0, -8.2], [-3, -6.6], [-6, -7.8], [-9.1, -6.6], [-10.1, -1]]),
        curls: true,
      };
    default:
      return {};
  }
}

/* ── The figure ───────────────────────────────────────────────────────── */

/** The dressed figure's markup (unlit). */
function body(R, look, m, bf) {
  const skin = SKINS[look.skin ?? 0];
  const c = {
    skin,
    skinSh: X.modern ? mix(skin, "#4a1f1a", 0.3) : mix(skin, "#5a2138", 0.26),
    line: mix(skin, "#2a0c0c", 0.55),
    hi: mix(skin, "#fff6ea", 0.45),
  };
  const { hipY, shY, sw, legs, arms, head, fem } = R;
  const [hx, hy] = head;
  const def = Math.max(0, 1 - bf * 1.6);
  const lat = sw - 1 + m.back * 3.5;
  const ww = (fem ? 9.5 : 12.3) + bf * 9 - m.core * 1.2;
  // Hips at least as wide as the thigh tops, so no thigh pokes out past the shorts.
  const LP = legProfile(m.legs, bf, fem);
  const hwT = (fem ? 15.5 : 13.5) + bf * 3;
  const hw = Math.max(hwT, R.hipW - 1.5 + LP[0][2] - 0.4);
  const trap = fem ? 0.4 : 1 + m.back * 2.6;
  const neckW = fem ? 4.5 : 5.5 + m.back * 1.6;
  const hair = hairParts(look.cut, hx, hy);
  const hairC = look.hair || "#2a1a0e";
  const hairSh = mix(hairC, "#000000", 0.45);
  const hairHi = mix(hairC, "#ffffff", hairC === "#0b0b0d" ? 0.32 : 0.4);
  let s = "";

  // Hair that hangs behind everything.
  if (hair.back && look.cut === "long") s += form(hair.back, hairC, hairSh, { off: 2 });

  // Neck, with the jaw's cast shadow.
  const chinY = hy + 15;
  const neckD = `M${P(-neckW, hy + 5)}H${f(neckW)}L${P(neckW + 1, shY - 1)}H${f(-neckW - 1)}Z`;
  s += form(neckD, c.skin, c.skinSh, { off: 2, w: 0 });
  s += clipped(neckD, tone(`M${P(-neckW - 2, hy + 4)}H${f(neckW + 2)}V${f(chinY + 1)}Q${P(0, chinY + 6)} ${P(-neckW - 2, chinY + 1)}Z`, c.skinSh, 0.85));
  if (!fem) s += crease(`M${P(-neckW + 0.6, hy + 11)}Q${P(-3, shY - 6)} ${P(-1.2, shY - 1)}M${P(neckW - 0.6, hy + 11)}Q${P(3, shY - 6)} ${P(1.2, shY - 1)}`, c.line, 0.9, 0.2 + m.back * 0.35);

  // Torso: traps into shoulders, lats tapering to the waist, hips.
  const half = [
    [neckW + 0.2, shY - 9 - trap * 0.5],
    [neckW + 3.6, shY - 6.5 - trap],
    [sw * 0.78, shY - 2.6 - trap * 0.4],
    [sw + 0.5, shY + 1],
    [sw + 1.2, shY + 8],
    [lat, shY + 19],
    [lat * 0.55 + ww * 0.45 + bf * 1.5, shY + 32],
    [ww, hipY - 13],
    [hwT - 0.3, hipY - 3],
    [hwT + 0.2, hipY + 3],
  ];
  const torsoPts = [...half.slice().reverse().map(([x, y]) => [-x, y]), [0, shY - 1.5], ...half];
  // Hips and bottom edge run straight across under the waistband.
  const torsoD = spline([...torsoPts, [hwT * 0.5, hipY + 4], [-hwT * 0.5, hipY + 4]]);
  s += form(torsoD, c.skin, c.skinSh, { off: 3, w: 0 });
  const trapY = (x) => {
    const ax = Math.abs(x);
    for (let i = 1; i < 4; i++) if (ax <= half[i][0]) return half[i - 1][1] + ((ax - half[i - 1][0]) / (half[i][0] - half[i - 1][0])) * (half[i][1] - half[i - 1][1]);
    return half[3][1];
  };

  // Chest, abs and the rest of the torso's anatomy.
  let anat = "";
  const pc = m.chest;
  const lowY = shY + 15 + pc * 3.5 + bf * 3;
  if (!fem) {
    for (const k of [-1, 1]) {
      const pOut = sw - 1.5 + pc;
      const lower = rel([[pOut + 0.4, shY + 9], [pOut * 0.8, lowY - 0.6], [pOut * 0.42, lowY + 1.4], [1.2, lowY - 0.6]], 0, 0, k);
      anat += tone(spline([...lower, ...lower.slice().reverse().map(([x, y], i) => [x, y + (i === 0 || i === 3 ? 0.4 : 2 + pc * 2.6)])]), c.skinSh, 0.35 + pc * 0.45);
      anat += crease(spline(lower, false), c.line, 1.1, 0.3 + pc * 0.5);
      anat += tone(spline(rel([[2, shY + 3], [pOut * 0.55, shY + 2.4], [pOut - 2, shY + 5], [pOut * 0.55, shY + 6.5]], 0, 0, k)), c.hi, 0.22 + pc * 0.15);
    }
    anat += crease(`M0,${f(shY + 3)}V${f(lowY)}`, c.line, 1, 0.2 + pc * 0.4);
  }
  // Collarbones.
  anat += crease(`M${P(-1.8, shY - 1)}Q${P(-sw * 0.45, shY - 3.2 - trap * 0.3)} ${P(-sw + 3, shY - 2.4)}M${P(1.8, shY - 1)}Q${P(sw * 0.45, shY - 3.2 - trap * 0.3)} ${P(sw - 3, shY - 2.4)}`, c.line, 0.9, fem ? 0.3 : 0.35);
  const ab = def * (0.25 + m.core * 0.75) * (fem ? 0.55 : 1);
  if (ab > 0.05) {
    anat += crease(`M0,${f(lowY + 2)}V${f(hipY - 12)}`, c.line, 1.1, ab);
    for (let i = 0; i < 3; i++) {
      const y = lowY + 5.5 + i * 6.3;
      const x = 6.8 - i * 0.3;
      anat += crease(`M${P(-x, y - 0.4)}Q${P(-3.4, y + 1.6)} ${P(-1, y + 0.6)}M${P(x, y - 0.4)}Q${P(3.4, y + 1.6)} ${P(1, y + 0.6)}`, c.line, 1, ab * 0.9);
      anat += tone(`M${P(-x + 0.5, y + 0.3)}Q${P(-3.4, y + 2.4)} ${P(-1, y + 1.3)}L${P(-1, y + 2.6)}Q${P(-3.4, y + 3.6)} ${P(-x + 0.6, y + 1.6)}Z` + `M${P(x - 0.5, y + 0.3)}Q${P(3.4, y + 2.4)} ${P(1, y + 1.3)}L${P(1, y + 2.6)}Q${P(3.4, y + 3.6)} ${P(x - 0.6, y + 1.6)}Z`, c.skinSh, ab * 0.5);
    }
    anat += crease(`M${P(-7.6, lowY + 2)}Q${P(-8.2, hipY - 22)} ${P(-5.6, hipY - 9)}M${P(7.6, lowY + 2)}Q${P(8.2, hipY - 22)} ${P(5.6, hipY - 9)}`, c.line, 1, ab * 0.6);
    anat += crease(`M${P(-ww + 1.5, hipY - 15)}Q${P(-ww + 3, hipY - 6)} ${P(-5, hipY + 2)}M${P(ww - 1.5, hipY - 15)}Q${P(ww - 3, hipY - 6)} ${P(5, hipY + 2)}`, c.line, 1, ab * 0.75);
    if (!fem && m.back > 0.4) for (const k of [-1, 1]) for (let i = 0; i < 3; i++) anat += crease(`M${P(k * (lat - 2.5 - i * 0.6), shY + 21 + i * 4)}l${f(-k * 2.6)},1.4`, c.line, 0.9, ab * (m.back - 0.3));
  }
  anat += crease(`M${P(-1.1, hipY - 12)}Q${P(0, hipY - 10)} ${P(1.1, hipY - 12)}`, c.line, 1, 0.6);
  const bb = Math.max(0, bf - 0.35) / 0.65;
  if (bb > 0) {
    anat += tone(`M${P(-ww + 2, hipY - 12)}Q0,${f(hipY - 3 + bb * 4)} ${P(ww - 2, hipY - 12)}L${P(ww - 2, hipY - 6)}Q0,${f(hipY + 3 + bb * 3)} ${P(-ww + 2, hipY - 6)}Z`, c.skinSh, 0.35 + bb * 0.3);
    anat += crease(`M${P(-ww + 2.5, hipY - 13)}Q0,${f(hipY - 4 + bb * 4)} ${P(ww - 2.5, hipY - 13)}`, c.line, 1, 0.25 + bb * 0.3);
  }
  s += clipped(torsoD, anat);

  // Legs: one outline per leg, thigh into knee into calf.
  const legChain = {};
  for (const k of [-1, 1]) {
    const { H, K, A } = legs[k];
    const J = [add(H, [-k * 1.5, 1]), K, A];
    legChain[k] = J;
    const S = chain(J, LP, k < 0);
    s += form(limbD(S, false), c.skin, c.skinSh, { off: 2.6 });
    // Knee cap, quad sweep and teardrop, calf split.
    const g = m.legs;
    const t0 = unit(sub(K, H));
    const nk = [-k * t0[1], k * t0[0]]; // points toward the midline
    s += crease(spline([add(K, add(scl(nk, 2.8), [0, -2.2])), add(K, [0, 1.8]), add(K, add(scl(nk, -2.8), [0, -2.2]))], false), c.line, 0.9, 0.35 + g * 0.2);
    if (g > 0.2) {
      const q = (u, off) => add(lerp(J[0], K, u), scl(nk, off));
      s += crease(spline([q(0.12, -3), q(0.5, -1.2 - g), q(0.86, 1.2)], false), c.line, 1, (0.2 + g * 0.45) * (0.4 + def * 0.6));
      s += crease(spline([q(0.62, 5.6 + g), q(0.8, 5.2 + g * 1.4), q(0.95, 2.8)], false), c.line, 1, (0.15 + g * 0.5) * (0.4 + def * 0.6));
      const cv = (u, off) => add(lerp(K, A, u), scl(nk, off));
      s += crease(spline([cv(0.14, 1.5), cv(0.3, 2.4 + g), cv(0.5, 1.2)], false), c.line, 0.9, (0.15 + g * 0.4) * (0.4 + def * 0.6));
    }
    if (look.legs) {
      const to = look.legs === "capri" ? [1, 0.5] : [1, 0.86];
      const LS = chain(J, cut(LP, [0, 0], to, 0.5), k < 0);
      s += form(limbD(LS, false, false), look.shorts, mix(look.shorts, "#000000", 0.45), { off: 2.4, w: 1 });
      if (look.legs === "leggings") s += crease(spline([lerp(J[0], K, 0.2), lerp(J[0], K, 0.7), add(K, [0, 2]), lerp(K, A, 0.6)], false), mix(look.shorts, "#ffffff", 0.3), 1, 0.35);
    }
    s += shoe(A, k, look.shoes);
  }

  // Shorts: fitted legs that flare to a hem, a side stripe and split, and the waistband.
  let shortsD = "";
  const stripes = [];
  for (const k of [-1, 1]) {
    const { K } = legs[k];
    const J = legChain[k];
    const u = fem ? 0.36 : 0.56;
    const r = profAt(LP, 0, u);
    const hem = lerp(J[0], K, u);
    const t = unit(sub(K, J[0]));
    const nOut = scl([-t[1], t[0]], -k); // points away from the midline
    const ho = add(hem, scl(nOut, r[2] + (fem ? 1 : 2.4)));
    const hi = add(hem, scl(nOut, -(r[3] + (fem ? 0.8 : 1.6))));
    const outerTop = [k * (hw + 0.6), hipY - 1];
    shortsD +=
      `M${P(...outerTop)}Q${P(ho[0] + k * 0.5, (outerTop[1] + ho[1]) / 2)} ${P(...ho)}` +
      `Q${P(...add(lerp(ho, hi, 0.5), scl(t, 1.6)))} ${P(...hi)}L${P(k * 0.6, hipY + 11)}L${P(0, hipY - 1)}Z`;
    stripes.push([outerTop, ho, hi, t]);
  }
  s += form(shortsD, look.shorts, mix(look.shorts, "#000000", 0.42), { off: 3 });
  for (const [top, ho, hi, t] of stripes) {
    const k = Math.sign(top[0]);
    const inset = (p, d) => add(p, [-k * d, 0]);
    s += ln(`M${P(...inset(top, 1.2))}Q${P(...inset(lerp(top, ho, 0.5), 1.2))} ${P(...inset(ho, 1.4))}`, mix(look.shorts, "#ffffff", 0.4), 1.2, 0.7);
    s += ln(`M${P(...lerp(ho, hi, 0.1))}Q${P(...add(lerp(ho, hi, 0.5), scl(t, 0.6)))} ${P(...lerp(ho, hi, 0.92))}`, mix(look.shorts, "#000000", 0.5), 1, 0.5);
    if (!fem) s += ln(`M${P(...lerp(ho, hi, 0.12))}l${f(-k * 1)},${f(-3)}`, INK, 0.9, 0.5);
  }

  // Tops over the torso (the arms go on after, so a hanging arm sits in front of the shirt).
  const topSh = look.style && look.style !== "none" ? mix(look.top, "#000000", 0.4) : "";
  const bustY = shY + 15;
  if (look.style === "tank" || look.style === "tee" || look.style === "crop") {
    const tee = look.style === "tee";
    const crop = look.style === "crop";
    const scoop = tee ? 3.5 : fem ? 9 : 10;
    const inX = neckW + (tee ? 0.2 : 1.2);
    const outX = tee ? sw : sw * (fem ? 0.5 : 0.52);
    const hemY = crop ? shY + 27 : hipY - 2;
    const sideY = shY + (tee ? 16 : 22);
    const side = (k) =>
      crop
        ? `L${P(k * (lat - 0.6), sideY + 2)}Q${P(k * (lat - 1.5), hemY - 2)} ${P(k * (lat - 2.2), hemY)}`
        : `L${P(k * (lat - (tee ? -0.4 : 1.2)), sideY)}Q${P(k * (lat * 0.55 + ww * 0.45 + bf * 1.5 + 1), shY + 32)} ${P(k * (ww + 0.6), hipY - 13)}L${P(k * (hwT + 0.8), hemY)}`;
    const topD =
      `M${P(-outX, trapY(outX) - 0.3)}L${P(-inX, trapY(inX) - 0.3)}Q0,${f(shY + scoop)} ${P(inX, trapY(inX) - 0.3)}L${P(outX, trapY(outX) - 0.3)}` +
      (tee ? `Q${P(sw + 1.6, shY + 3)} ${P(sw + 1.4, shY + 9)}` : `Q${P(sw * 0.56, shY + 14)} ${P(lat - 1.2, sideY)}`) +
      side(1) +
      (crop ? `Q0,${f(hemY + 1.5)} ${P(-(lat - 2.2), hemY)}` : `Q0,${f(hemY + 1)} ${P(-(hwT + 0.8), hemY)}`) +
      `L${P(-(ww + 0.6), hipY - 13)}`.slice(crop ? 1e9 : 0) +
      (crop ? `Q${P(-(lat - 1.5), hemY - 2)} ${P(-(lat - 0.6), sideY + 2)}` : `Q${P(-(lat * 0.55 + ww * 0.45 + bf * 1.5 + 1), shY + 32)} ${P(-(lat - (tee ? -0.4 : 1.2)), sideY)}`) +
      (tee ? `L${P(-(sw + 1.4), shY + 9)}Q${P(-(sw + 1.6), shY + 3)} ${P(-outX, trapY(outX) - 0.3)}Z` : `Q${P(-sw * 0.56, shY + 14)} ${P(-outX, trapY(outX) - 0.3)}Z`);
    s += form(topD, look.top, topSh, { off: 3.2, w: 1.2 });
    let det = "";
    if (fem) {
      for (const k of [-1, 1]) det += tone(`M${P(k * 1, bustY + 4)}Q${P(k * sw * 0.45, bustY + 9)} ${P(k * (sw - 2), bustY + 3)}L${P(k * (sw - 2), bustY + 6.5)}Q${P(k * sw * 0.45, bustY + 12)} ${P(k * 1, bustY + 7)}Z`, topSh, 0.55);
      det += crease(`M${P(-sw + 3, bustY + 3.5)}Q${P(-sw * 0.45, bustY + 9)} ${P(0, bustY + 4)}Q${P(sw * 0.45, bustY + 9)} ${P(sw - 3, bustY + 3.5)}`, INK, 0.9, 0.35);
    } else {
      det += crease(`M${P(-sw * 0.62, lowY - 1)}Q${P(-sw * 0.3, lowY + 1.5 + m.chest)} ${P(0, lowY)}Q${P(sw * 0.3, lowY + 1.5 + m.chest)} ${P(sw * 0.62, lowY - 1)}`, INK, 0.9, 0.2 + m.chest * 0.3);
      det += ln(`M${P(-4, shY + 23)}h8M${P(-5, shY + 21)}v4M${P(5, shY + 21)}v4`, mix(look.top, "#ffffff", 0.6), 1.4, 0.9);
    }
    if (!crop) {
      det += crease(`M${P(-lat + 5, shY + 28)}Q${P(-ww + 3, hipY - 16)} ${P(-ww + 4, hipY - 6)}`, topSh, 1.4, 0.6);
      det += crease(`M${P(lat - 6, shY + 30)}Q${P(ww - 4, hipY - 14)} ${P(ww - 5, hipY - 4)}`, topSh, 1.2, 0.5);
    }
    det += crease(`M${P(-inX + 0.4, trapY(inX) + 0.8)}Q0,${f(shY + scoop + 2)} ${P(inX - 0.4, trapY(inX) + 0.8)}`, mix(look.top, "#000000", 0.25), 1.3, 0.5);
    s += clipped(topD, det);
  }
  // Waistband (over any shirt hem).
  const wbTop = ww + (hwT - ww) * 0.6 + 0.6;
  s += form(`M${P(-wbTop, hipY - 7)}Q0,${f(hipY - 5)} ${P(wbTop, hipY - 7)}L${P(hw + 1, hipY + 1)}Q0,${f(hipY + 3)} ${P(-hw - 1, hipY + 1)}Z`, look.shorts, mix(look.shorts, "#000000", 0.42), { off: 1.5 });
  s += ln(`M${P(-(wbTop + hw) / 2, hipY - 3.5)}Q0,${f(hipY - 1.5)} ${P((wbTop + hw) / 2, hipY - 3.5)}`, mix(look.shorts, "#ffffff", 0.35), 1.2, 0.7);
  if (!fem) s += ln(`M${P(0, hipY + 2)}V${f(hipY + 11)}`, INK, 0.9, 0.4);
  if (look.style === "bra") s += bra(sw, shY, neckW, trapY, look.top);

  // Arms: one outline from under the delt to the wrist, then the hand.
  const AP = armProfile(m.arms, bf, fem, R.flex ? "flex" : R.pose);
  const U = AP[0][2];
  for (const k of [-1, 1]) {
    const { S, E, W } = arms[k];
    const tW = unit(sub(W, E));
    const wrist = R.bell ? sub(W, scl(tW, 4.5)) : W;
    const J = [S, E, wrist];
    const AS = chain(J, AP, k < 0);
    let a = form(limbD(AS), c.skin, c.skinSh, { off: 2.2 });
    const aa = m.arms;
    const nIn = unit(sub([0, shY + 20], S));
    const inA = dot(AS[2].n, nIn) > 0; // side A faces the body
    const lineOn = (u0, u1, sgn, inset) => {
      const pts = [];
      for (let i = 0; i <= 3; i++) {
        const q = chain(J, [profAt(AP, 0, u0 + ((u1 - u0) * i) / 3)], k < 0)[0];
        pts.push(add(q.p, scl(q.n, sgn * ((sgn > 0 ? q.wa : q.wb) - inset))));
      }
      return spline(pts, false);
    };
    if (aa > 0.2) {
      // Biceps edge on the flexing side, triceps split on the other.
      a += crease(lineOn(0.35, 0.85, k < 0 ? 1 : -1, 2.2 + aa), c.line, 0.9, (0.15 + aa * 0.45) * (0.4 + def * 0.6));
      a += crease(lineOn(0.2, 0.6, k < 0 ? -1 : 1, 2 + aa), c.line, 0.9, (0.1 + aa * 0.35) * (0.4 + def * 0.6));
    }
    if (R.flex) {
      const pk = chain(J, [profAt(AP, 0, 0.55)], k < 0)[0];
      const sgn = k < 0 ? 1 : -1;
      const top = add(pk.p, scl(pk.n, sgn * ((sgn > 0 ? pk.wa : pk.wb) - 2.2)));
      a += spec(`M${P(...add(top, scl(pk.t, -4)))}Q${P(...add(top, scl(pk.n, sgn * 0.8)))} ${P(...add(top, scl(pk.t, 3.5)))}`, 0.5, 1.2);
    }
    a += spec(spline([lerp(E, wrist, 0.12), lerp(E, wrist, 0.45), lerp(E, wrist, 0.75)].map((p) => add(p, scl(LIGHT, 2))), false), 0.3, 0.9);
    if (R.bell) a += dumbbell(W);
    a += fist(R.bell ? W : wrist, tW, k, aa, c, R.bell);
    s += a;

    // Delt: caps the shoulder from the trap out along the upper arm, blending into it.
    if (look.style !== "tee") {
      const D = (U * 1.12 + aa * 1.4 + m.back * 0.6) * (fem ? 0.86 : 1);
      const root = add(S, [-k * 3.6, -3.2]);
      const DP = [
        [0, 0, D * 0.62, D * 0.62],
        [1, 0, D, D * 0.92],
        [1, 0.2, D * 0.98, D * 0.9],
        [1, 0.42, U * 1.03, U * 1.03],
      ];
      const DS = chain([root, S, E], DP, k < 0);
      const dd = limbD(DS);
      s += form(dd, c.skin, c.skinSh, { off: 2, w: 0 });
      const facing = DS.filter((q, i) => i > 0 && i < DS.length).map((q) => add(q.p, scl(q.n, inA ? q.wa : -q.wb)));
      s += crease(spline([add(root, scl(nIn, 1)), ...facing], false), c.line, 1, 0.45 + aa * 0.25);
      const d0 = add(DS[1].p, scl(LIGHT, D * 0.55));
      s += spec(`M${P(...add(d0, scl(DS[1].t, -2)))}Q${P(...add(d0, scl(LIGHT, 1)))} ${P(...add(d0, scl(DS[1].t, 3)))}`, 0.45, 1.1);
    } else {
      // Tee sleeve over the shoulder and upper arm.
      const SP = [[0, 0, U * 0.8 + 1.4, U * 0.8 + 1.4], [1, 0, U * 1.12 + 1.5, U * 1.02 + 1.5], ...cut(AP, [0, 0.14], [0, 0.48], 1.7).map((r) => [r[0] + 1, r[1], r[2], r[3]])];
      const root = add(S, [-k * 3, -2]);
      const SS = chain([root, S, E], SP, k < 0);
      s += form(limbD(SS, true, false), look.top, topSh, { off: 2.6, w: 1.2 });
      const e = SS[SS.length - 1];
      s += ln(`M${P(...add(e.p, scl(e.n, e.wa - 0.6)))}L${P(...add(e.p, scl(e.n, -e.wb + 0.6)))}`, mix(look.top, "#000000", 0.3), 1.2, 0.6);
      s += crease(spline([add(root, [0, 2]), ...SS.slice(1, 3).map((q) => add(q.p, scl(q.n, inA ? q.wa - 0.5 : -q.wb + 0.5)))], false), topSh, 1.1, 0.6);
    }
  }
  if (look.style === "bra") s += braStraps(sw, shY, neckW, trapY, look.top);

  // Long hair's front locks fall over the shoulders.
  if (hair.locks) {
    for (const k of [-1, 1]) {
      const lock = spline(rel([[8.6, -2], [11.6, 6], [12.6, 16], [13.6, 26], [12, 33], [9.6, 26], [8.4, 14], [7.2, 4]], hx, hy, k));
      s += form(lock, hairC, hairSh, { off: 1.6 });
      s += crease(spline(rel([[10, 4], [10.8, 16], [11.6, 28]], hx, hy, k), false), hairSh, 0.9, 0.6);
    }
  }

  // Head.
  s += headMarkup(look, R, c, hair, hairC, hairSh, hairHi);
  return s;
}

function bra(sw, shY, neckW, trapY, top) {
  const dk = mix(top, "#000000", 0.4);
  const band = shY + 25;
  const d =
    `M${P(-sw + 2.2, shY + 10)}Q${P(-sw * 0.55, shY + 3.5)} ${P(-1.6, shY + 10.5)}Q0,${f(shY + 12.5)} ${P(1.6, shY + 10.5)}` +
    `Q${P(sw * 0.55, shY + 3.5)} ${P(sw - 2.2, shY + 10)}Q${P(sw - 1.2, shY + 18)} ${P(sw - 2.6, band)}Q0,${f(band + 2)} ${P(-sw + 2.6, band)}Q${P(-sw + 1.2, shY + 18)} ${P(-sw + 2.2, shY + 10)}Z`;
  let s = form(d, top, dk, { off: 2.4, w: 1.2 });
  let det = "";
  for (const k of [-1, 1]) det += tone(`M${P(k * 1.2, shY + 17)}Q${P(k * sw * 0.5, shY + 22)} ${P(k * (sw - 2), shY + 16)}L${P(k * (sw - 2), band)}H${f(k * 1.2)}Z`, dk, 0.45);
  det += crease(`M${P(-sw + 2.6, band - 4)}Q0,${f(band - 2)} ${P(sw - 2.6, band - 4)}`, dk, 1.2, 0.8);
  det += crease(`M0,${f(shY + 12)}V${f(band - 4)}`, dk, 0.9, 0.6);
  det += spec(`M${P(-sw * 0.62, shY + 8)}Q${P(-sw * 0.4, shY + 6.2)} ${P(-sw * 0.18, shY + 8.6)}`, 0.45, 1.1);
  return s + clipped(d, det);
}

function braStraps(sw, shY, neckW, trapY, top) {
  let s = "";
  for (const k of [-1, 1]) {
    const x0 = k * (neckW + 1.4);
    s += form(`M${P(x0 - 1.6, trapY(x0) - 0.6)}L${P(x0 + 1.6, trapY(x0) - 0.6)}L${P(k * sw * 0.52 + 1.5, shY + 9)}L${P(k * sw * 0.52 - 1.5, shY + 9)}Z`, top, mix(top, "#000000", 0.4), { off: 1, w: 0.9 });
  }
  return s;
}

function headMarkup(look, R, c, hair, hairC, hairSh, hairHi) {
  const [hx, hy] = R.head;
  const fem = R.fem;
  const brow = mix(look.cut === "bald" ? "#1a1410" : hairC, INK, 0.35);
  let s = "";
  // Behind the head: bun, ponytail, bob volume.
  if (hair.bun) {
    const [bx, by] = hair.bun;
    s += form(spline(rel([[0, -6], [5.4, -4.4], [6.6, 0.8], [3.6, 4.6], [-3.6, 4.6], [-6.6, 0.8], [-5.4, -4.4]], bx, by)), hairC, hairSh, { off: 1.4 });
    s += crease(`M${P(bx - 3.6, by - 1.6)}Q${P(bx, by - 4)} ${P(bx + 3.8, by - 0.6)}M${P(bx - 2.4, by + 1.8)}Q${P(bx + 1, by + 0.4)} ${P(bx + 3.6, by + 2.2)}`, hairSh, 0.9, 0.7);
    s += spec(`M${P(bx - 3.4, by - 3.4)}Q${P(bx - 1, by - 5.2)} ${P(bx + 1.6, by - 4.6)}`, 0.45, 1);
  }
  if (hair.back && look.cut !== "long") {
    s += form(hair.back, hairC, hairSh, { off: 1.8 });
    if (hair.tie) s += ell(hair.tie[0], hair.tie[1], 1.8, 2.4, look.top, 0.9);
    if (look.cut === "pony") s += crease(spline(rel([[13.5, -8], [16, 4], [14, 18]], hx, hy), false), hairSh, 0.9, 0.7);
  }
  // Ears.
  for (const k of [-1, 1]) {
    s += form(spline(rel([[9.4, -2.8], [11.6, -3.2], [12.4, 0.6], [11.2, 4.4], [9.2, 5]], hx, hy, k)), c.skin, c.skinSh, { off: 1, w: 1 });
    s += crease(spline(rel([[10.6, -1.4], [11.4, 1], [10.4, 3]], hx, hy, k), false), c.line, 0.8, 0.6);
  }
  // Skull and jaw.
  const jaw = fem ? 0 : 0.6 + (look.build ?? 0.6) * 0.8;
  const headHalf = fem
    ? [[0, -15], [6.2, -14], [9.7, -10], [10.3, -3.5], [10, 2.2], [8.8, 7.6], [6, 11.6], [2.8, 14.2], [0, 14.7]]
    : [[0, -15.2], [6.2, -14.2], [9.8, -10.2], [10.6, -3.5], [10.4 + jaw * 0.15, 2.2], [9.4 + jaw * 0.4, 7.2], [7.2 + jaw * 0.6, 11.4], [3.8 + jaw * 0.3, 14.6], [0, 15.4]];
  const headD = spline(rel(mirrored(headHalf), hx, hy));
  s += form(headD, c.skin, c.skinSh, { off: 1.9 });
  const face = R.face || look.face || "smile";
  let fx = "";
  // Beard shadow under everything else on the face.
  const beard = look.beard ?? (look.stubble ? "stubble" : null);
  if (beard === "stubble") fx += tone(spline(rel([[-10.4, 1], [-9.4, 7.2], [-6.4, 12], [0, 15.6], [6.4, 12], [9.4, 7.2], [10.4, 1], [9, 3], [7.6, 7.6], [4.2, 8], [0, 7.4], [-4.2, 8], [-7.6, 7.6], [-9, 3]], hx, hy)), hairC, 0.22);
  if (look.cut === "cap") fx += tone(`M${P(hx - 12, hy - 6)}H${f(hx + 12)}V${f(hy - 1.2)}Q${P(hx, hy + 1.6)} ${P(hx - 12, hy - 1.2)}Z`, c.skinSh, 0.6);
  if (fem) for (const k of [-1, 1]) fx += tone(`M${P(hx + k * 7.8, hy + 5.2)}a2.6 1.6 0 1 0 ${f(-k * 5.2)} 0a2.6 1.6 0 1 0 ${f(k * 5.2)} 0Z`, "#e0607a", 0.22);
  s += clipped(headD, fx);

  // Brows.
  const bw = fem ? 1.1 : 1.8;
  const bl = (k) => {
    if (face === "effort") return `M${P(hx + k * 7.4, hy - 4.2)}Q${P(hx + k * 5, hy - 3.8)} ${P(hx + k * 2, hy - 2)}`;
    if (face === "set") return `M${P(hx + k * 7.4, hy - 3.8)}Q${P(hx + k * 5, hy - 3.8)} ${P(hx + k * 2.1, hy - 2.6)}`;
    if (face === "smirk" && k > 0) return `M${P(hx + 7.2, hy - 4.6)}Q${P(hx + 5, hy - 5.6)} ${P(hx + 2.2, hy - 4)}`;
    return `M${P(hx + k * 7.3, hy - 3.2)}Q${P(hx + k * 5, hy - 5.2)} ${P(hx + k * 2.1, hy - 3.8)}`;
  };
  s += ln(bl(-1) + bl(1), brow, bw, 0.95);
  // Eyes: white, iris, catch light, a heavy upper lid (lashes for women).
  const eyeC = look.eyes || "#3a2616";
  for (const k of [-1, 1]) {
    const ex = hx + k * 4.3;
    const ey = hy + 1.3;
    const squint = face === "effort" ? 0.5 : face === "grin" ? 0.8 : 1;
    if (!X.bare) {
      s += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="2.3" ry="${f(1.4 * squint)}" fill="#fbf7f2"/>`;
      s += `<circle cx="${f(ex - k * 0.2)}" cy="${f(ey + 0.1)}" r="${f(Math.min(1.25, 1.4 * squint))}" fill="${eyeC}"/>`;
      s += `<circle cx="${f(ex - k * 0.2)}" cy="${f(ey + 0.1)}" r=".6" fill="${INK}"/>`;
      s += `<circle cx="${f(ex - k * 0.2 - 0.45)}" cy="${f(ey - 0.35)}" r=".35" fill="#fff"/>`;
    }
    s += ln(`M${P(ex - 2.5, ey + 0.2)}Q${P(ex, ey - 2.2 * squint)} ${P(ex + 2.5, ey + 0.1)}`, INK, fem ? 1.3 : 1.1, 1);
    if (fem) s += ln(`M${P(ex + k * 2.4, ey)}l${f(k * 1.3)},-1`, INK, 0.9, 1);
    s += crease(`M${P(ex - 1.8, ey + 1.7 * squint)}Q${P(ex, ey + 2.4 * squint)} ${P(ex + 1.8, ey + 1.6 * squint)}`, c.line, 0.6, 0.4);
  }
  if (look.glasses) {
    for (const k of [-1, 1]) s += `<rect x="${f(hx + k * 4.3 - 3.6)}" y="${f(hy - 1.2)}" width="7.2" height="5" rx="1.8" fill="#cfe6ff" fill-opacity=".18" stroke="#1c1f26" stroke-width="1.1"/>`;
    s += ln(`M${P(hx - 0.7, hy + 0.2)}Q${P(hx, hy - 0.6)} ${P(hx + 0.7, hy + 0.2)}M${P(hx - 7.9, hy)}L${P(hx - 10.2, hy - 0.8)}M${P(hx + 7.9, hy)}L${P(hx + 10.2, hy - 0.8)}`, "#1c1f26", 1, 1);
  }
  // Nose: a shadow-side stroke and nostril.
  s += crease(`M${P(hx + 0.7, hy + 2)}Q${P(hx + 1.9, hy + 5.4)} ${P(hx + 0.6, hy + 6.3)}Q${P(hx - 0.4, hy + 6.8)} ${P(hx - 1.4, hy + 6)}`, c.line, 0.9, 0.8);
  // Facial hair.
  const mous = `M${P(hx - 4.8, hy + 9.4)}Q${P(hx - 2.6, hy + 6.8)} ${P(hx, hy + 7.7)}Q${P(hx + 2.6, hy + 6.8)} ${P(hx + 4.8, hy + 9.4)}Q${P(hx + 2, hy + 8.5)} ${P(hx, hy + 8.9)}Q${P(hx - 2, hy + 8.5)} ${P(hx - 4.8, hy + 9.4)}Z`;
  if (beard === "full") {
    const bd = `M${P(hx - 10.4, hy - 1)}L${P(hx - 10.2, hy + 6)}Q${P(hx - 9.2, hy + 13.4)} ${P(hx - 4, hy + 17.6)}Q${P(hx, hy + 19.6)} ${P(hx + 4, hy + 17.6)}Q${P(hx + 9.2, hy + 13.4)} ${P(hx + 10.2, hy + 6)}L${P(hx + 10.4, hy - 1)}` +
      `L${P(hx + 9.2, hy - 1)}Q${P(hx + 8.6, hy + 6.4)} ${P(hx + 5, hy + 7.4)}Q${P(hx, hy + 6.2)} ${P(hx - 5, hy + 7.4)}Q${P(hx - 8.6, hy + 6.4)} ${P(hx - 9.2, hy - 1)}Z`;
    s += form(bd, hairC, hairSh, { off: 1.6, w: 0.9 });
    s += spec(`M${P(hx - 7.6, hy + 11)}Q${P(hx - 5, hy + 15.4)} ${P(hx - 1.4, hy + 16.6)}`, 0.3, 1);
  }
  if (beard === "goatee") s += form(`M${P(hx - 3.8, hy + 11.8)}Q${P(hx, hy + 11)} ${P(hx + 3.8, hy + 11.8)}Q${P(hx + 3.6, hy + 16.4)} ${P(hx, hy + 17.4)}Q${P(hx - 3.6, hy + 16.4)} ${P(hx - 3.8, hy + 11.8)}Z`, hairC, hairSh, { off: 1, w: 0.9 });
  if (beard === "full" || beard === "goatee" || beard === "mous") s += form(mous, hairC, hairSh, { off: 0.8, w: 0.9 });
  // Mouth.
  const my = hy + 10;
  if (face === "grin") {
    s += flat(`M${P(hx - 4, my - 0.8)}Q${P(hx, my + 0.4)} ${P(hx + 4, my - 0.8)}Q${P(hx + 0.2, my + 4.6)} ${P(hx - 4, my - 0.8)}Z`, "#5a1c1e", 0.9);
    s += flat(`M${P(hx - 3.3, my - 0.4)}Q${P(hx, my + 0.6)} ${P(hx + 3.3, my - 0.4)}L${P(hx + 2.9, my + 0.9)}Q${P(hx, my + 1.7)} ${P(hx - 2.9, my + 0.9)}Z`, "#ffffff", 0);
    s += ln(`M${P(hx - 4.6, my - 1.4)}l0.7,0.7M${P(hx + 4.6, my - 1.4)}l-0.7,0.7`, INK, 0.9, 0.7);
  } else if (face === "effort") {
    s += flat(`M${P(hx - 3.8, my - 0.6)}Q${P(hx, my - 1.4)} ${P(hx + 3.8, my - 0.6)}L${P(hx + 3.4, my + 2)}Q${P(hx, my + 2.6)} ${P(hx - 3.4, my + 2)}Z`, "#ffffff", 0.9);
    s += ln(`M${P(hx - 3.5, my + 0.7)}H${f(hx + 3.5)}M${P(hx - 1.2, my - 0.8)}V${f(my + 2.2)}M${P(hx + 1.3, my - 0.8)}V${f(my + 2.2)}`, INK, 0.6, 0.6);
  } else if (face === "smirk") {
    s += ln(`M${P(hx - 3.2, my + 0.4)}Q${P(hx + 0.6, my + 1.4)} ${P(hx + 3.6, my - 1.4)}`, INK, 1.1, 0.9);
  } else if (face === "set") {
    s += ln(`M${P(hx - 3.2, my + 0.4)}Q${P(hx, my - 0.2)} ${P(hx + 3.2, my + 0.5)}`, INK, 1.1, 0.9);
  } else {
    s += ln(`M${P(hx - 3.6, my - 0.6)}Q${P(hx, my + 2.2)} ${P(hx + 3.6, my - 0.6)}`, INK, 1.1, 0.9);
  }
  if (fem && face !== "effort") s += flat(`M${P(hx - 2.6, my + (face === "grin" ? 2.6 : 1.4))}Q${P(hx, my + (face === "grin" ? 5.2 : 3.6))} ${P(hx + 2.6, my + (face === "grin" ? 2.6 : 1.4))}Q${P(hx, my + (face === "grin" ? 3.4 : 2.2))} ${P(hx - 2.6, my + (face === "grin" ? 2.6 : 1.4))}Z`, mix(c.skin, "#b8324e", 0.5), 0);
  else if (face !== "grin" && face !== "effort") s += crease(`M${P(hx - 1.6, my + 2.6)}Q${P(hx, my + 3.4)} ${P(hx + 1.6, my + 2.6)}`, c.line, 0.8, 0.45);

  // Hair over the head.
  if (hair.sides) s += clipped(headD, tone(hair.sides, hairC, 0.55));
  if (hair.front) {
    if (hair.thin) {
      s += flat(hair.front, hairC, 0, 0.88);
    } else {
      s += form(hair.front, hairC, hairSh, { off: 1.8, w: 1.1 });
    }
    let hd = "";
    if (hair.curls) {
      for (const [x, y] of [[-8, -12], [-3, -16], [3, -15.6], [8, -12], [-5.6, -7.6], [5.6, -7.4], [0, -11]]) hd += crease(`M${P(hx + x - 1.4, hy + y + 0.6)}q1.4,-2 2.8,0`, hairSh, 0.9, 0.8);
    } else if (!hair.thin) {
      hd += crease(`M${P(hx - 6, hy - 11)}Q${P(hx - 3, hy - 14)} ${P(hx + 1, hy - 15.4)}M${P(hx + 2, hy - 11)}Q${P(hx + 5, hy - 13)} ${P(hx + 7.6, hy - 13.4)}`, hairSh, 0.9, 0.6);
    }
    hd += `<path d="M${P(hx - 6.4, hy - 13.4)}Q${P(hx - 1, hy - 17)} ${P(hx + 5, hy - 15)}" fill="none" stroke="${hairHi}" stroke-width="1.8" stroke-linecap="round" opacity="${X.modern ? 0.35 : 0.6}"${X.modern ? ` filter="url(#fline)"` : ""}/>`;
    s += clipped(hair.front, X.bare ? "" : hd);
  }
  if (look.cut === "cap") {
    const cc = look.top === "#f2f2f2" ? "#c8323a" : look.top;
    const crown = spline(rel([[-11.2, -3], [-11.2, -11], [-6.6, -17.2], [0, -18.4], [6.6, -17.2], [11.2, -11], [11.2, -3], [0, -5.2]], hx, hy));
    s += flat(`M${P(hx - 11, hy - 2)}L${P(hx - 10.4, hy + 1.5)}L${P(hx - 9.6, hy - 2)}ZM${P(hx + 11, hy - 2)}L${P(hx + 10.4, hy + 1.5)}L${P(hx + 9.6, hy - 2)}Z`, hairC, 0);
    s += form(crown, cc, mix(cc, "#000000", 0.4), { off: 2 });
    s += crease(`M${P(hx, hy - 18)}V${f(hy - 5.6)}M${P(hx - 6, hy - 16)}Q${P(hx - 7, hy - 9)} ${P(hx - 6.4, hy - 4.6)}M${P(hx + 6, hy - 16)}Q${P(hx + 7, hy - 9)} ${P(hx + 6.4, hy - 4.6)}`, mix(cc, "#000000", 0.4), 0.8, 0.6);
    s += ell(hx, hy - 18.2, 1.3, 0.8, mix(cc, "#000000", 0.2), 0.8);
    s += form(`M${P(hx - 12.2, hy - 4.6)}Q${P(hx, hy - 8.2)} ${P(hx + 12.2, hy - 4.6)}Q${P(hx + 13, hy - 1.6)} ${P(hx + 11, hy - 1.2)}Q${P(hx, hy - 3.8)} ${P(hx - 11, hy - 1.2)}Q${P(hx - 13, hy - 1.6)} ${P(hx - 12.2, hy - 4.6)}Z`, mix(cc, "#000000", 0.15), "#1c1f26", { off: 1.2 });
    s += spec(`M${P(hx - 7, hy - 14)}Q${P(hx - 3, hy - 16.6)} ${P(hx + 1, hy - 17)}`, 0.5, 1.2);
  }
  if (look.cut === "bald") {
    s += tone(`M${P(hx - 6.4, hy - 10.6)}Q${P(hx - 2, hy - 14.6)} ${P(hx + 3.6, hy - 13)}Q${P(hx - 1.6, hy - 12.4)} ${P(hx - 6.4, hy - 10.6)}Z`, "#ffffff", X.modern ? 0.35 : 0.5);
  }
  return s;
}

/* ── Sprites ──────────────────────────────────────────────────────────── */

/** Muscle 0..1 per group and body fat 0..1 from game stats. */
export function buildFromStats(stats) {
  const m = {};
  for (const g of GROUPS) m[g] = Math.min(1, stats.mus[g] / 55);
  return { m, bf: Math.min(1, Math.max(0, (stats.bf - 8) / 22)) };
}

const rimFor = () => "#fff1dc";

/** Defs the figures add on top of the kit's: soft shading blurs and a gentler Modern grade. */
function figDefs() {
  const R = `x="-40%" y="-40%" width="180%" height="180%"`;
  return (
    `<filter id="fsoft" ${R}><feGaussianBlur stdDeviation="1.7"/></filter>` +
    `<filter id="fsoft2" ${R}><feGaussianBlur stdDeviation="1"/></filter>` +
    `<filter id="fline" ${R}><feGaussianBlur stdDeviation=".45"/></filter>` +
    `<filter id="fsat" x="${FIG_BOX[0]}" y="${FIG_BOX[1]}" width="${FIG_BOX[2]}" height="${FIG_BOX[3]}" filterUnits="userSpaceOnUse"><feColorMatrix type="saturate" values=".88"/></filter>`
  );
}

/**
 * Comic figure lighting, as the kit's `lit` (heavy ink ring, key-light wash,
 * rim) but with the ring and masks cut from the plain silhouette, so the
 * detailed figure is painted once rather than once per ring copy.
 */
function litComic(content, silhouette, rim) {
  const [x, y, w, h] = FIG_BOX;
  const R = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  const ink = 2.4;
  let ring = "";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ring += `<use href="#s" transform="translate(${f(Math.cos(a) * ink)} ${f(Math.sin(a) * ink)})"/>`;
  }
  return (
    `<defs><g id="s">${silhouette}</g>` +
    `<mask id="sil" maskUnits="userSpaceOnUse" ${R}><use href="#s" filter="url(#wht)"/></mask>` +
    `<mask id="rim" maskUnits="userSpaceOnUse" ${R}><use href="#s" filter="url(#wht)"/>` +
    `<use href="#s" filter="url(#blk)" transform="translate(-1.6 1.4)"/></mask></defs>` +
    `<g filter="url(#blk)">${ring}</g>` +
    content +
    `<rect ${R} fill="url(#shade)" mask="url(#sil)"/>` +
    `<rect ${R} fill="${rim}" opacity=".3" mask="url(#rim)"/>`
  );
}

/**
 * Modern figure lighting: the kit's key light, floor falloff and edge
 * occlusion over smooth paint (no grime texture on skin), all clipped to the
 * plain silhouette so soft shading never bleeds past the body.
 */
function litModern(content, silhouette) {
  const [x, y, w, h] = FIG_BOX;
  const R = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  return (
    `<defs><g id="s">${silhouette}</g><mask id="fsil" maskUnits="userSpaceOnUse" ${R}><use href="#s" filter="url(#wht)"/></mask></defs>` +
    `<g mask="url(#fsil)"><g filter="url(#fsat)">${content}</g>` +
    `<rect ${R} fill="url(#rkey)" opacity=".75"/><rect ${R} fill="url(#rfall)"/>` +
    `<use href="#s" filter="url(#redge)" opacity=".7"/></g>`
  );
}

function build(look, m, bf, pose, modern, bare) {
  X = { modern, bare, n: 0 };
  try {
    return body(rig(m, bf, pose, !!look.fem), look, m, bf);
  } finally {
    X = { modern: false, bare: false, n: 0 };
  }
}

/**
 * One figure sprite: { box, layers, defs, realistic? }. `modern` builds the
 * no-ink Realistic variant.
 */
export function figureSprite(look, m, bf, pose, modern = false) {
  const markup = modern
    ? withRealisticBuild(() => litModern(build(look, m, bf, pose, true, false), build(look, m, bf, pose, true, true)))
    : litComic(build(look, m, bf, pose, false, false), build(look, m, bf, pose, false, true), rimFor(look));
  const defs = baseDefs(FIG_BOX) + (modern ? realDefs(FIG_BOX) : "") + figDefs();
  const s = { box: FIG_BOX, layers: [{ markup: `<ellipse cx="0" cy="1" rx="30" ry="6" fill="#000" opacity=".35" filter="url(#gb)"/>${markup}` }], defs };
  if (modern) s.realistic = true;
  return s;
}

/** Member look → muscle table from its `build` scalar. */
export function lookMuscle(look) {
  const b = look.build;
  return { m: { chest: b, back: b * 0.9, legs: b * 0.8, arms: b, core: b * 0.7 }, bf: look.bf ?? 0.25 + (1 - b) * 0.2 };
}

export const MEMBER_POSES = ["idle", "walkA", "walkB", "liftA", "liftB"];

/**
 * The player's physique portrait as a standalone SVG document string for an
 * <img> (own document, so the kit's fixed ids cannot clash with the page).
 */
export function portraitSvg(stats, modern = false, look = PLAYER_LOOK) {
  const { m, bf } = buildFromStats(stats);
  const s = figureSprite(look, m, bf, "flex", modern);
  const [x, y, w, h] = FIG_BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w * 2}" height="${h * 2}"><defs>${s.defs}</defs>${s.layers[0].markup}</svg>`;
}

export const PLAYER_LOOK = { skin: 1, top: "#e2362b", style: "none", shorts: "#1c2438", shoes: "#ffd23a", hair: "#2a1a0e", cut: "crop", stubble: true, face: "smile", build: 0.6 };
