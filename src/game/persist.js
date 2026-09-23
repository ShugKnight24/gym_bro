/**
 * Persistence: the save slot (normalised on load, so an old or damaged save
 * can never crash the game) and player settings (accessibility, bindings).
 * Audio volumes persist inside engine/audio.js.
 */

import { createSave } from "../engine/save.js";
import { SAVE_VERSION, migrateSave, normalizeState } from "./rules/save-state.js";

const SETTINGS = { assist: false, calm: false, sens: 1, invertY: false, tips: true, dragLook: false, bindings: null };

export function createPersistence() {
  const slot = createSave("gymbro_save", SAVE_VERSION, migrateSave);
  const prefs = createSave("gymbro_settings", 1);
  return {
    /** A playable state, or null when there is no usable save. */
    load() {
      const d = slot.load();
      return d ? normalizeState(d.state) : null;
    },
    /** false when storage is full or blocked; the caller tells the player. */
    write: (state) => slot.write({ state }),
    clear: () => slot.clear(),
    settings() {
      const d = prefs.load() || {};
      return {
        assist: d.assist === true,
        calm: d.calm === true,
        sens: typeof d.sens === "number" && d.sens >= 0.25 && d.sens <= 3 ? d.sens : SETTINGS.sens,
        invertY: d.invertY === true,
        tips: d.tips !== false,
        dragLook: d.dragLook === true,
        bindings: d.bindings && typeof d.bindings === "object" ? d.bindings : SETTINGS.bindings,
      };
    },
    saveSettings: (s) => prefs.write({ assist: s.assist, calm: s.calm, sens: s.sens, invertY: s.invertY, tips: s.tips, dragLook: s.dragLook, bindings: s.bindings }),
  };
}
