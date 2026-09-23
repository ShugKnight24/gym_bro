/**
 * Front-facing inked humanoids in centimetres (feet at y=0, y up negative):
 * gym members, the player's reflection and the physique portrait.
 *
 * One rig (`rig`) places joints for a pose; `body` dresses it. Muscle per
 * group (0..1) drives girth — chest and back widen the shoulders and pecs,
 * arms swell delts, biceps and forearms, legs the thighs and calves — and
 * body fat (0..1) softens the waist and hides the abs. Comic wraps the
 * figure in the ink-kit `lit` outline; Modern builds the same markup under
 * `withRealisticBuild` (no ink, key/fill shading).
 */

import {
  INK, f, P, polar, lerp, capsule, sh, ln, circ, ell, limb, lit, baseDefs, realDefs, withRealisticBuild, mix, spec,
} from "../../engine/ink-kit.js";
import { GROUPS } from "../data/equipment.js";

export const FIG_BOX = [-62, -196, 124, 202];

export const SKINS = ["#f1c7a5", "#dcaa80", "#b97c52", "#8d5836", "#5f3a24"];

/** Member looks: skin, top, top style, shorts, shoes, hair colour/style, build, fem. */
export const MEMBER_LOOKS = [
  { skin: 0, top: "#e2362b", style: "tank", shorts: "#1c2230", shoes: "#f2f2f2", hair: "#3a2412", cut: "crop", build: 0.55 },
  { skin: 3, top: "#2f6fd6", style: "tee", shorts: "#2a2a2e", shoes: "#ff5a3a", hair: "#0b0b0d", cut: "buzz", build: 0.35 },
  { skin: 1, top: "#ffd23a", style: "bra", shorts: "#6b2fa6", shoes: "#ffffff", hair: "#b8742a", cut: "pony", build: 0.3, fem: true },
  { skin: 4, top: "#3aa655", style: "tank", shorts: "#1e2a44", shoes: "#20242a", hair: "#0b0b0d", cut: "bald", build: 0.85 },
  { skin: 2, top: "#f2f2f2", style: "tee", shorts: "#c8323a", shoes: "#2f6fd6", hair: "#1a1410", cut: "cap", build: 0.45 },
  { skin: 0, top: "#ff7ab8", style: "bra", shorts: "#1c1f26", shoes: "#f2f2f2", hair: "#e8c26a", cut: "pony", build: 0.4, fem: true },
  { skin: 3, top: "#1c1f26", style: "tank", shorts: "#8a8f98", shoes: "#ffd23a", hair: "#0b0b0d", cut: "crop", build: 0.7 },
  { skin: 1, top: "#22b8c8", style: "tee", shorts: "#26303e", shoes: "#e2362b", hair: "#6a4424", cut: "crop", build: 0.2, bf: 0.7 },
];

/** Arm poses: sh = upper arm swing (deg off straight down, outward positive), el = elbow bend. */
const POSES = {
  idle: { armL: { sh: 12, el: 8 }, armR: { sh: 12, el: 8 } },
  walkA: { armL: { sh: 22, el: 18 }, armR: { sh: 4, el: 4 }, liftL: 7 },
  walkB: { armL: { sh: 4, el: 4 }, armR: { sh: 22, el: 18 }, liftR: 7 },
  liftA: { armL: { sh: 100, el: 60 }, armR: { sh: 100, el: 60 }, bell: true },
  liftB: { armL: { sh: 160, el: 8 }, armR: { sh: 160, el: 8 }, bell: true },
  flex: { armL: { sh: 92, el: 100 }, armR: { sh: 92, el: 100 } },
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
    const A = [s * (hipW + 3), -9 - lift];
    const L = 86;
    const D = Math.hypot(A[0] - H[0], A[1] - H[1]);
    const bend = Math.sqrt(Math.max(0, L * L - D * D)) / 2;
    const M = lerp(H, A, 0.52);
    legs[s] = { H, K: [M[0] + s * bend * 0.35, M[1] - bend * 0.1], A };
  }
  const arms = {};
  for (const s of [-1, 1]) {
    const ap = s < 0 ? P0.armL : P0.armR;
    const S = [s * (sw - 3), shY + 5];
    const E = polar(S, s * ap.sh, 29);
    const W = polar(E, s * (ap.sh + ap.el), 25);
    arms[s] = { S, E, W };
  }
  return { hipY, shY, sw, hipW, legs, arms, head: [0, -165], bell: !!P0.bell, flex: pose === "flex", fem };
}

