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
import { hudScale } from "./ui/hud.js";
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
    repT: 9, lastHit: 0, hitPos: 0.5, combo: 0, best: 0, side: 1, doneT: 0, quality: 0, eventId: "", tempo: tempo(1), shake: 0,
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

function registerRep(tr, h, view, pos) {
  tr.hits.push(h);
  tr.hitPos = pos;
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
    const G = hudGeom(view);
    callout("PERFECT", cx, (G.my + G.mh + 50) * G.k, { size: 22, color: "#ffffff", life: 0.7, rot: 0 });
  } else if (h === GOOD) {
    tr.shake = 5;
    callout("GOOD", cx + jit * 0.5, cy + 20, { size: 30, color: COLOR.green, life: 0.8 });
  } else {
    tr.shake = 3;
    callout("MISS", cx + jit * 0.5, cy + 20, { size: 30, color: "#a8b0bc", life: 0.8 });
  }
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
    if (input.pressed("rep") || input.mouse.clicked) registerRep(tr, judge(meterPos(tr.sweeps), tr.tempo), view, meterPos(tr.sweeps));
    else if (tr.idle > 2.2) registerRep(tr, 0, view, meterPos(tr.sweeps)); // stalled: the rep fails
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
  if (tr.game === "pull") return tr.type === "cable_station" ? -0.04 * p * k : 0.22 * p * k;
  if (tr.type === "ab_bench") return 0.08 * p * k;
  return 0;
}

function drawSide(ctx, set, name, x, y, ppu, t, flip) {
  const s = set.sprites[name];
  vmOpts.flip = flip;
  drawSvgSprite(ctx, s._key, s, s.defs, x, y, ppu, t, vmOpts);
}

/** Viewmodel sprite per machine where it differs from its minigame's default. */
const VM_TYPE = { leg_press: "handles", cable_station: "pulldown", ab_bench: "crunch", stationary_bike: "bike", kettlebell_rack: "kettle" };
const VM_GAME = { press: "press", squat: "squat", pull: "overhead", row: "row", run: "fist", curl: "curl", punch: "glove" };
const vmName = (tr) => (tr.kind === "train" && VM_TYPE[tr.type]) || VM_GAME[tr.game];

/** Soft floor of shadow under the arms so they sit in the scene instead of on it. */
function armShade(ctx, view) {
  const g = cached(ctx, "vmshade", view.w, view.h, 0, (c, w, h) => {
    const gr = c.createLinearGradient(0, h * 0.55, 0, h);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,0.32)");
    c.fillStyle = gr;
    c.fillRect(0, h * 0.55, w, h * 0.45);
  });
  blit(ctx, g, 0, 0, view.w, view.h);
}

