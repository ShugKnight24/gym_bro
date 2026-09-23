/**
 * Prop sprite kit: the oblique 3/4 projection, shared materials and primitives
 * every gym prop is built from (props live in src/game/art/props.js).
 *
 * Vendored from Clockwork Carnage src/rendering/svg-art/sprites/props.js.
 *
 * Units are centimetres. Origin (0,0) = the prop's footprint centre on the
 * floor, y up is negative, so a 190 cm locker spans y -190…0 and the engine
 * anchors y=0 on groundY(). Every prop is drawn in a fixed 3/4 view: a point
 * `z` cm behind the front plane shifts right by z·OX and converges vertically
 * toward the eye line (EYE, ~1.5 m), so low props show their top face and
 * tall ones have side edges that slope down like real perspective.
 *
 * Sprite format mirrors the cutscene models (../index.js):
 *   { box: [x, y, w, h], layers: [{ markup, anim?, blend?, shade? }] }
 * `shade: false` marks emissive layers that should not darken with distance.
 *
 * Realistic art style builds a second set from the same geometry
 * (buildRealisticProps, on first Realistic use): no ink outlines, graded
 * physical materials, a top key light, grime and scuffs, heavier contact
 * shadows and restrained emissives. Boxes and anchors are shared, so placement
 * does not change between styles.
 */

export const INK = "#04060b";
export const OX = 0.42;
export const EYE = -150;
const KZ = 0.0017;

// True only while buildRealisticProps / pickups' Realistic builders run, so
// the shared builders emit their Realistic variants. Modern builds at import
// with it false and its markup is unchanged.
let REAL = false;
export const isRealBuild = () => REAL;
/** Run `fn` with the Realistic variants of the shared helpers switched on. */
export function withRealistic(fn) {
  REAL = true;
  try {
    return fn();
  } finally {
    REAL = false;
  }
}

export const f = (n) => Math.round(n * 10) / 10;
export const pts = (list) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
/** Height of a point pushed `z` cm back, converging toward the eye line. */
export const zy = (y, z) => y + (EYE - y) * z * KZ;
export const pj = (x, y, z) => [x + z * OX, zy(y, z)];

export const poly = (list, fill, w = 1.1, extra = "") =>
  `<polygon points="${pts(list)}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const rect = (x, y, w, h, fill, sw = 1.1, rx = 0, extra = "") =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"` +
  (sw ? ` stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"` : "") +
  `${extra}/>`;
