import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"]) for (const area of ["", "/sign-in", "/accept-invitation", "/people", "/audit", "/participants"]) {
  test(`${locale} staff${area} is invisible with STAFF_PORTAL_ENABLED off`, async ({ page }) => {
    const response = await page.goto(`/${locale}/staff${area}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("staff-portal")).toHaveCount(0);
    await expect(page.locator("form, input, .site-header, .site-footer")).toHaveCount(0);
    const directives = await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content")));
    expect(directives.length).toBeGreaterThan(0);
    for (const directive of directives) expect(directive).toMatch(/noindex/);
  });
}

test("closed staff API denies without cookies or provider work", async ({ request }) => {
  for (const action of [null, "signin", "invite", "invite-accept", "reveal-identity", "reset-authenticator"]) {
    const response = action ? await request.post("/api/staff-portal", { data: { action, email: "closed@example.invalid", password: "Synthetic password only" } }) : await request.get("/api/staff-portal");
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ state: "closed" });
    expect(response.headers()["set-cookie"]).toBeUndefined();
  }
});

test("public navigation contains no staff destinations", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('a[href*="/staff"]')).toHaveCount(0);
});
