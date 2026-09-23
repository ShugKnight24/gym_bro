/**
 * The training minigame (and the competition rounds that reuse it).
 *
 * choose → pick a weight tier; set → a cursor sweeps the rep meter and each
 * Space/click is judged against the sweet spot, driving one rep of the
 * first-person arms; done → the game applies the set's quality to the rules
 * and shows the gains. Shows skip the weight pick and pose instead of lift.
 */

import { tempo, meterPos, judge, setQuality, PERFECT, GOOD } from "./rules/timing.js";
import { TIERS, setCost } from "./rules/stats.js";
import { viewmodelSet, armTier } from "./art/viewmodel.js";
import { drawSvgSprite } from "../engine/sprite.js";
import { callout } from "./ui/callouts.js";
import { plate, text, keycap, cached, blit, INK, COLOR } from "./ui/kit.js";
import { isModernArt } from "../engine/art-style.js";
import { EQUIPMENT } from "./data/equipment.js";
import { EVENTS } from "./data/events.js";

const REP_TIME = 0.55;
const POSES = ["FRONT DOUBLE BICEPS", "SIDE CHEST", "MOST MUSCULAR"];
const WORDS = { press: "PUSH!", squat: "DRIVE!", pull: "UP!", curl: "PUMP!", punch: "POW!", run: "ZOOM!", row: "HEAVE!", pose: "FLEX!" };
const vmOpts = { flip: false, cap: 2048 };

export function createTrainer() {
  return {
    on: false, kind: "train", type: "", game: "", tier: 1, phase: "choose", reps: 8, hits: [], sweeps: 0, idle: 0,
    repT: 9, lastHit: 0, combo: 0, best: 0, side: 1, doneT: 0, quality: 0, eventId: "", tempo: tempo(1), shake: 0,
    // Options and hooks the game sets: easier timing, calmer camera, a callback per judged rep.
    assist: false, calm: false, onRep: null,
  };
}

/** Begin a set on a machine type, or a competition round (`kind` "show" | "meet"). */
export function startTrainer(tr, kind, type, eventId = "") {
  tr.on = true;
  tr.kind = kind;
  tr.type = type;
  tr.eventId = eventId;
  tr.game = kind === "show" ? "pose" : kind === "meet" ? "press" : EQUIPMENT[type].game;
  tr.tier = kind === "meet" ? 2 : 1;
  tr.phase = kind === "train" ? "choose" : "set";
  tr.reps = kind === "train" ? TIERS[tr.tier].reps : 3;
  tr.hits.length = 0;
  tr.sweeps = 0;
  tr.idle = 0;
  tr.repT = 9;
  tr.combo = 0;
  tr.best = 0;
  tr.side = 1;
  tr.doneT = 0;
  tr.quality = 0;
  tr.tempo = tempo(tr.tier, tr.assist);
  tr._labelN = -1;
}

function beginSet(tr) {
  tr.phase = "set";
  tr._labelN = -1;
  tr.reps = TIERS[tr.tier].reps;
  tr.tempo = tempo(tr.tier, tr.assist);
  tr.sweeps = 0;
  tr.idle = 0;
}

function registerRep(tr, h, view) {
  tr.hits.push(h);
  tr.combo = h ? tr.combo + 1 : 0;
  tr.best = Math.max(tr.best, tr.combo);
  tr.repT = 0;
  tr.lastHit = h;
  tr.side = -tr.side;
  tr.idle = 0;
  const cx = view.w / 2;
  const cy = view.h * 0.42;
  const jit = (Math.random() - 0.5) * 120;
  if (h === PERFECT) {
    tr.shake = 9;
    callout(WORDS[tr.game], cx + jit, cy, { burst: true, size: 40, color: COLOR.yellow });
    callout("PERFECT", cx, view.h * 0.22 + 36, { size: 22, color: "#ffffff", life: 0.7, rot: 0 });
  } else if (h === GOOD) {
    tr.shake = 5;
    callout("GOOD", cx + jit * 0.5, cy + 20, { size: 30, color: COLOR.green, life: 0.8 });
  } else {
    tr.shake = 3;
    callout("MISS", cx + jit * 0.5, cy + 20, { size: 30, color: "#a8b0bc", life: 0.8 });
  }
  if (h && tr.combo >= 3) callout(`COMBO x${tr.combo}`, cx + 190, view.h * 0.22, { size: 22, color: COLOR.cyan, life: 0.8, rot: 0.08 });
  if (tr.calm) tr.shake = 0;
  tr.onRep?.(h, tr.combo);
}

