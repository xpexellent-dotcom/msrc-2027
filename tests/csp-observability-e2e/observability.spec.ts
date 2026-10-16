import { expect, test } from "../helpers/csp";

for (const locale of ["en", "ar"]) for (const path of ["sign-in", "registration", "staff/sign-in"]) {
  test(`${locale} ${path} production SDK loading respects the enforced policy`, async ({ page, baseURL }) => {
    const scripts: string[] = [];
    const external: string[] = [];
    const writes: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => { errors.push(error.message); });
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== baseURL) external.push(request.resourceType());
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method());
    });
    // Never load a real telemetry script or send any telemetry/provider request.
    await page.route("**/_vercel/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      expect(["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"]).toContain(pathname);
      scripts.push(pathname);
      await route.fulfill({ contentType: "application/javascript", body: "window.__cspObservabilityFixtures = (window.__cspObservabilityFixtures || 0) + 1;" });
    });
    const response = await page.goto(`/${locale}/${path}`);
    expect(response?.status()).toBe(path.startsWith("staff") ? 404 : 200);
    expect(response!.headers()["content-security-policy"]).toContain("'strict-dynamic'");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (path.startsWith("staff")) {
      await expect(page.locator('script[src*="/_vercel/"]')).toHaveCount(0);
      expect(scripts).toEqual([]);
    } else {
      await expect.poll(() => page.evaluate(() => (window as unknown as { __cspObservabilityFixtures?: number }).__cspObservabilityFixtures)).toBe(2);
      expect(scripts.sort()).toEqual(["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"]);
    }
    expect(external).toEqual([]);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
