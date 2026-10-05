import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// ORG-030/031/032; REG-02/03, WKS-02, LOC-01/03, ACC-01.
// Check the visitor-facing journey, including collapsed FAQ answers and metadata.
const backOfficeTerms = /approval|approve|discount|موافقة|خصم/i;
const paddedIndex = /^(?:0[1-9]|٠[١-٩])(?:\s|\/|$)/;
const pages = ["", "about", "dates-venue", "program", "speakers", "media", "participate", "registration", "submissions", "hackathon", "workshops", "3mt", "contact", "privacy", "terms"];
const screenshotPages = ["", "dates-venue", "registration", "workshops"];

for (const locale of ["en", "ar"] as const) {
  test(`${locale} public registration and workshop copy keeps back-office terms private`, async ({ page }) => {
    for (const route of pages) {
      expect((await page.goto(`/${locale}${route ? `/${route}` : ""}`))?.status(), route).toBe(200);
      // Registration/workshops pages are wholly in scope. Other pages may have
      // legitimate research ethics or policy approval wording outside these paths.
      if (route === "registration" || route === "workshops") {
        await expect(page.getByRole("main")).not.toContainText(backOfficeTerms);
        const descriptions = await page.locator('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content") ?? ""));
        expect(descriptions.join(" "), route).not.toMatch(backOfficeTerms);
      }
      const paths = page.locator('.pathway-row, .experience-pathway').filter({ has: page.locator('a[href$="/registration"], a[href$="/workshops"]') });
      const faqs = page.locator('.faq-item').filter({ hasText: locale === "en" ? /registration|workshop/i : /التسجيل|ورشة|ورش/ });
      const relevantCopy = paths.or(faqs);
      if (!route || route === "participate") await expect(paths).toHaveCount(2);
      for (const text of await relevantCopy.allTextContents()) expect(text, route).not.toMatch(backOfficeTerms);
      for (const text of await page.locator('.eyebrow, .chapter-number, .experience-pathway-number, .pathway-number, .program-row-top > span:last-child, .journey-guidelines-list > article > span, .journey-steps li > span').allTextContents()) {
        expect(text.trim(), `${route}: ${text}`).not.toMatch(paddedIndex);
      }
    }
    await page.goto(`/${locale}/registration`);
    await expect(page.locator(".journey-steps li")).toHaveCount(4);
    await expect(page.locator(".journey-guidelines")).toContainText(locale === "en" ? /email.*confirm|confirm.*email/i : /رسالة.*تأكيد|بريد.*تأكيد|تأكيد.*بريد/);
    await page.goto(`/${locale}/workshops`);
    await expect(page.locator(".journey-steps li")).toHaveCount(3);
    await expect(page.locator(".journey-steps")).toContainText(locale === "en" ? /confirmed conference registration/i : /تأكيد تسجيلك في المؤتمر/);
  });

  test(`${locale} affected pages retain accessible layouts and review screenshots`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of screenshotPages) {
      await page.goto(`/${locale}${route ? `/${route}` : ""}`);
      await page.evaluate(() => document.fonts.ready);
      if (!route) {
        await expect(page.locator(".visual-edition")).toHaveText(locale === "en" ? "5" : "٥");
        await expect(page.locator(".event-strip")).toContainText(locale === "en" ? "King Faisal Conference Center" : "مركز الملك فيصل للمؤتمرات");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      await testInfo.attach(`${locale}-${route || "home"}-axe`, { body: JSON.stringify({ violations: result.violations, needsManualReview: result.incomplete }, null, 2), contentType: "application/json" });
      expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
      await testInfo.attach(`${locale}-${route || "home"}-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    }
  });

  test(`${locale} numbered content fits 320px, phone, tablet and desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Run the explicit width matrix once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 791, 1440]) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      for (const route of ["", "participate", "program", "registration", "workshops", "design-system"]) {
        await page.goto(`/${locale}${route ? `/${route}` : ""}`);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}`).toBeLessThanOrEqual(width);
        const numbers = page.locator('.eyebrow, .visual-edition, .chapter-number, .experience-pathway-number, .pathway-number, .program-row-top > span:last-child, .journey-guidelines-list > article > span, .journey-steps li > span');
        if (route === "program") {
          // The unpublished catalogue has no rows; homepage programme overview
          // rows above are the rendered numbering surface at this stage.
          await expect(page.locator(".conference-session-row")).toHaveCount(0);
        } else {
          expect(await numbers.count(), `${route} numbered content`).toBeGreaterThan(0);
        }
        for (const text of await numbers.allTextContents()) expect(text.trim(), route).not.toMatch(paddedIndex);
        const clipped = await numbers.evaluateAll((elements) => elements.some((element) => {
          if (!element.getClientRects().length) return false;
          const range = document.createRange(); range.selectNodeContents(element);
          return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
        }));
        expect(clipped, `${route} number at ${width}`).toBe(false);
      }
    }
  });
}
