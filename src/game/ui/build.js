/**
 * Build mode: an overhead diorama of the gym grid with the catalog panel.
 * Left click buys and places the selected machine, right click sells, R or
 * the wheel rotates its access side. The catalog pages when it outgrows the
 * view: digits pick within the page, Q (pageNext) flips pages. Rules live in ../rules/build.js; this
 * module only hit-tests and draws, and hands actions back to the game.
 */

import { drawSvgSprite } from "../../engine/sprite.js";
import { isModernArt } from "../../engine/art-style.js";
import { EQUIPMENT, EQUIPMENT_IDS } from "../data/equipment.js";
import { placementError, accessCell, findAt, DIRS } from "../rules/build.js";
import { PROPS, WALL, FLOOR } from "../world/map.js";
import { worldSet } from "../world/scene.js";
import { MEMBER_LOOKS } from "../art/figures.js";
import { plate, text, keycap, cached, blit, memo, INK, COLOR } from "./kit.js";

const PANEL_W = 300;
const ROW_H = 62;
const ROW_Y = 118;
const MAX_ROWS = 8;
const spriteOpts = { alpha: 1, flip: false };

export function createBuild() {
  // sel -1: nothing picked yet; the player chooses from the catalog before placing.
  return { on: false, sel: -1, page: 0, rot: 2, hx: -1, hy: -1, err: null, msg: "", msgT: 0 };
}

/** Catalog rows per page: up to MAX_ROWS, leaving room for the note and message plate. */
const perPage = (view) => Math.max(1, Math.min(MAX_ROWS, Math.floor((view.h - ROW_Y - 90) / ROW_H)));
const pageCount = (per) => Math.max(1, Math.ceil(EQUIPMENT_IDS.length / per));
/** The selected catalog entry, clamped so a stale index never misses. */
const selected = (b) => (b.sel >= 0 ? EQUIPMENT[EQUIPMENT_IDS[Math.min(b.sel, EQUIPMENT_IDS.length - 1)]] : null);

function layout(view, map) {
  const availW = view.w - PANEL_W - 48;
  const availH = view.h - 120;
  const cs = Math.floor(Math.min(availW / map.w, availH / map.h));
  const ox = Math.round(24 + (availW - cs * map.w) / 2);
  const oy = Math.round(84 + (availH - cs * map.h) / 2);
  return { cs, ox, oy, px: view.w - PANEL_W - 16 };
}

/**
 * Returns an action for the game to apply:
 * { kind: "place", type, x, y, rot } | { kind: "sell", x, y } | { kind: "exit" } | null.
 */
export function updateBuild(b, input, view, map, placed, dt) {
  b.msgT = Math.max(0, b.msgT - dt);
  if (input.pressed("build")) return { kind: "exit" };
  // Esc first puts the picked machine back, then leaves.
  if (input.pressed("pause")) {
    if (b.sel < 0) return { kind: "exit" };
    b.sel = -1;
    return null;
  }
  const per = perPage(view);
  const pages = pageCount(per);
  if (b.page >= pages) b.page = 0;
  if (pages > 1 && input.pressed("pageNext")) {
    b.page = (b.page + 1) % pages;
    b.sel = b.page * per;
  }
  const first = b.page * per;
  const rows = Math.min(per, EQUIPMENT_IDS.length - first);
  for (let i = 0; i < Math.min(rows, 9); i++) if (input.pressed(`slot${i + 1}`)) b.sel = first + i;
  // Gamepad d-pad steps through the whole catalog, flipping pages as it goes.
  const step = (input.pressed("slotNext") ? 1 : 0) - (input.pressed("slotPrev") ? 1 : 0);
  if (step) {
    b.sel = b.sel < 0 ? (step > 0 ? 0 : EQUIPMENT_IDS.length - 1) : (b.sel + step + EQUIPMENT_IDS.length) % EQUIPMENT_IDS.length;
    b.page = Math.floor(b.sel / per);
  }
  if (input.pressed("rotate") || input.mouse.wheel) b.rot = (b.rot + (input.mouse.wheel < 0 ? 3 : 1)) & 3;
  const L = layout(view, map);
  const mx = input.mouse.x;
  const my = input.mouse.y;
  // Catalog rows.
  if (mx >= L.px && input.mouse.clicked) {
    const i = Math.floor((my - ROW_Y) / ROW_H);
    if (i >= 0 && i < rows) b.sel = first + i;
    return null;
  }
  const cx = Math.floor((mx - L.ox) / L.cs);
  const cy = Math.floor((my - L.oy) / L.cs);
  const inside = cx >= 0 && cy >= 0 && cx < map.w && cy < map.h;
  b.hx = inside ? cx : -1;
  b.hy = inside ? cy : -1;
  b.err = inside ? placementError(map, placed, cx, cy, b.rot) : null;
  if (!inside) return null;
  if (input.mouse.rightClicked) {
    if (findAt(placed, cx, cy) >= 0) return { kind: "sell", x: cx, y: cy };
    b.sel = -1;
    return null;
  }
  if (input.mouse.clicked && findAt(placed, cx, cy) < 0) {
    if (b.sel < 0) {
      flash(b, "Pick a machine from the list first");
      return null;
    }
    return { kind: "place", type: EQUIPMENT_IDS[b.sel], x: cx, y: cy, rot: b.rot };
  }
  return null;
}

