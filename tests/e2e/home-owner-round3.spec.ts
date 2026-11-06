import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} seat disclosures preserve keyboard focus, routes and phone bounds`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const seats = page.locator(".reserve-seat");
    for (const seat of await seats.all()) {
      const trigger = seat.locator(":scope > button");
      if (!await trigger.isVisible()) continue;
      await trigger.focus();
      const before = await trigger.boundingBox();
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      const panel = seat.locator(".reserve-seat-panel");
      await expect(panel).toHaveAttribute("id", (await trigger.getAttribute("aria-controls"))!);
      expect(await panel.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href"))))
        .toEqual([`/${locale}/sign-in`, `/${locale}/sign-up`]);
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(await trigger.boundingBox()).toEqual(before);
      await page.keyboard.press("Tab");
      await expect(panel.locator("a").first()).toBeFocused();
      for (const link of await panel.locator("a").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(panel).toBeHidden();
      await trigger.click();
      await page.locator("#hero-title").click();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    await page.setViewportSize({ width: 320, height: 844 });
    const hero = page.locator(".hero-actions .reserve-seat");
    await hero.locator("button").click();
    const panel = (await hero.locator(".reserve-seat-panel").boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(320);
    const results = await new AxeBuilder({ page }).include(".hero-actions").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test(`${locale} native reserve links and readable header survive without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".reserve-seat > a")).toHaveCount(3);
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
    const glass = page.locator(".header-glass");
    await expect(glass).toHaveCSS("backdrop-filter", "none");
    await expect(glass).toHaveCSS("border-top-width", "1px");
    await expect(page.locator(".wordmark")).toBeVisible();
    await expect(page.locator(".axiom-header")).not.toHaveAttribute("data-compact");
  });
}
