/**
 * Canvas + main loop.
 *
 * The canvas renders at a device-tier pixel budget (./device-tier.js), not at
 * the raw window size, and CSS stretches it. Drawing code works in CSS pixels:
 * the context transform maps them to backing pixels, so `view.w` / `view.h`
 * are the only sizes a renderer needs and hit-testing never sees DPR.
 *
 * Update runs every animation frame with `dt` clamped, so an alt-tab stall
 * cannot tunnel anything through a wall. Render runs through FramePacer.
 */

import { FramePacer } from "./frame-pacer.js";
import { detectDeviceTier, budgetedRenderSize } from "./device-tier.js";

const MAX_DT = 1 / 30;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ update(dt:number, t:number):void, render(ctx:CanvasRenderingContext2D, view:object, t:number):void,
 *           resize?(view:object):void, cap?: () => number, scale?: number }} game
 * @returns {{ view: object, stop(): void }}
 */
export function startLoop(canvas, game) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const tier = detectDeviceTier();
  const view = { w: 0, h: 0, k: 1, tier };
  const pacer = new FramePacer();

  function resize() {
    const cssW = canvas.clientWidth || innerWidth;
    const cssH = canvas.clientHeight || innerHeight;
    // Device pixels up to 2x DPR, then trimmed to the tier's pixel budget.
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = budgetedRenderSize(cssW * dpr, cssH * dpr, tier);
    const s = game.scale ?? 1;
    canvas.width = Math.max(1, Math.round(size.w * s));
    canvas.height = Math.max(1, Math.round(size.h * s));
    view.w = cssW;
    view.h = cssH;
    view.k = canvas.width / cssW;
    ctx.setTransform(view.k, 0, 0, view.k, 0, 0);
    ctx.imageSmoothingQuality = "high";
    game.resize?.(view);
  }
  resize();
  addEventListener("resize", resize);

  let last = 0;
  let raf = 0;
  let running = true;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0;
    last = now;
    const t = now / 1000;
    try {
      game.update(dt, t);
      if (pacer.shouldRender(now, game.cap?.() ?? 0)) {
        ctx.setTransform(view.k, 0, 0, view.k, 0, 0);
        game.render(ctx, view, t);
      }
    } catch (err) {
      // Keep the loop alive: one bad frame must not freeze the game for good.
      if (!frame.logged || now - frame.logged > 2000) {
        frame.logged = now;
        console.error(err);
      }
    }
  }
  const onVisible = () => {
    if (!document.hidden) {
      last = 0;
      pacer.reset();
    }
  };
  document.addEventListener("visibilitychange", onVisible);
  raf = requestAnimationFrame(frame);

  return {
    view,
    resize,
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisible);
    },
  };
}
