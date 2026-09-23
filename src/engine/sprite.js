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
  sprite.layers.forEach((layer, i) => {
    layer._id = `${pre}${key}:${i}`;
    layer._box = layer.box || sprite.box;
    layer._slot = { scale: 0, img: null };
    if (layer.shade !== false && !layer.blend) {
      layer._silId = `${pre}${key}:${i}:sil`;
      layer._silMarkup = `<g filter="url(#shadeSil)">${layer.silMarkup ?? layer.markup}</g>`;
      layer._silSlot = { scale: 0, img: null };
    }
  });
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
  const layers = sprite.layers;
  const base = layers[sprite.base || 0];
  if (!layerBitmap(base._slot, base._id, base._box, sprite._defs, base.markup, rasterScale(devPpu * (base.res || 1), base._box, cap))) {
    return false;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(o.flip ? -ppu : ppu, ppu);
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
