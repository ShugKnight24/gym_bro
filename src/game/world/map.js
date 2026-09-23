/**
 * The starter gym: a 16×12 grid of 2 m cells, plus the east annex (six more
 * columns) once the Gym Owner career opens it up. Wall, floor and ceiling ids
 * index the textures in ./textures.js. Static props sit at free world
 * positions; the cells they stand in are blocked for walking and building.
 */

export const W = 16;
export const H = 12;
/** With the annex open the grid is ANNEX_W wide; the east wall opens at rows 3-5. */
export const ANNEX_W = 22;
export const CELL_CM = 200;

export const WALL = { BLOCK: 1, MIRROR: 2, WINDOW: 3, DOOR: 4, MURAL_L: 5, ENTRANCE: 6, POSTER: 7, MURAL_R: 8 };
export const FLOOR = { MAT: 1, LOBBY: 2 };
export const CEIL = { TILE: 1, LIGHT: 2 };

/** Mirror glass plane: the east face of the x=0 wall. */
export const MIRROR_X = 1;
export const MIRROR_Y0 = 2;
export const MIRROR_Y1 = 9;

/** Annex columns 15-21 appended to each row when it is open. */
const ANNEX = [
  "1111331",
  "1.....1",
  "1.....3",
  "......3",
  "......1",
  "......3",
  "1.....3",
  "1.....1",
  "1.....1",
  "1.....1",
  "1.....1",
  "1111111",
];

const ROWS = [
  "1113317581133111",
  "1..............1",
  "2..............1",
  "2..............7",
  "2..............3",
  "2..............3",
  "2..............1",
  "2..............1",
  "2..............1",
  "1..............1",
  "1..............1",
  "1111661117111141",
];

export const SPAWN = [13, 9];
export const DOOR_CELL = [14, 11];
export const ENTRANCE = [4.5, 10.6];

/** Static props: sprite key, world position, collision radius, optional interaction. */
export const PROPS = [
  { sprite: "desk", x: 11.5, y: 8.45, r: 0.55, act: "desk" },
  { sprite: "chair", x: 11.2, y: 8.05, r: 0 },
  { sprite: "vending_machine", x: 14.62, y: 7.5, r: 0.45, act: "vending" },
  { sprite: "locker", x: 8.3, y: 10.72, r: 0.3 },
  { sprite: "locker", x: 8.75, y: 10.72, r: 0.3 },
  { sprite: "locker", x: 9.2, y: 10.72, r: 0.3 },
  { sprite: "locker", x: 9.65, y: 10.72, r: 0.3 },
  { sprite: "bench", x: 9.0, y: 10.05, r: 0.3 },
  { sprite: "potted_plant", x: 1.35, y: 10.6, r: 0.25 },
  { sprite: "potted_plant", x: 14.6, y: 1.4, r: 0.25 },
  { sprite: "potted_plant", x: 6.6, y: 10.6, r: 0.25 },
  { sprite: "crate", x: 1.45, y: 1.4, r: 0.35 },
  { sprite: "dumbbell", x: 4.3, y: 2.2, r: 0 },
];

const BLOCKED = [[11, 8], [14, 7], [8, 10], [9, 10], [1, 10], [14, 1], [6, 10], [1, 1]];
/** Walkable but not buildable: lobby, entrance approach, the spawn. */
const RESERVED = [[11, 9], [12, 9], [13, 9], [12, 8], [13, 8], [12, 10], [13, 10], [14, 10], [14, 9], [14, 8], [13, 7], [4, 10], [5, 10], [4, 9], [5, 9]];
/** Cells that must stay reachable: home door, entrance, desk and vending fronts. */
const KEEP = [[14, 10], [4, 10], [11, 9], [13, 7]];

export function buildMap(annex = false) {
  const w = annex ? ANNEX_W : W;
  const rows = annex ? ROWS.map((r, y) => r.slice(0, W - 1) + ANNEX[y]) : ROWS;
  const n = w * H;
  const walls = new Uint8Array(n);
  const floor = new Uint8Array(n).fill(FLOOR.MAT);
  const ceil = new Uint8Array(n).fill(CEIL.TILE);
  const blocked = new Uint8Array(n);
  const reserved = new Uint8Array(n);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      walls[y * w + x] = c === "." ? 0 : Number(c);
      if (x >= 11 && x < W - 1 && y >= 7) floor[y * w + x] = FLOOR.LOBBY;
      if (x % 3 === 1 && y % 3 === 1) ceil[y * w + x] = CEIL.LIGHT;
    }
  }
  for (const [x, y] of BLOCKED) blocked[y * w + x] = 1;
  for (const [x, y] of RESERVED) reserved[y * w + x] = 1;
  // The old east wall's doorway must stay walkable.
  if (annex) for (let y = 3; y <= 5; y++) reserved[y * w + (W - 1)] = 1;
  return { w, h: H, walls, floor, ceil, blocked, reserved, spawn: SPAWN, keep: KEEP };
}

export const isSolidCell = (m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || m.walls[y * m.w + x] > 0;
