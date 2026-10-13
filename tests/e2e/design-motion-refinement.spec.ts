import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    designMotionEvidence: {
      slides: { frames: Keyframe[]; duration: number | null | undefined }[];
      scrolls: { id: string; behavior: ScrollBehavior | undefined }[];
    };
  }
}

async function observeNavigation(page: Page) {
  await page.addInitScript(() => {
    window.designMotionEvidence = { slides: [], scrolls: [] };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      window.designMotionEvidence.slides.push({
        frames: Array.isArray(frames) ? frames : [],
        duration: typeof options === "number" ? options : options?.duration as number | undefined,
      });
      return animate.call(this, frames, options);
    };
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      window.designMotionEvidence.scrolls.push({ id: this.id, behavior: typeof options === "object" ? options.behavior : undefined });
      return scrollIntoView.call(this, options);
    };
  });
}

async function waitForHeader(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--site-header-height"))).not.toBe("");
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} keyboard anchors and routes keep focus and history without arrival motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    await page.goto(`/${locale}?view=keyboard-motion`);
    await waitForHeader(page);
    await page.locator(".hero-scroll").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=keyboard-motion#essentials$`));
    await expect(page.locator("#essentials")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.designMotionEvidence.scrolls.at(-1))).toEqual({ id: "essentials", behavior: "instant" });
    expect(await page.evaluate(() => window.designMotionEvidence.slides)).toEqual([]);

    const toggle = page.locator(".menu-toggle");
    if (await toggle.isVisible()) {
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".mobile-menu")).toBeVisible();
      expect(await page.locator(".mobile-menu").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    }
    const navigation = page.locator(await toggle.isVisible() ? ".mobile-menu nav" : ".desktop-nav");
    await navigation.locator(`a[href='/${locale}/program']`).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.getByRole("main")).toBeFocused();
    expect(await page.evaluate(() => window.designMotionEvidence.slides)).toEqual([]);
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=keyboard-motion#essentials$`));
    await expect(page.locator("#essentials")).toBeInViewport();
  });

  test(`${locale} pointer navigation retains a short directional arrival and native Back`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    await page.goto(`/${locale}/participate?view=pointer-motion`);
    await waitForHeader(page);
    const toggle = page.locator(".menu-toggle");
    if (await toggle.isVisible()) await toggle.click();
    const navigation = page.locator(await toggle.isVisible() ? ".mobile-menu nav" : ".desktop-nav");
    await navigation.locator(`a[href='/${locale}/program']`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.getByRole("main")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.designMotionEvidence.slides.length)).toBe(1);
    const arrival = await page.evaluate(() => window.designMotionEvidence.slides[0]);
    expect(arrival.duration).toBe(220);
    expect(arrival.frames[0].transform).toBe(`translateX(${locale === "ar" ? -8 : 8}px)`);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}/participate\\?view=pointer-motion$`));
    expect(await page.evaluate(() => window.designMotionEvidence.slides.length)).toBe(1);
  });

  test(`${locale} mobile disclosure marks the current page and stays immediate for keyboard reopening`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/participate`);
    await waitForHeader(page);
    const toggle = page.locator(".menu-toggle");
    await toggle.click();
    const menu = page.locator(".mobile-menu");
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    expect(await menu.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.2s, 0.2s");
    const current = menu.locator("a[aria-current='page']");
    await expect(current).toHaveAttribute("href", `/${locale}/participate`);
    expect(await current.evaluate((element) => getComputedStyle(element).textDecorationLine)).toContain("underline");
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    expect(await menu.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
    await current.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole("main")).toBeFocused();
  });

  test(`${locale} enabling reduced motion immediately exposes waiting content`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await waitForHeader(page);
    const waiting = page.locator('.reveal[data-reveal-state="waiting"] > :not(.chapter-stage, :has(.chapter-stage))');
    await expect.poll(() => waiting.count()).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => waiting.evaluateAll((elements) => elements.every((element) => {
      const style = getComputedStyle(element);
      return style.opacity === "1" && style.transform === "none";
    }))).toBe(true);
  });
}
