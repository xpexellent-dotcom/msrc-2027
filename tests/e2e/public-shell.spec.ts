import { expect, test } from "@playwright/test";

// LOC-01/03, SEC-01, INF-04, REL-06: static public browsing stays separate
// from closed operational flows. This is a smoke check, not a launch audit.
test("the default route opens the English public page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const locale of ["en", "ar"] as const) {
  test(`${locale} placeholder is readable without opening a workflow`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto(`/${locale}`);

    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator("form, input, textarea, select")).toHaveCount(0);
    await expect(page.locator('a[href*="register"], a[href*="payment"], a[href*="admin"], a[href*="submit"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Detect horizontal clipping at desktop, tablet, and phone project sizes.
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    await testInfo.attach(`${locale}-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    expect(errors).toEqual([]);
  });
}

test("keyboard access reaches content and changes the interface language", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(page.locator('a[href="#main-content"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const arabic = page.getByRole("link", { name: "View this page in Arabic" });
  await arabic.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const english = page.getByRole("link", { name: "View this page in English" });
  await english.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en$/);
});

test("reduced-motion preference keeps native page navigation usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ar");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  await page.getByRole("link", { name: "View this page in English" }).click();
  await expect(page).toHaveURL(/\/en$/);
});

test("unsupported locales and missing localized pages return real 404s", async ({ page }) => {
  expect((await page.goto("/fr"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect((await page.goto("/ar/missing-page"))?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
