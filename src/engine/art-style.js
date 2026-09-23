/**
 * Art style switch: Comic (inked vector art, the default) or Modern (the same
 * sprites graded into painted materials with no ink lines, plus a filmic
 * grade). Only the active style is drawn; renderers branch on it per frame,
 * so switching costs nothing.
 *
 * Mirrored on <html data-art-style="…"> so CSS can restyle DOM menus.
 * Adapted from Clockwork Carnage src/rendering/art-style.js.
 */

export const ART_COMIC = "comic";
export const ART_MODERN = "modern";

const KEY = "gymbro_art";
const listeners = new Set();

function readSaved() {
  try {
    return localStorage.getItem(KEY) === ART_MODERN ? ART_MODERN : ART_COMIC;
  } catch {
    return ART_COMIC;
  }
}

let current = typeof localStorage === "undefined" ? ART_COMIC : readSaved();

function mirrorToDom() {
  if (typeof document !== "undefined") document.documentElement.dataset.artStyle = current;
}
mirrorToDom();

export const getArtStyle = () => current;
export const isModernArt = () => current === ART_MODERN;

/** Switch style, persist, notify subscribers. */
export function setArtStyle(style) {
  const next = style === ART_MODERN ? ART_MODERN : ART_COMIC;
  if (next === current) return;
  const prev = current;
  current = next;
  try {
    localStorage.setItem(KEY, current);
  } catch {}
  mirrorToDom();
  for (const fn of listeners) fn(current, prev);
}

/** Subscribe to style changes. Returns an unsubscribe function. */
export function onArtStyleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
