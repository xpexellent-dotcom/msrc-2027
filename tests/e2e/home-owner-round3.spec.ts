import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} shared seat dialog opens from navigation and preserves focus`, async ({ page, browserName }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    for (const area of [".hero-actions", ".closing-grid"]) {
      await expect(page.locator(`${area} a[href="/${locale}/participate"]`)).toHaveCount(1);
      await expect(page.locator(`${area} button`)).toHaveCount(0);
    }
    const dialog = page.getByRole("dialog");
    await expect(page.locator("dialog.reserve-seat-dialog")).toHaveCount(1);
    for (const selector of [".header-primary-action", ".mobile-reserve-action"]) {
      let trigger = page.locator(selector);
      const phone = selector === ".mobile-reserve-action";
      if (phone) {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.locator(".menu-toggle").click();
      } else if (!await trigger.isVisible()) continue;
      await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      await trigger.scrollIntoViewIfNeeded();
      const before = await page.locator(".wordmark").boundingBox();
      await trigger.click();
      await expect(dialog).toBeVisible();
      if (phone) await expect(page.locator(".mobile-menu")).toHaveCount(0);
      expect(await page.locator(".wordmark").boundingBox()).toEqual(before);
      await expect(dialog).toHaveAccessibleName(locale === "en" ? "Reserve your seat" : "احجز مقعدك");
      expect(await dialog.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href"))))
        .toEqual([`/${locale}/sign-in`, `/${locale}/sign-up`]);
      await expect(dialog.locator("a").first()).toBeFocused();
      expect(await dialog.evaluate(element => element.matches(":modal"))).toBe(true);
      // WebKit follows the system preference for tabbing to links.
      if (browserName === "webkit") await dialog.locator("a").last().focus();
      else await page.keyboard.press("Tab");
      await expect(dialog.locator("a").last()).toBeFocused();
      await page.locator(phone ? ".menu-toggle" : selector).evaluate(element => (element as HTMLElement).focus());
      await expect(dialog.locator("a").last()).toBeFocused();
      if (browserName === "webkit") await dialog.locator("a").first().focus();
      else await page.keyboard.press("Shift+Tab");
      await expect(dialog.locator("a").first()).toBeFocused();
      await page.keyboard.press("Escape");
      trigger = phone ? page.locator(".menu-toggle") : trigger;
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    for (const [width, height] of [[320, 844], [390, 844], [1024, 900], [1440, 900], [667, 320]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(`/${locale}`);
      const header = page.locator(".header-primary-action");
      const phone = width < 1024 || !await header.isVisible();
      if (phone) await page.locator(".menu-toggle").click();
      await expect(page.locator(phone ? ".mobile-reserve-action" : ".header-primary-action")).toHaveAttribute("aria-haspopup", "dialog");
      await page.locator(phone ? ".mobile-reserve-action" : ".header-primary-action").click();
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(16);
      expect(box.x + box.width).toBeLessThanOrEqual(width - 16);
      expect(box.y).toBeGreaterThanOrEqual(16);
      expect(box.y + box.height).toBeLessThanOrEqual(height - 16);
      for (const link of await dialog.locator("a").all()) {
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeInViewport();
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await dialog.evaluate(async element => {
        element.scrollTop = 0;
        await element.querySelector("img")!.decode();
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      if (testInfo.project.name === "chromium-desktop") await page.screenshot({ path: `.tools/home-v2/round4/${locale}-reserve-${width}-reduce.png`, scale: "css" });
      if (width === 390 || width === 1440) {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        if (testInfo.project.name === "chromium-desktop") await page.screenshot({ path: `.tools/home-v2/round4/${locale}-reserve-${width}-motion.png`, scale: "css" });
        await page.emulateMedia({ reducedMotion: "reduce" });
      }
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
      await dialog.getByRole("button").click();
      await expect(dialog).toBeHidden();
      await expect(page.locator(phone ? ".menu-toggle" : ".header-primary-action")).toBeFocused();
      if (phone) await page.locator(".menu-toggle").click();
      await page.locator(phone ? ".mobile-reserve-action" : ".header-primary-action").click();
      await page.mouse.click(4, 4);
      await expect(dialog).toBeHidden();
      await expect(page.locator(phone ? ".menu-toggle" : ".header-primary-action")).toBeFocused();
    }
  });

  test(`${locale} dialog sign-up choice navigates successfully`, async ({ page }) => {
    await page.goto(`/${locale}`);
    if (!await page.locator(".header-primary-action").isVisible()) await page.locator(".menu-toggle").click();
    await page.locator(await page.locator(".header-primary-action").isVisible() ? ".header-primary-action" : ".mobile-reserve-action").click();
    await page.getByRole("dialog").locator("a").last().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-up$`));
  });

  test(`${locale} native reserve links and readable header survive without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".reserve-seat > a")).toHaveCount(1);
    for (const link of await page.locator(".reserve-seat > a").all()) await expect(link).toHaveAttribute("href", `/${locale}/sign-in`);
    await expect(page.locator(".axiom-header")).toHaveAttribute("data-header-tone", "dark");
    await expect(page.locator(".header-glass")).toHaveCSS("backdrop-filter", "none");
    await expect(page.locator(".header-glass")).toHaveCSS("background-color", "rgb(31, 25, 48)");
    await page.goto(`/${locale}/sponsors`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".axiom-header")).toHaveAttribute("data-header-tone", "light");
    await context.close();
  });

  test(`${locale} forced-colors header keeps its whole navigation readable`, async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    if (!await page.locator(".header-primary-action").isVisible()) await page.locator(".menu-toggle").click();
    await page.locator(await page.locator(".header-primary-action").isVisible() ? ".header-primary-action" : ".mobile-reserve-action").click();
    await expect(page.getByRole("dialog")).toHaveCSS("animation-name", "none");
    await expect(page.getByRole("dialog")).toHaveCSS("border-top-width", "1px");
    await page.keyboard.press("Escape");
    const glass = page.locator(".header-glass");
    await expect(glass).toHaveCSS("backdrop-filter", "none");
    await expect(glass).toHaveCSS("border-top-width", "1px");
    await expect(page.locator(".wordmark")).toBeVisible();
    await expect(page.locator(".axiom-header")).not.toHaveAttribute("data-compact");
  });
}
