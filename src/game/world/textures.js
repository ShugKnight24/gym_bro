/**
 * Procedural gym textures, painted once per art style into canvases the
 * raycaster bakes fog into. Walls are 128×192 (one 2 m × 3 m cell face, so
 * 64 px per metre), floors and ceilings 128×128 per cell (the same density).
 *
 * Comic: flat cel colours, ink seams and a highlight lip on every block.
 * Modern: the same layout painted: soft gradients, grain, occlusion at the
 * floor and ceiling lines, no ink.
 */

import { WALL, FLOOR, CEIL } from "./map.js";
import { SeededRNG } from "../../engine/seeded-rng.js";

const TW = 128;
const TH = 192;
const FS = 128;
const M = 64; // px per metre on walls
const INK = "#04060b";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Fine value noise over a region (Modern grain, Comic speckle). */
function grain(g, x, y, w, h, amt, seed, size = 1) {
  const r = new SeededRNG(seed);
  for (let yy = y; yy < y + h; yy += size) {
    for (let xx = x; xx < x + w; xx += size) {
      const v = r.next() - 0.5;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${(v * amt).toFixed(3)})` : `rgba(0,0,0,${(-v * amt).toFixed(3)})`;
      g.fillRect(xx, yy, size, size);
    }
  }
}

/** Vertical light falloff: occlusion under the ceiling and at the floor line. */
function occlusion(g, w, h, top = 0.35, bot = 0.45) {
  let gr = g.createLinearGradient(0, 0, 0, h * 0.18);
  gr.addColorStop(0, `rgba(0,0,0,${top})`);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h * 0.18);
  gr = g.createLinearGradient(0, h * 0.86, 0, h);
  gr.addColorStop(0, "rgba(0,0,0,0)");
  gr.addColorStop(1, `rgba(0,0,0,${bot})`);
  g.fillStyle = gr;
  g.fillRect(0, h * 0.86, w, h * 0.14);
}

/**
 * Painted cinderblock: light upper wall, a red/yellow gym stripe at ~1.1 m,
 * a dark dado below and a rubber baseboard.
 */
function block(g, modern, seed = 1) {
  const r = new SeededRNG(seed);
  const upper = modern ? "#b9b6ae" : "#c9d2dc";
  const dado = modern ? "#3c3f45" : "#34405a";
  const bh = 12.8;
  const bw = 25.6;
  const stripeY = TH - M * 1.15;
  g.fillStyle = upper;
  g.fillRect(0, 0, TW, stripeY);
  g.fillStyle = dado;
  g.fillRect(0, stripeY, TW, TH - stripeY);
  // Blocks, running bond.
  for (let row = 0; row * bh < TH; row++) {
    const y = row * bh;
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -off; x < TW; x += bw) {
      const tone = (r.next() - 0.5) * (modern ? 0.07 : 0.05);
      g.fillStyle = tone > 0 ? `rgba(255,255,255,${tone})` : `rgba(0,0,0,${-tone})`;
      g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      if (!modern) {
        g.fillStyle = "rgba(255,255,255,0.28)";
        g.fillRect(x + 1.5, y + 1.2, bw - 3, 1);
      } else {
        const gr = g.createLinearGradient(0, y, 0, y + bh);
        gr.addColorStop(0, "rgba(255,255,255,0.08)");
        gr.addColorStop(1, "rgba(0,0,0,0.1)");
        g.fillStyle = gr;
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
    }
    g.fillStyle = modern ? "rgba(40,36,30,0.35)" : "rgba(20,26,38,0.75)";
    g.fillRect(0, y, TW, modern ? 1 : 1.3);
    for (let x = -off; x < TW; x += bw) g.fillRect(x, y, modern ? 1 : 1.3, bh);
  }
  // Gym stripe.
  g.fillStyle = modern ? "#9c3a2e" : "#e2362b";
  g.fillRect(0, stripeY - 9, TW, 9);
  g.fillStyle = modern ? "#c9a24a" : "#ffd23a";
  g.fillRect(0, stripeY - 13, TW, 3);
  if (!modern) {
    g.fillStyle = INK;
    g.fillRect(0, stripeY - 14, TW, 1.5);
    g.fillRect(0, stripeY - 10, TW, 1.2);
    g.fillRect(0, stripeY, TW, 1.5);
  }
  // Rubber baseboard.
  g.fillStyle = modern ? "#1d1e21" : "#161a22";
  g.fillRect(0, TH - 7, TW, 7);
  if (!modern) {
    g.fillStyle = INK;
    g.fillRect(0, TH - 8, TW, 1.5);
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.fillRect(0, TH - 6, TW, 1);
  }
  if (modern) {
    grain(g, 0, 0, TW, TH, 0.09, seed + 7);
    occlusion(g, TW, TH);
  }
}

function inkRect(g, x, y, w, h, fill, modern, lw = 2) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (!modern) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
}

/** Mirror: a chrome-framed glass panel, transparent so the reflection shows through. */
function mirror(g, modern) {
  block(g, modern, 3);
  const top = 10;
  const bot = TH - M * 0.55;
  g.clearRect(2, top, TW - 4, bot - top);
  // Glass: a faint cool tint and two diagonal streaks.
  g.fillStyle = modern ? "rgba(190,205,215,0.12)" : "rgba(200,230,255,0.14)";
  g.fillRect(2, top, TW - 4, bot - top);
  g.save();
  g.beginPath();
  g.rect(2, top, TW - 4, bot - top);
  g.clip();
  g.fillStyle = modern ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)";
  g.beginPath();
  g.moveTo(20, top);
  g.lineTo(44, top);
  g.lineTo(0, top + 90);
  g.lineTo(0, top + 50);
  g.fill();
  g.beginPath();
  g.moveTo(70, top);
  g.lineTo(78, top);
  g.lineTo(24, bot);
  g.lineTo(16, bot);
  g.fill();
  g.restore();
  // Chrome frame and the seam between panels.
  const chrome = g.createLinearGradient(0, 0, 0, 4);
  chrome.addColorStop(0, "#f1f5f8");
  chrome.addColorStop(1, "#6b7886");
  g.fillStyle = modern ? "#9aa0a4" : "#dfe7ee";
  g.fillRect(0, top - 3, TW, 3);
  g.fillRect(0, bot, TW, 4);
  g.fillRect(0, top, 2, bot - top);
  g.fillRect(TW - 2, top, 2, bot - top);
  if (!modern) {
    g.fillStyle = INK;
    g.fillRect(0, top - 4, TW, 1.2);
    g.fillRect(0, bot + 4, TW, 1.2);
    g.fillRect(2, top, 1, bot - top);
    g.fillRect(TW - 3, top, 1, bot - top);
  }
}

/** Window: a daylit street view through a mullioned frame, blinds half down. */
function windowTex(g, modern) {
  block(g, modern, 5);
  const x0 = 12;
  const x1 = TW - 12;
  const y0 = 26;
  const y1 = TH - M * 1.3;
  const sky = g.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, modern ? "#9fb6c6" : "#7fd3ff");
  sky.addColorStop(1, modern ? "#e2e0d4" : "#e9f7ff");
  g.fillStyle = sky;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Skyline across the street.
  const r = new SeededRNG(9);
  g.fillStyle = modern ? "#6d7a86" : "#4f6f94";
  for (let x = x0; x < x1; x += 10 + r.next() * 8) {
    const h = 18 + r.next() * 34;
    g.fillRect(x, y1 - h, 12, h);
    if (!modern) {
      g.fillStyle = "#ffe78a";
      for (let wy = y1 - h + 4; wy < y1 - 4; wy += 7) g.fillRect(x + 3, wy, 2, 3);
      g.fillStyle = "#4f6f94";
    }
  }
  // Blinds.
  g.fillStyle = modern ? "#d8d4ca" : "#f2eee2";
  for (let y = y0; y < y0 + 30; y += 4) g.fillRect(x0, y, x1 - x0, 3);
  if (!modern) {
    g.fillStyle = "rgba(4,6,11,0.5)";
    for (let y = y0 + 3; y < y0 + 30; y += 4) g.fillRect(x0, y, x1 - x0, 1);
  }
  // Frame and mullions.
  g.fillStyle = modern ? "#2e3034" : "#e8ecef";
  g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, 4);
  g.fillRect(x0 - 4, y1, x1 - x0 + 8, 6);
  g.fillRect(x0 - 4, y0, 4, y1 - y0);
  g.fillRect(x1, y0, 4, y1 - y0);
  g.fillRect(TW / 2 - 2, y0, 4, y1 - y0);
  if (!modern) {
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.strokeRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 10);
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath();
    g.moveTo(x0 + 8, y1);
    g.lineTo(x0 + 26, y0 + 30);
    g.lineTo(x0 + 32, y0 + 30);
    g.lineTo(x0 + 14, y1);
    g.fill();
  } else {
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(x0, y0 + 30, (x1 - x0) / 2, y1 - y0 - 30);
  }
}

/** Home door: a painted steel door with a lit EXIT/HOME sign. */
function door(g, modern) {
  block(g, modern, 4);
  const dw = M * 1.05;
  const x0 = (TW - dw) / 2;
  const y0 = TH - M * 2.15;
  inkRect(g, x0 - 3, y0 - 3, dw + 6, TH - y0 + 3, modern ? "#55585d" : "#1b2230", modern, 2.5);
  const gr = g.createLinearGradient(x0, 0, x0 + dw, 0);
  gr.addColorStop(0, modern ? "#6a4a33" : "#d0823a");
  gr.addColorStop(1, modern ? "#4d3525" : "#9b5420");
  g.fillStyle = gr;
  g.fillRect(x0, y0, dw, TH - y0);
  if (!modern) {
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    g.strokeRect(x0 + 6, y0 + 8, dw - 12, 44);
    g.strokeRect(x0 + 6, y0 + 60, dw - 12, 60);
  } else {
    g.fillStyle = "rgba(0,0,0,0.15)";
    g.fillRect(x0 + 6, y0 + 8, dw - 12, 44);
    g.fillRect(x0 + 6, y0 + 60, dw - 12, 60);
  }
  inkRect(g, x0 + dw - 12, y0 + 64, 6, 14, modern ? "#b9bdc0" : "#eef3f7", modern, 1.2);
  // Sign.
  inkRect(g, TW / 2 - 22, y0 - 20, 44, 13, modern ? "#1f3b2a" : "#0b3d1e", modern, 1.5);
  g.fillStyle = modern ? "#8fd6a4" : "#5dff8a";
  g.font = "bold 10px Impact, 'Arial Black', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("HOME", TW / 2, y0 - 13);
}

/** Street entrance: glass double doors, daylight and an OPEN sign. */
function entrance(g, modern) {
  block(g, modern, 6);
  const x0 = 8;
  const x1 = TW - 8;
  const y0 = TH - M * 2.3;
  const sky = g.createLinearGradient(0, y0, 0, TH);
  sky.addColorStop(0, modern ? "#c8d2d6" : "#bff0ff");
  sky.addColorStop(1, modern ? "#9a9c98" : "#8fb3c9");
  g.fillStyle = sky;
  g.fillRect(x0, y0, x1 - x0, TH - y0);
  g.fillStyle = modern ? "#44484c" : "#dfe6ec";
  g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, 5);
  g.fillRect(x0 - 4, y0, 5, TH - y0);
  g.fillRect(x1 - 1, y0, 5, TH - y0);
  g.fillRect(TW / 2 - 2, y0, 4, TH - y0);
  g.fillRect(x0, TH - 12, x1 - x0, 12);
  if (!modern) {
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.strokeRect(x0 - 4, y0 - 4, x1 - x0 + 8, TH - y0 + 4);
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.fillRect(x0 + 10, y0 + 6, 5, 60);
    g.fillRect(TW / 2 + 10, y0 + 6, 5, 60);
  }
  inkRect(g, TW / 2 + 12, y0 + 20, 28, 12, modern ? "#6b2a24" : "#ff2a4a", modern, 1.5);
  g.fillStyle = "#fff";
  g.font = "bold 9px Impact, 'Arial Black', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("OPEN", TW / 2 + 26, y0 + 26.5);
}

/** Painted mural wall: big comic letters across two cells. */
function mural(g, modern, text) {
  block(g, modern, 8);
  g.fillStyle = modern ? "#7c2f28" : "#c8292c";
  g.fillRect(0, 14, TW, 100);
  if (!modern) {
    g.fillStyle = INK;
    g.fillRect(0, 13, TW, 2);
    g.fillRect(0, 113, TW, 2);
    // Halftone dots.
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 18; y < 112; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < TW; x += 6) g.fillRect(x, y, 2, 2);
  }
  // Fit each half inside its own cell, hugging the seam, so no letter is
  // cut where the two wall faces meet.
  let px = 74;
  g.font = `italic 900 ${px}px Impact, 'Arial Black', sans-serif`;
  const fit = TW - 18;
  const wText = g.measureText(text).width;
  if (wText > fit) {
    px = Math.floor((px * fit) / wText);
    g.font = `italic 900 ${px}px Impact, 'Arial Black', sans-serif`;
  }
  g.textAlign = text === "GYM" ? "right" : "left";
  g.textBaseline = "middle";
  const cx = text === "GYM" ? TW - 5 : 5;
  if (!modern) {
    g.lineJoin = "round";
    g.lineWidth = 10;
    g.strokeStyle = INK;
    g.strokeText(text, cx + 3, 68);
    g.strokeText(text, cx, 64);
  }
  g.fillStyle = modern ? "#e3c682" : "#ffd23a";
  g.fillText(text, cx, 64);
  if (!modern) {
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.save();
    g.beginPath();
    g.rect(0, 30, TW, 18);
    g.clip();
    g.fillText(text, cx, 64);
    g.restore();
  }
}

/** Cinderblock with a motivational poster. */
function poster(g, modern) {
  block(g, modern, 7);
  const x0 = 34;
  const y0 = 22;
  const w = 60;
  const h = 80;
  inkRect(g, x0, y0, w, h, modern ? "#23262b" : "#1b2440", modern, 2.5);
  g.fillStyle = modern ? "#a0453a" : "#ff2a4a";
  g.beginPath();
  g.arc(x0 + w / 2, y0 + 34, 20, 0, Math.PI * 2);
  g.fill();
  // Flexing silhouette.
  g.fillStyle = modern ? "#e2d6c0" : "#f3e9cf";
  g.beginPath();
  g.arc(x0 + w / 2, y0 + 20, 5, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x0 + w / 2 - 7, y0 + 26, 14, 20);
  g.fillRect(x0 + w / 2 - 20, y0 + 26, 13, 5);
  g.fillRect(x0 + w / 2 + 7, y0 + 26, 13, 5);
  g.fillRect(x0 + w / 2 - 20, y0 + 16, 5, 12);
  g.fillRect(x0 + w / 2 + 15, y0 + 16, 5, 12);
  g.font = "900 11px Impact, 'Arial Black', sans-serif";
  g.textAlign = "center";
  g.fillStyle = modern ? "#e2d6c0" : "#ffd23a";
  g.fillText("NO PAIN", x0 + w / 2, y0 + 64);
  g.fillText("NO GAIN", x0 + w / 2, y0 + 75);
}

/** Rubber gym mat: 1 m tiles with coloured flecks. */
function mat(g, modern) {
  const h = FS / 2;
  g.fillStyle = modern ? "#2a2b2e" : "#2b3140";
  g.fillRect(0, 0, FS, FS);
  // Flecks: small and close to the base tone, so distance averages them out
  // instead of sparkling.
  const r = new SeededRNG(21);
  for (let i = 0; i < 900; i++) {
    const c = r.next();
    g.fillStyle = modern
      ? c < 0.5 ? "rgba(96,98,102,0.45)" : "rgba(12,12,14,0.45)"
      : c < 0.3 ? "rgba(84,132,196,0.7)" : c < 0.6 ? "rgba(120,130,150,0.6)" : "rgba(20,24,34,0.7)";
    const s = r.next() < 0.2 ? 2 : 1;
    g.fillRect((r.next() * FS) | 0, (r.next() * FS) | 0, s, s);
  }
  // Tile seams with a soft lip on the far side.
  g.fillStyle = modern ? "rgba(0,0,0,0.45)" : "rgba(4,6,11,0.85)";
  g.fillRect(0, 0, FS, 2);
  g.fillRect(0, h, FS, 2);
  g.fillRect(0, 0, 2, FS);
  g.fillRect(h, 0, 2, FS);
  g.fillStyle = modern ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)";
  g.fillRect(2, 2, FS, 1);
  g.fillRect(2, h + 2, FS, 1);
  g.fillRect(2, 2, 1, FS);
  g.fillRect(h + 2, 2, 1, FS);
  if (modern) grain(g, 0, 0, FS, FS, 0.06, 23, 2);
}

/** Lobby vinyl: a two-tone checkerboard. */
function lobby(g, modern) {
  const t = FS / 4;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? (modern ? "#3b3a38" : "#28324a") : (modern ? "#cfc8b8" : "#e4dbc4");
      g.fillRect(x * t, y * t, t, t);
    }
  }
  if (modern) grain(g, 0, 0, FS, FS, 0.08, 31, 2);
  else {
    g.fillStyle = "rgba(4,6,11,0.45)";
    for (let i = 0; i <= 4; i++) {
      g.fillRect(i * t - 1, 0, 2, FS);
      g.fillRect(0, i * t - 1, FS, 2);
    }
  }
}

/** Acoustic ceiling tiles on a T-bar grid; `light` adds an LED panel. */
function ceiling(g, modern, light) {
  const h = FS / 2;
  // A shade darker than the walls, so the ceiling recedes and the lamps pop.
  g.fillStyle = modern ? "#7c7a75" : "#8797ac";
  g.fillRect(0, 0, FS, FS);
  const r = new SeededRNG(light ? 41 : 43);
  g.fillStyle = "rgba(0,0,0,0.1)";
  for (let i = 0; i < 500; i++) g.fillRect((r.next() * FS) | 0, (r.next() * FS) | 0, 1, 1);
  // T-bar grid: a lit edge beside a shadowed one reads as metal, not ink.
  g.fillStyle = modern ? "rgba(40,38,34,0.45)" : "rgba(40,50,66,0.8)";
  for (const p of [0, h]) {
    g.fillRect(0, p, FS, 2);
    g.fillRect(p, 0, 2, FS);
  }
  g.fillStyle = modern ? "rgba(255,250,240,0.12)" : "rgba(255,255,255,0.18)";
  for (const p of [0, h]) {
    g.fillRect(0, p + 2, FS, 1);
    g.fillRect(p + 2, 0, 1, FS);
  }
  if (light) {
    const a = FS / 8;
    const b = FS * 3 / 16;
    g.fillStyle = modern ? "rgba(255,244,220,0.3)" : "rgba(255,255,230,0.45)";
    g.fillRect(a, a, FS - 2 * a, FS - 2 * a);
    g.fillStyle = modern ? "#fff8ea" : "#ffffff";
    g.fillRect(b, b, FS - 2 * b, FS - 2 * b);
    if (!modern) {
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.strokeRect(b, b, FS - 2 * b, FS - 2 * b);
    }
  }
  if (modern) grain(g, 0, 0, FS, FS, 0.05, 47, 2);
}

/** All textures for a style: { walls, floors, ceils, reflective } indexed by the map ids. */
export function buildTextures(modern) {
  const paint = (w, h, fn) => {
    const c = canvas(w, h);
    fn(c.getContext("2d"));
    return c;
  };
  const walls = [];
  walls[WALL.BLOCK] = paint(TW, TH, (g) => block(g, modern));
  walls[WALL.MIRROR] = paint(TW, TH, (g) => mirror(g, modern));
  walls[WALL.WINDOW] = paint(TW, TH, (g) => windowTex(g, modern));
  walls[WALL.DOOR] = paint(TW, TH, (g) => door(g, modern));
  walls[WALL.MURAL_L] = paint(TW, TH, (g) => mural(g, modern, "GYM"));
  walls[WALL.MURAL_R] = paint(TW, TH, (g) => mural(g, modern, "BRO"));
  walls[WALL.ENTRANCE] = paint(TW, TH, (g) => entrance(g, modern));
  walls[WALL.POSTER] = paint(TW, TH, (g) => poster(g, modern));
  const floors = [];
  floors[FLOOR.MAT] = paint(FS, FS, (g) => mat(g, modern));
  floors[FLOOR.LOBBY] = paint(FS, FS, (g) => lobby(g, modern));
  const ceils = [];
  ceils[CEIL.TILE] = paint(FS, FS, (g) => ceiling(g, modern, false));
  ceils[CEIL.LIGHT] = paint(FS, FS, (g) => ceiling(g, modern, true));
  return { walls, floors, ceils, reflective: [WALL.MIRROR] };
}
