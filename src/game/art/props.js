/**
 * Gym prop sprites. Units are centimetres, origin at the footprint centre on
 * the floor, y up negative (see ../../engine/prop-kit.js for the projection).
 *
 * The locker, bench, crate, weight rack, dumbbells, heavy bag, desk, table,
 * chair, vending machine and plant come from Clockwork Carnage's prop set.
 */

import {
  INK, OX, f, zy, pj, poly, rect, path, line, ell, block, shadow, lamp, rim, vents, leaf,
  isRealBuild, buildSet, buildRealisticSet, DEFS,
} from "../../engine/prop-kit.js";
/** Double-door steel locker, 80×188 cm on a plinth, keypad lock LED. */
function locker() {
  const w = 80;
  const h = 188;
  const d = 45;
  const x = -(w + d * OX) / 2;
  const y = -196;
  const mx = x + w / 2;
  let s = shadow(4, -4, 58, 14);
  s += block(x + 3, -8, w - 6, 8, d - 6, "dk", { top: false, hi: 0 });
  s += block(x, y, w, h, d, "st", { top: false });
  // Doors: inset panels with bevels.
  for (const dx0 of [x + 3, mx + 1]) {
    const dw = w / 2 - 4;
    s += rect(dx0, y + 4, dw, h - 9, "none", 0.5, 0, ` stroke-opacity=".7"`);
    s += line(`M${f(dx0 + 0.8)},${f(y + h - 6)}V${f(y + 4.8)}H${f(dx0 + dw - 0.8)}`, "#cfe0ee", 0.5, 0.35);
    s += vents(dx0 + dw * 0.2, y + 14, dw * 0.6, 6);
    s += vents(dx0 + dw * 0.2, -44, dw * 0.6, 4);
  }
  s += line(`M${f(mx)},${f(y + 4)}V${f(-13)}`, INK, 1.1, 0.9);
  // Handles + lock box.
  s += rect(mx - 7.5, -118, 3.2, 26, "url(#chrome)", 0.6, 1.5);
  s += rect(mx + 4.3, -118, 3.2, 26, "url(#chrome)", 0.6, 1.5);
  s += rect(mx - 3.2, -126, 6.4, 10, "#141b22", 0.6, 1);
  // Number plates.
  s += rect(x + 12, y + 44, 14, 7, "#cfd7de", 0.5, 0.8);
  s += line(`M${f(x + 15)},${f(y + 47.5)}h3M${f(x + 20)},${f(y + 46)}v3`, "#1a232c", 0.9, 0.9);
  s += rect(mx + 10, y + 44, 14, 7, "#cfd7de", 0.5, 0.8);
  s += line(`M${f(mx + 13)},${f(y + 47.5)}h3M${f(mx + 18)},${f(y + 46)}v3h2`, "#1a232c", 0.9, 0.9);
  // Wear: scuffs low on the doors, AO under the top lip.
  s += line(`M${f(x + 10)},-30l9,-2M${f(mx + 20)},-58l12,3M${f(mx + 8)},-24l6,-1`, "#d8e4ee", 0.6, 0.25);
  s += rect(x + 0.6, y + 0.6, w - 1.2, 6, "url(#ao)", 0);
  // Side face panel seam and rim light.
  s += line(`M${f(x + w + d * OX * 0.5)},${f(zy(y, d * 0.5) + 6)}V${f(zy(-8, d * 0.5) - 4)}`, "#000", 0.6, 0.5);
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 2)}V${f(zy(y + h, d) - 2)}`);
  return {
    box: [-64, -214, 128, 226],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: lamp(mx, -121, 1.3, "#00ff66", "#c8ffd8"), shade: false, blend: "lighter", anim: { type: "pulse", min: 0.45, max: 1, speed: 2.4 } },
    ],
  };
}

/** Changing-room bench: varnished slats on a steel U-frame. */
function bench() {
  const w = 150;
  const d = 36;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -45;
  let s = shadow(2, -6, 88, 14);
  // Rear legs (seen through the gap), then front legs.
  for (const lx of [x + 12, x + w - 18]) {
    s += rect(lx + dx * 0.85, zy(top + 6, d * 0.85), 5, -top - 6, "url(#dkS)", 0.8);
  }
  for (const lx of [x + 12, x + w - 18]) {
    s += block(lx, top + 6, 5, -top - 6, 4, "dk", { top: false, hi: 0.2 });
    s += rect(lx - 3, -2, 11, 2.5, "#1a1f26", 0.6, 1);
  }
  s += block(x + 12, top + 10, w - 24, 3.5, d * 0.85, "dk", { hi: 0 });
  // Seat: three slats across the depth.
  for (let i = 2; i >= 0; i--) {
    const z = (i * d) / 3;
    const [sx, sy] = pj(x, top, z);
    s += block(sx, sy, w, 5, d / 3 - 1.5, "wd", { side: true, hi: i === 0 ? 0.35 : 0 });
  }
  // Wood grain on the front slat and screw heads.
  s += line(`M${f(x + 8)},${top + 2}h40M${f(x + 70)},${top + 3}h52`, "#3a2806", 0.4, 0.45);
  for (const lx of [x + 14.5, x + w - 15.5]) s += ell(lx, top + 2.5, 0.9, 0.9, "#1a1206");
  s += rim(`M${f(x + w + d * OX)},${f(zy(top, d) + 1)}v4`, 0.45);
  return { box: [-90, -66, 180, 76], layers: [{ markup: `<g>${s}</g>` }] };
}

/**
 * Timber cargo crate with iron corner brackets and a smaller box stacked on
 * top. Warmer and taller than the olive ammo crate, so a room using both still
 * reads as two different objects.
 */
function crate() {
  const w = 76;
  const h = 62;
  const d = 50;
  const x = -(w + d * OX) / 2;
  const y = -h;
  let s = shadow(2, -6, 56, 15);
  s += block(x, y, w, h, d, "wd");
  // Plank seams across the front face.
  for (let i = 1; i < 3; i++) {
    s += line(`M${f(x + 1)},${f(y + (h * i) / 3)}h${f(w - 2)}`, "#5f4410", 0.7, 0.55);
  }
  // Diagonal brace, the way a shipping crate is actually built.
  s += line(`M${f(x + 3)},${f(y + h - 3)}L${f(x + w - 3)},${f(y + 3)}`, "#6d4d12", 1.1, 0.5);
  s += line(`M${f(x + 4)},${f(y + h - 4)}L${f(x + w - 4)},${f(y + 4)}`, "#d9a94a", 0.5, 0.3);
  // Iron corner brackets.
  for (const cx of [x, x + w - 8]) {
    s += rect(cx, y, 8, 8, "url(#dkF)", 0.6) + rect(cx, y + h - 8, 8, 8, "url(#dkF)", 0.6);
  }
  // Painted handling chevrons on the side face.
  const [gx, gy] = pj(x + w, y + 20, d * 0.45);
  s += line(`M${f(gx - 5)},${f(gy)}l5,-6l5,6`, "#c8532c", 1.6, 0.75);
  s += line(`M${f(gx - 5)},${f(gy + 7)}l5,-6l5,6`, "#c8532c", 1.6, 0.55);

  // Stacked box — a second, smaller crate sitting on the lid.
  const tw = 44;
  const th = 30;
  const td = 30;
  const tx = x + 10;
  const ty = zy(y, d * 0.5) - th;
  s += block(tx, ty, tw, th, td, "lm");
  s += line(`M${f(tx + 1)},${f(ty + th / 2)}h${f(tw - 2)}`, "#6b5c4a", 0.6, 0.5);
  s += rim(`M${f(tx + tw + td * OX)},${f(zy(ty, td) + 1)}V${f(zy(ty + th, td))}`, 0.3);
  return { box: [-60, -104, 122, 112], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Hex dumbbell head seen end-on, with the back head peeking out in depth. */
function hexHead(cx, cy, r) {
  const hex = (ox, oy, rr) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return [ox + Math.cos(a) * rr, oy + Math.sin(a) * rr];
  });
  const [bx, by] = pj(cx, cy, r * 1.4);
  return (
    poly(hex(bx, by, r * 0.96), "url(#rubber)", 0.8) +
    poly(hex(cx, cy, r), "url(#dkF)", 1) +
    poly(hex(cx, cy, r * 0.62), "url(#dkT)", 0, ` opacity=".35"`) +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.28)}" fill="url(#chrome)" stroke="${INK}" stroke-width=".5"/>`
  );
}

