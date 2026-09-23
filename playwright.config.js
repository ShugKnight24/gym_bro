import { existsSync } from "node:fs";
import { defineConfig, devices, chromium } from "@playwright/test";

// Like scripts/shot.mjs: fall back to the system Chrome when Playwright's own
// browser build for this version is not installed (`npx playwright install chromium`).
const bundled = existsSync(chromium.executablePath());

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
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
    reuseExistingServer: true,
  },
});
