/**
 * DOM screens over the canvas: title, pause, settings, careers, gym office,
 * shop, physique, day summary, competition results and career finales. Each screen is a template rendered into #ui;
 * buttons carry data-act (range inputs data-input) and are dispatched to
 * the handlers passed in.
 * Styling (Comic ink vs Modern plates) lives in style.css, keyed on
 * <html data-art-style>.
 */

import { GROUPS, EQUIPMENT, SHOP } from "../data/equipment.js";
import { EVENTS, CAREERS } from "../data/events.js";
import { physique } from "../rules/stats.js";
import { careerStatus, eligibility, reqText } from "../rules/compete.js";
import { clockText, gymReport } from "../rules/day.js";
import { isBroken } from "../rules/members.js";
import { UPGRADES, UPGRADE_IDS, ADS, upgradeStatus, repairCost } from "../rules/economy.js";
import { PRODUCTS, PRODUCT_IDS, launchStatus, hasProduct } from "../rules/supplements.js";
import { GOALS, memberMood, favStatus } from "../rules/roster.js";
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
  root.addEventListener("input", (e) => {
    const el = e.target.closest("[data-input]");
    if (el) handlers[el.dataset.input]?.(el.value, el.dataset.arg);
  });
}

export const overlayOpen = () => current;

function show(kind, html, h) {
  // Re-rendering the same screen keeps its scroll position.
  const prev = current === kind ? root.querySelector(".panel")?.scrollTop || 0 : 0;
  current = kind;
  handlers = h;
  root.innerHTML = `<div class="screen screen-${kind}">${html}</div>`;
  root.classList.add("open");
  const panel = root.querySelector(".panel");
  if (panel) panel.scrollTop = prev;
  root.querySelector("button.primary, button:not([disabled])")?.focus({ preventScroll: true });
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
    <dt>E</dt><dd>use equipment, desk, shop, home door</dd>
    <dt>F</dt><dd>repair a worn machine, quick-buy a shake</dd>
    <dt>Space / Click</dt><dd>hit the rep in the gold zone</dd>
    <dt>1 2 3</dt><dd>pick the weight before a set</dd>
    <dt>Tab</dt><dd>build mode</dd>
    <dt>C</dt><dd>careers</dd>
    <dt>G</dt><dd>gym office: dues, repairs, upgrades</dd>
    <dt>P</dt><dd>physique</dd>
    <dt>Esc</dt><dd>pause</dd>
    <dt>Gamepad</dt><dd>A use/rep · X alt · Y careers · LB build · Back physique · Start pause</dd>
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
        <button data-act="gym">Gym office</button>
        <button data-act="settings">Settings</button>
        ${styleBtn()}
        <button data-act="save">Save</button>
        <button data-act="quit">Save &amp; Quit to Title</button>
      </div>
      <h3>Controls</h3>
      ${CONTROLS}
    </div>`, h);
}

const KIND = { show: "Physique show", meet: "Powerlifting meet", award: "Industry award" };

export function showCareers(g, h) {
  const status = careerStatus(g);
  const cards = status.map((c) => {
    const events = c.events.map((id) => {
      const e = EVENTS[id];
      const el = eligibility(g, id);
      return `<div class="event">
        <div><b>${esc(e.name)}</b> <small>${KIND[e.kind]} · needs ${esc(reqText(e.req))} · entry ${money(e.entry)} · 1st ${money(e.prizes[0])}</small></div>
        <button ${el.ok ? "" : "disabled"} data-act="enter" data-arg="${id}">${el.ok ? "Enter" : esc(el.reason)}</button>
      </div>`;
    }).join("");
    const perk = c.perks[c.rank] ? `<div class="perk">Unlocked: ${esc(c.perks[c.rank])}</div>` : "";
    const nextPerk = c.next && c.perks[c.rank + 1] ? ` <small>(unlocks ${esc(c.perks[c.rank + 1])})</small>` : "";
    return `<section class="career ${c.locked ? "locked" : ""}">
      <header><h3>${esc(c.name)}</h3><span class="rank">${esc(c.rankName)}</span></header>
      <p>${esc(c.blurb)}</p>
      ${c.next ? `<div class="next">Next: <b>${esc(c.next.name)}</b> — ${esc(c.next.text)}${nextPerk}</div>${meter(c.next.progress)}` : `<div class="next">Top rank reached.</div>`}
      ${perk}${events}${c.id === "supplements" ? suppsBlock(g, c.rank) : ""}
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

function suppsBlock(g, rank) {
  const rows = PRODUCT_IDS.map((id) => {
    const p = PRODUCTS[id];
    const st = launchStatus(g, id, rank);
    const on = hasProduct(g, id);
    return `<li class="${on ? "on" : ""}"><div><b>${esc(p.name)}</b><small>${money(p.margin)}/unit · ${esc(p.perk)}</small></div>
      ${on ? `<span class="pill good">On shelves</span>` : `<button ${st.ok ? "" : "disabled"} data-act="launch" data-arg="${id}">${st.ok ? `Launch ${money(p.launch)}` : esc(st.reason)}</button>`}</li>`;
  }).join("");
  const ads = g.supps.launched.length
    ? `<div class="ads"><small>Ad budget (per day):</small>${ADS.map((a, i) => `<button class="${g.supps.ads === i ? "sel" : ""}" data-act="ads" data-arg="${i}">${esc(a.name)}${a.cost ? ` ${money(a.cost)}` : ""}</button>`).join("")}</div>`
    : "";
  return `<ul class="products">${rows}</ul>${ads}`;
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
          <div>Posing <b>${Math.round((s.posing || 0) * 100)}%</b> <small>posing room</small></div>
          <div>Stage tan <b>${s.tan ? `${s.tan} day${s.tan > 1 ? "s" : ""}` : "none"}</b> <small>tanning bed</small></div>
        </div>
        <h3>Muscle</h3>${muscleRows(s.mus)}
        <h3>Fatigue <small>(sore muscles gain less — mix it up)</small></h3>${fatigueRows(s.fat)}
        <div class="buttons"><button class="primary" data-act="close">Back</button></div>
      </div>
    </div>`, h);
}

const line = (label, v, cls = "") => `<div class="${cls}">${label} <b>${v < 0 ? "-" : ""}${money(Math.abs(v))}</b></div>`;

export function showSummary(sum, g, h) {
  const roster = [sum.joined ? `+${sum.joined} joined` : "", sum.quit ? `${sum.quit} quit` : ""].filter(Boolean).join(", ") || "no change";
  const news = sum.news ? `<p class="news ${sum.news.tone}"><b>${esc(sum.news.title)}:</b> ${esc(sum.news.text)}</p>` : "";
  const broke = sum.broke.length ? `<p class="news bad"><b>Broken:</b> ${sum.broke.map((t) => esc(EQUIPMENT[t].name)).join(", ")}. Repair with F at the machine.</p>` : "";
  const ups = sum.ups.map((u) => `<p class="news good"><b>Rank up!</b> ${esc(u.career)}: ${esc(u.name)}${u.perk ? ` — unlocked ${esc(u.perk)}` : ""}</p>`).join("");
  const reasons = sum.reasons.length ? `<ul class="reasons">${sum.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "";
  show("summary", `
    <div class="panel wide split">
      <div class="left">${portrait(g.stats)}</div>
      <div class="right">
        <h2>Day ${sum.day} Done</h2>
        ${sum.passedOut ? `<p class="warn">You passed out on the gym floor. Recovery was poor.</p>` : ""}
        ${ups}${news}${broke}
        <h3>Ledger</h3>
        <div class="stats ledger">
          ${line("Dues", sum.dues)}
          ${sum.fees ? line("Tanning fees", sum.fees) : ""}
          ${sum.sales.lines.length ? line(`Supplements <small>${sum.sales.units} sold</small>`, sum.sales.revenue) : ""}
          ${line("Rent &amp; upkeep", -sum.costs.rent)}
          ${sum.costs.staff ? line("Staff", -sum.costs.staff) : ""}
          ${sum.costs.ads ? line("Ads", -sum.costs.ads) : ""}
          ${line("Net", sum.net, sum.net < 0 ? "neg" : "pos")}
          ${line("Bank", g.money, g.money < 0 ? "neg" : "")}
        </div>
        <h3>Gym</h3>
        <div class="stats">
          <div>Members <b>${sum.members}</b> <small>${roster}</small></div>
          <div>Satisfaction <b>${sum.sat}%</b></div>
          <div>Gym appeal <b>${sum.appeal}</b></div>
          <div>Sets today <b>${sum.sets}</b></div>
          <div>Strength <b>+${sum.str.toFixed(2)}</b></div>
          <div>Endurance <b>+${sum.end.toFixed(2)}</b></div>
          <div>Physique <b>${sum.phys.toFixed(1)}</b></div>
        </div>
        ${reasons}
        ${peopleBlock(sum)}
        <h3>Recovery</h3>${fatigueRows(sum.fatigue)}
        <p class="hint">Game saved. Day ${g.day} starts at ${clockText(g.time)}.</p>
        <div class="buttons"><button class="primary" data-act="close">Rise and grind</button></div>
      </div>
    </div>`, h);
}

/** Who walked in and who walked out overnight, in their own words. */
function peopleBlock(sum) {
  if (!sum.joinedNames?.length && !sum.left?.length) return "";
  const joined = sum.joinedNames.length ? `<p class="people"><b>Joined:</b> ${sum.joinedNames.map(esc).join(", ")}</p>` : "";
  const left = sum.left.map((l) => `<li><b>${esc(l.name)}</b> left: “${esc(l.why)}”</li>`).join("");
  return `<h3>People</h3>${joined}${left ? `<ul class="reasons quits">${left}</ul>` : ""}`;
}

/** Roster table for the gym office, unhappiest first. */
function rosterBlock(g) {
  const rows = g.roster
    .map((m) => ({ m, mood: memberMood(m, g, g.sat), fav: favStatus(m, g.gym.placed) }))
    .sort((a, b) => a.mood - b.mood)
    .map(({ m, mood, fav }) => `<li><span><b>${esc(m.name)}</b> <small>${GOALS[m.goal].name} · since day ${m.since}</small></span>
      <small class="${fav === "ok" ? "" : "want"}">${esc(EQUIPMENT[m.fav].name)}${fav === "ok" ? "" : fav === "broken" ? " (broken)" : " (missing)"}</small>
      ${meter(mood / 100, mood < 40 ? "fatigue" : "")}<small>${mood}%</small></li>`).join("");
  return `<h3>Members <small>unhappiest first; the least happy leave first</small></h3><ul class="roster">${rows || "<li>No members yet.</li>"}</ul>`;
}

/** The business: members, pricing, machines, upgrades. */
export function showGym(g, ownerRank, h) {
  const r = gymReport(g);
  const machines = g.gym.placed.map((p, i) => {
    const eq = EQUIPMENT[p.type];
    const w = Math.round(p.wear || 0);
    const broken = isBroken(p);
    return `<li class="${broken ? "broken" : ""}"><span>${esc(eq.name)}</span>${meter(w / 100, "wear")}<small>${broken ? "BROKEN" : `${w}%`}</small>
      <button ${w >= 1 && g.money >= repairCost(eq, w) ? "" : "disabled"} data-act="repair" data-arg="${i}">${w >= 1 ? `Fix ${money(repairCost(eq, w))}` : "OK"}</button></li>`;
  }).join("");
  const ups = UPGRADE_IDS.map((id) => {
    const u = UPGRADES[id];
    const st = upgradeStatus(g, id, ownerRank);
    const label = st.ok ? (u.cost ? `Buy ${money(u.cost)}` : "Hire") : esc(st.reason);
    return `<li><div><b>${esc(u.name)}</b><small>${esc(u.desc)}</small></div><button ${st.ok ? "" : "disabled"} data-act="upgrade" data-arg="${id}">${label}</button></li>`;
  }).join("");
  show("gym", `
    <div class="panel wide">
      <h2>Gym Office</h2>
      <div class="stats">
        <div>Members <b>${g.members}</b> <small>/ ${r.cap} capacity</small></div>
        <div>Satisfaction <b>${g.sat}%</b> <small>today ${r.sat}%</small></div>
        <div>Appeal <b>${r.appeal}</b></div>
        <div>Cleanliness <b>${g.gym.clean}%</b></div>
        <div>Tonight's bills <b>${money(r.costs.total)}</b></div>
        <div>Could reach <b>${r.target}</b> <small>members at this price</small></div>
      </div>
      ${r.reasons.length ? `<ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <h3>Daily dues <small>fair price is about ${money(r.fair)}</small></h3>
      <div class="dues">
        <button data-act="dues" data-arg="-5">-5</button><button data-act="dues" data-arg="-1">-1</button>
        <b>${money(g.dues)}</b>
        <button data-act="dues" data-arg="1">+1</button><button data-act="dues" data-arg="5">+5</button>
        <small>${r.demand >= 1.05 ? "Bargain: sign-ups up" : r.demand <= 0.8 ? "Pricey: sign-ups down, members grumble" : "Market rate"}</small>
      </div>
      ${rosterBlock(g)}
      <h3>Machines <small>wear builds with use; broken machines draw no one</small></h3>
      <ul class="machines">${machines || "<li>No equipment yet. Press Tab to build.</li>"}</ul>
      <h3>Staff &amp; upgrades</h3>
      <ul class="products">${ups}</ul>
      <div class="buttons"><button class="primary" data-act="close">Back to the gym</button></div>
    </div>`, h);
}

/** The vending machine. */
export function showShop(g, prices, h) {
  const rows = Object.entries(SHOP).map(([id, it]) => {
    const price = prices[id];
    return `<li><div><b>${esc(it.name)}</b><small>+${it.energy} energy${it.boost > 1 ? ` · ${Math.round((it.boost - 1) * 100)}% gains today` : ""}${it.bf ? " · a little fat" : ""}</small></div>
      <button ${g.money >= price ? "" : "disabled"} data-act="buy" data-arg="${id}">${money(price)}</button></li>`;
  }).join("");
  show("shop", `
    <div class="panel">
      <h2>Vending</h2>
      <p>Energy ${Math.round(g.stats.energy)} · Bank ${money(g.money)}</p>
      <ul class="products">${rows}</ul>
      <div class="buttons"><button class="primary" data-act="close">Done</button></div>
    </div>`, h);
}

const ACTION_NAMES = {
  forward: "Forward", back: "Back", left: "Strafe left", right: "Strafe right", turnL: "Turn left", turnR: "Turn right",
  run: "Jog", use: "Use", alt: "Alt / repair", rep: "Hit rep", build: "Build mode", careers: "Careers", gym: "Gym office",
  stats: "Physique", pause: "Pause", rotate: "Rotate (build)", pageNext: "Next page (build)",
};
const keyName = (c) => c.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Arrow/, "").replace(/(Left|Right)$/, " $1").trim();

/** Audio, accessibility and key bindings. */
export function showSettings(st, bindings, h, capturing = "") {
  const vol = (bus, label) => `<label class="set"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(st.volume[bus] * 100)}" data-input="volume" data-arg="${bus}"><small>${Math.round(st.volume[bus] * 100)}</small></label>`;
  const toggle = (key, label, note) => `<label class="set"><span>${label}</span><button class="${st[key] ? "sel" : ""}" data-act="toggle" data-arg="${key}">${st[key] ? "On" : "Off"}</button><small>${note}</small></label>`;
  const keys = Object.keys(ACTION_NAMES).filter((a) => bindings[a]).map((a) => `<li><span>${ACTION_NAMES[a]}</span>
    <button class="${capturing === a ? "sel" : ""}" data-act="rebind" data-arg="${a}">${capturing === a ? "Press a key…" : esc(bindings[a].map(keyName).join(" / "))}</button></li>`).join("");
  show("settings", `
    <div class="panel wide">
      <h2>Settings</h2>
      <h3>Audio</h3>
      ${vol("master", "Master")}${vol("music", "Music")}${vol("sfx", "Effects")}
      ${toggle("muted", "Mute", "Silence everything")}
      <h3>Look</h3>
      <label class="set"><span>Sensitivity</span><input type="range" min="25" max="300" value="${Math.round(st.sens * 100)}" data-input="sens"><small>${st.sens.toFixed(2)}x</small></label>
      ${toggle("invertY", "Invert Y", "Push up to look down")}
      ${toggle("dragLook", "Hold to look", "Off: the view follows the mouse. On: hold the button and drag")}
      <p class="hint">Click the view to lock the mouse where your browser allows it. Otherwise the view follows the cursor, and resting it near the left or right edge keeps turning. Arrow keys turn too.</p>
      <h3>Accessibility</h3>
      ${toggle("assist", "Easier timing", "Slower rep cursor, wider sweet spot")}
      ${toggle("calm", "Reduce motion", "No screen shake or hit-stop")}
      ${toggle("tips", "Getting-started tips", "The checklist under your stats")}
      <h3>Keys <small>click an action, then press the new key (Esc cancels)</small></h3>
      <ul class="keys">${keys}</ul>
      <div class="buttons"><button data-act="resetKeys">Reset keys</button><button class="primary" data-act="close">Back</button></div>
    </div>`, h);
}

/** A career's top rank: the finale card with the run's numbers. */
export function showLegend(up, g, h) {
  const best = g.career.results.reduce((b, r) => (r.place < (b?.place ?? 99) || (r.place === b.place && r.prize > b.prize) ? r : b), null);
  show("legend", `
    <div class="panel wide split">
      <div class="left">${portrait(g.stats)}<div class="phys">${esc(up.name)}</div></div>
      <div class="right">
        <h2>Legend!</h2>
        <p class="placing">You reached the top of the <b>${esc(up.career)}</b> ladder on day ${g.day - 1}.</p>
        <div class="stats">
          <div>Bank <b>${money(g.money)}</b></div>
          <div>Members <b>${g.members}</b></div>
          <div>Strength <b>${g.stats.str.toFixed(1)}</b></div>
          <div>Physique <b>${physique(g.stats).toFixed(1)}</b></div>
          <div>Reputation <b>${g.rep}</b></div>
          <div>Competitions <b>${g.career.results.length}</b></div>
          ${best ? `<div>Best finish <b>${ordinal(best.place)}</b> <small>${esc(EVENTS[best.id].name)}</small></div>` : ""}
          <div>Ladders topped <b>${g.career.legends.length} / ${Object.keys(CAREERS).length}</b></div>
        </div>
        <p class="hint">The gym is yours to keep growing. Try topping another ladder.</p>
        <div class="buttons"><button class="primary" data-act="close">Keep grinding</button></div>
      </div>
    </div>`, h);
}

export function showResults(id, res, g, h) {
  const e = EVENTS[id];
  const rows = res.field.map((f, i) => `<li class="${f.you ? "you" : ""}"><span>${ordinal(i + 1)}</span><span>${esc(f.name)}</span><b>${f.score.toFixed(1)}</b></li>`).join("");
  show("results", `
    <div class="panel">
      <h2>${esc(e.name)}</h2>
      <p class="placing">${e.kind === "award" ? "Your gym placed" : "You placed"} <b>${ordinal(res.place)}</b>${res.prize ? ` and won <b>${money(res.prize)}</b>` : ""}! <small>+${res.rep} reputation</small></p>
      <ol class="field">${rows}</ol>
      <div class="buttons"><button class="primary" data-act="close">Back to the gym</button></div>
    </div>`, h);
}

