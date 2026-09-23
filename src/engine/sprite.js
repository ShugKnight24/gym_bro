/**
 * Layered SVG sprite blitter.
 *
 * A sprite is `{ box: [x, y, w, h], layers: [{ markup, anim?, opacity?, blend?, shade?, box? }] }`
 * in art units. Each layer rasterises once per half-octave size bucket
 * (./raster.js) and is blitted every frame after that; motion (sway, float,
 * pulse…) is a canvas transform, never a re-raster.
 *
 * `shade` (0..1) darkens every non-emissive layer toward `SHADE_RGB` with a
 * pre-baked silhouette, which is how distance fog and night fall on sprites
 * without a per-pixel filter. Layers with `shade: false` or a `blend` mode are
 * emissive and stay bright.
 *
 * A faded sprite (`alpha` < 1) is composited opaque into a scratch canvas and
 * blitted once with the fade, so its layers never show through each other.
 *
 * Vendored from Clockwork Carnage src/rendering/props.js (drawSvgSprite).
 */

import { getLayerImage, scaleBucket } from "./raster.js";

const MAX_BITMAP_PX = 512;

/** Silhouette colour for `shade` (0-1 per channel). Call before the first draw. */
let SHADE_RGB = [0.04, 0.07, 0.125];
export function setShadeColor(r, g, b) {
  SHADE_RGB = [r, g, b];
}
const shadeFilter = () =>
  `<filter id="shadeSil" x="-.1" y="-.1" width="1.2" height="1.2">` +
  `<feColorMatrix type="matrix" values="0 0 0 0 ${SHADE_RGB[0]} 0 0 0 0 ${SHADE_RGB[1]} 0 0 0 0 ${SHADE_RGB[2]} 0 0 0 1 0"/></filter>`;

/** Half-octave bucket for this draw, stepped down until the bitmap fits MAX_BITMAP_PX. */
function rasterScale(pxPerUnit, box, cap = MAX_BITMAP_PX) {
  const longest = Math.max(box[2], box[3]);
  let b = scaleBucket(pxPerUnit);
  while (b * longest > cap && b > 0.26) b /= Math.SQRT2;
  // Nudge below the bucket edge so raster.js snaps to this exact bucket.
  return b * 0.999;
}

/** Cached bitmap lookup: skip the string-keyed cache while the bucket is steady. */
function layerBitmap(slot, id, box, defs, markup, scale) {
  if (slot.scale === scale && slot.img) return slot.img;
  const img = getLayerImage(id, box, defs, markup, scale);
  if (img) {
    const k = scaleBucket(scale);
    // Baked layers are canvases (width), undecoded ones <img> (naturalWidth).
    const exact = (img.naturalWidth ?? img.width) === Math.max(1, Math.round(box[2] * k));
    slot.img = exact ? img : null;
    slot.scale = exact ? scale : 0;
  }
  return img;
}

/** Apply a layer animation as a canvas transform; returns an alpha multiplier. */
export function animate(ctx, anim, t) {
  const time = t + (anim.phase || 0);
  const sp = anim.speed ?? 1;
  switch (anim.type) {
    case "sway":
    case "spin": {
      const px = anim.pivot ? anim.pivot[0] : 0;
      const py = anim.pivot ? anim.pivot[1] : 0;
      ctx.translate(px, py);
      ctx.rotate(anim.type === "spin" ? time * sp : Math.sin(time * sp) * (anim.amp ?? 0.03));
      ctx.translate(-px, -py);
      return 1;
    }
    case "float":
      ctx.translate(0, Math.sin(time * sp) * (anim.amp ?? 2));
      return 1;
    case "bob": {
      // Squash-and-stretch about the pivot (walk cycles, breathing).
      const px = anim.pivot ? anim.pivot[0] : 0;
      const py = anim.pivot ? anim.pivot[1] : 0;
      const k = Math.sin(time * sp) * (anim.amp ?? 0.03);
      ctx.translate(px, py);
      ctx.scale(1 - k * 0.5, 1 + k);
      ctx.translate(-px, -py);
      return 1;
    }
    case "pulse": {
      const k = 0.5 + 0.5 * Math.sin(time * sp);
      return (anim.min ?? 0.5) + ((anim.max ?? 1) - (anim.min ?? 0.5)) * k;
    }
    case "flicker": {
      const n = Math.sin(time * sp * 7.3) * Math.sin(time * sp * 3.1 + 1.7);
      const k = n > 0.85 ? 0 : 0.5 + 0.5 * Math.sin(time * sp);
      return (anim.min ?? 0.6) + ((anim.max ?? 1) - (anim.min ?? 0.6)) * k;
    }
    case "blink":
      return Math.sin(time * sp) > 0 ? (anim.max ?? 1) : (anim.min ?? 0.3);
    default:
      return 1;
  }
}

