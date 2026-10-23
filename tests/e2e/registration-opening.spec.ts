import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Locator } from "../helpers/csp";

// ORG-056/057; TIM-01/02, REG-02, LOC-01/03, ACC-01. Visitors may be outside
// Riyadh: these published instants must retain their approved local date/time.
test.use({ timezoneId: "America/Los_Angeles" });

const generalOpening = "2026-11-18T20:00:00+03:00";
const closing = "2027-01-26T23:59:00+03:00";
const screenshots = ".tools/registration-opening/screenshots";

async function expectReadableText(notice: Locator) {
  const clipped = await notice.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (Array.from(range.getClientRects()).some((rect) =>
        rect.left < -1 || rect.right > document.documentElement.clientWidth + 1)) return true;
    }
    return false;
  });
  expect(clipped, "Every notice line remains within the visible reading width").toBe(false);
}

for (const locale of ["en", "ar"] as const) {
  for (const route of ["", "/participate", "/registration"] as const) {
    test(`${locale} ${route || "home"} publishes approved registration times accessibly while workflows remain closed`, async ({ page }, testInfo) => {
      const writes: string[] = [];
      page.on("request", (request) => {
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(new URL(request.url()).pathname);
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}${route}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByTestId("registration-opening-summary")).toHaveCount(0);
      await expect(page.getByRole("main")).not.toContainText(/early.access|التسجيل المبكر|organizer approval|موافقة المنظ/i);
      const notice = page.getByTestId("registration-opening-notice");
      if (route !== "/participate") {
        await expect(notice).toHaveCount(0);
        if (route === "/registration") {
          await expect(page.getByTestId("journey-closed")).toBeVisible();
          await expect(page.getByTestId("registration-request")).toHaveCount(0);
        }
        expect(writes).toEqual([]);
        return;
      }
      await expect(notice).toBeVisible();
      const general = notice.locator(`time[datetime="${generalOpening}"]`);
      await expect(general).toHaveCount(1);
      await expect(general).toContainText(locale === "en" ? "18 November" : "١٨ نوفمبر");
      await expect(general).toContainText(locale === "en" ? "8 pm" : "٨ م");
      await expect(notice).toContainText(locale === "en" ? /Riyadh time/ : /توقيت الرياض/);
      await expect(notice).toContainText(locale === "en" ? /Free attendance/i : /الحضور مجاني/);

      await expect(notice.getByRole("heading", { name: locale === "en" ? "Registration opens" : "مواعيد فتح التسجيل", exact: true })).toBeVisible();
      await expect(general).toContainText(locale === "en" ? "Wednesday, 18 November 2026" : "الأربعاء، ١٨ نوفمبر ٢٠٢٦");
      const deadline = notice.locator(`time[datetime="${closing}"]`);
      await expect(deadline).toHaveCount(1);
      await expect(deadline).toContainText(locale === "en" ? "26 January 2027" : "٢٦ يناير ٢٠٢٧");
      await expect(deadline).toContainText(locale === "en" ? "11:59 pm" : "١١:٥٩ م");
      await expect(notice.locator("time")).toHaveCount(2);
      if (locale === "ar") {
        for (const date of await notice.locator("time").allTextContents()) {
          expect(date).not.toMatch(/[0-9]/);
          expect(date).toMatch(/[٠-٩]/);
          expect(date).not.toMatch(/هـ|رجب|شعبان|رمضان/);
        }
        await expect(notice).toHaveCSS("direction", "rtl");
      }
      await expectReadableText(notice);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
      await testInfo.attach("registration-opening-axe", { body: JSON.stringify({ violations: axe.violations, needsManualReview: axe.incomplete }, null, 2), contentType: "application/json" });
      await mkdir(screenshots, { recursive: true });
      await notice.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshots}/${locale}-${route.slice(1) || "home"}-${testInfo.project.name}.png` });
      expect(writes).toEqual([]);
    });
  }

  test(`${locale} registration notice fits narrow screens and doubled text`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Run the explicit viewport and enlarged-text matrix once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/participate"] as const) {
        await page.goto(`/${locale}${route}`);
        await page.evaluate(() => document.fonts.ready);
        const notice = page.getByTestId("registration-opening-notice");
        for (const fontSize of ["100%", "200%"]) {
          await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, fontSize);
          expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route || "home"} at ${width}px / ${fontSize}`).toBeLessThanOrEqual(width);
          await expectReadableText(notice);
        }
      }
    }
  });
}
