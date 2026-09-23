/**
 * Grid raycaster: DDA walls textured per backing-pixel column, floor
 * and ceiling cast into a reduced-resolution ImageData and upscaled, baked
 * distance fog, a zBuffer, and layered SVG billboards clipped against it.
 *
 * World units: one grid cell = 1. `wallH` is the wall height in cells, the
 * camera's `z` its eye height, `cm` how many sprite art units (centimetres)
 * one cell spans, so a prop's y=0 lands on the floor under its (x, y).
 *
 * Fog is baked: every texture is pre-darkened into `fogLevels` steps (walls
 * also per side), so a column is one drawImage and a floor texel one lookup.
 *
 * Reflective wall ids (mirrors) bounce the ray once: the column shows the
 * wall the reflection hits, then the mirror's own texture (transparent where
 * the glass is) is laid over it. Sprites flagged `mirror` are drawn only
 * through mirror columns, between the glass and the reflected wall, so the
 * game can place reflected twins behind the glass.
 *
 * Comic ink (`o.ink`): a line at every wall-face or depth discontinuity and
 * along each face's base and top, as in Clockwork Carnage's silhouette pass.
 *
 * Sprite records: { x, y, z?, scale?, sprite, key, defs, flip?, alpha?, mirror?, hidden? }.
 * The renderer never allocates per frame: sort and column buffers are reused.
 */

import { drawSvgSprite } from "./sprite.js";

const INK_RGBA = "rgba(4,6,11,0.92)";