/** Three-tier gym dumbbell rack, heavy weights low. */
function weightRack() {
  const w = 110;
  const d = 50;
  const x = -(w + d * OX) / 2;
  let s = shadow(4, -8, 70, 16);
  // Rear uprights, shelves (sloped back), then front uprights.
  for (const ux of [x, x + w - 6]) s += rect(ux + d * OX, zy(-118, d), 6, zy(0, d) - zy(-118, d), "url(#dkS)", 0.8);
  const tiers = [[-22, 9.5, 5], [-58, 8, 6], [-92, 6.5, 7]];
  for (const [ty, r, n] of tiers) {
    s += block(x + 3, ty, w - 6, 3, d, "dk", { hi: 0.2 });
    const gap = (w - 22) / n;
    for (let i = 0; i < n; i++) s += hexHead(x + 6 + gap * (i + 0.5) + d * OX * 0.2, zy(ty - r * 0.95, d * 0.2), r);
  }
  for (const ux of [x, x + w - 6]) {
    s += block(ux, -122, 6, 122, 6, "dk", { hi: 0.25 });
    s += rect(ux - 3, -3, 12, 3, "#1a1f26", 0.6, 1);
  }
  s += rect(x - 1, -126, w + 2, 6, "url(#stF)", 0.9, 1);
  s += rim(`M${f(x + w + d * OX)},${f(zy(-118, d))}V${f(zy(-6, d))}`, 0.3);
  return { box: [-70, -142, 142, 150], layers: [{ markup: `<g>${s}</g>` }] };
}

