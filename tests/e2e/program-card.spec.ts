import { expect, test } from "@playwright/test";
for (const locale of ["en", "ar"] as const) for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`${locale} programme month card has no invented day destinations (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`/${locale}/program`);
    await expect(page.locator(".program-date-panel")).toContainText(locale === "en" ? "April 2027" : "أبريل ٢٠٢٧");
    await expect(page.locator(".conference-day-link, .program-calendar-link")).toHaveCount(0);
    await expect(page.getByTestId("program-day-all")).toBeEnabled();
    await expect(page.locator("#programme")).toBeVisible();
  });
}
