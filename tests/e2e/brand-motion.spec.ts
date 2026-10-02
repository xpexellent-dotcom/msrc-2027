import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    navigationEvidence: {
      slides: { id: string; frames: Keyframe[]; duration: number | null | undefined }[];
      scrolls: { id: string; behavior: ScrollBehavior | undefined }[];
    };
  }
}

async function observeNavigation(page: Page) {
  await page.addInitScript(() => {
    window.navigationEvidence = { slides: [], scrolls: [] };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      window.navigationEvidence.slides.push({
        id: this.id || this.closest("section[id]")?.id || "",
        frames: Array.isArray(frames) ? frames : [],
        duration: typeof options === "number" ? options : typeof options?.duration === "number" ? options.duration : null,
      });
      return animate.call(this, frames, options);
    };
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      window.navigationEvidence.scrolls.push({ id: this.id, behavior: typeof options === "object" ? options.behavior : undefined });
      return scrollIntoView.call(this, options);
    };
  });
}

async function headerNavigation(page: Page) {
  const toggle = page.locator(".menu-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    return page.locator(".mobile-menu nav");
  }
  return page.locator(".desktop-nav");
}

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

  test(`${locale} explicit section navigation glides and slides without controlling ordinary scrolling`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones have no chapter bar; their chapter titles are covered in chapter-titles.spec.ts (ORG-010).");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    await page.goto(`/${locale}`);
    const journey = page.locator(".section-journey");
    const links = journey.getByRole("link");
    for (const link of await links.all()) {
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    await expect(journey.getByRole("button")).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
    const program = journey.locator('a[href="#program"]');
    await program.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}#program$`));
    await expect(page.locator("#program")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.scrolls.find((scroll) => scroll.id === "program")?.behavior)).toBe("smooth");
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.slides.find((slide) => slide.id === "program")?.duration)).toBe(400);
    const slide = await page.evaluate(() => window.navigationEvidence.slides.find((entry) => entry.id === "program"));
    expect(slide?.frames[0].transform).toBe(`translateX(${locale === "ar" ? -16 : 16}px)`);
    expect(slide?.frames[1].transform).toBe("translateX(0)");
    await expect.poll(() => page.locator("#program").evaluate((element) =>
      Math.round(element.getBoundingClientRect().top) - parseFloat(getComputedStyle(element).scrollMarginBlockStart),
    )).toBeLessThanOrEqual(1);
    const position = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(position);
    expect(await page.evaluate(() => window.navigationEvidence.slides.length)).toBe(1);
  });

  test(`${locale} header navigation slides a page and retains browser history`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    await page.goto(`/${locale}`);
    const navigation = await headerNavigation(page);
    await navigation.locator(`a[href="/${locale}/about"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(page.getByRole("main")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.slides.find((slide) => slide.id === "about-introduction")?.duration)).toBe(400);
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    expect(await page.evaluate(() => window.navigationEvidence.slides.length)).toBe(1);
  });

  test(`${locale} dedicated programme navigation focuses the actual page and closes the mobile menu`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    await page.goto(`/${locale}/about`);
    const navigation = await headerNavigation(page);
    await expect(navigation.locator(".directional-arrow")).toHaveCount(0);
    await navigation.locator(`a[href="/${locale}/program"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.getByRole("main")).toBeFocused();
    await expect(page.getByTestId("program-empty")).toBeVisible();
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.slides.at(-1)?.duration)).toBe(400);
    const slide = await page.evaluate(() => window.navigationEvidence.slides.at(-1));
    expect(slide?.frames[0].transform).toBe(`translateX(${locale === "ar" ? -16 : 16}px)`);
  });

  test(`${locale} an anchor followed by a page visit retains the hash and query on Back`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones have no chapter bar; their chapter titles are covered in chapter-titles.spec.ts (ORG-010).");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    await page.goto(`/${locale}?view=motion`);
    await page.locator('.section-journey a[href="#program"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=motion#program$`));
    await expect(page.locator("#program")).toBeFocused();
    await expect.poll(() => page.locator("#program").evaluate((element) =>
      Math.round(element.getBoundingClientRect().top) - parseFloat(getComputedStyle(element).scrollMarginBlockStart),
    )).toBeLessThanOrEqual(1);
    const navigation = await headerNavigation(page);
    await navigation.locator(`a[href="/${locale}/about"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(page.getByRole("main")).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=motion#program$`));
    await expect(page.locator("#program")).toBeInViewport();
  });

  test(`${locale} language navigation preserves query, hash, destination focus and directional slide`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones have no chapter bar; their chapter titles are covered in chapter-titles.spec.ts (ORG-010).");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await observeNavigation(page);
    const targetLocale = locale === "en" ? "ar" : "en";
    await page.goto(`/${locale}?view=motion`);
    await page.locator('.section-journey a[href="#program"]').click();
    await expect(page.locator("#program")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.slides.length)).toBe(1);
    const language = page.getByRole("link", { name: locale === "en" ? "View this page in Arabic" : "View this page in English" });
    await expect(language).toHaveAttribute("href", `/${targetLocale}?view=motion#program`);
    await language.click();
    await expect(page).toHaveURL(new RegExp(`/${targetLocale}\\?view=motion#program$`));
    await expect(page.locator("html")).toHaveAttribute("dir", targetLocale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("#program")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.slides.length)).toBe(2);
    const slide = await page.evaluate(() => window.navigationEvidence.slides.at(-1));
    expect(slide?.id).toBe("program");
    expect(slide?.frames[0].transform).toBe(`translateX(${targetLocale === "ar" ? -16 : 16}px)`);
    expect(slide?.duration).toBe(400);
  });

  test(`${locale} reduced motion keeps navigation direct and removes button travel`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones have no chapter bar; their chapter titles are covered in chapter-titles.spec.ts (ORG-010).");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await observeNavigation(page);
    await page.goto(`/${locale}`);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
    const button = page.locator(".hero-actions .button--gold");
    await button.hover();
    expect(await button.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    expect(await button.evaluate((element) => getComputedStyle(element, "::before").transitionDuration)).toBe("0s");
    await page.locator('.section-journey a[href="#program"]').click();
    await expect(page.locator("#program")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.navigationEvidence.scrolls.find((scroll) => scroll.id === "program")?.behavior)).toBe("instant");
    expect(await page.evaluate(() => window.navigationEvidence.slides)).toEqual([]);
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