/** First-person arms for the current minigame. `body` is the player's sprite (posing). */
export function drawViewmodel(ctx, view, tr, t, arms, body) {
  const modern = isModernArt();
  // Sprites are laid out for 16:9; wider views fit by height so overhead bars stay on screen.
  const u = Math.min(view.w / 400, view.h / 225);
  const ox = view.w / 2;
  const oy = view.h;
  const hit = tr.lastHit ? 1 : 0.4;
  const p = repCurve(tr.repT) * hit;
  const breath = Math.sin(t * 2.2) * 2.5 * u;
  // A missed rep grinds: a fast tremor while it sticks. Heavier weights shake more.
  const strain = !tr.lastHit && tr.repT < REP_TIME ? Math.sin(t * 60) * (2 + tr.tier) * u : 0;
  // Choosing a weight: hands drop so the picker has the screen.
  const rest = tr.phase === "choose" ? 60 * u : tr.phase === "done" ? Math.min(1, tr.doneT * 3) * 30 * u : 0;
  if (tr.game === "pose") return drawStage(ctx, view, tr, t, body, p);
  armShade(ctx, view);
  const set = viewmodelSet(armTier(arms), modern, tr.kind === "train" ? tr.tier : 2);
  const name = vmName(tr);
  switch (name) {
    case "press": {
      const k = 1 - 0.18 * p;
      drawSide(ctx, set, name, ox + strain, oy + (26 - p * 64) * u + breath + rest, u * k, t, false);
      break;
    }
    case "squat":
      drawSide(ctx, set, name, ox + strain, oy + (24 + p * 10) * u + breath * 0.5 + rest, u, t, false);
      break;
    case "overhead":
      drawSide(ctx, set, name, ox + strain, oy + (8 + p * 100) * u + breath * 0.5 + rest, u, t, false);
      break;
    case "pulldown": {
      const k = 1 + 0.12 * p;
      drawSide(ctx, set, name, ox + strain, oy + (8 + p * 115) * u + breath * 0.5 + rest, u * k, t, false);
      break;
    }
    case "row": {
      const k = 1 + 0.3 * p;
      const y = oy + (-30 + p * 70) * u + breath + rest;
      drawSide(ctx, set, name, ox + strain, y, u * k, t, false);
      break;
    }
    case "crunch": {
      const k = 1 + 0.06 * p;
      drawSide(ctx, set, name, ox + strain, oy + (34 - p * 44) * u + breath + rest, u * k, t, false);
      break;
    }
    case "handles":
      for (let sg = -1; sg <= 1; sg += 2) drawSide(ctx, set, name, ox + sg * strain, oy + (18 + p * 12) * u + breath * 0.5 + rest, u, t, sg < 0);
      break;
    case "bike": {
      const cad = t * (tr.phase === "set" ? 7 : 3);
      ctx.save();
      ctx.translate(ox, oy + 30 * u);
      ctx.rotate(Math.sin(cad) * 0.035 * (1 + p));
      drawSide(ctx, set, name, strain, (-30 + Math.abs(Math.sin(cad)) * 6 + p * 8) * u + breath + rest, u, t, false);
      ctx.restore();
      break;
    }
    case "curl":
    case "kettle":
      for (let sg = -1; sg <= 1; sg += 2) {
        // The arm that just repped curls; the other hangs low, weight in view.
        const a = sg === tr.side ? 0 : p;
        ctx.save();
        ctx.translate(ox + sg * 175 * u, oy + 150 * u);
        ctx.rotate(sg * (0.14 - a * 0.36));
        drawSide(ctx, set, name, -sg * 175 * u + strain * (a ? 1 : 0), (-150 + 92 - a * 100) * u + breath + rest, u, t, sg < 0);
        ctx.restore();
      }
      break;
    case "glove":
      for (let sg = -1; sg <= 1; sg += 2) {
        const q = sg === tr.side ? 0 : p;
        const k = 1 - 0.32 * q;
        const guard = Math.sin(t * 5 + sg) * 5 * u;
        drawSide(ctx, set, name, ox - sg * 78 * q * u + strain, oy + (24 - 64 * q) * u + guard + rest, u * k, t, sg < 0);
      }
      break;
    case "fist": {
      const cad = t * (tr.phase === "set" ? 9 : 4);
      for (let sg = -1; sg <= 1; sg += 2) {
        const ph = Math.sin(cad + (sg > 0 ? 0 : Math.PI));
        ctx.save();
        ctx.translate(ox + sg * 120 * u, oy + 120 * u);
        ctx.rotate(-sg * (0.1 + ph * 0.1));
        drawSide(ctx, set, name, -sg * 150 * u, (-120 + 26 + ph * 30) * u + rest, u, t, sg < 0);
        ctx.restore();
      }
      break;
    }
  }
}

