/**
 * The DOM menus over the paused world: pause, careers (events, supplement
 * line), physique, vending shop, gym office and settings, plus the queue of
 * screens that follow a night's summary (legend finales).
 */

import { EQUIPMENT } from "./data/equipment.js";
import { careerRank } from "./rules/compete.js";
import { DUES_MIN, DUES_MAX } from "./rules/members.js";
import { repair, buyUpgrade, upgradeStatus } from "./rules/economy.js";
import { launch, launchStatus, setAds } from "./rules/supplements.js";
import { COLOR } from "./ui/kit.js";
import { markTip } from "./rules/tips.js";
import { showPause, showCareers, showStats, showShop, showGym, showSettings, hideOverlay } from "./ui/overlays.js";

/**
 * @param {object} g  the game
 * @param {object} env services and game actions the menus call back into
 */
export function createMenus(g, env) {
  const {
    audio, store, input, settings, uiRoot, defaultBindings: BINDINGS, applySettings, refreshGym, pop, persist,
    toTitle, toggleStyle, enterEvent, prices, buy, invalidateTarget,
  } = env;
  // Set when a menu releases pointer lock, so the lock loss does not also open the pause menu.
  let suppressPause = false;

  function releaseMouse() {
    if (document.pointerLockElement) {
      suppressPause = true;
      document.exitPointerLock();
    }
  }

  function openMenu(render) {
    releaseMouse();
    g.mode = "menu";
    render();
  }

  function resume() {
    hideOverlay();
    g.mode = "play";
  }

  const openPause = () => {
    // Pausing is a safe point: autosave.
    if (g.state) store.write(g.state);
    openMenu(() => showPause({
      resume,
      style: toggleStyle,
      gym: openGym,
      settings: () => openSettings(openPause),
      save: () => { if (persist(g.state)) pop("SAVED", COLOR.green, false); resume(); },
      quit: () => { persist(g.state); toTitle(); },
    }));
  };

  const careerHandlers = {
    close: resume,
    enter: enterEvent,
    launch(id) {
      if (!launchStatus(g.state, id, careerRank(g.state, "supplements")).ok) return;
      g.state = launch(g.state, id);
      audio.play("cash");
      openCareers();
    },
    ads(level) {
      g.state = setAds(g.state, Number(level));
      audio.play("ui");
      openCareers();
    },
  };
  const openCareers = () => openMenu(() => showCareers(g.state, careerHandlers));
  const openStats = () => openMenu(() => showStats(g.state, { close: resume }));
  const openShop = () => openMenu(() => showShop(g.state, prices(), {
    close: resume,
    buy(id) { buy(id); openShop(); },
  }));

  const gymHandlers = {
    close: resume,
    dues(d) {
      g.state = { ...g.state, dues: Math.max(DUES_MIN, Math.min(DUES_MAX, g.state.dues + Number(d))) };
      audio.play("ui");
      openGym();
    },
    repair(i) {
      g.state = repair(g.state, Number(i), EQUIPMENT);
      audio.play("clank");
      invalidateTarget();
      openGym();
    },
    upgrade(id) {
      if (!upgradeStatus(g.state, id, careerRank(g.state, "owner")).ok) return;
      g.state = buyUpgrade(g.state, id);
      audio.play("cash");
      if (id === "annex") {
        refreshGym();
        pop("THE ANNEX IS OPEN!", COLOR.yellow);
      }
      openGym();
    },
  };
  const openGym = () => {
    g.state = markTip(g.state, "office");
    openMenu(() => showGym(g.state, careerRank(g.state, "owner"), gymHandlers));
  };

  function openSettings(back = resume, capturing = "") {
    const vol = { master: audio.volume("master"), music: audio.volume("music"), sfx: audio.volume("sfx") };
    const view = { ...settings, muted: audio.muted(), volume: vol };
    g.settingsBack = capturing ? null : back;
    const saveBindings = () => {
      const cur = input.bindings();
      settings.bindings = cur;
      store.saveSettings(settings);
    };
    openMenu(() => showSettings(view, input.bindings(), {
      close: back,
      sens(v) {
        settings.sens = Number(v) / 100;
        store.saveSettings(settings);
        applySettings();
        const el = uiRoot.querySelector('[data-input="sens"] + small');
        if (el) el.textContent = `${settings.sens.toFixed(2)}x`;
      },
      volume(v, bus) {
        audio.setVolume(bus, Number(v) / 100);
        const el = uiRoot.querySelector(`[data-arg="${bus}"] + small`);
        if (el) el.textContent = v;
      },
      toggle(key) {
        if (key === "muted") audio.setMuted(!audio.muted());
        else {
          settings[key] = !settings[key];
          store.saveSettings(settings);
          applySettings();
        }
        audio.play("ui");
        openSettings(back);
      },
      rebind(action) {
        openSettings(back, action);
        input.captureNext((code) => {
          if (code) {
            const b = input.bindings();
            // A key does one thing: take it off any other action first.
            for (const a in b) b[a] = b[a].filter((c) => c !== code);
            b[action] = [code];
            input.setBindings(b);
            saveBindings();
          }
          openSettings(back);
        });
      },
      resetKeys() {
        input.setBindings(BINDINGS);
        settings.bindings = null;
        store.saveSettings(settings);
        openSettings(back);
      },
    }, capturing));
  }


  /** Close a menu, or open the next queued screen. */
  function next() {
    const q = g.queue.shift();
    if (q) {
      audio.play("fanfare");
      audio.play("cheer");
      q();
    } else resume();
  }

  return {
    releaseMouse, openMenu, resume, next, openPause, openCareers, openStats, openShop, openGym, openSettings,
    /** True once after a menu released the pointer lock. */
    takeSuppress() {
      const s = suppressPause;
      suppressPause = false;
      return s;
    },
  };
}
