import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

// ABS-01, TIM-01/02, LOC-01/03, ACC-01: public copy and process steps stay readable across locales.
test.use({ timezoneId: "America/Los_Angeles", reducedMotion: "reduce" });
for (const locale of ["en", "ar"] as const) {
  for (const route of ["participate", "registration", "abstracts", "contact"]) {
    test(`${locale} ${route} public copy and accessible layout`, async ({ page }, testInfo) => {
      const writes: string[] = [];
      page.on("request", (request) => { if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url()); });
      await page.goto(`/${locale}/${route}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("main")).not.toContainText(/early.access|التسجيل المبكر|organizer approval|موافقة المنظ|Resend/);
      await expect(page.getByTestId("registration-opening-notice")).toHaveCount(route === "participate" ? 1 : 0);
      if (route === "abstracts") {
        const timeline = page.getByRole("region", { name: researchCompetitionCopy[locale].journey });
        await expect(timeline.getByRole("list")).toHaveCount(1);
        await expect(timeline.getByRole("listitem")).toHaveCount(6);
        await expect(timeline.locator("h3")).toHaveText(researchCompetitionCopy[locale].steps);
        await expect(timeline.locator("time")).toHaveCount(0);
        for (const detail of await timeline.locator(".research-step-detail").all()) {
          await expect(detail).toHaveCSS("opacity", "1");
        }
        await timeline.scrollIntoViewIfNeeded();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations).toEqual([]);
      await mkdir(".tools/public-copy-dates", { recursive: true });
      await page.screenshot({ path: `.tools/public-copy-dates/${locale}-${route}-${testInfo.project.name}.png`, fullPage: true });
      expect(writes).toEqual([]);
    });
  }
}
