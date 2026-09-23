/**
 * Game orchestrator: owns the save state, the world (raycaster, player,
 * members, sprite scene) and the modes, and turns input into rule calls.
 *
 * Modes: title (DOM title over an orbiting camera), play (walk the gym),
 * train (minigame over the world), build (overhead editor), menu (a DOM
 * panel over the paused world). Rules in ./rules are pure; this module is
 * the only place that replaces `state`.
 */

import { createInput } from "../engine/input.js";
import { createTouchControls } from "../engine/touch-controls.js";
import { createAudio } from "../engine/audio.js";
import { createRaycaster } from "../engine/raycaster.js";
import { setShadeColor, warmSvgSprites } from "../engine/sprite.js";
import { isModernArt, setArtStyle, onArtStyleChange, ART_COMIC, ART_MODERN } from "../engine/art-style.js";
import { buildMap, SPAWN } from "./world/map.js";
import { buildTextures } from "./world/textures.js";
import { createPlayer, updatePlayer, cameraOf } from "./world/player.js";
import { createCrowd, updateCrowd, resetCrowd } from "./world/members.js";
import { createScene, rebuildScene, updateScene, playerSprite, worldSet, memberSprite } from "./world/scene.js";
import { EQUIPMENT } from "./data/equipment.js";
import { EVENTS } from "./data/events.js";
import { MEMBER_LOOKS } from "./art/figures.js";
import { newGame as freshState, endDay, SET_MINUTES, DAY_END, gymAppeal, STARTER_GYM } from "./rules/day.js";
import { trainSet, TIERS } from "./rules/stats.js";
import { placementError, findAt, sellValue } from "./rules/build.js";
import { eligibility, eventScore, awardScore, resolveEvent, applyEvent } from "./rules/compete.js";
import { rngFor, SALT } from "./rules/rng.js";
import { createPersistence } from "./persist.js";
import { createInteraction } from "./interact.js";
import { createMenus } from "./menus.js";
import { createTrainer, startTrainer, updateTrainer, drawViewmodel, drawTrainerHud, trainerCamDz } from "./train.js";
import { PERFECT, GOOD } from "./rules/timing.js";
import { drawHud } from "./ui/hud.js";
import { createBuild, updateBuild, drawBuild, flash } from "./ui/build.js";
import { callout, updateCallouts, drawCallouts, clearCallouts } from "./ui/callouts.js";
import { cached, blit, COLOR } from "./ui/kit.js";
import { initOverlays, showTitle, showSummary, showResults, showLegend, hideOverlay, overlayOpen } from "./ui/overlays.js";

const BINDINGS = {
  forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"], left: ["KeyA"], right: ["KeyD"],
  turnL: ["ArrowLeft"], turnR: ["ArrowRight"], run: ["ShiftLeft", "ShiftRight"],
  use: ["KeyE"], alt: ["KeyF"], rep: ["Space"], build: ["Tab"], careers: ["KeyC"], stats: ["KeyP"], gym: ["KeyG"],
  pause: ["Escape"], rotate: ["KeyR"], pageNext: ["KeyQ"],
  slot1: ["Digit1"], slot2: ["Digit2"], slot3: ["Digit3"], slot4: ["Digit4"], slot5: ["Digit5"], slot6: ["Digit6"],
  slot7: ["Digit7"], slot8: ["Digit8"], slot9: ["Digit9"],
};

/** On-screen prompt labels per input device. */
const PAD_KEYS = { use: "A", alt: "X", build: "LB", careers: "Y", stats: "BACK", pause: "START", gym: "START", rep: "A" };
const TOUCH_KEYS = { use: "USE", alt: "ALT", build: "BUILD", careers: "CAREERS", stats: "STATS", pause: "II", gym: "II", rep: "REP" };

/** Game minutes per real second while walking around. */
const MIN_PER_SEC = 2;
const FOG = { comic: [34, 40, 54], modern: [30, 28, 26] };
const HIT_STOP = 0.14;