/**
 * Advance. Returns the set's quality once, on the frame it completes;
 * "cancel" if the player backed out; otherwise null.
 */
export function updateTrainer(tr, dt, input, view, energy) {
  if (tr.shake > 0) tr.shake = Math.max(0, tr.shake - dt * 40);
  tr.repT += dt;
  if (tr.phase === "choose") {
    if (input.pressed("pause") || input.pressed("use")) return "cancel";
    if (input.pressed("left") || input.pressed("turnL") || input.pressed("slotPrev")) tr.tier = Math.max(0, tr.tier - 1);
    if (input.pressed("right") || input.pressed("turnR") || input.pressed("slotNext")) tr.tier = Math.min(2, tr.tier + 1);
    for (let i = 0; i < 3; i++) if (input.pressed(`slot${i + 1}`)) tr.tier = i;
    if (input.pressed("rep") || input.mouse.clicked) {
      if (energy < setCost(EQUIPMENT[tr.type], tr.tier)) {
        callout("TOO TIRED!", view.w / 2, view.h * 0.5, { burst: true, color: "#a8b0bc", size: 30 });
        return null;
      }
      beginSet(tr);
    }
    return null;
  }
  if (tr.phase === "set") {
    if (input.pressed("pause")) return tr.hits.length ? null : "cancel";
    tr.sweeps += dt * tr.tempo.speed;
    tr.idle += dt * tr.tempo.speed;
    if (input.pressed("rep") || input.mouse.clicked) registerRep(tr, judge(meterPos(tr.sweeps), tr.tempo), view);
    else if (tr.idle > 2.2) registerRep(tr, 0, view); // stalled: the rep fails
    if (tr.hits.length >= tr.reps) {
      tr.phase = "done";
      tr.doneT = 0;
      tr.quality = setQuality(tr.hits);
      return tr.quality;
    }
    return null;
  }
  tr.doneT += dt;
  if (tr.doneT > 2.2 || (tr.doneT > 0.5 && (input.pressed("rep") || input.pressed("use") || input.mouse.clicked))) {
    tr.on = false;
    return "close";
  }
  return null;
}

/** 0..1..0 over one rep, eased. */
function repCurve(t) {
  if (t >= REP_TIME) return 0;
  const k = t / REP_TIME;
  return Math.sin(k * Math.PI) ** 0.8;
}

/** Camera eye-height offset for full-body lifts (squat dips, pull-ups rise). */
export function trainerCamDz(tr) {
  if (!tr.on) return 0;
  const p = repCurve(tr.repT);
  const k = tr.lastHit ? 1 : 0.35;
  if (tr.game === "squat") return -0.32 * p * k;
  if (tr.game === "pull") return 0.22 * p * k;
  return 0;
}

function drawSide(ctx, set, name, x, y, ppu, t, flip) {
  const s = set.sprites[name];
  vmOpts.flip = flip;
  drawSvgSprite(ctx, s._key, s, s.defs, x, y, ppu, t, vmOpts);
}

