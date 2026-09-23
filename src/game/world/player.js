/**
 * First-person walker: WASD / left stick / touch stick (analog `input.move`),
 * mouse look (pointer lock), right stick or touch drag (always), arrow keys;
 * axis-separated collision against solid cells, head bob.
 */

const RADIUS = 0.22;
const WALK = 1.6; // cells/s (3.2 m/s)
const RUN = 2.5;
const TURN = 2.4; // rad/s on the arrow keys
const SENS = 0.0023;
const LOOK_YAW = 2.6; // rad/s at full right-stick deflection
const LOOK_PITCH = 260; // pitch units/s at full deflection

export function createPlayer(x, y, angle) {
  return { x, y, angle, pitch: 0, z: 0.8, bob: 0, bobAmp: 0, moving: false };
}

/** Is any corner of the player's box inside a solid cell? */
function blocked(solid, x, y) {
  return (
    solid(Math.floor(x - RADIUS), Math.floor(y - RADIUS)) ||
    solid(Math.floor(x + RADIUS), Math.floor(y - RADIUS)) ||
    solid(Math.floor(x - RADIUS), Math.floor(y + RADIUS)) ||
    solid(Math.floor(x + RADIUS), Math.floor(y + RADIUS))
  );
}

/**
 * @param {object} p       player
 * @param {object} input   engine/input.js
 * @param {boolean} look   pointer is locked: apply mouse look
 * @param {(cx:number, cy:number) => boolean} solid
 */
export function updatePlayer(p, input, dt, look, solid) {
  p.angle += input.axis("turnL", "turnR") * TURN * dt;
  let lx = look ? input.mouse.dx : 0;
  let ly = look ? input.mouse.dy : 0;
  if (input.lookDelta) (lx += input.lookDelta.x), (ly += input.lookDelta.y);
  p.angle += lx * SENS;
  let pitch = p.pitch - ly * 0.5;
  if (input.look) {
    p.angle += input.look.x * LOOK_YAW * dt;
    pitch -= input.look.y * LOOK_PITCH * dt;
  }
  p.pitch = Math.max(-140, Math.min(140, pitch));
  const m = input.move || { x: input.axis("left", "right"), y: input.axis("back", "forward") };
  const fwd = m.y;
  const str = m.x;
  const dx = Math.cos(p.angle);
  const dy = Math.sin(p.angle);
  let vx = dx * fwd - dy * str;
  let vy = dy * fwd + dx * str;
  const len = Math.hypot(vx, vy);
  p.moving = len > 0.01;
  if (p.moving) {
    const sp = ((input.down("run") ? RUN : WALK) * Math.min(1, len)) / len;
    vx *= sp * dt;
    vy *= sp * dt;
    if (!blocked(solid, p.x + vx, p.y)) p.x += vx;
    if (!blocked(solid, p.x, p.y + vy)) p.y += vy;
    p.bob += dt * (input.down("run") ? 12 : 9);
  }
  p.bobAmp += ((p.moving ? 1 : 0) - p.bobAmp) * Math.min(1, dt * 8);
}

/** Camera eye height and pitch with the walk bob applied. */
export function cameraOf(p, cam) {
  cam.x = p.x;
  cam.y = p.y;
  cam.angle = p.angle;
  cam.z = p.z + Math.abs(Math.sin(p.bob)) * 0.03 * p.bobAmp;
  cam.pitch = p.pitch + Math.sin(p.bob * 2) * 1.5 * p.bobAmp;
  return cam;
}