/** The dressed figure's markup (unlit). */
function body(R, look, m, bf) {
  const skin = SKINS[look.skin ?? 0];
  const skinDk = mix(skin, "#3a1a0a", 0.35);
  const top = look.top;
  const topDk = mix(top, "#000000", 0.35);
  const { hipY, shY, sw, legs, arms, head, fem } = R;
  const def = Math.max(0, 1 - bf * 1.6);
  const lat = sw - 1 + m.back * 3.5;
  const ww = (fem ? 9.5 : 12.5) + bf * 9 - m.core * 1.2;
  const hw = (fem ? 16 : 13.5) + bf * 3;
  let s = "";

  // Legs, calves and sneakers.
  const thighW = 16 + m.legs * 8 + bf * 4 + (fem ? 2 : 0);
  for (const k of [-1, 1]) {
    const { H, K, A } = legs[k];
    s += limb(H, K, thighW, thighW * 0.66, skin);
    s += limb(K, A, thighW * 0.62, 8.5, skin);
    const calf = lerp(K, A, 0.3);
    s += ell(calf[0] + k * (1.5 + m.legs * 1.5), calf[1], 4.2 + m.legs * 2.6, 11, skin, 0);
    s += ln(`M${P(calf[0] + k * (4 + m.legs * 3), calf[1] - 8)}Q${P(calf[0] + k * (6.5 + m.legs * 3.5), calf[1])} ${P(calf[0] + k * 3, calf[1] + 10)}`, INK, 0.9, 0.55);
    if (m.legs > 0.3) s += ln(`M${P(lerp(H, K, 0.35)[0] - k * 2, lerp(H, K, 0.35)[1])}Q${P(lerp(H, K, 0.7)[0] + k * 3, lerp(H, K, 0.7)[1])} ${P(K[0] - k * 1, K[1] - 4)}`, skinDk, 1.1, 0.35 + def * 0.4);
    // Sock and shoe.
    s += limb(lerp(K, A, 0.84), A, 8.6, 8.2, "#f4f4f0", 1);
    const sole = A[1] + 9;
    s += sh(`M${P(A[0] - 6, A[1] + 1)}Q${P(A[0], A[1] - 3)} ${P(A[0] + 6, A[1] + 1)}L${P(A[0] + 8 + k * 2, sole - 3)}Q${P(A[0] + 8 + k * 2, sole)} ${P(A[0] + 4, sole)}H${f(A[0] - 6)}Q${P(A[0] - 9 + k * 1.5, sole)} ${P(A[0] - 8 + k * 1.5, sole - 3)}Z`, look.shoes);
    s += ln(`M${P(A[0] - 8 + k * 1.5, sole - 1.5)}H${f(A[0] + 8 + k * 2)}`, INK, 1.6, 0.9);
  }
  // Shorts: fitted legs that taper to a flat hem (round tube ends read as a rear view), and a waistband.
  for (const k of [-1, 1]) {
    const { H, K } = legs[k];
    const hem = lerp(H, K, fem ? 0.42 : 0.58);
    const dx = K[0] - H[0];
    const dy = K[1] - H[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = thighW / 2 + (fem ? 1.2 : 2);
    const out = k * Math.sign(nx || 1);
    const ho = [hem[0] + nx * half * out, hem[1] + ny * half * out];
    const hi = [hem[0] - nx * half * out, hem[1] - ny * half * out];
    const outerTop = [k * (hw + 0.5), hipY];
    const crotch = [k * 0.8, hipY + 12];
    s += sh(`M${P(...outerTop)}Q${P(ho[0] + k * 1.5, (outerTop[1] + ho[1]) / 2)} ${P(...ho)}` +
      `Q${P((ho[0] + hi[0]) / 2, (ho[1] + hi[1]) / 2 + 1.5)} ${P(...hi)}L${P(...crotch)}L${P(0, hipY)}Z`, look.shorts);
    s += ln(`M${P(...lerp(ho, hi, 0.08))}Q${P((ho[0] + hi[0]) / 2, (ho[1] + hi[1]) / 2 - 0.5)} ${P(...lerp(ho, hi, 0.92))}`, mix(look.shorts, "#ffffff", 0.3), 1.1, 0.6);
  }
  // The waistband goes on after the torso and top (see below), so skin never cuts across it.
  const waistband = () =>
    sh(`M${P(-hw - 0.5, hipY - 7)}Q0,${f(hipY - 5)} ${P(hw + 0.5, hipY - 7)}L${P(hw + 1, hipY + 1)}Q0,${f(hipY + 3)} ${P(-hw - 1, hipY + 1)}Z`, look.shorts) +
    ln(`M${P(-hw, hipY - 3.5)}Q0,${f(hipY - 1.5)} ${P(hw, hipY - 3.5)}`, mix(look.shorts, "#ffffff", 0.35), 1.2, 0.7) +
    ln(`M${P(0, hipY + 2)}V${f(hipY + 12)}`, INK, 0.9, 0.45);

  // Arms behind the torso edge (drawn first so the torso overlaps the armpit).
  const uaW = 9 + m.arms * 6 + bf * 2 - (fem ? 1.5 : 0);
  const faW = 8 + m.arms * 3.2 - (fem ? 1 : 0);
  const armMarkup = (k) => {
    const { S, E, W } = arms[k];
    let a = limb(S, E, uaW, uaW * 0.78, skin);
    // Biceps belly and its crease.
    const mid = lerp(S, E, 0.5);
    a += sh(capsule(lerp(S, E, 0.22), lerp(S, E, 0.8), uaW * (0.72 + m.arms * 0.25), uaW * 0.6), skin, 0.9);
    if (m.arms > 0.25) a += ln(`M${P(...lerp(S, E, 0.3))}Q${P(mid[0] - k * 1.5, mid[1] + 1.5)} ${P(...lerp(S, E, 0.78))}`, skinDk, 1, 0.3 + def * 0.35);
    if (R.flex) {
      // Flexed biceps: a peak rising off the upper arm toward the forearm.
      const pk = lerp(S, E, 0.55);
      const r = uaW * (0.42 + m.arms * 0.35);
      a += sh(`M${P(S[0] + k * 4, S[1] - 2)}Q${P(pk[0], pk[1] - r * 2.2)} ${P(E[0] - k * 2, E[1] - 3)}Z`, skin, 1.1);
      a += spec(`M${P(pk[0] - k * r * 0.8, pk[1] - r * 1.1)}Q${P(pk[0], pk[1] - r * 1.5)} ${P(pk[0] + k * r * 0.6, pk[1] - r * 1.05)}`, 0.5, 1.1);
    }
    a += limb(E, W, faW, faW * 0.72, skin);
    a += spec(`M${P(...lerp(E, W, 0.15))}L${P(...lerp(E, W, 0.7))}`, 0.35, 0.9);
    // Fist, maybe holding a dumbbell.
    if (R.bell) {
      a += sh(`M${P(W[0] - 10, W[1] - 2)}h20v4h-20Z`, "#9aa6b2", 0.9);
      a += sh(`M${P(W[0] - 13, W[1] - 6)}h4v12h-4ZM${P(W[0] + 9, W[1] - 6)}h4v12h-4Z`, "#1c2027", 1);
    }
    a += circ(W[0], W[1], 4.8 + m.arms * 0.8, skin);
    a += ln(`M${P(W[0] - 3, W[1] - 1)}q3,-2 6,0`, INK, 0.8, 0.6);
    return a;
  };
  s += armMarkup(-1) + armMarkup(1);

  // Neck and traps.
  const neckW = 6 + m.back * 2.5;
  s += sh(`M${P(-neckW, shY - 16)}H${f(neckW)}L${P(neckW + 1, shY + 2)}H${f(-neckW - 1)}Z`, skin);
  s += sh(`M${P(-neckW, shY - 8)}Q${P(-sw * 0.6, shY - 5 - m.back * 3)} ${P(-sw, shY + 1)}L${P(sw, shY + 1)}Q${P(sw * 0.6, shY - 5 - m.back * 3)} ${P(neckW, shY - 8)}Z`, skin);

  // Torso.
  const torso =
    `M${P(-sw, shY)}Q${P(0, shY - 6)} ${P(sw, shY)}L${P(lat, shY + 24)}` +
    `Q${P(ww + 1 + bf * 3, hipY - 22)} ${P(ww, hipY - 8)}L${P(hw, hipY + 1)}H${f(-hw)}L${P(-ww, hipY - 8)}` +
    `Q${P(-ww - 1 - bf * 3, hipY - 22)} ${P(-lat, shY + 24)}Z`;
  s += sh(torso, skin, 1.3);
  // Pecs: broad plates under the collarbones with a hard lower edge. Women get a soft bust instead.
  const pc = m.chest;
  if (fem) {
    for (const k of [-1, 1]) {
      const cx = k * sw * 0.42;
      s += ell(cx, shY + 15, sw * 0.4, 7.5, mix(skin, "#ffffff", 0.05), 0);
      s += ln(`M${P(k * sw * 0.1, shY + 20)}Q${P(cx, shY + 25)} ${P(k * (sw - 2), shY + 17)}`, skinDk, 1.1, 0.45);
    }
  }
  for (const k of fem ? [] : [-1, 1]) {
    const lowY = shY + 15 + pc * 4 + bf * 2;
    const pe = `M${P(k * 1.2, shY + 2)}Q${P(k * sw * 0.55, shY - 1)} ${P(k * (sw - 2.5), shY + 4)}` +
      `Q${P(k * (sw - 1), shY + 12)} ${P(k * (sw - 4), lowY - 1)}Q${P(k * sw * 0.45, lowY + 2)} ${P(k * 1.2, lowY)}Z`;
    s += sh(pe, mix(skin, "#ffffff", 0.07), 0);
    s += ln(`M${P(k * (sw - 2), shY + 9)}Q${P(k * (sw - 2.5), lowY - 2)} ${P(k * (sw - 5), lowY - 0.5)}Q${P(k * sw * 0.45, lowY + 2.5)} ${P(k * 1.2, lowY + 0.5)}`, INK, 1.2, 0.35 + pc * 0.5);
    s += ln(`M${P(k * sw * 0.25, shY + 3)}Q${P(k * sw * 0.6, shY + 1)} ${P(k * (sw - 4), shY + 5)}`, "#ffffff", 1, 0.25);
  }
  if (!fem) s += ln(`M0,${f(shY + 3)}V${f(shY + 16 + pc * 4)}`, skinDk, 1, 0.3 + pc * 0.4);
  // Abs and obliques fade in with definition.
  const ab = def * (0.25 + m.core * 0.75) * (fem ? 0.6 : 1);
  if (ab > 0.05) {
    s += ln(`M0,${f(shY + 22)}V${f(hipY - 8)}`, skinDk, 1.1, ab);
    for (let i = 0; i < 3; i++) {
      const y = shY + 29 + i * 8;
      s += ln(`M${P(-7 + i * 0.5, y)}Q${P(-3, y + 1.6)} 0,${f(y + 0.8)}Q${P(3, y + 1.6)} ${P(7 - i * 0.5, y)}`, skinDk, 1, ab);
    }
    s += ln(`M${P(-ww + 1, hipY - 16)}L${P(-4, hipY + 2)}M${P(ww - 1, hipY - 16)}L${P(4, hipY + 2)}`, skinDk, 1, ab * 0.8);
  }
  if (bf > 0.45) s += ln(`M${P(-ww + 3, hipY - 10)}Q0,${f(hipY - 4 + bf * 4)} ${P(ww - 3, hipY - 10)}`, INK, 1, 0.45);
  s += ln(`M0,${f(hipY - 18)}v2.5`, INK, 1.2, 0.7);

  // Tops.
  if (look.style === "tank" || look.style === "tee") {
    const scoop = look.style === "tank" ? 10 : 5;
    const strap = look.style === "tank" ? sw * 0.45 : sw - 1;
    const tank =
      `M${P(-strap, shY - 3)}L${P(-neckW + 1, shY - 5)}Q0,${f(shY + scoop)} ${P(neckW - 1, shY - 5)}L${P(strap, shY - 3)}` +
      (look.style === "tank" ? `Q${P(sw - 2, shY + 16)} ${P(lat - 2, shY + 26)}` : `L${P(lat, shY + 24)}`) +
      `Q${P(ww + 1 + bf * 3, hipY - 22)} ${P(ww + 0.5, hipY - 8)}L${P(hw + 0.5, hipY - 2)}H${f(-hw - 0.5)}L${P(-ww - 0.5, hipY - 8)}` +
      `Q${P(-ww - 1 - bf * 3, hipY - 22)} ${P(-(look.style === "tank" ? lat - 2 : lat), shY + (look.style === "tank" ? 26 : 24))}` +
      (look.style === "tank" ? `Q${P(-sw + 2, shY + 16)} ${P(-strap, shY - 3)}Z` : "Z");
    s += sh(tank, top, 1.3);
    s += ln(`M${P(-lat + 4, shY + 30)}Q${P(-ww + 2, hipY - 16)} ${P(-ww + 3, hipY - 6)}`, topDk, 2.4, 0.5);
    s += ln(`M${P(-sw * 0.3, shY + 10)}Q0,${f(shY + 13 + m.chest * 3)} ${P(sw * 0.3, shY + 10)}`, INK, 0.9, 0.35 + m.chest * 0.3);
    // Chest logo: a little comic dumbbell.
    s += ln(`M${P(-4, shY + 22)}h8M${P(-5, shY + 20)}v4M${P(5, shY + 20)}v4`, mix(top, "#ffffff", 0.6), 1.4, 0.9);
    if (look.style === "tee") {
      for (const k of [-1, 1]) {
        const { S, E } = arms[k];
        s += sh(capsule(lerp(S, E, 0.02), lerp(S, E, 0.45), uaW + 3, uaW + 2), top, 1.2);
        s += ln(`M${P(...lerp(S, E, 0.42))}l${f(-k * 2)},1`, INK, 0.8, 0.4);
      }
    }
  }
  s += waistband();

  // Shoulder joint: an ink-less patch of the arm root hides the torso's
  // outline where the arm leaves it, then the delt caps the joint from
  // inside the torso out along the upper arm, so no pose shows a seam.
  for (const k of [-1, 1]) {
    if (look.style === "tee") break;
    const { S, E } = arms[k];
    const r = (4.2 + m.arms * 3.4 + m.back * 1.2) * (fem ? 0.75 : 0.9);
    // The cap sits on the shoulder's outer edge; reaching further in paints it across the chest.
    const root = [S[0] - k * r * 0.25, S[1] - 1];
    s += limb(root, lerp(S, E, 0.45), uaW * 1.02, uaW * 0.8, skin, 0);
    s += sh(capsule(root, lerp(S, E, 0.36), r * 2, r * 1.4), skin, 1.1);
    const d = lerp(S, E, 0.1);
    s += spec(`M${P(d[0] - k * 2, d[1] - r + 1.5)}Q${P(d[0] + k * r * 0.5, d[1] - r + 1)} ${P(d[0] + k * r * 0.8, d[1])}`, 0.4, 1);
  }

  // Sports bra over the shoulder caps: straps, two cups and an underband.
  if (look.style === "bra") {
    const band = shY + 25;
    for (const k of [-1, 1]) s += ln(`M${P(k * (neckW + 1), shY - 6)}L${P(k * sw * 0.55, shY + 8)}`, top, 3.2, 1);
    s += sh(`M${P(-sw + 2.5, shY + 9)}Q${P(-sw * 0.5, shY + 2)} ${P(-1.5, shY + 9)}Q0,${f(shY + 11)} ${P(1.5, shY + 9)}` +
      `Q${P(sw * 0.5, shY + 2)} ${P(sw - 2.5, shY + 9)}L${P(sw - 3, band)}Q0,${f(band + 2)} ${P(-sw + 3, band)}Z`, top, 1.2);
    s += ln(`M${P(-sw + 3, band - 4)}Q0,${f(band - 2)} ${P(sw - 3, band - 4)}`, mix(top, "#000000", 0.3), 1.2, 0.6);
    s += ln(`M0,${f(shY + 11)}V${f(band - 4)}`, mix(top, "#000000", 0.3), 0.9, 0.5);
  }

  // Head.
  const [hx, hy] = head;
  if (look.cut === "pony") s += sh(`M${P(hx + 6, hy - 8)}Q${P(hx + 20, hy - 4)} ${P(hx + 16, hy + 14)}Q${P(hx + 12, hy + 4)} ${P(hx + 5, hy - 2)}Z`, look.hair);
  s += ell(hx - 10.2, hy + 1, 2.6, 3.8, skin);
  s += ell(hx + 10.2, hy + 1, 2.6, 3.8, skin);
  s += sh(`M${P(hx - 10, hy - 6)}Q${P(hx - 10.5, hy + 8)} ${P(hx - 5, hy + 12)}Q${P(hx, hy + 15)} ${P(hx + 5, hy + 12)}Q${P(hx + 10.5, hy + 8)} ${P(hx + 10, hy - 6)}Q${P(hx, hy - 17)} ${P(hx - 10, hy - 6)}Z`, skin);
  if (look.cut === "crop" || look.cut === "pony") {
    s += sh(`M${P(hx - 10.5, hy - 2)}Q${P(hx - 12, hy - 15)} ${P(hx, hy - 15.5)}Q${P(hx + 12, hy - 15)} ${P(hx + 10.5, hy - 2)}Q${P(hx + 6, hy - 9)} ${P(hx - 2, hy - 8)}Q${P(hx - 8, hy - 8)} ${P(hx - 10.5, hy - 2)}Z`, look.hair);
  } else if (look.cut === "buzz") {
    s += sh(`M${P(hx - 10, hy - 4)}Q${P(hx - 10.5, hy - 14)} ${P(hx, hy - 14.5)}Q${P(hx + 10.5, hy - 14)} ${P(hx + 10, hy - 4)}Q${P(hx, hy - 9)} ${P(hx - 10, hy - 4)}Z`, look.hair, 0.9);
  } else if (look.cut === "cap") {
    s += sh(`M${P(hx - 11, hy - 4)}Q${P(hx - 11, hy - 16)} ${P(hx, hy - 16)}Q${P(hx + 11, hy - 16)} ${P(hx + 11, hy - 4)}Z`, look.top === "#f2f2f2" ? "#c8323a" : look.top);
    s += sh(`M${P(hx - 12, hy - 5)}Q${P(hx, hy - 8)} ${P(hx + 12, hy - 5)}L${P(hx + 13, hy - 2)}Q${P(hx, hy - 5)} ${P(hx - 13, hy - 2)}Z`, "#1c1f26", 1);
  } else {
    s += spec(`M${P(hx - 5, hy - 11)}Q${P(hx, hy - 13.5)} ${P(hx + 4, hy - 12)}`, 0.6, 1.4);
  }
  // Face: brows, eyes, nose, a confident grin. Women: arched brows, lashes, lips.
  if (fem) {
    s += ln(`M${P(hx - 7, hy - 2.5)}Q${P(hx - 5, hy - 5)} ${P(hx - 2.5, hy - 3.5)}M${P(hx + 7, hy - 2.5)}Q${P(hx + 5, hy - 5)} ${P(hx + 2.5, hy - 3.5)}`, INK, 1.1, 0.9);
    s += ell(hx - 4, hy + 0.6, 1.3, 1.6, INK, 0) + ell(hx + 4, hy + 0.6, 1.3, 1.6, INK, 0);
    s += ln(`M${P(hx - 5.3, hy - 0.4)}l-1.4,-1.1M${P(hx + 5.3, hy - 0.4)}l1.4,-1.1`, INK, 0.9, 0.9);
    s += ln(`M${P(hx + 0.4, hy + 2)}l-0.8,3.2h1.4`, skinDk, 0.8, 0.6);
    s += sh(`M${P(hx - 3.2, hy + 8.4)}Q${P(hx, hy + 7.4)} ${P(hx + 3.2, hy + 8.4)}Q${P(hx, hy + 11)} ${P(hx - 3.2, hy + 8.4)}Z`, mix(skin, "#c0395a", 0.45), 0);
    s += ln(`M${P(hx - 3.2, hy + 8.5)}Q${P(hx, hy + 9.6)} ${P(hx + 3.2, hy + 8.5)}`, INK, 0.8, 0.7);
  } else {
    s += ln(`M${P(hx - 7, hy - 3)}l4.5,1M${P(hx + 7, hy - 3)}l-4.5,1`, INK, 1.6, 1);
    s += ell(hx - 4, hy + 0.5, 1.3, 1.5, INK, 0) + ell(hx + 4, hy + 0.5, 1.3, 1.5, INK, 0);
    s += ln(`M${P(hx + 0.5, hy + 1)}l-1.2,4.5h2`, skinDk, 1, 0.8);
    s += ln(`M${P(hx - 3.5, hy + 8.5)}Q${P(hx, hy + 10.5)} ${P(hx + 3.5, hy + 8)}`, INK, 1.2, 0.9);
  }
  if (!fem && (look.stubble ?? m.back > 0.5)) s += ln(`M${P(hx - 7, hy + 6)}Q${P(hx, hy + 15)} ${P(hx + 7, hy + 6)}`, skinDk, 2.4, 0.25);
  return s;
}

/** Muscle 0..1 per group and body fat 0..1 from game stats. */
export function buildFromStats(stats) {
  const m = {};
  for (const g of GROUPS) m[g] = Math.min(1, stats.mus[g] / 55);
  return { m, bf: Math.min(1, Math.max(0, (stats.bf - 8) / 22)) };
}

const rimFor = (look) => mix(look.top, "#ffffff", 0.5);

/**
 * One figure sprite: { box, layers, defs, realistic? }. `modern` builds the
 * no-ink Realistic variant.
 */
export function figureSprite(look, m, bf, pose, modern = false) {
  const build = () => {
    const R = rig(m, bf, pose, !!look.fem);
    return lit(body(R, look, m, bf), FIG_BOX, rimFor(look), { ink: 2.4, rimX: 2.4, rimY: 1.8, rimOp: 0.55 });
  };
  const markup = modern ? withRealisticBuild(build) : build();
  const defs = baseDefs(FIG_BOX) + (modern ? realDefs(FIG_BOX) : "");
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

export const PLAYER_LOOK = { skin: 1, top: "#e2362b", style: "none", shorts: "#1c2438", shoes: "#ffd23a", hair: "#2a1a0e", cut: "crop", stubble: true };
