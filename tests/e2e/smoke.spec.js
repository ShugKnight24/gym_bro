import { test, expect } from "@playwright/test";

const SAVE_KEY = "gymbro_save";

/** Collect uncaught page errors and console.error output for a page. */
function trackErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

async function boot(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.__game && window.__game.mode === "title");
}

/** Wait for `n` animation frames so draw/update errors surface. */
const frames = (page, n = 30) =>
  page.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i > n ? r() : requestAnimationFrame(f)); f(); }), n);

async function newGame(page) {
  await page.evaluate(() => window.__game.newGame());
  await page.waitForFunction(() => window.__game.mode === "play");
}

let errors;

test.beforeEach(async ({ page }) => {
  errors = trackErrors(page);
  // Start every test from an empty save slot (only on the first navigation,
  // so reloads inside a test keep what the test wrote).
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem("__e2e_init")) {
      sessionStorage.setItem("__e2e_init", "1");
      localStorage.removeItem(key);
    }
  }, SAVE_KEY);
});

test.afterEach(() => {
  expect(errors, "page errors / console.error").toEqual([]);
});

test("boots to the title with no console errors", async ({ page }) => {
  await boot(page);
  await frames(page);
  expect(await page.evaluate(() => window.__game.state)).toBeNull();
  expect(errors).toEqual([]);
});

test("new game starts on day 1 in play mode", async ({ page }) => {
  await boot(page);
  await newGame(page);
  const s = await page.evaluate(() => ({ mode: window.__game.mode, day: window.__game.state.day }));
  expect(s).toEqual({ mode: "play", day: 1 });
});

test("a training set raises strength or muscle and costs energy", async ({ page }) => {
  await boot(page);
  await newGame(page);
  const before = await page.evaluate(() => structuredClone(window.__game.state.stats));

  await page.evaluate(() => {
    window.__game.train("bench_press", 1);
    window.__game.beginSet();
  });
  expect(await page.evaluate(() => window.__game.mode)).toBe("train");

  // Tap reps until the trainer leaves the "set" phase.
  await page.waitForFunction(
    () => {
      const g = window.__game;
      if (g.trainer.phase !== "set") return true;
      g.rep();
      return false;
    },
    null,
    { polling: 150, timeout: 20_000 },
  );

  const after = await page.evaluate(() => structuredClone(window.__game.state.stats));
  const musGain = Object.keys(before.mus).some((k) => after.mus[k] > before.mus[k]);
  expect(after.str > before.str || musGain).toBe(true);
  expect(after.energy).toBeLessThan(before.energy);

  // The trainer closes itself and returns to play.
  await page.waitForFunction(() => window.__game.mode === "play", null, { timeout: 10_000 });
});

test("build mode places and sells a squat rack", async ({ page }) => {
  await boot(page);
  await newGame(page);
  await page.evaluate(() => {
    window.__game.setState({ money: 5000 });
    window.__game.openBuild();
  });
  expect(await page.evaluate(() => window.__game.mode)).toBe("build");

  const placed = await page.evaluate(() => {
    const g = window.__game;
    const n = g.state.gym.placed.length;
    for (let y = 1; y < g.map.h - 1; y++) {
      for (let x = 1; x < g.map.w - 1; x++) {
        for (let rot = 0; rot < 4; rot++) {
          g.applyBuild({ kind: "place", type: "squat_rack", x, y, rot });
          if (g.state.gym.placed.length > n) return { x, y, rot, n, money: g.state.money };
        }
      }
    }
    return null;
  });
  expect(placed, "found a valid cell for a squat rack").not.toBeNull();
  expect(placed.money).toBeLessThan(5000);
  expect(await page.evaluate(() => window.__game.state.gym.placed.at(-1).type)).toBe("squat_rack");

  const sold = await page.evaluate(({ x, y }) => {
    const g = window.__game;
    g.applyBuild({ kind: "sell", x, y });
    return { n: g.state.gym.placed.length, money: g.state.money };
  }, placed);
  expect(sold.n).toBe(placed.n);
  expect(sold.money).toBeGreaterThan(placed.money);
  expect(sold.money).toBeLessThan(5000);

  await page.evaluate(() => window.__game.applyBuild({ kind: "exit" }));
  expect(await page.evaluate(() => window.__game.mode)).toBe("play");
});

test("sleeping saves day 2 and Continue restores it after a reload", async ({ page }) => {
  await boot(page);
  await newGame(page);
  await page.evaluate(() => window.__game.sleep(false));
  expect(await page.evaluate(() => window.__game.state.day)).toBe(2);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
  expect(saved?.state?.day).toBe(2);

  await page.reload();
  await page.waitForFunction(() => window.__game && window.__game.mode === "title");
  expect(await page.evaluate(() => window.__game.continueGame())).toBe(true);
  await page.waitForFunction(() => window.__game.mode === "play");
  expect(await page.evaluate(() => window.__game.state.day)).toBe(2);
});

for (const [name, raw] of [
  ["garbage", "{not json!!"],
  ["missing fields", JSON.stringify({ v: 1, state: { day: 3 } })],
]) {
  test(`a corrupted save (${name}) does not break Continue`, async ({ page }) => {
    await boot(page);
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, raw]);
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.mode === "title");

    const res = await page.evaluate(() => {
      try {
        window.__game.continueGame();
        return { ok: true };
      } catch (e) {
        return { ok: false, err: String(e) };
      }
    });
    expect(res).toEqual({ ok: true });

    // Whether it resumed a repaired save or not, the game must be playable.
    await page.evaluate(() => { if (window.__game.mode === "title") window.__game.newGame(); });
    await page.waitForFunction(() => window.__game.mode === "play");
    const s = await page.evaluate(() => ({
      stats: !!window.__game.state.stats,
      energy: window.__game.state.stats?.energy,
      placed: Array.isArray(window.__game.state.gym?.placed),
    }));
    expect(s.stats).toBe(true);
    expect(typeof s.energy).toBe("number");
    expect(s.placed).toBe(true);

    // Let the loop run a moment: rendering/updating the restored state must not throw.
    await frames(page);
    expect(await page.evaluate(() => window.__game.mode)).toBe("play");
  });
}

test("art style toggles without errors", async ({ page }) => {
  await boot(page);
  const style = () => page.evaluate(() => document.documentElement.dataset.artStyle);
  const first = await style();
  expect(["comic", "modern"]).toContain(first);

  await page.evaluate(() => window.__game.toggleStyle());
  await frames(page, 10);
  expect(await style()).not.toBe(first);
  expect(await page.evaluate(() => window.__game.mode)).toBe("title");

  await newGame(page);
  await page.evaluate(() => window.__game.toggleStyle());
  await frames(page, 10);
  expect(await style()).toBe(first);
  expect(await page.evaluate(() => window.__game.mode)).toBe("play");
});