export const path = (d, fill, w = 1.1, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const line = (d, color, w, op = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const ell = (cx, cy, rx, ry, fill, sw = 0, extra = "") =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"` +
  (sw ? ` stroke="${INK}" stroke-width="${sw}"` : "") +
  `${extra}/>`;

/** Material = front (diagonal, lit upper-left), side (shadow) and top gradients. */
export function mat(id, top, front, side) {
  return (
    `<linearGradient id="${id}T" x1="0" y1="1" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${top[0]}"/><stop offset="1" stop-color="${top[1]}"/></linearGradient>` +
    `<linearGradient id="${id}F" x1="0" y1="0" x2=".7" y2="1">` +
    `<stop offset="0" stop-color="${front[0]}"/><stop offset=".3" stop-color="${front[1]}"/>` +
    `<stop offset=".78" stop-color="${front[2]}"/><stop offset="1" stop-color="${front[3]}"/></linearGradient>` +
    `<linearGradient id="${id}S" x1="0" y1="0" x2="1" y2=".5">` +
    `<stop offset="0" stop-color="${side[0]}"/><stop offset="1" stop-color="${side[1]}"/></linearGradient>`
  );
}

/** Horizontal cylinder shading: soft edge, highlight at 28%, falloff to the right. */
export function cyl(id, c) {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${c[1]}"/><stop offset=".28" stop-color="${c[0]}"/>` +
    `<stop offset=".6" stop-color="${c[2]}"/><stop offset=".9" stop-color="${c[3]}"/>` +
    `<stop offset="1" stop-color="${c[4]}"/></linearGradient>`
  );
}

export const DEFS =
  mat("st", ["#6b8196", "#8ea3b6"], ["#7f96ab", "#566b80", "#34475a", "#1f2b37"], ["#1f2b37", "#0d141b"]) +
  mat("dk", ["#4a5563", "#5d6a78"], ["#566271", "#3a4450", "#222932", "#14181e"], ["#1a1f26", "#0a0d10"]) +
  mat("gy", ["#9aa1a8", "#b9c0c6"], ["#b3b9bf", "#8d949b", "#666d74", "#484e55"], ["#50575e", "#2c3136"]) +
  mat("wd", ["#b4832b", "#d09a3a"], ["#c08a28", "#9a7016", "#735310", "#4f390a"], ["#5a410c", "#33240a"]) +
  mat("wn", ["#8a5a38", "#a36d45"], ["#8d5b37", "#6b4226", "#4d2f1b", "#34200f"], ["#3e2515", "#221409"]) +
  mat("ol", ["#71873f", "#8aa14e"], ["#7a9045", "#5b7231", "#3f5222", "#2c3a17"], ["#34431c", "#1b230e"]) +
  mat("bv", ["#3e62c4", "#5479d8"], ["#4a6fd0", "#2c4fb3", "#1d3888", "#122462"], ["#172d70", "#0a1640"]) +
  mat("cc", ["#a7a7a1", "#c2c2bb"], ["#b4b4ae", "#96968f", "#74746f", "#565652"], ["#61615c", "#3b3b38"]) +
  mat("lm", ["#b8ad9d", "#d2c8b8"], ["#a89c8b", "#887766", "#665748", "#4a3f34"], ["#554a3d", "#312a22"]) +
  mat("fb", ["#55556a", "#6a6a80"], ["#5d5d72", "#444455", "#2e2e3a", "#1d1d26"], ["#262631", "#121218"]) +
  mat("tc", ["#a8582a", "#c06a36"], ["#b76330", "#8b4513", "#65310d", "#442007"], ["#4f260a", "#2a1304"]) +
  cyl("chrome", ["#f2f7fb", "#a7b4c0", "#6b7886", "#39434d", "#1b2128"]) +
  cyl("rubber", ["#5a6068", "#2d3238", "#1c2025", "#0f1215", "#06080a"]) +
  cyl("leather", ["#c4552a", "#8b2d0a", "#7a2204", "#4a1400", "#240900"]) +
  `<linearGradient id="chromeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7b4c0"/>` +
  `<stop offset=".3" stop-color="#f2f7fb"/><stop offset=".7" stop-color="#5a6775"/><stop offset="1" stop-color="#1b2128"/></linearGradient>` +
  `<linearGradient id="rubberV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4048"/>` +
  `<stop offset=".25" stop-color="#5a6068"/><stop offset=".6" stop-color="#1c2025"/><stop offset="1" stop-color="#06080a"/></linearGradient>` +
  cyl("pipe", ["#8d99a6", "#4d5864", "#353e48", "#1d242b", "#0c1014"]) +
  `<linearGradient id="vert" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/>` +
  `<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>` +
  `<radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".6"/>` +
  `<stop offset=".55" stop-color="#000" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="bloomG"><stop offset="0" stop-color="#9dffd0" stop-opacity=".55"/>` +
  `<stop offset=".45" stop-color="#00ff88" stop-opacity=".22"/><stop offset="1" stop-color="#00ff88" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="warmG"><stop offset="0" stop-color="#fff2c0" stop-opacity=".9"/>` +
  `<stop offset=".35" stop-color="#ffb030" stop-opacity=".45"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="cyanG"><stop offset="0" stop-color="#d8fdff" stop-opacity=".95"/>` +
  `<stop offset=".35" stop-color="#22e6ff" stop-opacity=".5"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="greenG"><stop offset="0" stop-color="#e0ffe8" stop-opacity=".95"/>` +
  `<stop offset=".35" stop-color="#00ff44" stop-opacity=".5"/><stop offset="1" stop-color="#00ff44" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="screen" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#0a5a3c"/>` +
  `<stop offset=".5" stop-color="#003322"/><stop offset="1" stop-color="#001810"/></linearGradient>` +
  `<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe9ff"/>` +
  `<stop offset=".5" stop-color="#8ab8e0"/><stop offset="1" stop-color="#3e6a96"/></linearGradient>` +
  `<linearGradient id="leafA" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a5e26"/>` +
  `<stop offset=".6" stop-color="#2f9a3f"/><stop offset="1" stop-color="#5fcf5f"/></linearGradient>` +
  `<linearGradient id="leafB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0f3f18"/>` +
  `<stop offset=".6" stop-color="#1f7a2e"/><stop offset="1" stop-color="#3aa648"/></linearGradient>` +
  `<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.2"/></filter>` +
  `<filter id="soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5"/></filter>`;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Oblique box. (x, y) is the front face's top-left, `d` the depth in cm.
 * Draws side, top (skip with o.top=false for things above eye height) and front.
 */
export function block(x, y, w, h, d, m, o = {}) {
  const dx = d * OX;
  const yt = zy(y, d);
  const ink = o.ink ?? 1.1;
  let s = "";
  if (o.side !== false) s += poly([[x + w, y], [x + w + dx, yt], [x + w + dx, zy(y + h, d)], [x + w, y + h]], `url(#${m}S)`, ink);
  // The top face is only visible when it sits below the eye line.
  if (o.top !== false && yt < y - 0.5) s += poly([[x, y], [x + dx, yt], [x + w + dx, yt], [x + w, y]], `url(#${m}T)`, ink);
  s += rect(x, y, w, h, `url(#${m}F)`, ink, o.rx || 0);
  if (o.hi !== 0) s += line(`M${f(x + 1.2)},${f(y + h - 1.5)}V${f(y + 1.2)}H${f(x + w - 1.5)}`, "#fff", 0.7, o.hi ?? 0.28);
  return s;
}

/** Soft floor contact shadow. */
export const shadow = (cx, cy, rx, ry, op = 1) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#shadow)" opacity="${op}"/>` +
  // Realistic: a tight occlusion core where the object meets the floor.
  (REAL ? `<ellipse cx="${f(cx - 1)}" cy="${f(cy + ry * 0.12)}" rx="${f(rx * 0.74)}" ry="${f(ry * 0.5)}" fill="url(#shadowCore)" opacity="${op}"/>` : "");

/** Rim light along an edge — cool cyan, the in-world accent colour. */
export const rim = (d, op = 0.35, w = 0.9) => (REAL ? line(d, "#e6ecf0", w * 0.8, op * 0.4) : line(d, "#22e6ff", w, op));

/** Small emissive light: blurred halo + bright core (for glow layers). */
export const lamp = (x, y, r, color, core = "#ffffff") =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * (REAL ? 1.7 : 2.6))}" fill="${color}" opacity="${REAL ? ".3" : ".55"}" filter="url(#glow)"/>` +
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${core}"/>`;

/** Horizontal vent slits with a lit lower lip. */
export function vents(x, y, w, n, gap = 4.2) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const yy = y + i * gap;
    s += rect(x, yy, w, 1.8, "#070b10", 0, 0.9);
    s += line(`M${f(x + 0.6)},${f(yy + 2.4)}H${f(x + w - 0.6)}`, "#c8d6e2", 0.5, 0.3);
  }
  return s;
}

