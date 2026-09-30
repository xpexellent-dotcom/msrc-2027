import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} enlarged-text skip link stays hidden until keyboard focus`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const skip = page.locator('a[href="#main-content"]');
    expect(await skip.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThan(0);
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    const bounds = await skip.boundingBox();
    expect(bounds?.y).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
    expect(await skip.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test(`${locale} section navigation preserves keyboard focus and offers free scrolling`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const journey = page.locator(".section-journey");
    const links = journey.getByRole("link");
    for (const link of await links.all()) {
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    const toggle = journey.getByRole("button");
    if (await toggle.isVisible()) {
      // Chromium serializes the default proximity strictness as just "y".
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toMatch(/^y(?: proximity)?$/);
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
      await page.keyboard.press("Enter");
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
    }
    const program = journey.locator('a[href="#program"]');
    await program.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}#program$`));
    await expect(page.locator("#program")).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test(`${locale} reduced motion removes section snapping and button travel`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
    const button = page.locator(".hero-actions .button--gold");
    await button.hover();
    expect(await button.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    expect(await button.evaluate((element) => getComputedStyle(element, "::before").transitionDuration)).toBe("0s");
  });
}

test("a production build cannot serve unpublished footage even with its local flag enabled", async ({ request }) => {
  for (const route of ["/en/hero-preview", "/ar/hero-preview", "/api/preview-media/desktop.mp4", "/api/preview-media/mobile.mp4", "/api/preview-media/poster-desktop.jpg", "/api/preview-media/poster-mobile.jpg", "/api/preview-media/Montage_3.mp4"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
    if (route.startsWith("/api/")) {
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
  }
});
