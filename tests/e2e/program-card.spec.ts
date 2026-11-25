import { expect, test } from "@playwright/test";
for (const locale of ["en", "ar"] as const) for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`${locale} programme date card selects and focuses the confirmed day (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`/${locale}/program`);
    const dateLinks = page.locator(".program-date-panel .conference-day-link");
    await expect(dateLinks.locator("time")).toHaveText(locale === "ar"
      ? ["٧ أبريل ٢٠٢٧", "٨ أبريل ٢٠٢٧"] : ["7 April 2027", "8 April 2027"]);
    await expect(dateLinks.first().locator("time")).toHaveAttribute("datetime", "2027-04-07");
    await expect(dateLinks.last().locator("time")).toHaveAttribute("datetime", "2027-04-08");
    await expect(page.getByTestId("program-day-all")).toBeEnabled();
    await dateLinks.last().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/program\\?day=day2#programme$`));
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#programme")).toBeFocused();
    await expect(page.locator(".programme-toolbar")).toBeInViewport();
  });
}