export function flash(b, msg) {
  b.msg = msg;
  b.msgT = 2.2;
}

const WALL_COLORS = {
  comic: { [WALL.BLOCK]: "#8f9bab", [WALL.MIRROR]: "#bfe8ff", [WALL.WINDOW]: "#7fd3ff", [WALL.DOOR]: "#d0823a", [WALL.MURAL_L]: "#e2362b", [WALL.MURAL_R]: "#e2362b", [WALL.ENTRANCE]: "#bff0ff", [WALL.POSTER]: "#8f9bab" },
  modern: { [WALL.BLOCK]: "#6d6a64", [WALL.MIRROR]: "#9eb0ba", [WALL.WINDOW]: "#8aa4b4", [WALL.DOOR]: "#6a4a33", [WALL.MURAL_L]: "#7c2f28", [WALL.MURAL_R]: "#7c2f28", [WALL.ENTRANCE]: "#a9b8be", [WALL.POSTER]: "#6d6a64" },
};

/** Static floor/walls/props layer, cached per size and style. */
function paintBase(ctx, map, L) {
  const modern = isModernArt();
  const w = map.w * L.cs;
  const h = map.h * L.cs;
  return cached(ctx, "buildbase", w, h, 8, (g) => {
    const wc = WALL_COLORS[modern ? "modern" : "comic"];
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const i = y * map.w + x;
        const X = x * L.cs;
        const Y = y * L.cs;
        const wall = map.walls[i];
        if (wall) {
          g.fillStyle = wc[wall];
          g.fillRect(X, Y, L.cs, L.cs);
          if (wall === WALL.DOOR || wall === WALL.ENTRANCE) {
            g.fillStyle = INK;
            g.font = `800 ${Math.round(L.cs * 0.24)}px sans-serif`;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(wall === WALL.DOOR ? "HOME" : "IN", X + L.cs / 2, Y + L.cs / 2);
          }
          continue;
        }
        const lobby = map.floor[i] === FLOOR.LOBBY;
        g.fillStyle = lobby ? (modern ? "#8c877c" : "#e8dfc6") : modern ? "#34363a" : "#39425a";
        g.fillRect(X, Y, L.cs, L.cs);
        g.strokeStyle = modern ? "rgba(255,255,255,0.06)" : "rgba(4,6,11,0.45)";
        g.lineWidth = 1;
        g.strokeRect(X + 0.5, Y + 0.5, L.cs - 1, L.cs - 1);
        if (map.reserved[i]) {
          g.strokeStyle = modern ? "rgba(255,255,255,0.08)" : "rgba(4,6,11,0.18)";
          g.beginPath();
          for (let k = -L.cs; k < L.cs; k += 8) {
            g.moveTo(X + Math.max(0, k), Y + Math.max(0, -k));
            g.lineTo(X + Math.min(L.cs, L.cs + k), Y + Math.min(L.cs, L.cs - k));
          }
          g.stroke();
        }
      }
    }
    if (!modern) {
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.strokeRect(0, 0, w, h);
    }
  });
}

const fmtMoney = memo((v) => `$${Math.floor(v).toLocaleString("en-US")}`);

