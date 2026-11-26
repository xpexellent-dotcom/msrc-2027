import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Locator } from "../helpers/csp";

// TIM-01/02, REG-02, LOC-01/03, ACC-01. Publication is separate from registration access.
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
    test(`${locale} ${route || "home"} shows registration opening and closing as pending while workflows remain closed`, async ({ page }, testInfo) => {
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
      await expect(notice.getByRole("heading", { name: locale === "en" ? "Registration dates" : "مواعيد التسجيل", exact: true })).toBeVisible();
      await expect(notice.locator("dt")).toHaveText(locale === "en" ? ["Registration opens", "Registration closes"] : ["فتح التسجيل", "إغلاق التسجيل"]);
      await expect(notice.locator("dd")).toHaveText(Array(2).fill(locale === "en" ? "To be announced" : "سيُعلن لاحقًا"));
      await expect(notice.locator("time")).toHaveCount(0);
      await expect(notice).toContainText(locale === "en" ? "Free attendance" : "الحضور مجاني");
      await expect(notice).toHaveCSS("direction", locale === "ar" ? "rtl" : "ltr");
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