/** Posing: spotlight, a pool of light at the feet, and the player's own body flexing on each hit. */
function drawStage(ctx, view, tr, t, body, p) {
  const g = cached(ctx, "spot", view.w, view.h, 0, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, h * 0.75);
    gr.addColorStop(0, "rgba(255,244,200,0.22)");
    gr.addColorStop(0.5, "rgba(0,0,0,0.35)");
    gr.addColorStop(1, "rgba(0,0,0,0.85)");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    const fl = c.createRadialGradient(w / 2, h * 0.97, 4, w / 2, h * 0.97, h * 0.22);
    fl.addColorStop(0, "rgba(255,236,180,0.45)");
    fl.addColorStop(1, "rgba(255,236,180,0)");
    c.fillStyle = fl;
    c.save();
    c.translate(w / 2, h * 0.97);
    c.scale(1, 0.28);
    c.translate(-w / 2, -h * 0.97);
    c.fillRect(0, h * 0.5, w, h);
    c.restore();
  });
  blit(ctx, g, 0, 0, view.w, view.h);
  if (!body) return;
  // Sized so the flexed arms clear the meter at every aspect.
  const k = Math.min(view.h / 272, view.w / 300);
  const pump = 1 + p * 0.05;
  vmOpts.flip = false;
  drawSvgSprite(ctx, body._key, body, body.defs, view.w / 2, view.h * 0.975, k * pump, t, vmOpts);
}

/** HUD geometry in the scaled space: meter box and where rep callouts land in view pixels. */
function hudGeom(view) {
  const k = hudScale(view);
  const W = view.w / k;
  const mw = Math.min(540, W * 0.46);
  const mh = 26;
  return { k, W, H: view.h / k, mw, mh, mx: (W - mw) / 2, my: 74 };
}

const GRADE_TONE = { S: COLOR.yellow, A: COLOR.green, B: "#5aa0ff", C: "#c9ced4", F: COLOR.red };
const HIT_COLOR = (h) => (h === PERFECT ? COLOR.yellow : h === GOOD ? COLOR.green : "#8b93a0");

/** A little loaded bar: more and bigger plates for heavier tiers. */
function weightIcon(ctx, x, y, tier, on) {
  ctx.fillStyle = on ? INK : "#c9ced4";
  ctx.fillRect(x - 34, y - 2, 68, 4);
  const plates = [[1, 12], [2, 15], [3, 18]][tier];
  for (const sg of [-1, 1]) {
    for (let i = 0; i < plates[0]; i++) {
      const px = x + sg * (14 + i * 6);
      ctx.fillStyle = on ? INK : "#0c0f14";
      ctx.fillRect(px - 3, y - plates[1] / 2 - 1, 6, plates[1] + 2);
      ctx.fillStyle = tier === 2 ? "#3a4048" : tier === 1 ? COLOR.red : COLOR.blue;
      ctx.fillRect(px - 2, y - plates[1] / 2, 4, plates[1]);
    }
  }
}

/** Meter, rep counter, tier picker and result banner. */
export function drawTrainerHud(ctx, view, tr, energy) {
  const G = hudGeom(view);
  ctx.save();
  if (G.k !== 1) ctx.scale(G.k, G.k);
  if (tr.phase === "choose") drawPicker(ctx, G, tr, energy);
  else drawSetHud(ctx, G, tr);
  ctx.restore();
}

