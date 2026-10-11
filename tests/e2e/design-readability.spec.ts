import { expect, test, type Page } from "@playwright/test";

// ACC-01 / LOC-01/03: verify the visible result, including narrow zoom-equivalent
// widths, instead of checking that particular CSS declarations exist.
async function expectReflow(page: Page) {
  const layout = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} paper and dark homepage actions retain a contrasting keyboard focus indicator`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.keyboard.press("Tab");

    for (const selector of ['#program .editorial-action', '#legacy [data-testid="watch-opening-film"]']) {
      const action = page.locator(selector);
      await action.focus();
      await expect(action).toBeFocused();
      const focus = await action.evaluate((element) => {
        const style = getComputedStyle(element);
        const surface = getComputedStyle(element.closest("section")!);
        function luminance(color: string) {
          const [red, green, blue] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
            .map((channel) => channel / 255)
            .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
          return red * .2126 + green * .7152 + blue * .0722;
        }
        const light = [luminance(style.outlineColor), luminance(surface.backgroundColor)].sort((a, b) => b - a);
        return {
          visible: element.matches(":focus-visible") && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
          contrast: (light[0] + .05) / (light[1] + .05),
        };
      });
      expect(focus.visible).toBe(true);
      expect(focus.contrast).toBeGreaterThanOrEqual(3);
    }
  });

  test(`${locale} public content reflows below 320 pixels and with enlarged text`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Reflow matrix runs once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["", "/program", "/media"]) {
        await page.goto(`/${locale}${route}`);
        await page.evaluate(() => document.fonts.ready);
        await expectReflow(page);
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        await expectReflow(page);
        const clippedReadingText = await page.locator(".pathway-description, .experience-publication-status, .experience-lead").evaluateAll((elements) => elements.some((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return [...range.getClientRects()].some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
        }));
        expect(clippedReadingText).toBe(false);
      }
    }
  });

  test(`${locale} programme publication status is available before using filters`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/program`);
    const announcement = page.locator(".experience-intro .experience-publication-status");
    await expect(announcement).toContainText(locale === "en" ? /to be announced/ : /سيُعلن/);
    await expect(announcement).toBeInViewport({ ratio: 1 });
    const screenshot = testInfo.outputPath(`${locale}-programme-phone.png`);
    await page.screenshot({ path: screenshot });
    await testInfo.attach(`${locale}-programme-phone`, { path: screenshot, contentType: "image/png" });
    await expect(page.getByTestId("program-search")).toBeEnabled();
    await page.getByTestId("program-search").fill("No matching session");
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /No matching results/ : /لا توجد نتائج مطابقة/);
    await expect(announcement).toBeVisible();
    await page.getByTestId("program-clear").click();
    await expect(page.getByTestId("program-search")).toHaveValue("");
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /to be announced/ : /سيُعلن/);
  });
}