/** First-person arms for the current minigame. `body` is the player's sprite (posing). */
export function drawViewmodel(ctx, view, tr, t, arms, body) {
  const modern = isModernArt();
  const set = viewmodelSet(armTier(arms), modern);
  const u = view.w / 400;
  const ox = view.w / 2;
  const oy = view.h;
  const p = repCurve(tr.repT) * (tr.lastHit ? 1 : 0.45);
  const breath = Math.sin(t * 2.2) * 3 * u;
  const strain = !tr.lastHit && tr.repT < REP_TIME ? Math.sin(t * 60) * 3 * u : 0;
  const idleUp = tr.phase === "choose" ? 0.25 : 0;
  switch (tr.game) {
    case "press": {
      const k = 1 - 0.2 * p;
      drawSide(ctx, set, "press", ox + strain, oy + (30 - p * 70 + idleUp * 40) * u + breath, u * k, t, false);
      break;
    }
    case "squat":
      drawSide(ctx, set, "overhead", ox + strain, oy + 40 * u + breath * 0.5, u, t, false);
      break;
    case "pull":
      drawSide(ctx, set, "overhead", ox + strain, oy + (10 + p * 110) * u + breath * 0.5, u, t, false);
      break;
    case "row": {
      const k = 0.8 + 0.3 * p;
      drawSide(ctx, set, "row", ox + strain, oy + (-60 + p * 90) * u + breath, u * k, t, false);
      break;
    }
    case "curl":
      for (let sg = -1; sg <= 1; sg += 2) {
        const active = sg === tr.side ? 0 : 1;
        const a = (1 - (active ? p : 0)) * 0.95 - (active ? p * 0.1 : 0);
        ctx.save();
        ctx.translate(ox + sg * 170 * u, oy + 120 * u + breath);
        ctx.rotate(sg * a);
        drawSide(ctx, set, "curl", -sg * 170 * u + strain, -120 * u, u, t, sg < 0);
        ctx.restore();
      }
      break;
    case "punch":
      for (let sg = -1; sg <= 1; sg += 2) {
        const q = sg === tr.side ? 0 : p;
        const k = 1 - 0.35 * q;
        const guard = Math.sin(t * 5 + sg) * 6 * u;
        drawSide(ctx, set, "glove", ox - sg * 115 * q * u + strain, oy + (20 - 70 * q) * u + guard, u * k, t, sg < 0);
      }
      break;
    case "run": {
      const cad = t * (tr.phase === "set" ? 9 : 4);
      for (let sg = -1; sg <= 1; sg += 2) drawSide(ctx, set, "fist", ox, oy + (40 + Math.sin(cad + (sg > 0 ? 0 : Math.PI)) * 45) * u, u, t, sg < 0);
      break;
    }
    case "pose": {
      // Stage: spotlight and the player's own body, flexing on each hit.
      const g = cached(ctx, "spot", view.w, view.h, 0, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, h * 0.75);
        gr.addColorStop(0, "rgba(255,244,200,0.28)");
        gr.addColorStop(0.5, "rgba(0,0,0,0.3)");
        gr.addColorStop(1, "rgba(0,0,0,0.82)");
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      });
      blit(ctx, g, 0, 0, view.w, view.h);
      if (body) {
        const k = view.h / 230;
        const pump = 1 + p * 0.05;
        drawSvgSprite(ctx, body._key, body, body.defs, ox, view.h * 0.97, k * pump, t, vmOpts);
      }
      break;
    }
  }
}

