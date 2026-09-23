/**
 * Keyboard + pointer input as named actions.
 *
 * Game code asks `input.down("left")` / `input.pressed("use")`, never about
 * key codes, so rebinding is one table. `pressed` is edge-triggered and holds
 * until `endFrame()` runs at the end of each update.
 */

export function createInput(target, bindings) {
  const byCode = new Map();
  for (const [action, codes] of Object.entries(bindings)) for (const c of codes) byCode.set(c, action);
  const held = new Set();
  const edge = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, clicked: false, rightClicked: false, wheel: 0 };

  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
  addEventListener("keydown", (e) => {
    if (typing(e)) return;
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
  addEventListener("blur", () => held.clear());

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

  return {
    mouse,
    down: (a) => held.has(a),
    pressed: (a) => edge.has(a),
    /** Axis from two actions: -1, 0 or 1. */
    axis: (neg, pos) => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0),
    endFrame() {
      edge.clear();
      mouse.dx = mouse.dy = mouse.wheel = 0;
      mouse.clicked = mouse.rightClicked = false;
    },
  };
}
