import { test, expect } from "@playwright/test";

/**
 * Verifies the security headers configured in `next.config.ts`.
 * In development HSTS is typically skipped by design; CSP / X-Frame-Options /
 * Referrer-Policy / X-Content-Type-Options should still be present.
 */
test.describe("security headers", () => {
  test("landing page has hardened response headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBeLessThan(500);
    const headers = res.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]?.toLowerCase()).toMatch(/deny|sameorigin/);
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toBeTruthy();
  });

  test("unauthenticated API call to protected route is rejected", async ({
    request,
  }) => {
    const res = await request.get("/api/payouts/export");
    /** Either 401/403 from auth() or 307 redirect from middleware — all acceptable. */
    expect([307, 401, 403]).toContain(res.status());
  });
});