/** A pair of hex dumbbells lying on the floor. */
function dumbbell() {
  // Lying along x: round rubber plates seen edge-on, outer end face visible.
  const bell = (cx, by, len, r) => {
    const hw = 9;
    const cy = by - r;
    let s = rect(cx - len / 2 + hw - 1, cy - 2, len - hw * 2 + 2, 4, "url(#chromeV)", 0.7, 1.5);
    for (const [hx, end] of [[cx - len / 2, -1], [cx + len / 2 - hw, 1]]) {
      if (end > 0) s += ell(hx + hw, cy, 3.2, r, "#15181c", 0.8);
      s += rect(hx, cy - r, hw, r * 2, "url(#rubberV)", 1, 2.5);
      s += line(`M${f(hx + 2)},${f(cy - r + 1.4)}h${hw - 4}`, "#9aa4ae", 0.7, 0.5);
      s += line(`M${f(hx + hw * 0.5)},${f(cy - r + 1)}v${f(r * 2 - 2)}`, "#000", 0.5, 0.35);
    }
    return s;
  };
  let s = shadow(3, -3, 34, 8);
  s += bell(9, -6, 40, 7.5);
  s += bell(-5, 0, 44, 8.5);
  return { box: [-32, -30, 72, 36], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Leather heavy bag on a chain from a ceiling bracket; swings as one piece. */
function punchingBag() {
  const top = -300;
  let floor = shadow(0, -2, 34, 8, 0.8);
  let bag = rect(-14, top, 28, 5, "url(#dkF)", 0.8, 1);
  // Chain links.
  for (let yy = top + 5; yy < -186; yy += 7) {
    bag += `<ellipse cx="0" cy="${yy + 3.5}" rx="${yy % 14 < 7 ? 1.6 : 2.6}" ry="3.8" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
    bag += `<ellipse cx="0" cy="${yy + 3.5}" rx="${yy % 14 < 7 ? 1.6 : 2.6}" ry="3.8" fill="none" stroke="#9aa6b2" stroke-width="1"/>`;
  }
  bag += ell(0, -183, 3.5, 3.5, "url(#chrome)", 0.7);
  bag += line("M0,-182L-15,-162M0,-182L-5,-160M0,-182L5,-160M0,-182L15,-162", INK, 1.6, 1);
  bag += line("M0,-182L-15,-162M0,-182L15,-162", "#9aa6b2", 0.6, 0.9);
  // Body: cylinder with rounded caps.
  bag += path("M-18,-160C-18,-167 18,-167 18,-160V-52C18,-44 -18,-44 -18,-52Z", "url(#leather)", 1.2);
  bag += `<path d="M-18,-160C-18,-154 18,-154 18,-160" fill="none" stroke="${INK}" stroke-width=".7"/>`;
  bag += ell(0, -161, 18, 4, "#5a1a06", 0.7);
  bag += rect(-18, -122, 36, 13, "url(#rubber)", 0.8);
  bag += line("M-15,-117h8M-4,-117h10", "#e8e0d0", 1.6, 0.65);
  bag += line("M-17.6,-150C-10,-152 10,-152 17.6,-150M-17.6,-72C-10,-70 10,-70 17.6,-72", "#2a0800", 0.5, 0.6);
  bag += line("M-9,-156V-54", "#ff9a70", 1.6, 0.25);
  bag += rim("M17.4,-158V-54", 0.35);
  bag += `<path d="M-18,-52C-18,-44 18,-44 18,-52" fill="none" stroke="#000" stroke-width="2" stroke-opacity=".35"/>`;
  return {
    box: [-40, -306, 80, 314],
    layers: [
      { markup: `<g>${floor}</g>` },
      { markup: `<g>${bag}</g>`, anim: { type: "sway", amp: 0.028, speed: 1.5, pivot: [0, top] } },
    ],
  };
}

/** Office desk: walnut top, drawer pedestal, papers, mug and a closed laptop. */
function desk() {
  const w = 140;
  const d = 70;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -76;
  let s = shadow(6, -12, 92, 24);
  // Back modesty panel and right leg panel.
  s += rect(x + 46 + dx * 0.7, zy(top + 4, d * 0.7), w - 52, 40, "url(#wnS)", 0.8);
  s += block(x + w - 5, top + 4, 5, -top - 4, d - 4, "wn", { top: false, hi: 0.2 });
  // Pedestal with three drawers.
  s += block(x + 2, top + 4, 42, -top - 4, d - 4, "wn", { top: false });
  for (let i = 0; i < 3; i++) {
    const yy = top + 8 + i * 23;
    s += rect(x + 5, yy, 36, 20, "url(#wnF)", 0.6, 0.8);
    s += rect(x + 16, yy + 8, 14, 2.4, "url(#chrome)", 0.5, 1);
  }
  s += rect(x + 2, top + 4, 42, 5, "url(#ao)", 0);
  // Top slab.
  s += block(x, top, w, 4, d, "wn", { hi: 0.4 });
  // Items on the top, placed by depth.
  const at = (px, z) => pj(x + px, top, z);
  let [px, py] = at(20, 30);
  s += poly([[px, py], [px + 30, py - 2], [px + 42, py - 10], [px + 12, py - 8]], "#e8ecef", 0.6);
  s += poly([[px + 2, py - 2], [px + 32, py - 4], [px + 43, py - 12], [px + 13, py - 10]], "#f7f9fb", 0.6);
  s += line(`M${f(px + 10)},${f(py - 5)}l18,-1M${f(px + 12)},${f(py - 7)}l20,-1.5`, "#6a7a88", 0.4, 0.6);
  [px, py] = at(78, 22);
  s += block(px, py - 2.5, 40, 2.5, 30, "dk", { hi: 0.3 });
  [px, py] = at(124, 12);
  s += path(`M${f(px - 5)},${f(py - 14)}V${f(py - 1)}C${f(px - 5)},${f(py + 1)} ${f(px + 5)},${f(py + 1)} ${f(px + 5)},${f(py - 1)}V${f(py - 14)}Z`, "url(#chrome)", 0.8);
  s += ell(px, py - 14, 5, 1.5, "#2a1a10", 0.6);
  s += `<path d="M${f(px + 5)},${f(py - 11)}c4,0 4,7 0,7" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}v3`, 0.5);
  const [lx, ly] = at(98, 36);
  return {
    box: [-94, -104, 188, 112],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: lamp(lx, ly - 2.8, 0.9, "#22e6ff", "#d8fdff"), shade: false, blend: "lighter", anim: { type: "pulse", min: 0.2, max: 1, speed: 1.6 } },
    ],
  };
}

/** Break-room table: laminate top on four steel tube legs, paper cup. */
function table() {
  const w = 110;
  const d = 75;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -74;
  let s = shadow(8, -10, 76, 24);
  const legs = [[x + 5, d - 6], [x + w - 10, d - 6], [x + 5, 2], [x + w - 10, 2]];
  for (const [lx, z] of legs) {
    const [px, py] = pj(lx, top, z);
    s += rect(px, py + 4, 4.5, -top - 4, z > 10 ? "url(#dkS)" : "url(#pipe)", 0.8);
    s += rect(px - 1.5, py - top - 2, 7.5, 2.5, "#15191e", 0.5, 1);
  }
  s += block(x + 4, top + 4, w - 8, 5, d - 6, "dk", { top: false, hi: 0 });
  s += block(x, top, w, 4.5, d, "lm", { hi: 0.45 });
  // Paper cup and napkin holder.
  const [cx, cy] = pj(x + 30, top, 30);
  s += path(`M${f(cx - 3.5)},${f(cy - 11)}L${f(cx - 2.6)},${f(cy)}H${f(cx + 2.6)}L${f(cx + 3.5)},${f(cy - 11)}Z`, "#f2efe6", 0.6);
  s += rect(cx - 3.5, cy - 8, 7, 3, "#c0392b", 0);
  const [nx, ny] = pj(x + 70, top, 40);
  s += block(nx, ny - 9, 12, 9, 6, "st", { hi: 0.3 });
  s += rect(nx + 1.5, ny - 12, 9, 4, "#fdfdfb", 0.5);
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}v3.5`, 0.5);
  return { box: [-80, -104, 164, 114], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Office swivel chair: padded seat at knee height, mesh back, star base. */
function chair() {
  const sw = 48;
  const d = 44;
  const dx = d * OX;
  const x = -(sw + dx) / 2;
  const seat = -48;
  let s = shadow(4, -6, 36, 12);
  // Backrest behind the seat.
  const [bx, by] = pj(x + 2, seat - 2, d - 4);
  // J-bar from under the seat up the back of the backrest.
  const [jx, jy] = pj(x + sw / 2, seat + 8, d * 0.5);
  s += path(`M${f(jx - 2)},${f(jy)}L${f(bx + sw / 2 + 4)},${f(by + 2)}V${f(by - 20)}h-6V${f(by - 3)}L${f(jx - 6)},${f(jy - 4)}Z`, "url(#pipe)", 0.8);
  s += path(`M${f(bx)},${f(by - 6)}C${f(bx - 2)},${f(by - 30)} ${f(bx)},${f(by - 48)} ${f(bx + 6)},${f(by - 52)}H${f(bx + sw - 10)}C${f(bx + sw - 4)},${f(by - 48)} ${f(bx + sw - 2)},${f(by - 30)} ${f(bx + sw - 4)},${f(by - 6)}Z`, "url(#fbF)", 1.1);
  s += path(`M${f(bx + 5)},${f(by - 12)}C${f(bx + 4)},${f(by - 30)} ${f(bx + 6)},${f(by - 42)} ${f(bx + 10)},${f(by - 46)}H${f(bx + sw - 14)}C${f(bx + sw - 10)},${f(by - 42)} ${f(bx + sw - 8)},${f(by - 30)} ${f(bx + sw - 9)},${f(by - 12)}Z`, "none", 0.5, ` stroke-opacity=".6"`);
  s += line(`M${f(bx + 7)},${f(by - 44)}C${f(bx + 4)},${f(by - 32)} ${f(bx + 5)},${f(by - 20)} ${f(bx + 6)},${f(by - 10)}`, "#9a9ab8", 1, 0.35);
  s += rim(`M${f(bx + sw - 4.5)},${f(by - 44)}C${f(bx + sw - 2.5)},${f(by - 30)} ${f(bx + sw - 2.8)},${f(by - 18)} ${f(bx + sw - 4.5)},${f(by - 8)}`, 0.4);
  // Star base with casters and gas lift.
  const [cx, cy] = pj(x + sw / 2, 0, d / 2);
  const liftTop = zy(seat + 6, d / 2);
  s += rect(cx - 2.5, liftTop, 5, cy - 4 - liftTop, "url(#chrome)", 0.8);
  for (const [lx, ly] of [[-26, 2], [26, 1], [-14, -9], [16, -10], [0, 5]]) {
    s += line(`M${f(cx)},${f(cy - 4)}L${f(cx + lx)},${f(cy + ly - 2)}`, INK, 4.6, 1);
    s += line(`M${f(cx)},${f(cy - 4)}L${f(cx + lx)},${f(cy + ly - 2)}`, "#2b3139", 2.6, 1);
    s += ell(cx + lx, cy + ly, 2.6, 2.4, "url(#rubber)", 0.6);
  }
  // Seat cushion.
  s += block(x, seat, sw, 8, d, "fb", { rx: 0, hi: 0.3 });
  s += rect(x, seat, sw, 8, "url(#vert)", 0);
  return { box: [-40, -118, 88, 126], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Blue snack/drink vending machine with lit glass front and blinking status LED. */
function vendingMachine() {
  const w = 88;
  const h = 183;
  const d = 72;
  const x = -(w + d * OX) / 2;
  const y = -h;
  let s = shadow(8, -10, 64, 20);
  s += block(x, y, w, h, d, "bv", { top: false });
  // Lightbox header.
  s += rect(x + 4, y + 4, w - 8, 14, "#0c1a48", 0.7, 1);
  s += rect(x + 8, y + 7, 30, 8, "#e8eefc", 0, 1.5);
  s += rect(x + 10, y + 9, 12, 4, "#d02030", 0, 1);
  // Glass window and shelves of product.
  const gx = x + 5;
  const gy = y + 22;
  const gw = 56;
  const gh = 104;
  s += rect(gx, gy, gw, gh, "#0a1430", 1.1, 1);
  const colors = ["#ff4444", "#44ff44", "#ffaa00", "#e8e8f0", "#44aaff"];
  for (let r = 0; r < 4; r++) {
    const sy = gy + 24 + r * 25;
    for (let c = 0; c < 5; c++) {
      const px = gx + 5 + c * 10.4;
      const col = colors[(r * 2 + c) % 5];
      if (r % 2 === 0) {
        s += rect(px, sy - 15, 8, 15, col, 0.5, 1.2);
        s += rect(px + 1.2, sy - 13, 2, 11, "#fff", 0, 0, ` opacity=".45"`);
        s += rect(px, sy - 15, 8, 3, "#c9d2da", 0.3, 1);
      } else {
        s += path(`M${f(px - 0.5)},${f(sy - 16)}h9l-0.8,16h-7.4Z`, col, 0.5);
        s += rect(px + 1, sy - 11, 6, 4, "#fff", 0, 0, ` opacity=".55"`);
      }
    }
    s += rect(gx + 1, sy, gw - 2, 2.2, "#8a96a2", 0.4);
    s += line(`M${f(gx + 3)},${f(sy + 3.8)}h${gw - 6}`, "#c8d4de", 0.6, 0.35);
  }
  // Keypad column.
  const kx = x + 66;
  s += rect(kx, gy, 17, 22, "#081020", 0.7, 1);
  s += rect(kx + 2, gy + 3, 13, 6, "#3a0a0a", 0.4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += rect(kx + 2.2 + c * 4.4, gy + 28 + r * 5, 3.4, 3.6, "url(#chrome)", 0.4, 0.6);
  s += rect(kx + 5, gy + 52, 7, 12, "#070b16", 0.5, 1);
  s += line(`M${f(kx + 8.5)},${f(gy + 55)}v6`, "#9aa6b2", 0.9, 1);
  s += rect(kx + 3, gy + 72, 11, 22, "url(#dkF)", 0.5, 1);
  // Dispenser flap.
  s += rect(x + 8, -48, 52, 20, "#070b16", 0.9, 1.5);
  s += rect(x + 10, -46, 48, 8, "url(#dkT)", 0.5, 1);
  s += rect(x, -14, w, 14, "url(#bvS)", 0.8);
  // Glass reflection streaks on top of everything.
  s += `<path d="M${f(gx + 8)},${f(gy)}l-8,26v14l22,-40ZM${f(gx + 30)},${f(gy)}l-30,56v8l35,-64Z" fill="#fff" opacity=".1"/>`;
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 2)}V${f(zy(-2, d))}`, 0.4);
  let glow = rect(gx + 1, gy + 1, gw - 2, gh - 2, "#bfe2ff", 0, 0, ` opacity=".16"`);
  glow += `<rect x="${f(gx)}" y="${f(gy)}" width="${gw}" height="${gh}" fill="#8fd0ff" opacity=".35" filter="url(#soft)"/>`;
  glow += rect(x + 8, y + 7, 30, 8, "#ffffff", 0, 1.5, ` opacity=".35"`);
  glow += rect(kx + 2, gy + 3, 13, 6, "#ff3344", 0, 0, ` opacity=".6"`);
  return {
    box: [-66, -212, 134, 224],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.65, max: 1, speed: 1.8 } },
      { markup: lamp(kx + 13, y + 11, 1.5, "#00ff44", "#d8ffe0"), shade: false, blend: "lighter", anim: { type: "blink", min: 0.3, max: 0.9, speed: 5 } },
    ],
  };
}

/** Terracotta planter with arching palm fronds in two swaying layers. */
function pottedPlant() {
  const rimY = -44;
  let pot = shadow(2, -3, 34, 9);
  pot += path(`M-22,${rimY}L-16,-2C-15,0 15,0 16,-2L22,${rimY}Z`, "url(#tcF)", 1.1);
  pot += path(`M-22,${rimY}L-16,-2C-15,0 15,0 16,-2L22,${rimY}Z`, "url(#vert)", 0);
  pot += line(`M-17,${rimY + 6}L-12.5,-5`, "#f0a070", 1.2, 0.35);
  pot += rect(-25, rimY - 7, 50, 8, "url(#tcF)", 1.1, 1.5);
  pot += line(`M-24,${rimY - 6}h47`, "#f0a070", 0.6, 0.45);
  pot += rect(-22, rimY + 1, 44, 4, "url(#ao)", 0);
  pot += ell(0, rimY - 6.5, 21, 2.6, "#2a1a0c", 0.6);
  pot += rim(`M24.5,${rimY - 5}v4M21.4,${rimY + 2}L15.6,-3`, 0.35);
  const base = rimY - 6;
  const back = [[-62, 72, 7, 0.28], [-28, 86, 6, 0.12], [22, 84, 6, 0.12], [58, 70, 7, 0.3]]
    .map(([a, l, wd, b]) => leaf(0, base, a, l, wd, b, "url(#leafB)")).join("");
  const front = [[-78, 58, 7, 0.45], [-44, 76, 7.5, 0.2], [-8, 90, 6.5, 0.05], [34, 78, 7.5, 0.2], [74, 60, 7, 0.45]]
    .map(([a, l, wd, b]) => leaf(0, base, a, l, wd, b, "url(#leafA)")).join("");
  return {
    box: [-82, -150, 164, 158],
    layers: [
      { markup: `<g>${back}</g>`, anim: { type: "sway", amp: 0.03, speed: 1, pivot: [0, base] } },
      { markup: `<g>${pot}</g>` },
      { markup: `<g>${front}</g>`, anim: { type: "sway", amp: 0.045, speed: 1.25, pivot: [0, base], phase: 0.8 } },
    ],
  };
}

export const BUILDERS = {
  locker,
  bench,
  crate,
  weight_rack: weightRack,
  dumbbell,
  punching_bag: punchingBag,
  desk,
  table,
  chair,
  vending_machine: vendingMachine,
  potted_plant: pottedPlant,
};

export const PROP_DEFS = DEFS;
export const PROP_SPRITES = buildSet(BUILDERS);

let real = null;
/** Realistic set, built on first Modern-style draw. */
export const realisticProps = () => real || (real = buildRealisticSet(BUILDERS));
