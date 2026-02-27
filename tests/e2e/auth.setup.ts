import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/user.json";

/**
 * Global auth setup — runs once before all tests.
 *
 * Authenticates via the /auth page using test credentials from environment
 * variables and persists the browser storage state (including Supabase
 * session) so that subsequent tests can skip the login flow.
 *
 * Required environment variables:
 *   E2E_TEST_EMAIL    — email of a test account
 *   E2E_TEST_PASSWORD — password of the test account
 *
 * If credentials are not set, the setup is skipped and tests that depend
 * on authentication will need to handle the unauthenticated state.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    console.warn(
      "E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set. " +
      "Skipping auth setup — authenticated tests will be skipped.",
    );
    // Save empty storage state so dependent projects don't fail to load
    await page.context().storageState({ path: authFile });
    return;
  }

  // Navigate to auth page
  await page.goto("/auth");
  await expect(page.locator("form")).toBeVisible({ timeout: 10_000 });

  // Fill in credentials and submit
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|login|entrar/i }).click();

  // Wait for redirect to dashboard (indicates successful auth)
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15_000 });

  // Persist storage state (includes Supabase session in localStorage)
  await page.context().storageState({ path: authFile });
});
