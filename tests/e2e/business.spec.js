import { test, expect } from "@playwright/test";

/** Business, careers and settings flows through the real DOM screens. */

let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console.error: ${m.text()}`));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("__e2e_init")) {
      sessionStorage.setItem("__e2e_init", "1");
      localStorage.clear();
    }
  });
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.mode === "title");
  await page.evaluate(() => window.__game.newGame());
});

test.afterEach(() => expect(errors).toEqual([]));

const click = (page, act, arg) => page.locator(arg == null ? `[data-act="${act}"]` : `[data-act="${act}"][data-arg="${arg}"]`).first().click();

test("gym office: dues, repairs and the annex", async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.setState({ money: 10000, members: 20, rep: 30 });
    g.state.gym.placed[0].wear = 100;
    g.openGym();
  });
  await expect(page.locator("#ui h2")).toHaveText(/gym office/i);
  await click(page, "dues", "5");
  await click(page, "repair", "0");
  await click(page, "upgrade", "annex");
  const s = await page.evaluate(() => ({ dues: window.__game.state.dues, wear: window.__game.state.gym.placed[0].wear, annex: !!window.__game.state.gym.upgrades.annex, w: window.__game.map.w }));
  expect(s).toEqual({ dues: 17, wear: 0, annex: true, w: 22 });
});

test("the night pays bills, and a save round-trips the new systems", async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.setState({ money: 8000, members: 6 });
    g.openCareers();
  });
  await click(page, "launch", "whey");
  await click(page, "ads", "1");
  await page.evaluate(() => window.__game.sleep(false));
  await expect(page.locator("#ui")).toContainText("Ledger");
  await expect(page.locator("#ui")).toContainText("Supplements");
  await page.reload();
  await page.waitForFunction(() => window.__game?.mode === "title");
  const s = await page.evaluate(() => (window.__game.continueGame(), window.__game.state));
  expect(s.day).toBe(2);
  expect(s.supps).toEqual({ launched: ["whey"], ads: 1 });
});

test("awards resolve without a minigame", async ({ page }) => {
  await page.evaluate(() => {
    window.__game.setState({ money: 5000, members: 20, rep: 30 });
    window.__game.enterEvent("gym_award");
  });
  await expect(page.locator("#ui h2")).toHaveText(/gym of the year/i);
  expect(await page.evaluate(() => window.__game.state.career.results.length)).toBe(1);
});

test("settings persist: easier timing and a rebound key", async ({ page }) => {
  await page.evaluate(() => window.__game.openSettings());
  await click(page, "toggle", "assist");
  await click(page, "rebind", "gym");
  await page.keyboard.press("KeyH");
  await page.reload();
  await page.waitForFunction(() => window.__game?.mode === "title");
  const s = await page.evaluate(() => ({ assist: window.__game.trainer.assist, gym: window.__game.input.bindings().gym }));
  expect(s).toEqual({ assist: true, gym: ["KeyH"] });
});

test("members have names in the office, and staff can be hired", async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.setState({ money: 5000, members: 6, career: { ...g.state.career, best: { owner: 2 } } });
    g.sleep(false);
    g.next();
    g.openGym();
  });
  const n = await page.locator(".roster li").count();
  expect(n).toBe(await page.evaluate(() => window.__game.state.members));
  await click(page, "upgrade", "trainer");
  await click(page, "upgrade", "receptionist");
  expect(await page.evaluate(() => window.__game.state.gym.upgrades)).toMatchObject({ trainer: true, receptionist: true });
});