function drawPicker(ctx, G, tr, energy) {
  const cx = G.W / 2;
  const eq = EQUIPMENT[tr.type];
  const pw = 576;
  const ph = 222;
  const px = cx - pw / 2;
  const py = Math.max(24, G.H * 0.2);
  plate(ctx, px, py, pw, ph, "cream");
  text(ctx, eq.name.toUpperCase(), cx, py + 30, 30, COLOR.red, "center", true);
  text(ctx, "PICK YOUR WEIGHT", cx, py + 58, 14, INK, "center");
  const tired = energy < setCost(eq, tr.tier);
  for (let i = 0; i < 3; i++) {
    const T = TIERS[i];
    const on = i === tr.tier;
    const bx = px + 24 + i * 180;
    const by = py + 74 + (on ? -4 : 0);
    plate(ctx, bx, by, 168, on ? 104 : 96, on ? "yellow" : "dark");
    const c = on ? INK : "#e8eef4";
    text(ctx, T.name.toUpperCase(), bx + 84, by + 18, 20, c, "center");
    weightIcon(ctx, bx + 84, by + 42, i, on);
    text(ctx, `${T.reps} reps · ${setCost(eq, i)} energy`, bx + 84, by + 66, 13, c, "center");
    text(ctx, `gains x${T.gain}`, bx + 84, by + 84, 12, on ? INK : COLOR.dim, "center");
    if (on) keycap(ctx, String(i + 1), bx + 6, by + 14, 11);
  }
  const ky = py + ph - 20;
  let kx = cx - 196;
  kx += keycap(ctx, "1", kx, ky) + 4;
  kx += keycap(ctx, "2", kx, ky) + 4;
  kx += keycap(ctx, "3", kx, ky) + 8;
  text(ctx, "weight", kx, ky, 13, INK);
  kx = cx + 14;
  kx += keycap(ctx, "SPACE", kx, ky) + 8;
  text(ctx, "start", kx, ky, 13, INK);
  kx += 50;
  kx += keycap(ctx, "ESC", kx, ky) + 8;
  text(ctx, "leave", kx, ky, 13, INK);
  if (tired) text(ctx, "Not enough energy for this weight", cx, py + ph + 22, 18, COLOR.red, "center", true);
}

function drawSetHud(ctx, G, tr) {
  const modern = isModernArt();
  const cx = G.W / 2;
  const { mw, mh, my } = G;
  const T = tr.tempo;
  // A missed rep knocks the meter sideways.
  const knock = !tr.lastHit && tr.hits.length && tr.repT < 0.3 ? Math.sin(tr.repT * 70) * 6 * (1 - tr.repT / 0.3) : 0;
  const mx = G.mx + knock;
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
  if (tr.phase === "done") {
    drawResult(ctx, G, tr);
    pips(ctx, cx, my + mh + 52, tr);
    return;
  }
  text(ctx, tr._label, cx, my - 24, 18, "#ffffff", "center", true);
  // Meter: track, good zone, perfect zone, cursor.
  const track = cached(ctx, "meter", mw, mh, 8, (g, w, h) => {
    if (!modern) {
      g.fillStyle = INK;
      g.fillRect(4, 4, w, h);
    }
    g.fillStyle = modern ? "rgba(12,14,18,0.8)" : "#2a2f3a";
    g.fillRect(0, 0, w, h);
    // Faint ticks so the sweep speed reads.
    g.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 1; i < 10; i++) g.fillRect(Math.round((w * i) / 10) - 1, h - 7, 2, 4);
    g.fillStyle = modern ? "rgba(90,200,140,0.6)" : COLOR.green;
    g.fillRect(w * (0.5 - T.good), 3, w * T.good * 2, h - 6);
    g.fillStyle = modern ? "rgba(236,204,110,0.95)" : COLOR.yellow;
    g.fillRect(w * (0.5 - T.perfect), 3, w * T.perfect * 2, h - 6);
    if (!modern) {
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.strokeRect(0, 0, w, h);
      g.lineWidth = 1.5;
      g.strokeRect(w * (0.5 - T.good), 3, w * T.good * 2, h - 6);
      g.strokeRect(w * (0.5 - T.perfect), 3, w * T.perfect * 2, h - 6);
    } else {
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, w - 1, h - 1);
    }
  }, `${tr.tier}${tr.assist ? "a" : ""}`);
  blit(ctx, track, mx, my, mw, mh);
  // Hit feedback: the zone flashes on a perfect, a ghost marks where the rep landed.
  if (done && tr.repT < 0.45) {
    const a = 1 - tr.repT / 0.45;
    if (tr.lastHit === PERFECT) {
      const zw = mw * T.perfect * 2;
      const grow = (1 - a) * 10;
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx + mw / 2 - zw / 2, my + 3, zw, mh - 6);
      ctx.globalAlpha = a;
      ctx.strokeStyle = COLOR.yellow;
      ctx.lineWidth = 3;
      ctx.strokeRect(mx + mw / 2 - zw / 2 - grow, my - grow, zw + grow * 2, mh + grow * 2);
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = HIT_COLOR(tr.lastHit);
    ctx.fillRect(Math.round(mx + tr.hitPos * mw) - 3, my - 6, 6, mh + 12);
    ctx.globalAlpha = 1;
  }
  if (tr.phase === "set") {
    const x = Math.round(mx + meterPos(tr.sweeps) * mw);
    ctx.fillStyle = modern ? "rgba(0,0,0,0.6)" : INK;
    ctx.fillRect(x - 4, my - 9, 8, mh + 18);
    ctx.beginPath();
    ctx.moveTo(x - 9, my - 16);
    ctx.lineTo(x + 9, my - 16);
    ctx.lineTo(x, my - 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 2, my - 7, 4, mh + 14);
    ctx.beginPath();
    ctx.moveTo(x - 6, my - 14);
    ctx.lineTo(x + 6, my - 14);
    ctx.lineTo(x, my - 7);
    ctx.closePath();
    ctx.fill();
  }
  // Rep counter pops on each rep.
  const pop = done && tr.repT < 0.25 ? 1 + (0.25 - tr.repT) * 2.4 : 1;
  ctx.save();
  ctx.translate(G.mx + mw + 60, my + mh / 2 - 2);
  ctx.scale(pop, pop);
  text(ctx, tr._count, 0, 0, 34, COLOR.yellow, "center", true);
  ctx.restore();
  text(ctx, "REPS", G.mx + mw + 60, my + mh / 2 + 24, 12, "#ffffff", "center", true);
  if (tr.combo >= 2) text(ctx, `COMBO x${tr.combo}`, G.mx - 60, my + mh / 2, 16, COLOR.cyan, "center", true);
  pips(ctx, cx, my + mh + 16, tr);
  if (tr.phase === "set" && !done) {
    let kx = cx - 120;
    kx += keycap(ctx, "SPACE", kx, my + mh + 46) + 8;
    text(ctx, "or click in the gold zone", kx, my + mh + 46, 14, "#ffffff", "left", true);
  }
}

