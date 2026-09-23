/**
 * In-world HUD: day/clock/money plate, energy/strength/endurance bars,
 * roster plate, crosshair dot, interaction prompt and key hints. Numbers go
 * through memoised formatters so a steady HUD allocates nothing.
 */

import { plate, text, bar, keycap, memo, font, INK, COLOR } from "./kit.js";
import { clockText } from "../rules/day.js";
import { physique, MAX_ENERGY } from "../rules/stats.js";
import { isModernArt } from "../../engine/art-style.js";

const fmtDay = memo((d) => `DAY ${d}`);
const fmtClock = memo((m) => clockText(m));
const fmtMoney = memo((v) => `$${Math.floor(v).toLocaleString("en-US")}`);
const fmtEnergy = memo((v) => `${Math.round(v)}`);
const fmtStr = memo((v) => v.toFixed(1));
const fmtEnd = memo((v) => v.toFixed(1));
const fmtPhys = memo((v) => v.toFixed(1));
const fmtMembers = memo((v) => `${v}`);
const fmtRep = memo((v) => `${v}`);
const fmtSat = memo((v) => `${v}%`);

export function drawHud(ctx, view, g, target, locked) {
  const s = g.state;
  const st = s.stats;
  const modern = isModernArt();
  const light = modern ? "#e8eef4" : INK;

  // Day, clock, money.
  plate(ctx, 16, 14, 262, 58, "cream");
  text(ctx, fmtDay(s.day), 30, 36, 24, COLOR.red, "left", true);
  text(ctx, fmtClock(Math.floor(s.time / 5) * 5), 138, 36, 24, light);
  text(ctx, fmtMoney(s.money), 30, 60, 16, modern ? "#9be29b" : "#1f7a3a");
  if (s.today.boost > 1) text(ctx, "SHAKE BOOST", 262, 60, 12, modern ? "#e3c682" : COLOR.red, "right");

  // Body bars.
  plate(ctx, 16, 84, 262, 104, "cream");
  const low = st.energy < 20;
  text(ctx, "ENERGY", 28, 101, 13, light);
  bar(ctx, 96, 93, 136, 16, st.energy / MAX_ENERGY, low ? COLOR.red : COLOR.energy);
  text(ctx, fmtEnergy(st.energy), 266, 101, 14, light, "right");
  text(ctx, "STR", 28, 125, 13, light);
  bar(ctx, 96, 117, 136, 16, st.str / 100, COLOR.red);
  text(ctx, fmtStr(st.str), 266, 125, 14, light, "right");
  text(ctx, "END", 28, 149, 13, light);
  bar(ctx, 96, 141, 136, 16, st.end / 100, COLOR.blue);
  text(ctx, fmtEnd(st.end), 266, 149, 14, light, "right");
  text(ctx, "PHYSIQUE", 28, 173, 13, light);
  text(ctx, fmtPhys(physique(st)), 266, 173, 16, modern ? "#e3c682" : COLOR.red, "right");

  // Gym roster.
  const rx = view.w - 196;
  plate(ctx, rx, 14, 180, 82, "cream");
  text(ctx, "MEMBERS", rx + 14, 32, 13, light);
  text(ctx, fmtMembers(s.members), rx + 166, 32, 20, light, "right");
  text(ctx, "REPUTATION", rx + 14, 56, 13, light);
  text(ctx, fmtRep(s.rep), rx + 166, 56, 18, light, "right");
  text(ctx, "SATISFACTION", rx + 14, 80, 13, light);
  text(ctx, fmtSat(s.sat), rx + 166, 80, 18, s.sat < 45 ? COLOR.red : light, "right");

  // Crosshair dot.
  const cx = Math.round(view.w / 2);
  const cy = Math.round(view.h / 2);
  ctx.fillStyle = INK;
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
  ctx.fillStyle = target ? COLOR.yellow : "#ffffff";
  ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

  // Interaction prompt.
  if (target) {
    ctx.font = font(16, !modern);
    const ku = g.keyLabel("use");
    const ka = g.keyLabel("alt");
    const lw = ctx.measureText(target.label).width;
    const aw = target.alt ? ctx.measureText(target.alt).width : 0;
    const extra = (ku.length - 1) * 9;
    const w = 58 + lw + extra + (target.alt ? 58 + aw + (ka.length - 1) * 9 : 0);
    const px = cx - w / 2;
    const py = cy + 54;
    plate(ctx, px, py, w, 40, "cream");
    let x = px + 12;
    x += keycap(ctx, ku, x, py + 20) + 8;
    text(ctx, target.label, x, py + 20, 16, light);
    if (target.alt) {
      x += lw + 20;
      x += keycap(ctx, ka, x, py + 20) + 8;
      text(ctx, target.alt, x, py + 20, 16, light);
    }
    if (target.note) text(ctx, target.note, cx, py + 56, 14, "#ffffff", "center", true);
  }

  if (!locked && g.lookHintT > 0) {
    ctx.globalAlpha = Math.min(1, g.lookHintT);
    plate(ctx, cx - 150, view.h * 0.3, 300, 34, "dark");
    text(ctx, "CLICK THE VIEW TO LOOK AROUND", cx, view.h * 0.3 + 17, 15, "#ffffff", "center", true);
    ctx.globalAlpha = 1;
  }

  if (s.time >= 22 * 60 + 30) {
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 180);
    ctx.globalAlpha = pulse;
    plate(ctx, cx - 190, 20, 380, 36, "red");
    text(ctx, "GETTING LATE! SLEEP AT THE HOME DOOR", cx, 38, 16, "#ffffff", "center", true);
    ctx.globalAlpha = 1;
  }

  // Key hints (touch has its own buttons).
  if (g.keyLabel("use") === "USE") return;
  let x = 18;
  const y = view.h - 22;
  for (const [action, label, w] of HINTS) {
    x += keycap(ctx, g.keyLabel(action), x, y, 11) + 6;
    text(ctx, label, x, y, 13, "#ffffff", "left", true);
    x += w;
  }
}

const HINTS = [["build", "build", 50], ["careers", "careers", 64], ["gym", "gym office", 84], ["stats", "physique", 72], ["pause", "menu", 0]];
