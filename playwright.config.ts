import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for CRStats.
 *
 * Expects the dev server to be running on http://localhost:5000.
 * Launch with: `npm run dev` in a separate terminal, then `npm run test:e2e`.
 *
 * The `webServer` block will auto-start the dev server if it is not already
 * running, but you can also start it manually for faster iteration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Auth setup — runs once and saves session state for reuse
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Reuse authenticated state from setup project
        storageState: "tests/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
