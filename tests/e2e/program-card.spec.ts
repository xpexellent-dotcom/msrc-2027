import { expect, test, type Page } from "@playwright/test";
import { languageLink } from "./helpers/header-navigation";

// PRG-01, ACC-01, LOC-01/03: confirmed date links must both select a day
// and bring its programme controls into view, including before sessions exist.
async function expectProgrammeArrival(page: Page, day: "day1" | "day2", focused = true) {
  const programme = page.locator("#programme");
  await expect(page.getByTestId(`program-day-${day}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`program-day-${day === "day1" ? "day2" : "day1"}`)).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("program-day-all")).toHaveAttribute("aria-pressed", "false");
  if (focused) await expect(programme).toBeFocused();
  await expect.poll(() => page.evaluate(() => {
    const target = document.getElementById("programme")!;
    const header = document.querySelector(".site-header-inner")!;
    const toolbar = target.querySelector(".programme-toolbar")!;
    const targetBox = target.getBoundingClientRect();
    const toolbarBox = toolbar.getBoundingClientRect();
    const arrivalTop = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart)
      + parseFloat(getComputedStyle(target).scrollMarginBlockStart);
    return window.scrollY > 0
      // Visibility can become true midway through native smooth scrolling.
      // Wait for the requested anchor alignment before starting the next journey.
      && Math.abs(targetBox.top - arrivalTop) <= 2
      && targetBox.top >= header.getBoundingClientRect().bottom
      && toolbarBox.top >= 0 && toolbarBox.bottom <= window.innerHeight;
  }), { message: "Programme anchor reaches its final header-clear scroll alignment" }).toBe(true);
}

for (const locale of ["en", "ar"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`${locale} programme date card scrolls, focuses and preserves the selected day (${reducedMotion})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto(`/${locale}/program`);
      await expect(page.getByTestId("program-day-all")).toBeEnabled();
      const second = page.locator(`.program-date-panel a[href="/${locale}/program?day=day2#programme"]`);
      await second.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/program\\?day=day2#programme$`));
      await expectProgrammeArrival(page, "day2");

      // The same address must still scroll after the reader returns to the hero.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await second.click();
      await expectProgrammeArrival(page, "day2");

      const first = page.locator(`.program-date-panel a[href="/${locale}/program?day=day1#programme"]`);
      await first.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}/program\\?day=day1#programme$`));
      await expectProgrammeArrival(page, "day1");

      // A shared day URL must work on a fresh load and remain the same destination
      // when the visitor changes the interface language.
      await page.goto(`/${locale}/program?day=day2#programme`);
      await expectProgrammeArrival(page, "day2", false);
      const translatedLocale = locale === "en" ? "ar" : "en";
      const translated = await languageLink(page, translatedLocale === "ar" ? "View this page in Arabic" : "View this page in English");
      await expect(translated).toHaveAttribute("href", `/${translatedLocale}/program?day=day2#programme`);
      await translated.click();
      await expect(page).toHaveURL(new RegExp(`/${translatedLocale}/program\\?day=day2#programme$`));
      await expect(page.locator("html")).toHaveAttribute("dir", translatedLocale === "ar" ? "rtl" : "ltr");
      await expectProgrammeArrival(page, "day2");
    });
  }
}
