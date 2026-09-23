/**
 * DOM screens over the canvas: title, pause, careers, physique, day summary
 * and competition results. Each screen is a template rendered into #ui;
 * buttons carry data-act and are dispatched to the handlers passed in.
 * Styling (Comic ink vs Modern plates) lives in style.css, keyed on
 * <html data-art-style>.
 */

import { GROUPS } from "../data/equipment.js";
import { EVENTS } from "../data/events.js";
import { physique } from "../rules/stats.js";
import { careerStatus, eligibility } from "../rules/compete.js";
import { clockText } from "../rules/day.js";
import { portraitSvg } from "../art/figures.js";
import { isModernArt } from "../../engine/art-style.js";

let root = null;
let handlers = {};
let current = "";

export function initOverlays(el) {
  root = el;
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    e.stopPropagation();
    handlers[b.dataset.act]?.(b.dataset.arg);
  });
}

export const overlayOpen = () => current;

function show(kind, html, h) {
  current = kind;
  handlers = h;
  root.innerHTML = `<div class="screen screen-${kind}">${html}</div>`;
  root.classList.add("open");
}

export function hideOverlay() {
  current = "";
  handlers = {};
  root.innerHTML = "";
  root.classList.remove("open");
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const money = (v) => `$${Math.floor(v).toLocaleString("en-US")}`;
const portrait = (stats) => `<img class="portrait" alt="Your physique" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(stats, isModernArt()))}">`;
const meter = (frac, cls = "") => `<div class="meter ${cls}"><i style="width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%"></i></div>`;
const styleBtn = () => `<button data-act="style">Style: <b>${isModernArt() ? "Modern" : "Comic"}</b></button>`;

const CONTROLS = `
  <dl class="controls">
    <dt>WASD</dt><dd>move (Shift to jog)</dd>
    <dt>Mouse / ← →</dt><dd>look (click the view to lock the mouse)</dd>
    <dt>E</dt><dd>use equipment, desk, vending, home door</dd>
    <dt>Space / Click</dt><dd>hit the rep in the gold zone</dd>
    <dt>1 2 3</dt><dd>pick the weight before a set</dd>
    <dt>Tab</dt><dd>build mode</dd>
    <dt>C</dt><dd>careers</dd>
    <dt>P</dt><dd>physique</dd>
    <dt>Esc</dt><dd>pause</dd>
  </dl>`;

export function showTitle(hasSave, h) {
  show("title", `
    <div class="title-card">
      <h1 class="logo"><span>GYM</span><span>BRO</span></h1>
      <p class="tag">Lift. Grow. Own the gym.</p>
      <div class="buttons">
        ${hasSave ? `<button class="primary" data-act="continue">Continue</button>` : ""}
        <button class="${hasSave ? "" : "primary"}" data-act="new">New Game</button>
        ${styleBtn()}
      </div>
      <p class="hint">Click the view to look around · Esc for the menu</p>
    </div>`, h);
}

export function showPause(h) {
  show("pause", `
    <div class="panel">
      <h2>Paused</h2>
      <div class="buttons">
        <button class="primary" data-act="resume">Resume</button>
        ${styleBtn()}
        <button data-act="save">Save</button>
        <button data-act="quit">Save &amp; Quit to Title</button>
      </div>
      <h3>Controls</h3>
      ${CONTROLS}
    </div>`, h);
}

export function showCareers(g, h) {
  const status = careerStatus(g);
  const cards = status.map((c) => {
    const events = c.events.map((id) => {
      const e = EVENTS[id];
      const el = eligibility(g, id);
      return `<div class="event">
        <div><b>${esc(e.name)}</b> <small>${e.kind === "show" ? "Physique show" : "Powerlifting meet"} · entry ${money(e.entry)} · 1st ${money(e.prizes[0])}</small></div>
        <button ${el.ok ? "" : "disabled"} data-act="enter" data-arg="${id}">${el.ok ? "Enter" : esc(el.reason)}</button>
      </div>`;
    }).join("");
    const products = c.products
      ? `<ul class="products ${c.locked ? "locked" : ""}">${c.products.map((p) => `<li>${esc(p)}${c.locked ? " <small>(locked)</small>" : " <small>coming soon</small>"}</li>`).join("")}</ul>`
      : "";
    return `<section class="career ${c.locked ? "locked" : ""}">
      <header><h3>${esc(c.name)}</h3><span class="rank">${esc(c.rankName)}</span></header>
      <p>${esc(c.blurb)}</p>
      ${c.next ? `<div class="next">Next: <b>${esc(c.next.name)}</b> — ${esc(c.next.text)}</div>${meter(c.next.progress)}` : `<div class="next">Top rank reached.</div>`}
      ${events}${products}
    </section>`;
  }).join("");
  const last = g.career.results.slice(-3).reverse().map((r) => `<li>Day ${r.day}: ${esc(EVENTS[r.id].name)} — ${ordinal(r.place)}${r.prize ? `, ${money(r.prize)}` : ""}</li>`).join("");
  show("careers", `
    <div class="panel wide">
      <h2>Careers</h2>
      <div class="careers">${cards}</div>
      ${last ? `<h3>Recent results</h3><ul class="results">${last}</ul>` : ""}
      <div class="buttons"><button class="primary" data-act="close">Back to the gym</button></div>
    </div>`, h);
}

const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

function fatigueRows(fat) {
  return GROUPS.map((gname) => `<div class="row"><span>${gname}</span>${meter(fat[gname] / 100, "fatigue")}<small>${fat[gname] < 20 ? "fresh" : fat[gname] < 60 ? "worked" : "sore"}</small></div>`).join("");
}

function muscleRows(mus) {
  return GROUPS.map((gname) => `<div class="row"><span>${gname}</span>${meter(mus[gname] / 60, "muscle")}<small>${mus[gname].toFixed(1)}</small></div>`).join("");
}

export function showStats(g, h) {
  const s = g.stats;
  show("stats", `
    <div class="panel wide split">
      <div class="left">${portrait(s)}<div class="phys">Physique <b>${physique(s).toFixed(1)}</b></div></div>
      <div class="right">
        <h2>Your Body</h2>
        <div class="stats">
          <div>Strength <b>${s.str.toFixed(1)}</b></div>
          <div>Endurance <b>${s.end.toFixed(1)}</b></div>
          <div>Body fat <b>${s.bf.toFixed(1)}%</b></div>
          <div>Energy <b>${Math.round(s.energy)}</b></div>
        </div>
        <h3>Muscle</h3>${muscleRows(s.mus)}
        <h3>Fatigue <small>(sore muscles gain less — mix it up)</small></h3>${fatigueRows(s.fat)}
        <div class="buttons"><button class="primary" data-act="close">Back</button></div>
      </div>
    </div>`, h);
}

export function showSummary(sum, g, h) {
  const joined = sum.joined > 0 ? `+${sum.joined} joined` : sum.joined < 0 ? `${-sum.joined} quit` : "no change";
  show("summary", `
    <div class="panel wide split">
      <div class="left">${portrait(g.stats)}</div>
      <div class="right">
        <h2>Day ${sum.day} Done</h2>
        ${sum.passedOut ? `<p class="warn">You passed out on the gym floor. Recovery was poor.</p>` : ""}
        <div class="stats">
          <div>Dues collected <b>${money(sum.dues)}</b></div>
          <div>Members <b>${sum.members}</b> <small>${joined}</small></div>
          <div>Sets today <b>${sum.sets}</b></div>
          <div>Strength <b>+${sum.str.toFixed(2)}</b></div>
          <div>Endurance <b>+${sum.end.toFixed(2)}</b></div>
          <div>Physique <b>${sum.phys.toFixed(1)}</b></div>
          <div>Gym appeal <b>${sum.appeal}</b></div>
          <div>Bank <b>${money(g.money)}</b></div>
        </div>
        <h3>Recovery</h3>${fatigueRows(sum.fatigue)}
        <p class="hint">Game saved. Day ${g.day} starts at ${clockText(g.time)}.</p>
        <div class="buttons"><button class="primary" data-act="close">Rise and grind</button></div>
      </div>
    </div>`, h);
}

export function showResults(id, res, g, h) {
  const e = EVENTS[id];
  const rows = res.field.map((f, i) => `<li class="${f.you ? "you" : ""}"><span>${ordinal(i + 1)}</span><span>${esc(f.name)}</span><b>${f.score.toFixed(1)}</b></li>`).join("");
  show("results", `
    <div class="panel">
      <h2>${esc(e.name)}</h2>
      <p class="placing">You placed <b>${ordinal(res.place)}</b>${res.prize ? ` and won <b>${money(res.prize)}</b>` : ""}! <small>+${res.rep} reputation</small></p>
      <ol class="field">${rows}</ol>
      <div class="buttons"><button class="primary" data-act="close">Back to the gym</button></div>
    </div>`, h);
}

