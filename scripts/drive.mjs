// Drive the running dev server headlessly with a scenario module:
//   node scripts/drive.mjs path/to/scenario.mjs [url]
// The scenario default-exports async (page, { shot, wait, game }) => {}.
// `game(fn, arg)` evaluates fn(window.__game, arg) in the page. Logs console errors.
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [scenario, url = `http://localhost:${process.env.PORT || 3100}/`] = process.argv.slice(2);
// Fall back to the system Chrome when Playwright's own browser build is not installed.
const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", (m) => ["error", "warning"].includes(m.type()) && console.log(`console.${m.type()}:`, m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url);
const helpers = {
  wait: (ms) => page.waitForTimeout(ms),
  shot: async (out) => {
    await page.screenshot({ path: out });
    console.log("shot", out);
  },
  game: (fn, arg) => page.evaluate(([src, a]) => new Function("g", "a", `return (${src})(g, a)`)(window.__game, a), [fn.toString(), arg]),
};
const run = (await import(pathToFileURL(resolve(scenario)).href)).default;
try {
  await run(page, helpers);
} finally {
  await browser.close();
}