/** Tapered leaf blade from base along an angle (deg from vertical) with a bend. */
export function leaf(bx, by, deg, len, wid, bend, fill) {
  const a = (deg * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const tip = [bx + ux * len, by + uy * len + Math.abs(ux) * len * bend];
  const nx = -uy;
  const ny = ux;
  const mid = [bx + ux * len * 0.55, by + uy * len * 0.55];
  const c1 = [mid[0] + nx * wid, mid[1] + ny * wid];
  const c2 = [mid[0] - nx * wid, mid[1] - ny * wid];
  const d = `M${f(bx)},${f(by)}Q${f(c1[0])},${f(c1[1])} ${f(tip[0])},${f(tip[1])}Q${f(c2[0])},${f(c2[1])} ${f(bx)},${f(by)}Z`;
  const rib = `M${f(bx)},${f(by)}Q${f(mid[0])},${f(mid[1] - 1)} ${f(tip[0])},${f(tip[1])}`;
  if (REAL) {
    // Leaves fold along the midrib: the half away from the key light is darker.
    const half = `M${f(bx)},${f(by)}Q${f(c2[0])},${f(c2[1])} ${f(tip[0])},${f(tip[1])}Q${f(mid[0])},${f(mid[1] - 1)} ${f(bx)},${f(by)}Z`;
    return path(d, fill, 0.8) + `<path d="${half}" fill="#000" opacity=".26"/>` + line(rib, "#b8f0a0", 0.5, 0.3);
  }
  return path(d, fill, 0.8) + line(rib, "#b8f0a0", 0.5, 0.35);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Realistic set
// ---------------------------------------------------------------------------

/** Ink outlines become a soft, translucent darker edge. */
const SOFT_EDGE = "rgba(10,8,6,.34)";

/**
 * Grade a #rgb / #rrggbb colour toward paint: pulled toward its own
 * luminance (reduced saturation) and off pure white and black.
 */
export function gradeHex(h, sat = 0.66) {
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  const n = parseInt(full, 16);
  const c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  let out = "#";
  for (let i = 0; i < 3; i++) {
    const v = (L + (c[i] - L) * sat) * 0.88 + 0.025;
    out += Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  }
  return out;
}

/** Realistic pass over finished markup: soft edges for ink, graded colours. `url(#id)` refs are untouched. */
export const gradeMarkup = (m, sat) =>
  m
    .replace(/stroke="#04060b"/g, `stroke="${SOFT_EDGE}"`)
    .replace(/(?<!url\()#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (_, h) => gradeHex(h, sat));

/**
 * Surface filters for the Realistic wrap. Frequencies are in art units, so
 * each sprite set passes values that suit its scale (props are centimetres).
 */
export const realSurfaceDefs = (grime = 0.035, scuff = "0.06 0.45") =>
  `<filter id="rWht"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter>` +
  `<filter id="rGrime"><feTurbulence type="fractalNoise" baseFrequency="${grime}" numOctaves="4" seed="3"/>` +
  `<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.6 0 0 0 -1.12"/>` +
  `<feComposite in="SourceGraphic" operator="in"/></filter>` +
  `<filter id="rScuff"><feTurbulence type="turbulence" baseFrequency="${scuff}" numOctaves="2" seed="11"/>` +
  `<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 7 0 0 0 -3.9"/>` +
  `<feComposite in="SourceGraphic" operator="in"/></filter>` +
  // Key light from above and slightly left, falling off to floor occlusion.
  `<linearGradient id="rKey" x1=".3" y1="0" x2=".62" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/>` +
  `<stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity=".06"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>` +
  `<radialGradient id="shadowCore"><stop offset="0" stop-color="#000" stop-opacity=".72"/>` +
  `<stop offset=".6" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;

/**
 * Wrap a lit (non-emissive) layer: draw it, then key light, grime and scuffs
 * clipped to its own silhouette. Runs once per layer at build time.
 */
export function realWrap(markup, box, grime = 0.36, scuff = 0.2) {
  const R = `x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"`;
  return (
    `<defs><g id="rl">${markup}</g>` +
    `<mask id="rm" maskUnits="userSpaceOnUse" ${R}><use href="#rl" filter="url(#rWht)"/></mask></defs>` +
    `<use href="#rl"/><g mask="url(#rm)"><rect ${R} fill="url(#rKey)"/>` +
    `<rect ${R} fill="#17120b" opacity="${grime}" filter="url(#rGrime)"/>` +
    `<rect ${R} fill="#e2dccf" opacity="${scuff}" filter="url(#rScuff)"/></g>`
  );
}

/**
 * Turn a sprite built under withRealistic() into its Realistic form: lit
 * layers graded and wrapped, emissive layers scaled by `glow`. The raw graded
 * markup is kept as `silMarkup` for the cheaper distance-fog silhouette.
 */
export function realizeSprite(sprite, glow = 0.85, o = {}) {
  sprite.realistic = true;
  for (const layer of sprite.layers) {
    if (layer.shade === false || layer.blend) {
      layer.opacity = (layer.opacity ?? 1) * glow;
      continue;
    }
    const m = gradeMarkup(layer.markup, o.sat);
    layer.silMarkup = m;
    layer.markup = realWrap(m, layer.box || sprite.box, o.grime, o.scuff);
  }
  return sprite;
}

/** Realistic overrides placed ahead of the graded Modern defs (first id wins). */
const REAL_PROP_FX =
  `<radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".74"/>` +
  `<stop offset=".5" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="bloomG"><stop offset="0" stop-color="#9dffd0" stop-opacity=".3"/>` +
  `<stop offset=".45" stop-color="#00ff88" stop-opacity=".1"/><stop offset="1" stop-color="#00ff88" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="warmG"><stop offset="0" stop-color="#fff2c0" stop-opacity=".8"/>` +
  `<stop offset=".3" stop-color="#ffb030" stop-opacity=".28"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>`;

/** Build every sprite from a { key: () => sprite } table. */
export function buildSet(builders) {
  const out = {};
  for (const key in builders) out[key] = builders[key]();
  return out;
}

/**
 * Realistic ("Modern") counterpart of a prop set: the same builders run with
 * the Realistic helpers on, then graded and wrapped. { defs, sprites }.
 */
export function buildRealisticSet(builders, defs = DEFS) {
  const sprites = withRealistic(() => buildSet(builders));
  for (const key in sprites) realizeSprite(sprites[key]);
  return { defs: REAL_PROP_FX + realSurfaceDefs() + gradeMarkup(defs), sprites };
}
