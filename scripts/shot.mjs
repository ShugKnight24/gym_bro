// Headless screenshot of the running dev server: node scripts/shot.mjs [url] [out.png] [waitMs]
// Starts no server; run `npm run dev` first. Logs console errors.
import { chromium } from "@playwright/test";

const [url = `http://localhost:${process.env.PORT || 3100}/`, out = "shots/shot.png", wait = "1500"] = process.argv.slice(2);
// Fall back to the system Chrome when Playwright's own browser build is not installed.
const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", (m) => m.type() === "error" && console.log("console.error:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
await browser.close();
console.log(out);