export function createGame(canvas, uiRoot) {
  const input = createInput(canvas, BINDINGS);
  const touch = createTouchControls(input);
  // A touch device starts with touch prompts, before the first tap.
  if (touch.el) input.device = "touch";
  const audio = createAudio();
  const store = createPersistence();
  const settings = store.settings();
  if (settings.bindings) input.setBindings({ ...BINDINGS, ...settings.bindings });
  let map = buildMap();
  const rc = createRaycaster({ fov: 75, wallH: 1.5, cm: 200, fogNear: 3, fogFar: 20, fogMax: 0.62 });
  rc.setWorld(map);
  let occ = new Int16Array(map.w * map.h); // placed index + 1 per cell
  const cam = { x: 0, y: 0, angle: 0, z: 0.8, pitch: 0 };
  const renderOpts = { ink: true };
  let fogCss = "#000";
  let lastMode = "";

  const g = {
    mode: "title",
    state: null,
    player: createPlayer(SPAWN[0] + 0.5, SPAWN[1] + 0.5, -Math.PI * 0.75),
    crowd: createCrowd(),
    scene: createScene(),
    trainer: createTrainer(),
    build: createBuild(),
    target: null,
    shake: 0,
    hitStop: 0,
    flexT: 0,
    body: null,
    bodyKey: -1,
    pending: null,
    queue: [],
    lookHintT: 0,
    trainIndex: -1,
    titleCam: { x: 13, y: 4, a: Math.PI * 0.8 },
    view: { w: 1280, h: 720 },
    settings,
    rc,
    get map() { return map; },
    get occ() { return occ; },
    keyLabel(action) {
      if (input.device === "gamepad") return PAD_KEYS[action] || "?";
      if (input.device === "touch") return TOUCH_KEYS[action] || "?";
      const code = input.bindings()[action]?.[0] || "";
      return code.replace(/^Key/, "").replace(/^Digit/, "").replace("Escape", "ESC").replace("Space", "SPACE").toUpperCase();
    },
  };

  const applySettings = () => {
    g.trainer.assist = settings.assist;
    g.trainer.calm = settings.calm;
    g.player.sens = settings.sens;
    g.player.invertY = settings.invertY;
  };
  applySettings();

  const interaction = createInteraction(g, { audio, pop, sleep, openShop: () => menus.openShop() });
  const menus = createMenus(g, {
    audio, store, input, settings, uiRoot, defaultBindings: BINDINGS, applySettings, refreshGym, pop, persist,
    toTitle, toggleStyle, enterEvent, prices: interaction.prices, buy: interaction.buy, invalidateTarget: interaction.invalidate,
  });
  const { findTarget, interact } = interaction;
  const { releaseMouse, openMenu, resume, next, openPause, openCareers, openStats, openShop, openGym, openSettings } = menus;

  // Rep feedback: sound per judged rep, and a hit-stop on a perfect set's last rep.
  g.trainer.onRep = (h, combo) => {
    audio.play(h === PERFECT ? "rep_perfect" : h === GOOD ? "rep_good" : "rep_miss", { pitch: h ? Math.min(combo, 8) * 0.5 : 0 });
    if (h) audio.play("clank", { gain: 0.4 });
  };

  // ── World and style ────────────────────────────────────────────────────
  function applyStyle() {
    const modern = isModernArt();
    const fog = modern ? FOG.modern : FOG.comic;
    rc.setFog(fog);
    fogCss = `rgb(${fog[0]},${fog[1]},${fog[2]})`;
    rc.setTextures(buildTextures(modern));
    setShadeColor(fog[0] / 255, fog[1] / 255, fog[2] / 255);
    renderOpts.ink = !modern;
    const set = worldSet(modern);
    warmSvgSprites(set.sprites, set.defs, 1.2);
    for (let i = 0; i < MEMBER_LOOKS.length; i++) for (const p of ["idle", "walkA", "walkB", "liftA", "liftB"]) memberSprite(i, p, modern);
    refreshGym();
    g.bodyKey = -1;
  }

  /** Switch between the starter room and the room with the east annex open. */
  function syncMap() {
    const annex = !!g.state?.gym.upgrades.annex;
    if (annex === map.w > 16) return;
    map = buildMap(annex);
    rc.setWorld(map);
    occ = new Int16Array(map.w * map.h);
    resetCrowd(g.crowd);
  }

  function refreshGym() {
    syncMap();
    occ.fill(0);
    const placed = g.state ? g.state.gym.placed : STARTER_GYM;
    for (let i = 0; i < placed.length; i++) occ[placed[i].y * map.w + placed[i].x] = i + 1;
    interaction.invalidate();
    rebuildScene(g.scene, placed, isModernArt());
  }

  const solid = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= map.w || cy >= map.h) return true;
    const i = cy * map.w + cx;
    return map.walls[i] > 0 || map.blocked[i] > 0 || occ[i] > 0;
  };

  function updateBody(dt) {
    const p = g.player;
    // Stand still facing the mirror and your reflection starts flexing.
    const facingMirror = Math.cos(p.angle) < -0.75 && p.x < 6;
    g.flexT = facingMirror && !p.moving ? g.flexT + dt : 0;
    const pose = g.mode === "train" && g.trainer.game === "pose" ? "flex" : g.flexT > 1.2 ? "flex" : "idle";
    const st = g.state.stats;
    const m = st.mus;
    // Numeric key: no string built per frame.
    let key = (pose === "flex" ? 2 : 1) * 2 + (isModernArt() ? 1 : 0);
    key = ((((key * 101 + (m.chest | 0)) * 101 + (m.back | 0)) * 101 + (m.legs | 0)) * 101 + (m.arms | 0)) * 101 + (m.core | 0);
    key = key * 64 + (st.bf | 0);
    if (key !== g.bodyKey) {
      g.bodyKey = key;
      g.body = playerSprite(st, pose, isModernArt());
    }
  }

  function pop(msg, color = COLOR.yellow, burst = true) {
    callout(msg, g.view.w / 2, g.view.h * 0.4, { burst, color, size: 30 });
  }

  // ── Day, training and events ───────────────────────────────────────────
  function persist(state) {
    const ok = store.write(state);
    if (!ok) pop("SAVE FAILED: STORAGE FULL OR BLOCKED", COLOR.red, false);
    return ok;
  }

  function sleep(passedOut) {
    const { state, summary } = endDay(g.state, passedOut);
    // Top ranks earned tonight become legends, shown after the summary.
    const tops = summary.ups.filter((u) => u.top && !state.career.legends.includes(u.id));
    g.state = tops.length ? { ...state, career: { ...state.career, legends: [...state.career.legends, ...tops.map((u) => u.id)] } } : state;
    persist(g.state);
    Object.assign(g.player, createPlayer(SPAWN[0] + 0.5, SPAWN[1] + 0.5, -Math.PI * 0.75));
    applySettings();
    resetCrowd(g.crowd);
    refreshGym();
    audio.play("sleep");
    if (summary.news?.sound) audio.play(summary.news.sound);
    if (summary.ups.length) audio.play("fanfare");
    g.queue = tops.map((u) => () => openMenu(() => showLegend(u, g.state, { close: next })));
    openMenu(() => showSummary(summary, g.state, { close: next }));
  }

  function finishSet(q) {
    const s = g.state;
    const tr = g.trainer;
    const eq = EQUIPMENT[tr.type];
    const r = trainSet(s.stats, eq, q, tr.tier, s.today.boost);
    if (!r) return;
    const perfect = q >= 1.2;
    g.state = {
      ...s, stats: r.stats, time: s.time + SET_MINUTES,
      today: { ...s.today, sets: s.today.sets + 1, str: s.today.str + r.gains.str, end: s.today.end + r.gains.end, perfect: s.today.perfect + (perfect ? 1 : 0) },
    };
    const cx = g.view.w / 2;
    const y = g.view.h * 0.55;
    let k = 0;
    if (perfect) {
      audio.play("pr");
      callout("PERFECT SET!", cx, g.view.h * 0.3, { burst: true, size: 44, color: COLOR.yellow, life: 1.6 });
      if (!settings.calm) {
        g.hitStop = HIT_STOP;
        g.shake = 14;
      }
    }
    if (r.gains.str >= 0.01) callout(`+${r.gains.str.toFixed(2)} STR`, cx - 160, y, { size: 30, color: COLOR.red, life: 1.8, rot: -0.08 }), k++;
    if (r.gains.end >= 0.01) callout(`+${r.gains.end.toFixed(2)} END`, cx + 160, y, { size: 30, color: "#5aa0ff", life: 1.8, rot: 0.08 }), k++;
    for (const m in r.gains.mus) {
      if (r.gains.mus[m] < 0.05) continue;
      callout(`+${m.toUpperCase()}`, cx + (k % 2 ? 1 : -1) * (80 + k * 30), y + 60 + (k >> 1) * 30, { size: 22, color: COLOR.yellow, life: 1.8 });
      k++;
    }
    g.bodyKey = -1;
  }

  const eventRng = (id) => rngFor(g.state.seed, g.state.day, SALT.event, g.state.career.results.length, id.length);

  function finishEvent(q) {
    const tr = g.trainer;
    const e = EVENTS[tr.eventId];
    const res = resolveEvent(tr.eventId, eventScore(e.kind, g.state.stats, q), eventRng(tr.eventId));
    g.state = applyEvent(g.state, tr.eventId, res);
    g.pending = { id: tr.eventId, res };
    audio.play(res.place === 1 ? "fanfare" : "cheer");
  }

  function enterEvent(id) {
    const el = eligibility(g.state, id);
    if (!el.ok) return;
    const e = EVENTS[id];
    if (e.kind === "award") {
      // Awards judge the gym itself: no minigame, straight to the results.
      const res = resolveEvent(id, awardScore(g.state, gymAppeal(g.state)), eventRng(id));
      g.state = applyEvent(g.state, id, res);
      audio.play(res.place === 1 ? "fanfare" : "cheer");
      openMenu(() => showResults(id, res, g.state, { close: resume }));
      return;
    }
    hideOverlay();
    startTrainer(g.trainer, e.kind, "", id);
    g.mode = "train";
    pop(e.kind === "show" ? "SHOWTIME!" : "LIFT OFF!", COLOR.yellow);
  }

  function toggleStyle() {
    setArtStyle(isModernArt() ? ART_COMIC : ART_MODERN);
  }

  onArtStyleChange(() => {
    applyStyle();
    clearCallouts();
    if (overlayOpen() === "pause") openPause();
    if (overlayOpen() === "title") toTitle();
  });

  function toTitle() {
    releaseMouse();
    g.mode = "title";
    showTitle(!!store.load(), {
      continue: () => { const st = store.load(); if (st) start(st); },
      new: () => start(freshState()),
      style: toggleStyle,
    });
  }

  function start(state) {
    const { v, ...clean } = state;
    g.state = clean;
    g.queue = [];
    syncMap();
    Object.assign(g.player, createPlayer(SPAWN[0] + 0.5, SPAWN[1] + 0.5, -Math.PI * 0.75));
    applySettings();
    resetCrowd(g.crowd);
    refreshGym();
    g.bodyKey = -1;
    updateBody(0);
    hideOverlay();
    g.mode = "play";
    g.lookHintT = input.device === "keyboard" ? 6 : 0;
    pop(`DAY ${g.state.day}`, COLOR.yellow);
  }

  // ── Build mode ─────────────────────────────────────────────────────────
  function applyBuild(a) {
    const s = g.state;
    const b = g.build;
    if (a.kind === "exit") {
      b.on = false;
      g.mode = "play";
      return;
    }
    if (a.kind === "sell") {
      const i = findAt(s.gym.placed, a.x, a.y);
      if (i < 0) return;
      const eq = EQUIPMENT[s.gym.placed[i].type];
      const placed = s.gym.placed.filter((_, k) => k !== i);
      g.state = { ...s, money: s.money + sellValue(eq.cost), gym: { ...s.gym, placed } };
      flash(b, `Sold ${eq.name} for $${sellValue(eq.cost)}`);
      audio.play("cash");
      refreshGym();
      return;
    }
    const eq = EQUIPMENT[a.type];
    if (findAt(s.gym.placed, a.x, a.y) >= 0) return;
    const err = placementError(map, s.gym.placed, a.x, a.y, a.rot);
    if (err) return flash(b, err), audio.play("error");
    if (Math.floor(g.player.x) === a.x && Math.floor(g.player.y) === a.y) return flash(b, "You're standing there");
    if (s.money < eq.cost) return flash(b, `Need $${eq.cost}`), audio.play("error");
    g.state = { ...s, money: s.money - eq.cost, gym: { ...s.gym, placed: [...s.gym.placed, { type: a.type, x: a.x, y: a.y, rot: a.rot, wear: 0 }] } };
    flash(b, `${eq.name} installed! Appeal ${gymAppeal(g.state)}`);
    audio.play("clank");
    refreshGym();
  }

  function openBuild() {
    releaseMouse();
    g.build.on = true;
    g.mode = "build";
  }

  // ── Loop ───────────────────────────────────────────────────────────────
  function syncModeOutputs() {
    const busy = g.mode === "train";
    const event = busy && g.trainer.kind !== "train";
    const mode = g.mode === "menu" && overlayOpen() !== "title" ? "menu" : g.mode;
    audio.setMusic(g.mode === "title" ? "title" : event ? "event" : "gym");
    audio.setIntensity(event ? 1 : busy ? (g.trainer.phase === "set" ? 0.7 : 0.4) : g.mode === "menu" ? 0.1 : 0.25);
    if (mode !== lastMode) {
      lastMode = mode;
      touch.setMode(mode);
    }
  }

  function update(dt, t) {
    input.poll(dt);
    g.shake = settings.calm ? 0 : Math.max(0, g.shake - dt * 40);
    updateCallouts(dt);
    syncModeOutputs();
    // Hit-stop: the world holds for a beat after a perfect set.
    if (g.hitStop > 0) {
      g.hitStop -= dt;
      input.endFrame();
      return;
    }
    const locked = document.pointerLockElement === canvas;
    if (g.mode === "title") {
      // A slow sway around a pose that keeps the mural out from behind the logo.
      const tc = g.titleCam;
      g.player.x = tc.x;
      g.player.y = tc.y;
      g.player.angle = tc.a + Math.sin(t * 0.15) * 0.15;
    } else if (g.mode === "play") {
      // Without pointer lock (denied, embedded browser, Safari quirks) the mouse still looks while the button is held.
      const drag = !locked && input.mouse.down && input.device !== "touch";
      if (locked || input.device !== "keyboard" || (drag && (input.mouse.dx || input.mouse.dy))) g.lookHintT = 0;
      else if (g.lookHintT > 0) g.lookHintT -= dt;
      updatePlayer(g.player, input, dt, locked || drag, solid);
      g.state.time += dt * MIN_PER_SEC;
      g.target = findTarget();
      if (g.target && (input.pressed("use") || input.pressed("alt"))) interact(g.target, input.pressed("alt"));
      else if (input.pressed("build")) openBuild();
      else if (input.pressed("careers")) openCareers();
      else if (input.pressed("stats")) openStats();
      else if (input.pressed("gym")) openGym();
      else if (input.pressed("pause") && !locked) openPause();
      if (g.mode === "play" && g.state.time >= DAY_END) {
        pop("PASSED OUT!", "#a8b0bc");
        sleep(true);
      }
    } else if (g.mode === "train") {
      if (locked) g.player.angle += input.mouse.dx * 0.0006;
      const r = updateTrainer(g.trainer, dt, input, g.view, g.state.stats.energy);
      if (typeof r === "number") {
        if (g.trainer.kind === "train") finishSet(r);
        else finishEvent(r);
      } else if (r === "cancel") {
        g.trainer.on = false;
        g.mode = "play";
      } else if (r === "close") {
        g.mode = "play";
        if (g.pending) {
          const { id, res } = g.pending;
          g.pending = null;
          openMenu(() => showResults(id, res, g.state, { close: resume }));
        }
      }
      if (!settings.calm) g.shake = Math.max(g.shake, g.trainer.shake);
    } else if (g.mode === "build") {
      const a = updateBuild(g.build, input, g.view, map, g.state.gym.placed, dt);
      if (a) applyBuild(a);
    } else if (g.mode === "menu") {
      const k = overlayOpen();
      const toggles = (k === "careers" && input.pressed("careers")) || (k === "stats" && input.pressed("stats")) || (k === "gym" && input.pressed("gym"));
      if (k === "settings" && input.pressed("pause") && g.settingsBack) g.settingsBack();
      else if ((input.pressed("pause") || toggles) && k !== "title" && k !== "settings") {
        if (k === "summary" || k === "legend") next();
        else resume();
      }
    }
    if (g.state && g.mode !== "menu" && g.mode !== "title") {
      const busy = g.mode === "train" && g.trainer.kind === "train" ? g.trainIndex : -1;
      updateCrowd(g.crowd, dt, g.state.roster, g.state.time, map, g.state.gym.placed, busy);
    }
    if (g.state) updateBody(dt);
    // Your own reflection would loom behind the bar mid-set; it returns when you walk.
    updateScene(g.scene, g.crowd, g.player, g.body, isModernArt(), g.mode === "train" && g.trainer.kind === "train");
    input.endFrame();
  }

  function vignette(ctx, view) {
    const modern = isModernArt();
    const c = cached(ctx, "vignette", view.w, view.h, 0, (v, w, h) => {
      const gr = v.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(1, modern ? "rgba(10,8,6,0.55)" : "rgba(4,6,11,0.42)");
      v.fillStyle = gr;
      v.fillRect(0, 0, w, h);
    });
    blit(ctx, c, 0, 0, view.w, view.h);
  }

  function render(ctx, view, t) {
    g.view = view;
    if (!view.w || !view.h) return;
    if (g.mode === "build") {
      drawBuild(ctx, view, g.build, g, map, g.crowd, g.player, t);
      drawCallouts(ctx);
      return;
    }
    if (g.state || g.mode === "title") {
      cameraOf(g.player, cam);
      cam.z += trainerCamDz(g.trainer);
      if (g.mode === "train") cam.pitch = 0;
      ctx.fillStyle = fogCss;
      ctx.fillRect(0, 0, view.w, view.h);
      const sx = g.shake ? (Math.random() - 0.5) * g.shake : 0;
      const sy = g.shake ? (Math.random() - 0.5) * g.shake : 0;
      ctx.save();
      ctx.translate(sx, sy);
      rc.render(ctx, view, cam, g.scene.recs, g.scene.n, t, renderOpts);
      if (g.mode === "train") {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(-20, -20, view.w + 40, view.h + 40);
        drawViewmodel(ctx, view, g.trainer, t, g.state.stats.mus.arms, g.body);
      }
      ctx.restore();
      vignette(ctx, view);
      if (g.mode === "train") drawTrainerHud(ctx, view, g.trainer, g.state.stats.energy);
      else if (g.mode === "play") drawHud(ctx, view, g, g.target, document.pointerLockElement === canvas);
    }
    drawCallouts(ctx);
  }

  // Audio can only start from a user gesture.
  const unlock = () => audio.unlock();
  addEventListener("pointerdown", unlock);
  addEventListener("keydown", unlock);

  // Pointer lock: click the view to look; losing the lock mid-walk pauses.
  canvas.addEventListener("click", () => {
    if (g.mode === "play" && !document.pointerLockElement && input.device !== "touch") canvas.requestPointerLock?.()?.catch?.(() => {});
  });
  document.addEventListener("pointerlockchange", () => {
    const suppressed = menus.takeSuppress();
    if (!document.pointerLockElement && g.mode === "play" && !suppressed) openPause();
  });
  // Leaving the tab mid-day is a safe point too.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && g.state && g.mode !== "title") store.write(g.state);
  });

  initOverlays(uiRoot);
  g.state = null;
  applyStyle();
  toTitle();

  // Debug / test surface.
  Object.assign(g, {
    update, render, store, audio, input,
    save: { load: () => store.load() && { state: store.load() }, write: (d) => store.write(d.state), clear: () => store.clear() },
    newGame: () => start(freshState()),
    continueGame: () => { const st = store.load(); if (st) start(st); return !!st; },
    teleport(x, y, angle = g.player.angle) { Object.assign(g.player, { x, y, angle }); },
    train(type, tier = 1) {
      startTrainer(g.trainer, "train", type);
      g.trainIndex = g.state.gym.placed.findIndex((p) => p.type === type);
      g.trainer.tier = tier;
      g.mode = "train";
    },
    rep: () => { input.mouse.clicked = true; },
    beginSet: () => { g.trainer.phase = "set"; g.trainer.reps = TIERS[g.trainer.tier].reps; },
    openBuild, applyBuild, openCareers, openStats, openPause, openGym, openShop, openSettings, enterEvent, sleep, toggleStyle, resume, next,
    setState(patch) { g.state = { ...g.state, ...patch }; refreshGym(); },
  });
  return g;
}