/** Precompute per-layer ids and silhouette markup once per sprite. */
function prepareSprite(key, sprite, defs) {
  sprite._ready = true;
  sprite._defs = defs + shadeFilter();
  const pre = sprite.realistic ? "sprite:r:" : "sprite:";
  // Union of every layer box, padded for sway/float/bob: the fade composite's bounds.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  sprite.layers.forEach((layer, i) => {
    layer._id = `${pre}${key}:${i}`;
    layer._box = layer.box || sprite.box;
    layer._slot = { scale: 0, img: null };
    if (layer.shade !== false && !layer.blend) {
      layer._silId = `${pre}${key}:${i}:sil`;
      layer._silMarkup = `<g filter="url(#shadeSil)">${layer.silMarkup ?? layer.markup}</g>`;
      layer._silSlot = { scale: 0, img: null };
    }
    const b = layer._box;
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[0] + b[2]);
    y1 = Math.max(y1, b[1] + b[3]);
  });
  const pad = Math.max(x1 - x0, y1 - y0) * 0.15;
  sprite._ub = [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/** Draw every layer at the context's current transform; `alpha` scales each layer. */
function drawLayers(ctx, sprite, devPpu, cap, t, alpha, shade) {
  const layers = sprite.layers;
  const prevAlpha = ctx.globalAlpha;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const box = layer._box;
    const scale = rasterScale(devPpu * (layer.res || 1), box, cap);
    const img = layerBitmap(layer._slot, layer._id, box, sprite._defs, layer.markup, scale);
    if (!img) continue;
    ctx.save();
    const a = layer.anim ? animate(ctx, layer.anim, t) : 1;
    const la = alpha * a * (layer.opacity ?? 1);
    if (la > 0.004) {
      ctx.globalAlpha = prevAlpha * la;
      if (layer.blend) ctx.globalCompositeOperation = layer.blend;
      ctx.drawImage(img, box[0], box[1], box[2], box[3]);
      if (shade > 0.02 && layer._silId) {
        const sil = layerBitmap(layer._silSlot, layer._silId, box, sprite._defs, layer._silMarkup, scale);
        if (sil) {
          ctx.globalAlpha = prevAlpha * alpha * shade;
          ctx.drawImage(sil, box[0], box[1], box[2], box[3]);
        }
      }
    }
    ctx.restore();
  }
}

// Scratch canvas for faded sprites, grown on demand and reused.
let fadeCanvas = null;
let fadeCtx = null;

/**
 * Faded sprite: composite every layer at full opacity into the scratch canvas
 * (device pixels, clipped to the target canvas), then blit that once with the
 * fade, so overlapping layers never show through each other.
 */
function drawFaded(ctx, sprite, x, y, ppu, flip, devPpu, cap, t, alpha, shade) {
  const m = ctx.getTransform();
  const u = sprite._ub;
  const sx = flip ? -ppu : ppu;
  // Device-space bounds of the padded sprite box.
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (let c = 0; c < 4; c++) {
    const ax = x + (c & 1 ? u[2] : u[0]) * sx;
    const ay = y + (c & 2 ? u[3] : u[1]) * ppu;
    const dx = m.a * ax + m.c * ay + m.e;
    const dy = m.b * ax + m.d * ay + m.f;
    if (dx < bx0) bx0 = dx;
    if (dx > bx1) bx1 = dx;
    if (dy < by0) by0 = dy;
    if (dy > by1) by1 = dy;
  }
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  bx0 = Math.max(0, Math.floor(bx0));
  by0 = Math.max(0, Math.floor(by0));
  bx1 = Math.min(cw, Math.ceil(bx1));
  by1 = Math.min(ch, Math.ceil(by1));
  const bw = bx1 - bx0;
  const bh = by1 - by0;
  if (bw <= 0 || bh <= 0) return;
  if (!fadeCanvas) {
    fadeCanvas = document.createElement("canvas");
    fadeCanvas.width = fadeCanvas.height = 1;
    fadeCtx = fadeCanvas.getContext("2d");
  }
  if (fadeCanvas.width < bw || fadeCanvas.height < bh) {
    fadeCanvas.width = Math.max(fadeCanvas.width, bw);
    fadeCanvas.height = Math.max(fadeCanvas.height, bh);
  }
  const g = fadeCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, bw, bh);
  g.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
  g.imageSmoothingQuality = ctx.imageSmoothingQuality;
  g.setTransform(m.a, m.b, m.c, m.d, m.e - bx0, m.f - by0);
  g.translate(x, y);
  g.scale(sx, ppu);
  drawLayers(g, sprite, devPpu, cap, t, 1, shade);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(fadeCanvas, 0, 0, bw, bh, bx0, by0, bw, bh);
  ctx.restore();
}

/**
 * Blit a layered SVG sprite with its origin at (x, y), `ppu` screen pixels per
 * art unit. `key` must be unique per distinct sprite (it keys the bitmap
 * cache). Returns false while the base layer is still decoding.
 *
 * @param {object} [o] { alpha = 1, shade = 0, flip = false, cap = MAX_BITMAP_PX }
 */
export function drawSvgSprite(ctx, key, sprite, defs, x, y, ppu, t, o = {}) {
  if (typeof Image === "undefined" || !sprite) return false;
  const alpha = o.alpha ?? 1;
  const shade = o.shade ?? 0;
  const cap = o.cap ?? MAX_BITMAP_PX;
  if (!sprite._ready) prepareSprite(key, sprite, defs);
  const m = ctx.getTransform();
  const devPpu = ppu * (Math.hypot(m.a, m.b) || 1);
  const base = sprite.layers[sprite.base || 0];
  if (!layerBitmap(base._slot, base._id, base._box, sprite._defs, base.markup, rasterScale(devPpu * (base.res || 1), base._box, cap))) {
    return false;
  }
  if (alpha <= 0.004) return true;
  if (alpha < 0.996) {
    drawFaded(ctx, sprite, x, y, ppu, !!o.flip, devPpu, cap, t, alpha, shade);
    return true;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(o.flip ? -ppu : ppu, ppu);
  drawLayers(ctx, sprite, devPpu, cap, t, 1, shade);
  ctx.restore();
  return true;
}

/** Start decoding every sprite of a set at one scale, so first sight is never blank. */
export function warmSvgSprites(sprites, defs, ppu) {
  if (typeof Image === "undefined") return;
  for (const key in sprites) {
    const sprite = sprites[key];
    if (!sprite._ready) prepareSprite(key, sprite, defs);
    for (const layer of sprite.layers) {
      getLayerImage(layer._id, layer._box, sprite._defs, layer.markup, rasterScale(ppu * (layer.res || 1), layer._box));
    }
  }
}
