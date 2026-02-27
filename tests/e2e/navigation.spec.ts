import { test, expect } from "@playwright/test";

/**
 * Navigation E2E tests — verify sidebar links navigate to the correct pages.
 *
 * These tests run with the authenticated storage state from auth.setup.ts.
 * If E2E_TEST_EMAIL is not configured, the tests that require auth are skipped.
 */

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard first to ensure the sidebar is visible
    await page.goto("/dashboard");

    // If we got redirected to /auth, test credentials aren't configured
    if (page.url().includes("/auth")) {
      test.skip(true, "E2E_TEST_EMAIL not configured — skipping navigation test");
    }
  });

  test("sidebar push link navigates to push page", async ({ page }) => {
    // Click the Push link in the sidebar navigation
    const pushLink = page.locator("nav a[href='/push']");
    await expect(pushLink).toBeVisible({ timeout: 5_000 });
    await pushLink.click();
    await expect(page).toHaveURL(/\/push/);
  });

  test("sidebar coach link navigates to coach page", async ({ page }) => {
    const coachLink = page.locator("nav a[href='/coach']");
    await expect(coachLink).toBeVisible({ timeout: 5_000 });
    await coachLink.click();
    await expect(page).toHaveURL(/\/coach/);
  });

  test("sidebar decks link navigates to decks page", async ({ page }) => {
    // Decks uses a collapsible trigger, not a regular link
    const decksButton = page.locator("nav button").filter({ hasText: /deck/i });
    await expect(decksButton).toBeVisible({ timeout: 5_000 });
    await decksButton.click();
    await expect(page).toHaveURL(/\/decks/);
  });

  test("sidebar training link navigates to training page", async ({ page }) => {
    const trainingLink = page.locator("nav a[href='/training']");
    await expect(trainingLink).toBeVisible({ timeout: 5_000 });
    await trainingLink.click();
    await expect(page).toHaveURL(/\/training/);
  });

  test("sidebar community link navigates to community page", async ({ page }) => {
    const communityLink = page.locator("nav a[href='/community']");
    await expect(communityLink).toBeVisible({ timeout: 5_000 });
    await communityLink.click();
    await expect(page).toHaveURL(/\/community/);
  });

  test("sidebar settings link navigates to settings page", async ({ page }) => {
    const settingsLink = page.locator("nav a[href='/settings']");
    await expect(settingsLink).toBeVisible({ timeout: 5_000 });
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("Push Analysis page renders correctly (regression test for TD-004)", async ({ page }) => {
    // Navigate directly to the push page
    await page.goto("/push");

    // Verify the Push page loaded (not a 404 or error page)
    // The Push page should contain its specific content
    await expect(page.locator("main, [data-testid='push-page'], h1, h2")).toBeVisible({ timeout: 10_000 });

    // Verify we're still on /push and didn't get redirected to an error
    await expect(page).toHaveURL(/\/push/);
  });
});
