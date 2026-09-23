import { test, expect } from "@playwright/test";

/** Looking around must work even where pointer lock is never granted. */

test("dragging with the mouse turns and tilts the view without pointer lock", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Simulate a browser that refuses pointer lock (embedded webviews, some Safari setups),
  // with the "Hold to look" setting on: this test is about drag mode.
  await page.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    localStorage.setItem("gymbro_settings", JSON.stringify({ v: 1, dragLook: true }));
  });
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.mode === "title");
  await page.evaluate(() => window.__game.newGame());
  const before = await page.evaluate(() => ({ a: window.__game.player.angle, p: window.__game.player.pitch }));
  await page.mouse.move(400, 360);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(400 + i * 30, 360 - i * 5);
  await page.mouse.up();
  const after = await page.evaluate(() => ({ a: window.__game.player.angle, p: window.__game.player.pitch, lock: !!document.pointerLockElement, mode: window.__game.mode }));
  expect(after.lock).toBe(false);
  expect(after.a).toBeGreaterThan(before.a + 0.3);
  expect(after.p).toBeGreaterThan(before.p);
  expect(errors).toEqual([]);
});

test("arrow keys turn the view", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.mode === "title");
  await page.evaluate(() => window.__game.newGame());
  const a0 = await page.evaluate(() => window.__game.player.angle);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowRight");
  expect(await page.evaluate(() => window.__game.player.angle)).toBeGreaterThan(a0 + 0.3);
});

test("without pointer lock the view follows the mouse, and the edges keep turning", async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.mode === "title");
  await page.evaluate(() => window.__game.newGame());
  await page.mouse.move(640, 360);
  const a0 = await page.evaluate(() => window.__game.player.angle);
  for (let i = 1; i <= 8; i++) await page.mouse.move(640 + i * 20, 360);
  const a1 = await page.evaluate(() => window.__game.player.angle);
  expect(a1).toBeGreaterThan(a0 + 0.2);
  // Resting at the right edge keeps turning with no mouse movement.
  await page.mouse.move(1275, 360);
  const e0 = await page.evaluate(() => window.__game.player.angle);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__game.player.angle)).toBeGreaterThan(e0 + 0.4);
});

test("build mode opens with nothing picked; placing needs a pick first", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.mode === "title");
  await page.evaluate(() => {
    window.__game.newGame();
    window.__game.setState({ money: 5000 });
    window.__game.openBuild();
  });
  expect(await page.evaluate(() => window.__game.build.sel)).toBe(-1);
  const n0 = await page.evaluate(() => window.__game.state.gym.placed.length);
  await page.mouse.click(300, 300);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__game.state.gym.placed.length)).toBe(n0);
  await page.keyboard.press("Digit2");
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__game.build.sel)).toBe(1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => ({ sel: window.__game.build.sel, mode: window.__game.mode }))).toEqual({ sel: -1, mode: "build" });
});

test("a cursor resting at the edge does not spin the view until the mouse moves", async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.mode === "title");
  await page.mouse.move(2, 360);
  await page.evaluate(() => window.__game.newGame());
  const a0 = await page.evaluate(() => window.__game.player.angle);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__game.player.angle)).toBeCloseTo(a0, 5);
});
