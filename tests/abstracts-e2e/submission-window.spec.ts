import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import { PUBLISHED_WINDOW } from "../../src/features/submissions/submission-window";
for (const locale of ["en", "ar"] as const) {
  for (const state of ["opening", "open", "closed", "area-not-ready"] as const) test(`${locale} saved window CTA ${state}`, async ({ page }) => {
    await page.route("**/api/abstracts/window", route => route.fulfill({ json: { state, ...PUBLISHED_WINDOW } }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/abstracts`); const cta = page.locator(".research-submission-cta").first(), text = researchCompetitionCopy[locale].cta;
    if (state === "open") { await expect(cta).toHaveText(text.signIn); await expect(cta).toHaveAttribute("href", `/${locale}/sign-in`); }
    else { await expect(cta).toHaveAttribute("aria-disabled", "true"); await expect(cta).toContainText(state === "opening" ? text.opening : text.closed); }
    if (state === "opening") { await expect(cta.locator("time")).toHaveAttribute("datetime", PUBLISHED_WINDOW.opensAt); await expect(cta).toContainText(locale === "ar" ? "توقيت الرياض" : "Riyadh time"); }
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  test(`${locale} CTA rechecks saved window when focus returns`, async ({ page }) => {
    let state = "opening";
    await page.route("**/api/abstracts/window", route => route.fulfill({ json: { state, ...PUBLISHED_WINDOW } }));
    await page.goto(`/${locale}/abstracts`); const cta = page.locator(".research-submission-cta").first(), text = researchCompetitionCopy[locale].cta;
    await expect(cta).toContainText(text.opening);
    state = "open"; await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await expect(cta).toHaveText(text.signIn);
    state = "closed"; await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await expect(cta).toHaveText(text.closed);
  });
}