/** Meter, rep counter, tier picker and result banner. */
export function drawTrainerHud(ctx, view, tr, energy) {
  const cx = view.w / 2;
  const modern = isModernArt();
  if (tr.phase === "choose") {
    const eq = EQUIPMENT[tr.type];
    const pw = 560;
    const ph = 196;
    const px = cx - pw / 2;
    const py = view.h * 0.2;
    plate(ctx, px, py, pw, ph, "cream");
    text(ctx, eq.name.toUpperCase(), cx, py + 30, 30, COLOR.red, "center", true);
    text(ctx, "PICK YOUR WEIGHT", cx, py + 60, 14, INK, "center");
    for (let i = 0; i < 3; i++) {
      const T = TIERS[i];
      const bx = px + 22 + i * 176;
      const by = py + 80;
      plate(ctx, bx, by, 160, 74, i === tr.tier ? "yellow" : "dark");
      const c = i === tr.tier ? INK : "#e8eef4";
      text(ctx, T.name.toUpperCase(), bx + 80, by + 20, 20, c, "center");
      text(ctx, `${T.reps} reps · ${setCost(eq, i)} energy`, bx + 80, by + 44, 13, c, "center");
      text(ctx, `gains x${T.gain}`, bx + 80, by + 61, 12, c, "center");
    }
    let kx = cx - 190;
    kx += keycap(ctx, "1", kx, py + ph - 20) + 4;
    kx += keycap(ctx, "2", kx, py + ph - 20) + 4;
    kx += keycap(ctx, "3", kx, py + ph - 20) + 8;
    text(ctx, "weight", kx, py + ph - 20, 13, INK);
    kx = cx + 20;
    kx += keycap(ctx, "SPACE", kx, py + ph - 20) + 8;
    text(ctx, "start", kx, py + ph - 20, 13, INK);
    kx += 50;
    kx += keycap(ctx, "ESC", kx, py + ph - 20) + 8;
    text(ctx, "leave", kx, py + ph - 20, 13, INK);
    if (energy < setCost(eq, tr.tier)) text(ctx, "Not enough energy for this weight", cx, py + ph + 24, 16, COLOR.red, "center", true);
    return;
  }
  // Meter: track, good zone, perfect zone, cursor.
  const mw = Math.min(520, view.w * 0.5);
  const mh = 28;
  const mx = cx - mw / 2;
  const my = view.h * 0.12;
  const T = tr.tempo;
  const track = cached(ctx, "meter", mw, mh, 8, (g, w, h) => {
    if (!modern) {
      g.fillStyle = INK;
      g.fillRect(4, 4, w, h);
    }
    g.fillStyle = modern ? "rgba(12,14,18,0.85)" : "#2a2f3a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = modern ? "rgba(90,200,140,0.55)" : COLOR.green;
    g.fillRect(w * (0.5 - T.good), 3, w * T.good * 2, h - 6);
    g.fillStyle = modern ? "rgba(230,200,110,0.9)" : COLOR.yellow;
    g.fillRect(w * (0.5 - T.perfect), 3, w * T.perfect * 2, h - 6);
    if (!modern) {
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.strokeRect(0, 0, w, h);
      g.lineWidth = 1.5;
      g.strokeRect(w * (0.5 - T.good), 3, w * T.good * 2, h - 6);
      g.strokeRect(w * (0.5 - T.perfect), 3, w * T.perfect * 2, h - 6);
    }
  }, tr.tier);
  blit(ctx, track, mx, my, mw, mh);
  if (tr.phase === "set") {
    const pos = meterPos(tr.sweeps);
    const x = Math.round(mx + pos * mw);
    ctx.fillStyle = modern ? "#ffffff" : INK;
    ctx.fillRect(x - 3, my - 10, 6, mh + 20);
    ctx.fillStyle = modern ? "#ff5a4a" : "#ffffff";
    ctx.fillRect(x - 1, my - 8, 2, mh + 16);
  }
  const done = tr.hits.length;
  if (tr._labelN !== done || tr._labelFor !== tr.game + tr.tier) {
    // Labels change once per rep, not per frame.
    tr._labelN = done;
    tr._labelFor = tr.game + tr.tier;
    tr._count = `${done}/${tr.reps}`;
    tr._label = tr.kind === "show" ? `POSE ${Math.min(done + 1, 3)}/3 · ${POSES[Math.min(done, 2)]}`
      : tr.kind === "meet" ? `ATTEMPT ${Math.min(done + 1, 3)}/3 · ${EVENTS[tr.eventId].name.toUpperCase()}`
      : `${EQUIPMENT[tr.type].name.toUpperCase()} · ${TIERS[tr.tier].name.toUpperCase()}`;
  }
  const label = tr._label;
  text(ctx, label, cx, my - 22, 18, "#ffffff", "center", true);
  // Rep counter pops on each rep.
  const pop = tr.repT < 0.25 ? 1 + (0.25 - tr.repT) * 2.4 : 1;
  ctx.save();
  ctx.translate(mx + mw + 56, my + mh / 2);
  ctx.scale(pop, pop);
  text(ctx, tr._count, 0, 0, 34, COLOR.yellow, "center", true);
  ctx.restore();
  text(ctx, "REPS", mx + mw + 56, my + mh / 2 + 26, 12, "#ffffff", "center", true);
  // Rep pips.
  for (let i = 0; i < tr.reps; i++) {
    const h = tr.hits[i];
    ctx.fillStyle = h === undefined ? "rgba(255,255,255,0.25)" : h === PERFECT ? COLOR.yellow : h === GOOD ? COLOR.green : "#6b7280";
    ctx.fillRect(Math.round(cx - tr.reps * 11 + i * 22 + 3), Math.round(my + mh + 12), 16, 8);
  }
  if (tr.phase === "set" && !done) {
    let kx = cx - 120;
    kx += keycap(ctx, "SPACE", kx, my + mh + 44) + 8;
    text(ctx, "or click in the gold zone", kx, my + mh + 44, 14, "#ffffff", "left", true);
  }
  if (tr.phase === "done") {
    const q = tr.quality;
    const grade = q >= 1.05 ? "S" : q >= 0.85 ? "A" : q >= 0.6 ? "B" : q > 0.25 ? "C" : "F";
    const k = Math.min(1, tr.doneT * 4);
    ctx.save();
    ctx.translate(cx, view.h * 0.36);
    ctx.scale(k, k);
    plate(ctx, -170, -44, 340, 88, "red");
    text(ctx, tr.kind === "train" ? "SET COMPLETE" : "ROUND DONE", 0, -14, 30, "#ffffff", "center", true);
    text(ctx, `GRADE ${grade}  ·  BEST COMBO ${tr.best}`, 0, 22, 16, "#ffffff", "center", true);
    ctx.restore();
  }
}
