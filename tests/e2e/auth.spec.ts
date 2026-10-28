import { test, expect } from "@playwright/test";

/**
 * Dashboard and settings are protected by Auth.js + middleware.
 * Unauthenticated access must redirect to /login.
 */
test.describe("protected routes", () => {
  test("redirects /dashboard to /login when signed out", async ({ page }) => {
    const response = await page.goto("/dashboard", { waitUntil: "load" });
    expect(page.url()).toContain("/login");
    expect(response?.status()).toBeLessThan(500);
  });

  test("redirects /settings to /login when signed out", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "load" });
    expect(page.url()).toContain("/login");
  });

  test("login form renders with email + password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
