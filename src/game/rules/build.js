/**
 * Equipment placement. The map is `{ w, h, walls: Uint8Array, blocked:
 * Uint8Array, reserved: Uint8Array, spawn: [x, y], keep: [[x, y], …] }`:
 * walls and blocked (static props) are solid, reserved cells are walkable
 * but not buildable, `keep` lists cells that must stay reachable (doors,
 * desk). Every piece is used from its access cell, the neighbour `rot` faces.
 */

/** rot 0..3 = access to the north, east, south, west. */
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const accessCell = (x, y, rot) => [x + DIRS[rot & 3][0], y + DIRS[rot & 3][1]];
export const inBounds = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
export const isOpen = (m, x, y) => inBounds(m, x, y) && !m.walls[y * m.w + x] && !m.blocked[y * m.w + x];
export const findAt = (placed, x, y) => placed.findIndex((p) => p.x === x && p.y === y);

/** BFS over open, unoccupied floor from the spawn. Returns a Uint8Array of reached cells. */
export function reachable(m, placed) {
  const seen = new Uint8Array(m.w * m.h);
  const solid = new Uint8Array(m.w * m.h);
  for (const p of placed) solid[p.y * m.w + p.x] = 1;
  const q = [m.spawn[1] * m.w + m.spawn[0]];
  seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    const x = c % m.w;
    const y = (c / m.w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const n = ny * m.w + nx;
      if (isOpen(m, nx, ny) && !solid[n] && !seen[n]) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return seen;
}

/** Why a piece cannot go at (x, y) facing `rot`, or null when it can. */
export function placementError(m, placed, x, y, rot) {
  if (!isOpen(m, x, y)) return "Not open floor";
  if (findAt(placed, x, y) >= 0) return "Occupied";
  if (m.reserved[y * m.w + x]) return "Keep this area clear";
  const [ax, ay] = accessCell(x, y, rot);
  if (!isOpen(m, ax, ay) || findAt(placed, ax, ay) >= 0) return "Needs a clear access side";
  for (const p of placed) {
    const [px, py] = accessCell(p.x, p.y, p.rot);
    if (px === x && py === y) return "Blocks another machine";
  }
  const next = [...placed, { x, y, rot }];
  const seen = reachable(m, next);
  for (const p of next) {
    const [px, py] = accessCell(p.x, p.y, p.rot);
    if (!seen[py * m.w + px]) return "Blocks the walkway";
  }
  for (const [kx, ky] of m.keep) if (!seen[ky * m.w + kx]) return "Blocks the walkway";
  return null;
}

export const sellValue = (cost) => Math.floor(cost * 0.5);
