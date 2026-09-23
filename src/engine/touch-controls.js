/**
 * On-screen touch controls feeding engine/input.js.
 *
 * Renders only on touch-capable devices. Left 40% of the screen is a floating
 * joystick (input.setTouchMove), the rest is a look drag (input.addLook);
 * buttons map to actions via input.hold / input.tap. Modes from the game:
 * "play" stick + look + buttons, "train" a big REP button, "build" ROTATE /
 * NEXT PAGE / EXIT only (no drag zones, so canvas taps still place),
 * "title" / "menu" hidden. The root ignores pointers; only controls take them.
 */

const STICK_R = 56; // px of drag for full deflection

const BUTTONS = {
  play: [["USE", "use", "big"], ["ALT", "alt"], ["BUILD", "build"], ["CAREERS", "careers"], ["STATS", "stats"], ["PAUSE", "pause", "top"]],
  train: [["REP", "rep", "huge"], ["PAUSE", "pause", "top"]],
  build: [["ROTATE", "rotate", "big"], ["NEXT PAGE", "pageNext"], ["EXIT", "build"], ["PAUSE", "pause", "top"]],
};

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || !!window.matchMedia?.("(pointer: coarse)").matches;
}

export function createTouchControls(input, root = typeof document !== "undefined" ? document.body : null) {
  if (!root || !isTouchDevice()) return { show() {}, setMode() {}, el: null };

  const el = document.createElement("div");
  el.className = "tc";
  el.hidden = true;
  const stickZone = document.createElement("div");
  stickZone.className = "tc-zone tc-stick-zone";
  const lookZone = document.createElement("div");
  lookZone.className = "tc-zone tc-look-zone";
  const base = document.createElement("div");
  base.className = "tc-base";
  const knob = document.createElement("div");
  knob.className = "tc-knob";
  base.append(knob);
  stickZone.append(base);
  const pad = document.createElement("div");
  pad.className = "tc-buttons";
  const top = document.createElement("div");
  top.className = "tc-top";
  el.append(stickZone, lookZone, pad, top);
  root.append(el);

  // Joystick: appears where the thumb lands.
  let stickId = null;
  let ox = 0;
  let oy = 0;
  const stickEnd = () => {
    stickId = null;
    base.classList.remove("on");
    input.setTouchMove(0, 0);
  };
  stickZone.addEventListener("pointerdown", (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    stickZone.setPointerCapture?.(e.pointerId);
    const r = stickZone.getBoundingClientRect();
    ox = e.clientX;
    oy = e.clientY;
    base.style.left = ox - r.left + "px";
    base.style.top = oy - r.top + "px";
    knob.style.transform = "";
    base.classList.add("on");
    e.preventDefault();
  });
  stickZone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - ox;
    let dy = e.clientY - oy;
    const m = Math.hypot(dx, dy);
    if (m > STICK_R) (dx *= STICK_R / m), (dy *= STICK_R / m);
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.setTouchMove(dx / STICK_R, -dy / STICK_R);
  });
  for (const t of ["pointerup", "pointercancel"]) stickZone.addEventListener(t, (e) => e.pointerId === stickId && stickEnd());

  // Look: relative drag.
  let lookId = null;
  let lx = 0;
  let ly = 0;
  lookZone.addEventListener("pointerdown", (e) => {
    if (lookId !== null) return;
    lookId = e.pointerId;
    lookZone.setPointerCapture?.(e.pointerId);
    lx = e.clientX;
    ly = e.clientY;
    e.preventDefault();
  });
  lookZone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== lookId) return;
    input.addLook((e.clientX - lx) * 1.4, (e.clientY - ly) * 1.4);
    lx = e.clientX;
    ly = e.clientY;
  });
  for (const t of ["pointerup", "pointercancel"]) lookZone.addEventListener(t, (e) => e.pointerId === lookId && (lookId = null));

  const button = ([label, action, cls]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tc-btn" + (cls && cls !== "top" ? " tc-" + cls : "");
    b.textContent = label;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      b.classList.add("on");
      input.hold(action, true);
    });
    const up = () => {
      b.classList.remove("on");
      input.hold(action, false);
    };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    return b;
  };

  let visible = true;
  let mode = "title";
  const render = () => {
    const set = BUTTONS[mode];
    el.hidden = !visible || !set;
    el.dataset.mode = mode;
    stickEnd();
    lookId = null;
    for (const b of pad.querySelectorAll(".on")) b.dispatchEvent(new Event("pointercancel"));
    pad.replaceChildren();
    top.replaceChildren();
    if (!set) return;
    for (const d of set) (d[2] === "top" ? top : pad).append(button(d));
    const drag = mode === "play";
    stickZone.hidden = lookZone.hidden = !drag;
  };
  render();

  return {
    el,
    show(on) {
      visible = !!on;
      render();
    },
    setMode(m) {
      if (m === mode) return;
      mode = m;
      render();
    },
  };
}