export function createRaycaster(opts = {}) {
  const cfg = {
    fov: 75, wallH: 1.5, cm: 200, fogNear: 2.5, fogFar: 16, fogMax: 0.82, fogColor: [18, 22, 30],
    fogLevels: 16, floorRes: 0.5, flatBilerp: 1.1, maxColScale: 2, maxSteps: 96, edgeWall: 1, flatSize: 128, spriteCap: 768, sideShade: 0.16, nearFade: 0.7,
    ...opts,
  };
  const FL = cfg.fogLevels;
  let world = null;
  const wallTex = [];
  const floorTex = [];
  const ceilTex = [];
  const reflect = new Uint8Array(256);

  // Per-column buffers, grown on resize.
  let cols = 0;
  let zBuf, zFar, colTop, colBot, colKey, mir, mirTex, mirU, mirLv, mirSide, mirTop, mirBot;
  function ensureCols(w) {
    if (w <= cols) return;
    cols = w;
    zBuf = new Float32Array(w);
    zFar = new Float32Array(w);
    colTop = new Float32Array(w);
    colBot = new Float32Array(w);
    colKey = new Int32Array(w);
    mir = new Uint8Array(w);
    mirTex = new Uint8Array(w);
    mirU = new Uint16Array(w);
    mirLv = new Uint8Array(w);
    mirSide = new Uint8Array(w);
    mirTop = new Float32Array(w);
    mirBot = new Float32Array(w);
  }

  // Floor/ceiling buffer.
  let fc = null;
  let fcCtx = null;
  let fcImg = null;
  let fcBuf = null;
  const rowLv = [];
  const rowLvC = [];

  // Sprite sort buffers.
  let sDepth = new Float32Array(128);
  let sOrder = new Int32Array(128);
  const drawOpts = { alpha: 1, shade: 0, flip: false, cap: cfg.spriteCap };

  const fogAt = (d) => {
    const k = (d - cfg.fogNear) / (cfg.fogFar - cfg.fogNear);
    return (k < 0 ? 0 : k > 1 ? 1 : k) * cfg.fogMax;
  };
  const fogLevel = (d) => Math.round((fogAt(d) / cfg.fogMax) * (FL - 1));

  const fogCss = (a) => `rgba(${cfg.fogColor[0]},${cfg.fogColor[1]},${cfg.fogColor[2]},${a})`;

  /** Wall texture → atlas of FL fog levels (x) × 2 sides (y). */
  function bakeWall(src) {
    const w = src.width;
    const h = src.height;
    const c = document.createElement("canvas");
    c.width = w * FL;
    c.height = h * 2;
    const g = c.getContext("2d");
    for (let side = 0; side < 2; side++) {
      for (let l = 0; l < FL; l++) {
        const x = l * w;
        const y = side * h;
        g.globalCompositeOperation = "source-over";
        g.drawImage(src, x, y);
        g.globalCompositeOperation = "source-atop";
        if (side) {
          g.fillStyle = `rgba(0,0,0,${cfg.sideShade})`;
          g.fillRect(x, y, w, h);
        }
        g.fillStyle = fogCss((l / (FL - 1)) * cfg.fogMax);
        g.fillRect(x, y, w, h);
      }
    }
    return { atlas: c, w, h };
  }

  /**
   * Flat (floor/ceiling) texture → mips[m][fogLevel] Uint32 texel arrays, a
   * box-filtered chain halving from flatSize² down to 8² (each mip stored at
   * its own size), so every row samples the mip whose texels match its
   * on-screen footprint: near rows stay sharp, distant rows stop shimmering.
   */
  function bakeFlat(src) {
    const c = document.createElement("canvas");
    const g = c.getContext("2d", { willReadFrequently: true });
    const mips = [];
    let prev = src;
    for (let k = cfg.flatSize; k >= 8; k >>= 1) {
      const lvl = document.createElement("canvas");
      lvl.width = lvl.height = k;
      const lg = lvl.getContext("2d");
      lg.imageSmoothingEnabled = true;
      lg.imageSmoothingQuality = "high";
      lg.drawImage(prev, 0, 0, k, k);
      prev = lvl;
      c.width = c.height = k;
      const levels = [];
      for (let l = 0; l < FL; l++) {
        g.globalCompositeOperation = "copy";
        g.drawImage(lvl, 0, 0);
        g.globalCompositeOperation = "source-over";
        g.fillStyle = fogCss((l / (FL - 1)) * cfg.fogMax);
        g.fillRect(0, 0, k, k);
        levels.push(new Uint32Array(g.getImageData(0, 0, k, k).data.buffer.slice(0)));
      }
      mips.push(levels);
    }
    return { mips };
  }

  function ensureFloorBuf(bw, bh) {
    if (fc && fc.width === bw && fc.height === bh) return;
    fc = document.createElement("canvas");
    fc.width = bw;
    fc.height = bh;
    fcCtx = fc.getContext("2d");
    fcImg = fcCtx.createImageData(bw, bh);
    fcBuf = new Uint32Array(fcImg.data.buffer);
  }

  function renderFlats(ctx, W, H, horizon, cam, dirX, dirY, planeX, planeY, focal, tanH) {
    const bw = Math.max(1, Math.ceil(W * cfg.floorRes));
    const bh = Math.max(1, Math.ceil(H * cfg.floorRes));
    ensureFloorBuf(bw, bh);
    const buf = fcBuf;
    const n = cfg.flatSize;
    const nMip = (floorTex[1] || floorTex[0] || ceilTex[1]).mips.length - 1;
    const { w: mw, h: mh, floor, ceil } = world;
    const nf = floorTex.length;
    const nc = ceilTex.length;
    const kx = W / bw;
    const ky = H / bh;
    const fcol = 0xff000000 | (cfg.fogColor[2] << 16) | (cfg.fogColor[1] << 8) | cfg.fogColor[0];
    for (let yb = 0; yb < bh; yb++) {
      const dy = (yb + 0.5) * ky - horizon;
      let i = yb * bw;
      if (dy > -0.5 && dy < 0.5) {
        buf.fill(fcol, i, i + bw);
        continue;
      }
      const isFloor = dy > 0;
      const dist = ((isFloor ? cam.z : cfg.wallH - cam.z) * focal) / (isFloor ? dy : -dy);
      const lv = fogLevel(dist);
      // Texels per buffer pixel picks the mip: the geometric mean of the
      // footprint across the row and down the screen (grazing rows are
      // stretched in depth), biased a little sharp since sampling is nearest.
      const across = (dist * 2 * tanH * n) / bw;
      const down = ((dist * ky) / (dy < 0 ? -dy : dy)) * n;
      const foot = Math.sqrt(across * down);
      let mip = foot > 1.1 ? Math.ceil(Math.log2(foot / 1.1)) : 0;
      if (mip > nMip) mip = nMip;
      const tn = n >> mip;
      const tmask = tn - 1;
      const texs = isFloor ? floorTex : ceilTex;
      const lvArr = isFloor ? rowLv : rowLvC;
      const cnt = isFloor ? nf : nc;
      for (let t = 0; t < cnt; t++) lvArr[t] = texs[t] ? texs[t].mips[mip][lv] : null;
      const map = isFloor ? floor : ceil;
      const def = lvArr[1] || lvArr[0];
      // Row endpoints at the screen's left edge; step per buffer pixel.
      const sx = (dist * 2 * planeX * kx) / W;
      const sy = (dist * 2 * planeY * kx) / W;
      let wx = cam.x + dist * (dirX - planeX) + sx * 0.5;
      let wy = cam.y + dist * (dirY - planeY) + sy * 0.5;
      if (foot < cfg.flatBilerp) {
        // Near rows (the band by the top and bottom edges, on mip 0) show a
        // texel per buffer pixel or more: filter bilinearly so grid lines stay
        // straight instead of stair-stepping through the upscale.
        // Packed-channel lerps, R|B and A|G at once, weights out of 256.
        let lcx = -1e9;
        let lcy = -1e9;
        let tex = def;
        for (let xb = 0; xb < bw; xb++, i++, wx += sx, wy += sy) {
          const cx = Math.floor(wx);
          const cy = Math.floor(wy);
          if (cx !== lcx || cy !== lcy) {
            lcx = cx;
            lcy = cy;
            tex = cx >= 0 && cy >= 0 && cx < mw && cy < mh ? lvArr[map[cy * mw + cx]] || def : def;
          }
          const fu = (wx - cx) * tn - 0.5 + tn;
          const fv = (wy - cy) * tn - 0.5 + tn;
          const iu = fu | 0;
          const iv = fv | 0;
          const ax = ((fu - iu) * 256) | 0;
          const ay = ((fv - iv) * 256) | 0;
          const u0 = iu & tmask;
          const u1 = (iu + 1) & tmask;
          const r0 = (iv & tmask) * tn;
          const r1 = ((iv + 1) & tmask) * tn;
          const p00 = tex[r0 + u0];
          const p01 = tex[r0 + u1];
          const p10 = tex[r1 + u0];
          const p11 = tex[r1 + u1];
          const bx = 256 - ax;
          const rbT = (((p00 & 0xff00ff) * bx + (p01 & 0xff00ff) * ax) >>> 8) & 0xff00ff;
          const agT = (((p00 >>> 8) & 0xff00ff) * bx + ((p01 >>> 8) & 0xff00ff) * ax) >>> 8 & 0xff00ff;
          const rbB = (((p10 & 0xff00ff) * bx + (p11 & 0xff00ff) * ax) >>> 8) & 0xff00ff;
          const agB = (((p10 >>> 8) & 0xff00ff) * bx + ((p11 >>> 8) & 0xff00ff) * ax) >>> 8 & 0xff00ff;
          const by = 256 - ay;
          buf[i] = ((((rbT * by + rbB * ay) >>> 8) & 0xff00ff) | ((agT * by + agB * ay) & 0xff00ff00));
        }
        continue;
      }
      for (let xb = 0; xb < bw; xb++, i++, wx += sx, wy += sy) {
        const cx = Math.floor(wx);
        const cy = Math.floor(wy);
        const tex = cx >= 0 && cy >= 0 && cx < mw && cy < mh ? lvArr[map[cy * mw + cx]] || def : def;
        buf[i] = tex[(((wy - cy) * tn) & tmask) * tn + (((wx - cx) * tn) & tmask)];
      }
    }
    fcCtx.putImageData(fcImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fc, 0, 0, bw, bh, 0, 0, W, H);
  }

  function blitColumn(ctx, T, lv, side, u, x, cw, top, bot, H) {
    const h = bot - top;
    if (h <= 0) return;
    let sy = 0;
    let sh = T.h;
    let dy = top;
    let dh = h;
    if (top < 0) {
      sy = (-top / h) * T.h;
      dy = 0;
    }
    if (bot > H) sh = ((H - top) / h) * T.h;
    sh -= sy;
    dh = (bot > H ? H : bot) - dy;
    if (sh <= 0 || dh <= 0) return;
    ctx.drawImage(T.atlas, lv * T.w + u, side * T.h + sy, 1, sh, x * cw, dy, cw, dh);
  }

  /**
   * Draw one sprite clipped to the columns where it is visible. Mirror
   * sprites are visible only through glass, beyond it and before the
   * reflected wall.
   */
  function drawClipped(ctx, s, sx, sy, ppu, depth, t, H, W) {
    const box = s.sprite.box;
    const flip = !!s.flip;
    const kc = frame.kc;
    // Screen extent in columns (W is the column count).
    let x0 = (flip ? sx - (box[0] + box[2]) * ppu : sx + box[0] * ppu) * kc;
    let x1 = (flip ? sx - box[0] * ppu : sx + (box[0] + box[2]) * ppu) * kc;
    if (x1 < 0 || x0 >= W) return;
    x0 = x0 < 0 ? 0 : x0 | 0;
    x1 = x1 >= W ? W - 1 : x1 | 0;
    const m = !!s.mirror;
    // Fade billboards reaching the camera so none can fill the screen.
    const near = depth < cfg.nearFade ? (depth - cfg.nearFade * 0.35) / (cfg.nearFade * 0.65) : 1;
    if (near <= 0) return;
    drawOpts.alpha = (s.alpha ?? 1) * near;
    drawOpts.shade = fogAt(depth);
    drawOpts.flip = flip;
    let all = true;
    let any = false;
    for (let x = x0; x <= x1; x++) {
      const v = m ? mir[x] && depth > zBuf[x] && depth < zFar[x] : depth < zBuf[x];
      if (v) any = true;
      else all = false;
    }
    if (!any) return;
    if (all && !m) {
      drawSvgSprite(ctx, s.key, s.sprite, s.defs, sx, sy, ppu, t, drawOpts);
      return;
    }
    let run = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const v = x <= x1 && (m ? mir[x] && depth > zBuf[x] && depth < zFar[x] : depth < zBuf[x]);
      if (v && run < 0) run = x;
      else if (!v && run >= 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(run / kc, 0, (x - run) / kc, H);
        ctx.clip();
        drawSvgSprite(ctx, s.key, s.sprite, s.defs, sx, sy, ppu, t, drawOpts);
        ctx.restore();
        run = -1;
      }
    }
  }

  // Ink run buffers (one entry per same-face run of columns).
  let runA = new Int32Array(256);
  let runB = new Int32Array(256);

  function drawInk(ctx, W, H) {
    const mw = world.w;
    const cw = frame.cw;
    ctx.fillStyle = INK_RGBA;
    // Vertical: wall-face and depth discontinuities.
    for (let x = 1; x < W; x++) {
      const k = colKey[x];
      const kp = colKey[x - 1];
      if (k === kp || k < 0 || kp < 0) continue;
      const z0 = zBuf[x - 1];
      const z1 = zBuf[x];
      // Neighbouring cells of one flat wall are not an edge: no seam line
      // every two metres, only at corners and depth steps.
      if ((k & 1) === (kp & 1) && Math.abs(z1 - z0) < 0.05 * Math.min(z0, z1) + 0.02) {
        const a = k >> 1;
        const b = kp >> 1;
        if ((k & 1) ? ((a / mw) | 0) === ((b / mw) | 0) : a % mw === b % mw) continue;
      }
      const near = z1 < z0 ? x : x - 1;
      const nz = z1 < z0 ? z1 : z0;
      const lh = H / nz;
      const lw = lh > 900 ? 3 : lh > 280 ? 2 : 1.5;
      let t;
      let b;
      if (Math.abs(z1 - z0) < 0.05 * nz + 0.02) {
        t = Math.min(colTop[x], colTop[x - 1]);
        b = Math.max(colBot[x], colBot[x - 1]);
      } else {
        t = colTop[near];
        b = colBot[near];
      }
      if (b > t) ctx.fillRect(near === x ? x * cw : (x + 1) * cw - lw, t, lw, b - t);
    }
    // Base and top lines: one straight segment per same-face run.
    let n = 0;
    let start = 0;
    for (let x = 1; x <= W; x++) {
      if (x < W && colKey[x] === colKey[start]) continue;
      if (colKey[start] >= 0) {
        if (n >= runA.length) {
          const a = new Int32Array(n * 2);
          a.set(runA);
          runA = a;
          const b = new Int32Array(n * 2);
          b.set(runB);
          runB = b;
        }
        runA[n] = start;
        runB[n++] = x - 1;
      }
      start = x;
    }
    ctx.strokeStyle = INK_RGBA;
    ctx.lineCap = "round";
    for (let pass = 0; pass < 3; pass++) {
      ctx.lineWidth = pass === 0 ? 1.5 : pass === 1 ? 2.5 : 3.5;
      ctx.beginPath();
      for (let r = 0; r < n; r++) {
        const a = runA[r];
        const b = runB[r];
        const lh = colBot[a] - colTop[a];
        const bucket = lh > 700 ? 2 : lh > 240 ? 1 : 0;
        if (bucket !== pass) continue;
        ctx.moveTo(a * cw, colBot[a]);
        ctx.lineTo((b + 1) * cw, colBot[b]);
        if (colTop[a] > -2 || colTop[b] > -2) {
          ctx.moveTo(a * cw, colTop[a]);
          ctx.lineTo((b + 1) * cw, colTop[b]);
        }
      }
      ctx.stroke();
    }
  }

  const frame = { W: 0, H: 0, cols: 0, kc: 1, cw: 1, horizon: 0, focal: 1, dirX: 1, dirY: 0, t: 0 };
  function drawSprites(ctx, sprites, m, mirrorPass, cam) {
    const { W, H, horizon, focal, dirX, dirY, t } = frame;
    for (let k = 0; k < m; k++) {
      const s = sprites[sOrder[k]];
      if (!!s.mirror !== mirrorPass) continue;
      const d = sDepth[sOrder[k]];
      const lat = (s.x - cam.x) * -dirY + (s.y - cam.y) * dirX;
      const sx = W / 2 + (focal * lat) / d;
      const sy = horizon + ((cam.z - (s.z || 0)) * focal) / d;
      const ppu = (focal / (d * cfg.cm)) * (s.scale || 1);
      drawClipped(ctx, s, sx, sy, ppu, d, t + (s.phase || 0), H, frame.cols);
    }
  }

  const api = {
    cfg,
    fogAt,
    get focal() {
      return api._focal;
    },
    _focal: 1,
    /** { w, h, walls, floor, ceil } — Uint8Arrays of w*h ids (0 = open for walls). */
    setWorld(wd) {
      world = wd;
    },
    /**
     * Textures by id: walls[id], floors[id], ceils[id] (canvases, index 0
     * unused for walls). `reflective` lists wall ids that act as mirrors.
     */
    setTextures({ walls = [], floors = [], ceils = [], reflective = [] }) {
      wallTex.length = floorTex.length = ceilTex.length = 0;
      walls.forEach((c, i) => (wallTex[i] = c ? bakeWall(c) : null));
      floors.forEach((c, i) => (floorTex[i] = c ? bakeFlat(c) : null));
      ceils.forEach((c, i) => (ceilTex[i] = c ? bakeFlat(c) : null));
      reflect.fill(0);
      for (const id of reflective) reflect[id] = 1;
    },
    setFog(color, near = cfg.fogNear, far = cfg.fogFar) {
      cfg.fogColor = color;
      cfg.fogNear = near;
      cfg.fogFar = far;
    },

    /**
     * Cast one ray. Returns the wall id hit (0 = none within maxDist) and
     * writes { dist, cx, cy, side } into `out`.
     */
    castRay(x, y, angle, maxDist, out) {
      const rdx = Math.cos(angle);
      const rdy = Math.sin(angle);
      let mx = Math.floor(x);
      let my = Math.floor(y);
      const ddx = Math.abs(1 / rdx);
      const ddy = Math.abs(1 / rdy);
      const stx = rdx < 0 ? -1 : 1;
      const sty = rdy < 0 ? -1 : 1;
      let sdx = (rdx < 0 ? x - mx : mx + 1 - x) * ddx;
      let sdy = (rdy < 0 ? y - my : my + 1 - y) * ddy;
      for (let i = 0; i < cfg.maxSteps; i++) {
        let side;
        let d;
        if (sdx < sdy) {
          d = sdx;
          sdx += ddx;
          mx += stx;
          side = 0;
        } else {
          d = sdy;
          sdy += ddy;
          my += sty;
          side = 1;
        }
        if (d > maxDist) return 0;
        const id = mx < 0 || my < 0 || mx >= world.w || my >= world.h ? cfg.edgeWall : world.walls[my * world.w + mx];
        if (id) {
          out.dist = d;
          out.cx = mx;
          out.cy = my;
          out.side = side;
          return id;
        }
      }
      return 0;
    },

    /**
     * Render the view. cam = { x, y, angle, z, pitch }; sprites[0..n) are
     * sprite records. o = { ink: boolean }.
     */
    render(ctx, view, cam, sprites, n, t, o) {
      if (!world) return;
      const W = Math.ceil(view.w);
      const H = view.h;
      // One ray per backing pixel column (view.k backing px per CSS px, already
      // held to the device tier's pixel budget by the loop), so walls are as
      // sharp as the canvas on high-DPI screens; clamped to bound the CPU cost.
      const kc = Math.min(Math.max(view.k || 1, 0.5), cfg.maxColScale);
      const C = Math.max(1, Math.round(view.w * kc));
      const cw = view.w / C;
      ensureCols(C);
      const horizon = H / 2 + (cam.pitch || 0);
      const dirX = Math.cos(cam.angle);
      const dirY = Math.sin(cam.angle);
      // Hor+: `fov` is the horizontal FOV at 16:9. The vertical FOV stays
      // fixed, so a wider window sees more to the sides instead of zooming in,
      // and a narrower one keeps its wall height (clamped to 3:2 .. 21:9).
      const aspect = Math.min(Math.max(W / H, 1.5), 2.4);
      const tanH = Math.tan((cfg.fov * Math.PI) / 360) * (aspect / (16 / 9));
      const planeX = -dirY * tanH;
      const planeY = dirX * tanH;
      const focal = W / 2 / tanH;
      api._focal = focal;
      api._horizon = horizon;

      renderFlats(ctx, W, H, horizon, cam, dirX, dirY, planeX, planeY, focal, tanH);

      const { w: mw, h: mh, walls } = world;
      const up = (cfg.wallH - cam.z) * focal;
      const dn = cam.z * focal;
      // Filtered columns: bricks, stripes and ink seams magnify smoothly
      // instead of stair-stepping (the source rect is one texel wide, so
      // there is no sideways bleed between atlas cells).
      ctx.imageSmoothingEnabled = true;
      let anyMirror = false;
      for (let x = 0; x < C; x++) {
        const camX = (2 * (x + 0.5)) / C - 1;
        let rx = dirX + planeX * camX;
        let ry = dirY + planeY * camX;
        let ox = cam.x;
        let oy = cam.y;
        let mx = Math.floor(ox);
        let my = Math.floor(oy);
        const ddx = Math.abs(1 / rx);
        const ddy = Math.abs(1 / ry);
        let stx = rx < 0 ? -1 : 1;
        let sty = ry < 0 ? -1 : 1;
        let sdx = (rx < 0 ? ox - mx : mx + 1 - ox) * ddx;
        let sdy = (ry < 0 ? oy - my : my + 1 - oy) * ddy;
        let side = 0;
        let id = 0;
        let bounced = false;
        mir[x] = 0;
        colKey[x] = -1;
        for (let i = 0; i < cfg.maxSteps; i++) {
          if (sdx < sdy) {
            sdx += ddx;
            mx += stx;
            side = 0;
          } else {
            sdy += ddy;
            my += sty;
            side = 1;
          }
          id = mx < 0 || my < 0 || mx >= mw || my >= mh ? cfg.edgeWall : walls[my * mw + mx];
          if (!id) continue;
          if (!reflect[id] || bounced) break;
          // Mirror: record the glass column, then bounce back into the room.
          const d = side === 0 ? sdx - ddx : sdy - ddy;
          const T = wallTex[id];
          let u = side === 0 ? oy + d * ry : ox + d * rx;
          u -= Math.floor(u);
          if ((side === 0 && rx < 0) || (side === 1 && ry > 0)) u = 1 - u;
          mir[x] = 1;
          mirTex[x] = id;
          mirU[x] = (u * T.w) | 0;
          mirLv[x] = fogLevel(d);
          mirSide[x] = side;
          mirTop[x] = horizon - up / d;
          mirBot[x] = horizon + dn / d;
          zBuf[x] = d;
          colTop[x] = mirTop[x];
          colBot[x] = mirBot[x];
          colKey[x] = ((my * mw + mx) << 1) | side;
          bounced = true;
          anyMirror = true;
          if (side === 0) {
            ox += 2 * d * rx;
            rx = -rx;
            stx = -stx;
            mx += stx;
          } else {
            oy += 2 * d * ry;
            ry = -ry;
            sty = -sty;
            my += sty;
          }
        }
        if (!id) id = cfg.edgeWall;
        let d = side === 0 ? sdx - ddx : sdy - ddy;
        if (d < 0.01) d = 0.01;
        const T = wallTex[id] || wallTex[cfg.edgeWall];
        let u = side === 0 ? oy + d * ry : ox + d * rx;
        u -= Math.floor(u);
        // A reflection reads mirrored, so flip it back against the real ray.
        if (((side === 0 && rx < 0) || (side === 1 && ry > 0)) !== bounced) u = 1 - u;
        const top = horizon - up / d;
        const bot = horizon + dn / d;
        blitColumn(ctx, T, fogLevel(d), side, (u * T.w) | 0, x, cw, top, bot, H);
        zFar[x] = d;
        if (!mir[x]) {
          zBuf[x] = d;
          colTop[x] = top;
          colBot[x] = bot;
          colKey[x] = mx < 0 || my < 0 || mx >= mw || my >= mh ? -2 - side : ((my * mw + mx) << 1) | side;
        }
      }

      // Sprites: depth sort once, far to near.
      if (n > sDepth.length) {
        sDepth = new Float32Array(n * 2);
        sOrder = new Int32Array(n * 2);
      }
      let m = 0;
      for (let i = 0; i < n; i++) {
        const s = sprites[i];
        if (s.hidden || !s.sprite) continue;
        const d = (s.x - cam.x) * dirX + (s.y - cam.y) * dirY;
        if (d < 0.12) continue;
        sDepth[i] = d;
        let j = m++;
        while (j > 0 && sDepth[sOrder[j - 1]] < d) {
          sOrder[j] = sOrder[j - 1];
          j--;
        }
        sOrder[j] = i;
      }
      ctx.imageSmoothingEnabled = true;
      frame.W = W;
      frame.H = H;
      frame.cols = C;
      frame.kc = 1 / cw;
      frame.cw = cw;
      frame.horizon = horizon;
      frame.focal = focal;
      frame.dirX = dirX;
      frame.dirY = dirY;
      frame.t = t;
      if (anyMirror) {
        drawSprites(ctx, sprites, m, true, cam);
        for (let x = 0; x < C; x++) {
          if (!mir[x]) continue;
          blitColumn(ctx, wallTex[mirTex[x]], mirLv[x], mirSide[x], mirU[x], x, cw, mirTop[x], mirBot[x], H);
        }
      }
      if (o && o.ink) drawInk(ctx, C, H);
      drawSprites(ctx, sprites, m, false, cam);
    },

    /** Screen position of a world point after the last render, or false when behind. */
    project(x, y, z, cam, view, out) {
      const dirX = Math.cos(cam.angle);
      const dirY = Math.sin(cam.angle);
      const d = (x - cam.x) * dirX + (y - cam.y) * dirY;
      if (d < 0.1) return false;
      const lat = (x - cam.x) * -dirY + (y - cam.y) * dirX;
      out.x = view.w / 2 + (api._focal * lat) / d;
      out.y = api._horizon + ((cam.z - z) * api._focal) / d;
      out.d = d;
      return true;
    },
  };
  return api;
}