/** One pip per rep, coloured by how it went. */
function pips(ctx, cx, y, tr) {
  const n = tr.reps;
  const step = 22;
  for (let i = 0; i < n; i++) {
    const h = tr.hits[i];
    const x = Math.round(cx - (n * step) / 2 + i * step + 3);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x - 1, y - 1, 18, 10);
    ctx.fillStyle = h === undefined ? "rgba(255,255,255,0.28)" : HIT_COLOR(h);
    ctx.fillRect(x, y, 16, 8);
  }
}

/** Result banner where the meter was, leaving the middle to the gains callouts. */
function drawResult(ctx, G, tr) {
  const q = tr.quality;
  const grade = q >= 1.05 ? "S" : q >= 0.85 ? "A" : q >= 0.6 ? "B" : q > 0.25 ? "C" : "F";
  const perfect = tr.hits.filter((h) => h === PERFECT).length;
  const e = Math.min(1, tr.doneT * 5);
  const k = 1 + 2.2 * (e - 1) ** 3 + 1.2 * (e - 1) ** 2;
  ctx.save();
  ctx.translate(G.W / 2, G.my + 4);
  ctx.scale(k, k);
  plate(ctx, -200, -44, 400, 88, "red");
  // Grade badge.
  plate(ctx, -188, -34, 68, 68, "dark");
  text(ctx, grade, -154, 2, 50, GRADE_TONE[grade], "center", true);
  text(ctx, tr.kind === "train" ? "SET COMPLETE" : "ROUND DONE", 34, -14, 30, "#ffffff", "center", true);
  text(ctx, `${perfect}/${tr.reps} PERFECT  ·  BEST COMBO ${tr.best}`, 34, 20, 15, "#ffffff", "center", true);
  ctx.restore();
}