export function drawBuild(ctx, view, b, g, map, crowd, player, t) {
  const modern = isModernArt();
  const set = worldSet(modern);
  const L = layout(view, map);
  const placed = g.state.gym.placed;
  ctx.fillStyle = modern ? "#121416" : "#1b2130";
  ctx.fillRect(0, 0, view.w, view.h);
  if (!modern) {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let y = 0; y < view.h; y += 12) for (let x = (y / 12) % 2 ? 0 : 6; x < view.w; x += 12) ctx.fillRect(x, y, 3, 3);
  }
  const base = paintBase(ctx, map, L);
  blit(ctx, base, L.ox, L.oy, map.w * L.cs, map.h * L.cs);
  // Props redraw every frame: a sprite still decoding must not get baked in blank.
  for (const p of PROPS) drawSvgSprite(ctx, p.sprite, set.sprites[p.sprite], set.defs, L.ox + p.x * L.cs, L.oy + p.y * L.cs + L.cs * 0.12, L.cs / 200, t);

  // Placed equipment, back rows first so sprites overlap like a diorama.
  const ppu = L.cs / 185;
  for (let y = 0; y < map.h; y++) {
    for (const p of placed) {
      if (p.y !== y) continue;
      const X = L.ox + p.x * L.cs;
      const Y = L.oy + p.y * L.cs;
      const [ax, ay] = accessCell(p.x, p.y, p.rot);
      ctx.fillStyle = modern ? "rgba(230,200,110,0.18)" : "rgba(255,210,58,0.28)";
      ctx.fillRect(L.ox + ax * L.cs + 3, L.oy + ay * L.cs + 3, L.cs - 6, L.cs - 6);
      const key = EQUIPMENT[p.type].sprite;
      drawSvgSprite(ctx, key, set.sprites[key], set.defs, X + L.cs / 2, Y + L.cs * 0.9, ppu, t);
      arrow(ctx, X, Y, L.cs, p.rot, modern ? "#e3c682" : COLOR.yellow);
    }
  }
  // Members and the player.
  for (const ag of crowd.agents) {
    if (!ag.on) continue;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(L.ox + ag.x * L.cs, L.oy + ag.y * L.cs, L.cs * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = MEMBER_LOOKS[ag.look].top;
    ctx.beginPath();
    ctx.arc(L.ox + ag.x * L.cs, L.oy + ag.y * L.cs, L.cs * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const px = L.ox + player.x * L.cs;
  const py = L.oy + player.y * L.cs;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);
  ctx.fillStyle = COLOR.red;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L.cs * 0.28, 0);
  ctx.lineTo(-L.cs * 0.16, -L.cs * 0.16);
  ctx.lineTo(-L.cs * 0.16, L.cs * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Hover ghost.
  if (b.hx >= 0) {
    const X = L.ox + b.hx * L.cs;
    const Y = L.oy + b.hy * L.cs;
    const occupied = findAt(placed, b.hx, b.hy) >= 0;
    const eq = selected(b);
    const ok = eq && !b.err && g.state.money >= eq.cost;
    if (!occupied && eq) {
      ctx.fillStyle = ok ? "rgba(61,207,106,0.35)" : "rgba(226,54,43,0.35)";
      ctx.fillRect(X, Y, L.cs, L.cs);
      spriteOpts.alpha = 0.6;
      drawSvgSprite(ctx, eq.sprite, set.sprites[eq.sprite], set.defs, X + L.cs / 2, Y + L.cs * 0.9, ppu, t, spriteOpts);
      spriteOpts.alpha = 1;
      arrow(ctx, X, Y, L.cs, b.rot, ok ? COLOR.green : COLOR.red);
    }
    ctx.strokeStyle = occupied ? COLOR.yellow : !eq ? "#ffffff" : ok ? COLOR.green : COLOR.red;
    ctx.lineWidth = 3;
    ctx.strokeRect(X + 1.5, Y + 1.5, L.cs - 3, L.cs - 3);
    const tip = occupied ? "Right-click to sell (50% back)" : !eq ? "Pick a machine from the list →"
      : b.err || (g.state.money < eq.cost ? "Not enough money" : `Place for $${eq.cost}`);
    text(ctx, tip, X + L.cs / 2, Y - 12, 14, "#ffffff", "center", true);
  }

  // Header.
  plate(ctx, 24, 14, 360, 52, "yellow");
  text(ctx, "BUILD MODE", 40, 40, 28, modern ? "#f3e9cf" : INK, "left", false);
  text(ctx, fmtMoney(g.state.money), 370, 40, 22, modern ? "#9be29b" : "#1f7a3a", "right");
  let hx = 404;
  const hy = 40;
  hx += keycap(ctx, "LMB", hx, hy, 11) + 6;
  text(ctx, "place", hx, hy, 13, "#ffffff", "left", true);
  hx += 44;
  hx += keycap(ctx, "RMB", hx, hy, 11) + 6;
  text(ctx, "sell", hx, hy, 13, "#ffffff", "left", true);
  hx += 36;
  hx += keycap(ctx, "R", hx, hy, 11) + 6;
  text(ctx, "rotate", hx, hy, 13, "#ffffff", "left", true);
  hx += 52;
  hx += keycap(ctx, "TAB", hx, hy, 11) + 6;
  text(ctx, "done", hx, hy, 13, "#ffffff", "left", true);

  // Catalog.
  plate(ctx, L.px, 84, PANEL_W, view.h - 100, "cream");
  text(ctx, "EQUIPMENT", L.px + 16, 102, 20, modern ? "#f3e9cf" : COLOR.red, "left");
  const per = perPage(view);
  const pages = pageCount(per);
  const page = Math.min(b.page, pages - 1);
  const first = page * per;
  const rows = Math.min(per, EQUIPMENT_IDS.length - first);
  if (pages > 1) {
    const kx = L.px + PANEL_W - 104;
    text(ctx, `${page + 1}/${pages}`, kx - 8, 102, 13, modern ? "#c9d2dc" : INK, "right");
    const kw = keycap(ctx, "Q", kx, 102, 11);
    text(ctx, "more", kx + kw + 6, 102, 13, modern ? "#c9d2dc" : INK, "left");
  }
  for (let r = 0; r < rows; r++) {
    const i = first + r;
    const eq = EQUIPMENT[EQUIPMENT_IDS[i]];
    const y = ROW_Y + r * ROW_H;
    const sel = i === b.sel;
    plate(ctx, L.px + 10, y, PANEL_W - 20, ROW_H - 8, sel ? "yellow" : "dark");
    const c = sel && !modern ? INK : "#e8eef4";
    drawSvgSprite(ctx, eq.sprite, set.sprites[eq.sprite], set.defs, L.px + 46, y + ROW_H - 12, 0.2, t);
    text(ctx, `${r < 9 ? r + 1 : " "}  ${eq.name}`, L.px + 84, y + 17, 15, c);
    text(ctx, `$${eq.cost} · appeal +${eq.appeal} · ${eq.energy}⚡`, L.px + 84, y + 38, 12, c);
    if (g.state.money < eq.cost) text(ctx, "$", L.px + PANEL_W - 24, y + 17, 16, COLOR.red, "right");
  }
  const note = selected(b)?.desc || "Pick a machine above, then click the floor.";
  text(ctx, note, L.px + 16, ROW_Y + rows * ROW_H + 12, 12, modern ? "#c9d2dc" : INK);
  if (b.msgT > 0) {
    ctx.globalAlpha = Math.min(1, b.msgT * 2);
    plate(ctx, L.px + 10, view.h - 74, PANEL_W - 20, 44, "red");
    text(ctx, b.msg, L.px + PANEL_W / 2, view.h - 52, 14, "#ffffff", "center", true);
    ctx.globalAlpha = 1;
  }
}

/** Little triangle on the access side of a cell. */
function arrow(ctx, X, Y, cs, rot, color) {
  const [dx, dy] = DIRS[rot & 3];
  const cx = X + cs / 2 + dx * cs * 0.42;
  const cy = Y + cs / 2 + dy * cs * 0.42;
  const s = cs * 0.1;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + dx * s, cy + dy * s);
  ctx.lineTo(cx - dy * s - dx * s * 0.4, cy + dx * s - dy * s * 0.4);
  ctx.lineTo(cx + dy * s - dx * s * 0.4, cy - dx * s - dy * s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
