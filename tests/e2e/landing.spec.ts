import { test, expect } from "@playwright/test";

test.describe("PayoutFlow landing", () => {
  test("renders main CTA and brand", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PayoutFlow/i);
    await expect(page.getByText(/payoutflow/i).first()).toBeVisible();
  });

  test("has sign-in / create-account links", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /sign in|log in/i }).first();
    const registerLink = page
      .getByRole("link", { name: /create account|get started|sign up|register/i })
      .first();
    await expect(loginLink.or(registerLink)).toBeVisible();
  });
});
