import { test, expect } from "@playwright/test";

/** Looking around must work even where pointer lock is never granted. */

test("dragging with the mouse turns and tilts the view without pointer lock", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Simulate a browser that refuses pointer lock (embedded webviews, some Safari setups).
  await page.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
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
