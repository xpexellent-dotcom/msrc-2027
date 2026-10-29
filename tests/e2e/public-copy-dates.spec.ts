import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const dates = ["2026-11-23", "2026-12-13", "2026-12-18", "2026-12-19", "2027-01-02", "2027-01-07", "2027-01-10"];


// ORG-058; ABS-01, TIM-01/02, LOC-01/03, ACC-01. Check calendar dates
// outside Riyadh too: public dates must not acquire times or shift by timezone.
test.use({ timezoneId: "America/Los_Angeles", reducedMotion: "reduce" });
for (const locale of ["en", "ar"] as const) {
  for (const route of ["participate", "registration", "abstracts", "contact"]) {
    test(`${locale} ${route} public copy, calendar dates and accessible layout`, async ({ page }, testInfo) => {
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
        expect(await timeline.locator("time").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime")))).toEqual(dates);
        await expect(timeline.locator("time")).toHaveText(locale === "en"
          ? ["23 November 2026", "13 December 2026", "18 December 2026", "19 December 2026", "2 January 2027", "7 January 2027", "10 January 2027"]
          : ["٢٣ نوفمبر ٢٠٢٦", "١٣ ديسمبر ٢٠٢٦", "١٨ ديسمبر ٢٠٢٦", "١٩ ديسمبر ٢٠٢٦", "٢ يناير ٢٠٢٧", "٧ يناير ٢٠٢٧", "١٠ يناير ٢٠٢٧"]);
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
