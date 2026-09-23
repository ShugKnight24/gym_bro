import { existsSync } from "node:fs";
import { defineConfig, devices, chromium } from "@playwright/test";

const ci = !!process.env.CI;
// Like scripts/shot.mjs: locally, fall back to the system Chrome when Playwright's
// own browser build for this version is not installed (`npx playwright install chromium`).
// CI always installs and uses the bundled build.
const bundled = ci || existsSync(chromium.executablePath());

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: ci ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        ...(bundled ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3100,
    reuseExistingServer: !ci,
  },
});
