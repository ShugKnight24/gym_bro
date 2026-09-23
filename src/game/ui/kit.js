/**
 * Canvas UI kit for the HUD, meters and build mode, after Clockwork Carnage's
 * modern-ui-kit: static parts (plates, bar tracks, keycaps) are painted once
 * into offscreen canvases per size and style and blitted; only fills and
 * numbers are drawn per frame.
 *
 * Comic: cream caption plates, a heavy ink outline and a hard ink drop
 * shadow. Modern: dark translucent steel plates, hairline bevel, no ink.
 */

import { isModernArt } from "../../engine/art-style.js";

export const INK = "#04060b";
export const COLOR = {
  cream: "#f3e9cf", paper: "#fff8e6", red: "#e2362b", yellow: "#ffd23a", blue: "#2f6fd6", green: "#3dcf6a",
  cyan: "#22e6ff", energy: "#3dff8a", dim: "#8fa4b8", steel: "#1b222c", text: "#e8eef4",
};
export const FONT_COMIC = "Impact, 'Arial Black', 'Helvetica Neue', sans-serif";
export const FONT_UI = 'Bahnschrift, "Avenir Next Condensed", "DIN Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';

const fonts = new Map();
/** Cached font string. */
export function font(px, comic = true, weight = 700) {
  const k = (comic ? 1e6 : 0) + weight * 1000 + Math.round(px);
  let s = fonts.get(k);
  if (!s) fonts.set(k, (s = `${comic ? "italic " : ""}${weight} ${Math.round(px)}px ${comic ? FONT_COMIC : FONT_UI}`));
  return s;
}

const sprites = new Map(); // key → sub → numeric size/dpr/style → canvas
let count = 0;
const pixelRatio = (ctx) => {
  const m = ctx.getTransform();
  return Math.max(1, Math.round(Math.hypot(m.a, m.b) * 4) / 4);
};

/**
 * Offscreen canvas of w×h CSS px + pad, painted once by
 * paint(g, w, h, sub, modern). `key` and `sub` should be constants and
 * `paint` a module-level function at hot call sites, so a cache hit
 * allocates nothing.
 */
export function cached(ctx, key, w, h, pad, paint, sub = "") {
  const dpr = pixelRatio(ctx);
  const num = (((w | 0) * 4096 + (h | 0)) * 64 + dpr * 4) * 2 + (isModernArt() ? 1 : 0);
  let bySub = sprites.get(key);
  if (!bySub) sprites.set(key, (bySub = new Map()));
  let byNum = bySub.get(sub);
  if (!byNum) bySub.set(sub, (byNum = new Map()));
  let c = byNum.get(num);
  if (c) return c;
  if (++count > 400) {
    sprites.clear();
    count = 0;
  }
  c = document.createElement("canvas");
  c.width = Math.ceil((w + pad * 2) * dpr);
  c.height = Math.ceil((h + pad * 2) * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.translate(pad, pad);
  paint(g, w, h, sub, isModernArt());
  c._pad = pad;
  byNum.set(num, c);
  return c;
}

export function blit(ctx, c, x, y, w, h) {
  // A zero-size view (first frame before layout) paints a zero-size canvas.
  if (!c.width || !c.height) return;
  const p = c._pad;
  ctx.drawImage(c, Math.round(x - p), Math.round(y - p), Math.round(w + p * 2), Math.round(h + p * 2));
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function paintPlate(g, w, h, tone, modern) {
  if (modern) {
    roundRect(g, 0, 0, w, h, 6);
    g.fillStyle = tone === "red" ? "rgba(96,30,26,0.86)" : tone === "yellow" ? "rgba(92,74,30,0.86)" : "rgba(16,19,24,0.8)";
    g.fill();
    g.strokeStyle = "rgba(220,228,236,0.18)";
    g.lineWidth = 1;
    g.stroke();
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(255,255,255,0.07)");
    gr.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = gr;
    g.fill();
    return;
  }
  g.fillStyle = INK;
  g.fillRect(4, 4, w, h);
  g.fillStyle = { cream: COLOR.cream, dark: "#1b2230", red: COLOR.red, yellow: COLOR.yellow }[tone];
  g.fillRect(0, 0, w, h);
  if (tone === "cream") {
    g.fillStyle = "rgba(0,0,0,0.06)";
    for (let yy = 3; yy < h; yy += 5) for (let xx = (yy / 5) % 2 ? 2 : 4.5; xx < w; xx += 5) g.fillRect(xx, yy, 1.2, 1.2);
  }
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.strokeRect(0, 0, w, h);
}

/** Caption plate. `tone`: "cream" | "dark" | "red" | "yellow". */
export function plate(ctx, x, y, w, h, tone = "cream") {
  blit(ctx, cached(ctx, "plate", w, h, 8, paintPlate, tone), x, y, w, h);
}

/** Text with an ink outline (Comic) or a soft shadow (Modern). */
export function text(ctx, s, x, y, px, color = INK, align = "left", outline = false) {
  const modern = isModernArt();
  ctx.font = font(px, !modern);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (outline && !modern) {
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, px * 0.2);
    ctx.strokeStyle = INK;
    ctx.strokeText(s, x, y);
  } else if (outline) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(s, x + 1, y + 1.5);
  }
  ctx.fillStyle = modern && color === INK ? COLOR.text : color;
  ctx.fillText(s, x, y);
}

function paintBar(g, w, h, _, modern) {
  g.fillStyle = modern ? "rgba(0,0,0,0.5)" : "#2a2f3a";
  g.fillRect(0, 0, w, h);
  if (!modern) {
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  }
}

/** Stat bar: static track cached, fill per frame. */
export function bar(ctx, x, y, w, h, frac, color) {
  blit(ctx, cached(ctx, "bar", w, h, 4, paintBar), x, y, w, h);
  const fw = Math.max(0, Math.min(1, frac)) * (w - 4);
  if (fw <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, fw, h - 4);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 2, y + 2, fw, Math.max(1, (h - 4) * 0.35));
}

function paintKey(g, w, h, label, modern) {
  if (modern) {
    roundRect(g, 0, 0, w, h, 4);
    g.fillStyle = "rgba(230,236,242,0.92)";
    g.fill();
  } else {
    g.fillStyle = INK;
    g.fillRect(2, 3, w, h);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  }
  g.font = `800 ${Math.round(h / 1.7)}px ${FONT_UI}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#10141a";
  g.fillText(label, w / 2, h / 2 + 1);
}

/** Keyboard key glyph. Returns its width. */
export function keycap(ctx, label, x, y, px = 13) {
  const w = Math.max(px * 1.7, label.length * px * 0.62 + 10);
  const h = px * 1.7;
  blit(ctx, cached(ctx, "key", w, h, 3, paintKey, label), x, y - h / 2, w, h);
  return w;
}

/** Memoised number → string, so HUD numbers do not allocate every frame. */
export function memo(fmt) {
  let last = NaN;
  let str = "";
  return (v) => {
    if (v !== last) {
      last = v;
      str = fmt(v);
    }
    return str;
  };
}
