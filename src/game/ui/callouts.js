/**
 * Comic callouts ("POW!", "PERFECT!", "+0.8 STR"): a fixed pool of popups
 * that punch in with an overshoot, hang, then float up and fade. Each label
 * is painted once into an offscreen canvas (a jagged ink starburst in
 * Comic, a rounded plate in Modern).
 */

import { isModernArt } from "../../engine/art-style.js";
import { INK, FONT_COMIC, FONT_UI } from "./kit.js";

const POOL = 16;
const pool = Array.from({ length: POOL }, () => ({ on: false, img: null, x: 0, y: 0, t: 0, life: 1, rot: 0 }));
const cache = new Map();

function paint(textStr, fill, burst, px) {
  const modern = isModernArt();
  const g0 = document.createElement("canvas").getContext("2d");
  const fontStr = modern ? `800 ${px}px ${FONT_UI}` : `italic 900 ${px}px ${FONT_COMIC}`;
  g0.font = fontStr;
  const tw = g0.measureText(textStr).width;
  const w = Math.ceil(tw + px * (burst && !modern ? 2.2 : 1.2));
  const h = Math.ceil(px * (burst && !modern ? 2.6 : 1.7));
  const c = document.createElement("canvas");
  const dpr = 2;
  c.width = w * dpr;
  c.height = h * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const cx = w / 2;
  const cy = h / 2;
  if (modern) {
    if (burst) {
      g.fillStyle = "rgba(14,17,22,0.78)";
      g.beginPath();
      g.roundRect(2, 2, w - 4, h - 4, 8);
      g.fill();
    }
    g.font = fontStr;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "rgba(0,0,0,0.5)";
    g.fillText(textStr, cx + 1, cy + 2);
    g.fillStyle = fill;
    g.fillText(textStr, cx, cy);
  } else {
    if (burst) {
      // Jagged starburst behind the word.
      const n = 18;
      g.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const k = i % 2 ? 0.74 : 1;
        const x = cx + Math.cos(a) * (w / 2 - 3) * k;
        const y = cy + Math.sin(a) * (h / 2 - 3) * k;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = INK;
      g.stroke();
    }
    g.font = fontStr;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = px * 0.26;
    g.strokeStyle = INK;
    g.strokeText(textStr, cx + 2, cy + 3);
    g.strokeText(textStr, cx, cy);
    g.fillStyle = fill;
    g.fillText(textStr, cx, cy);
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.save();
    g.beginPath();
    g.rect(0, 0, w, cy - px * 0.12);
    g.clip();
    g.fillText(textStr, cx, cy);
    g.restore();
  }
  c._w = w;
  c._h = h;
  return c;
}

function label(textStr, fill, burst, px) {
  const k = `${textStr}|${fill}|${burst ? 1 : 0}|${px}|${isModernArt() ? 1 : 0}`;
  let c = cache.get(k);
  if (!c) {
    if (cache.size > 120) cache.delete(cache.keys().next().value);
    cache.set(k, (c = paint(textStr, fill, burst, px)));
  }
  return c;
}

/** Pop a callout at screen (x, y). o: { color, burst, size, life, rot } */
export function callout(textStr, x, y, o = {}) {
  let slot = pool.find((p) => !p.on) || pool.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
  slot.on = true;
  slot.img = label(textStr, o.color || "#ffd23a", o.burst ?? false, o.size || 34);
  slot.x = x;
  slot.y = y;
  slot.t = 0;
  slot.life = o.life || 1.1;
  slot.rot = o.rot ?? (Math.random() - 0.5) * 0.25;
}

export function clearCallouts() {
  for (const p of pool) p.on = false;
}

export function updateCallouts(dt) {
  for (const p of pool) {
    if (!p.on) continue;
    p.t += dt;
    if (p.t >= p.life) p.on = false;
  }
}

const easeOutBack = (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;

export function drawCallouts(ctx) {
  for (const p of pool) {
    if (!p.on) continue;
    const k = p.t / p.life;
    const pop = k < 0.18 ? easeOutBack(k / 0.18) : 1;
    const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    const rise = k > 0.45 ? (k - 0.45) * 60 : 0;
    const img = p.img;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(p.x, p.y - rise);
    ctx.rotate(p.rot);
    ctx.scale(pop, pop);
    ctx.drawImage(img, -img._w / 2, -img._h / 2, img._w, img._h);
    ctx.restore();
  }
}
