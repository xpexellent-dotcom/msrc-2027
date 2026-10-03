import { expect, test, type Page } from "@playwright/test";

// DSN-01 / ACC-01 / LOC-01/03: navigation remains reachable during native down/up scrolling.
async function hydrated(page: Page) {
  await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} mobile header stays settled during small scroll reversals`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile header only.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    const header = page.locator(".site-header");
    // Small movements near the opening keep its initial position, even across the old 24px edge.
    for (const top of [20, 28, 44, 18]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(header).toHaveAttribute("data-scrolled", "false");
    }
    await page.evaluate(() => window.scrollTo({ top: 80, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-scrolled", "true");
    const docked = (await header.boundingBox())!.y;
    for (const top of [42, 29, 20, 40, 16]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(header).toHaveAttribute("data-scrolled", "true");
      expect((await header.boundingBox())!.y).toBeCloseTo(docked, 0);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-scrolled", "false");
  });

  test(`${locale} mobile menu remains reachable after scrolling down and back up`, async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile, "Mobile disclosure navigation only.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    const toggle = page.locator(".menu-toggle");
    for (const top of [1800, 700, 40, 0, 1800, 700]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
      await expect(toggle).toBeInViewport();
      await expect.poll(() => toggle.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return Boolean(hit && button.contains(hit));
      })).toBe(true);
      const scroll = await page.evaluate(() => window.scrollY);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(".mobile-menu")).toBeVisible();
      const firstLink = page.locator(".mobile-menu").getByRole("link").first();
      // Windows WebKit's default keyboard policy tabs to controls, skipping links.
      // Chromium verifies native Tab order; WebKit verifies explicit link focus and
      // keyboard activation below, without changing browser or system preferences.
      if (browserName === "webkit") await firstLink.focus();
      else await page.keyboard.press("Tab");
      await expect(firstLink).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator(".mobile-menu")).toHaveCount(0);
      await expect(toggle).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0);
    }
    await toggle.click();
    const programme = page.locator(".mobile-menu").locator(`a[href='/${locale}/program']`);
    await programme.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`${locale} narrow enlarged mobile menu fits the viewport and reaches its last destination`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile disclosure navigation only.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const toggle = page.locator(".menu-toggle");
    await expect(toggle).toBeInViewport();
    await toggle.click();
    const menu = page.locator(".mobile-menu");
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(menuBox!.y).toBeGreaterThanOrEqual(0);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(641);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const last = menu.getByRole("link").last();
    const href = await last.getAttribute("href");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await last.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
