/**
 * Keyboard + pointer + gamepad + touch input as named actions.
 *
 * Game code asks `input.down("left")` / `input.pressed("use")`, never about
 * key codes, so rebinding is one table. `pressed` is edge-triggered and holds
 * until `endFrame()` runs at the end of each update. Each source (keys, pad,
 * touch) keeps its own held set; `down` is true if any source holds it.
 *
 * Analog: `input.move` {x: strafe right, y: forward} in -1..1 (keys + left
 * stick + touch stick, length capped at 1). `input.look` {x, y} is right-stick
 * deflection (a rate: scale by dt), `input.lookDelta` {x, y} is per-frame touch
 * drag in pixels (like mouse dx/dy, but applied without pointer lock).
 * `input.device` is the last used: "keyboard" | "gamepad" | "touch".
 *
 * Gamepad (standard mapping), read by `poll(dt)` at the start of each update:
 *   left stick  move            right stick  look          L3  run
 *   A           use + rep       B            pause (back)  X   alt
 *   Y           careers         LB           build         RB  pageNext
 *   LT / RT     rotate          Back/Select  stats         Start  pause
 *   D-pad L/R   turnL / turnR   D-pad U/D    slotPrev / slotNext
 *
 * Rebinding: `bindings()` copy, `setBindings(map)`, `defaults`, and
 * `captureNext(cb)` which hands the next keydown's code to cb instead of
 * acting on it (Escape cancels with cb(null)).
 */

const DEAD = 0.18;
const PAD_BUTTONS = [
  ["use", "rep"], ["pause"], ["alt"], ["careers"], ["build"], ["pageNext"], ["rotate"], ["rotate"],
  ["stats"], ["pause"], ["run"], [], ["slotPrev"], ["slotNext"], ["turnL"], ["turnR"],
];

const copyMap = (m) => Object.fromEntries(Object.entries(m).map(([a, c]) => [a, [...c]]));

/** Radial deadzone, rescaled so output starts at 0 just past the edge. */
function deadzone(x, y, out) {
  const m = Math.hypot(x, y);
  if (m < DEAD) out.x = out.y = 0;
  else {
    const s = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
    out.x = x * s;
    out.y = y * s;
  }
  return out;
}

export function createInput(target, bindings) {
  const defaults = copyMap(bindings);
  let map = copyMap(bindings);
  const byCode = new Map();
  const rebuild = () => {
    byCode.clear();
    for (const [action, codes] of Object.entries(map)) for (const c of codes) byCode.set(c, action);
  };
  rebuild();
  const held = new Set();
  const padHeld = new Set();
  const touchHeld = new Set();
  const edge = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, clicked: false, rightClicked: false, wheel: 0 };
  const stick = { x: 0, y: 0 };
  const touchMove = { x: 0, y: 0 };
  const look = { x: 0, y: 0 };
  const lookDelta = { x: 0, y: 0 };
  const move = { x: 0, y: 0 };
  let capture = null;

  const isDown = (a) => held.has(a) || padHeld.has(a) || touchHeld.has(a);
  const axis = (neg, pos) => (isDown(pos) ? 1 : 0) - (isDown(neg) ? 1 : 0);

  const api = {
    mouse,
    look,
    lookDelta,
    device: "keyboard",
    defaults,
    down: isDown,
    pressed: (a) => edge.has(a),
    /** Axis from two actions: -1, 0 or 1. */
    axis,
    /** Keys + left stick + touch stick, capped to length 1. Valid without poll(). */
    get move() {
      let x = axis("left", "right") + stick.x + touchMove.x;
      let y = axis("back", "forward") + stick.y + touchMove.y;
      const m = Math.hypot(x, y);
      if (m > 1) (x /= m), (y /= m);
      move.x = x;
      move.y = y;
      return move;
    },
    /** Read the first standard gamepad; call at the start of each update. */
    poll() {
      const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
      const live = [...pads].filter((p) => p && p.connected);
      const pad = live.find((p) => p.mapping === "standard") || live[0];
      if (!pad) {
        padHeld.clear();
        stick.x = stick.y = look.x = look.y = 0;
        return;
      }
      const ax = pad.axes;
      deadzone(ax[0] || 0, -(ax[1] || 0), stick);
      deadzone(ax[2] || 0, ax[3] || 0, look);
      let active = stick.x || stick.y || look.x || look.y;
      const now = new Set();
      pad.buttons.forEach((b, i) => {
        if (!(b.pressed || b.value > 0.5)) return;
        active = true;
        for (const a of PAD_BUTTONS[i] || []) now.add(a);
      });
      for (const a of now) if (!padHeld.has(a)) edge.add(a);
      padHeld.clear();
      for (const a of now) padHeld.add(a);
      if (active) api.device = "gamepad";
    },
    /** Touch: hold an action on/off. */
    hold(action, on) {
      api.device = "touch";
      if (on) {
        if (!isDown(action)) edge.add(action);
        touchHeld.add(action);
      } else touchHeld.delete(action);
    },
    /** Touch: a single edge press. */
    tap(action) {
      api.device = "touch";
      edge.add(action);
    },
    /** Touch stick, x = strafe right, y = forward, -1..1. */
    setTouchMove(x, y) {
      if (x || y) api.device = "touch";
      touchMove.x = x;
      touchMove.y = y;
    },
    /** Touch look drag in pixels. */
    addLook(dx, dy) {
      api.device = "touch";
      lookDelta.x += dx;
      lookDelta.y += dy;
    },
    bindings: () => copyMap(map),
    setBindings(next) {
      map = copyMap(next);
      rebuild();
      held.clear();
    },
    /** Next keydown's code goes to cb (Escape → null) and is not an action. */
    captureNext(cb) {
      capture = cb;
    },
    endFrame() {
      edge.clear();
      mouse.dx = mouse.dy = mouse.wheel = 0;
      mouse.clicked = mouse.rightClicked = false;
      lookDelta.x = lookDelta.y = 0;
    },
  };

  if (typeof addEventListener !== "function" || !target) return api;

  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
  addEventListener("keydown", (e) => {
    if (capture) {
      const cb = capture;
      capture = null;
      e.preventDefault();
      cb(e.code === "Escape" ? null : e.code);
      return;
    }
    if (typing(e)) return;
    api.device = "keyboard";
    const a = byCode.get(e.code);
    if (!a) return;
    if (!held.has(a)) edge.add(a);
    held.add(a);
    if (e.code === "Tab" || e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
  });
  addEventListener("keyup", (e) => {
    const a = byCode.get(e.code);
    if (a) held.delete(a);
  });
  addEventListener("blur", () => {
    held.clear();
    touchHeld.clear();
    touchMove.x = touchMove.y = 0;
  });

  const toLocal = (e) => {
    const r = target.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  };
  target.addEventListener("pointermove", (e) => {
    toLocal(e);
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
  });
  target.addEventListener("pointerdown", (e) => {
    toLocal(e);
    api.device = e.pointerType === "touch" ? "touch" : "keyboard";
    if (e.button === 2) mouse.rightClicked = true;
    else {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  addEventListener("pointerup", () => (mouse.down = false));
  target.addEventListener("contextmenu", (e) => e.preventDefault());
  target.addEventListener("wheel", (e) => {
    mouse.wheel += Math.sign(e.deltaY);
    e.preventDefault();
  }, { passive: false });

  return api;
}
