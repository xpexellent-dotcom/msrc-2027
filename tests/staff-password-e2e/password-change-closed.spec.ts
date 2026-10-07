import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) test(`${locale} own security is invisible when its separate gate is off`, async ({ page }) => {
  const response = await page.goto(`/${locale}/staff/security`);
  expect(response?.status()).toBe(404);
  await expect(page.locator("form, input, .site-header, .site-footer")).toHaveCount(0);
  await expect(page.getByTestId("staff-portal")).toHaveCount(0);
  const directives = await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content")));
  expect(directives.length).toBeGreaterThan(0);
  for (const directive of directives) expect(directive).toMatch(/noindex/);
  // Existing restricted staff sign-in remains available while owner password changes close.
  expect((await page.goto(`/${locale}/staff/sign-in`))?.status()).toBe(200);
  await expect(page.locator("#staff-password")).toBeVisible();
});

test("the separate password-change gate denies its API while normal sign-in remains ready", async ({ request }) => {
  const ready = await request.get("/api/staff-portal");
  expect(ready.status()).toBe(200);
  const body = await ready.json() as { state: string; formToken: string };
  expect(body.state).toBe("ready");
  const response = await request.post("/api/staff-portal", { data: { action: "password-change", formToken: body.formToken, password: "Synthetic New Password", passwordConfirmation: "Synthetic New Password" }, headers: { Origin: "http://127.0.0.1:3219" } });
  expect(response.status()).toBe(403); expect(await response.json()).toMatchObject({ state: "denied" });
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
});
