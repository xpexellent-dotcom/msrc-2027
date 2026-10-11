import { expect, test } from "@playwright/test";

// ENG-023 / ACC-01 / LOC-01/03: verify the requested editorial story through
// rendered positions, real controls and truthful content, not animation declarations alone.
for (const locale of ["en", "ar"] as const) {
  const finalCount = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(4007) + "+";

  test(`${locale} the speaker ambience settles once without extra controls and respects reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    const atmosphere = page.locator(".speaker-atmosphere");
    const orbit = atmosphere.locator(".speaker-contour-orbit");
    await expect(atmosphere).toHaveAttribute("data-running", "false");
    await page.locator("#speakers").scrollIntoViewIfNeeded();
    await expect(atmosphere).toHaveAttribute("data-running", "true");
    await expect(orbit).toHaveCSS("animation-play-state", "running");
    await expect(atmosphere.getByRole("button")).toHaveCount(0);
    await expect(atmosphere).toHaveAttribute("data-running", "false", { timeout: 6000 });
    await expect(orbit).toHaveCSS("animation-play-state", "paused");
    const settled = await orbit.evaluate((element) => getComputedStyle(element).transform);
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await expect(atmosphere).toHaveAttribute("data-running", "false");
    await page.locator("#speakers").scrollIntoViewIfNeeded();
    await expect(atmosphere).toHaveAttribute("data-running", "false");
    await expect(orbit).toHaveCSS("transform", settled);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(atmosphere.getByRole("button")).toHaveCount(0);
    await expect(orbit).toHaveCSS("animation-name", "none");
    await expect(page.locator("#speakers h2")).toHaveAccessibleName(locale === "ar" ? "تعرّف إلى المتحدثين." : "Meet the speakers.");
  });

  test(`${locale} the content sheet covers the held film through native scrolling`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator(".hero-scroll-stage > .conference-hero");
    const sheet = page.locator(".homepage-content-sheet");
    await expect(hero).toHaveCSS("position", "sticky");
    const initialHero = (await hero.boundingBox())!;
    const initialSheet = (await sheet.boundingBox())!;
    const stickyTop = await hero.evaluate((element) => parseFloat(getComputedStyle(element).top));
    const hold = await page.locator(".hero-scroll-stage").evaluate((element) => parseFloat(getComputedStyle(element, "::after").height));
    expect(hold).toBeGreaterThan(0);
    expect(initialSheet.y).toBeCloseTo(initialHero.y + initialHero.height, 0);
    const travel = Math.ceil(Math.max(0, -stickyTop) + hold * .6);
    await page.evaluate((distance) => window.scrollTo({ top: distance, behavior: "instant" }), travel);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(travel);
    const heldHero = (await hero.boundingBox())!;
    const risingSheet = (await sheet.boundingBox())!;
    // A hero taller than the viewport first reveals its lower controls, then
    // holds at its bottom edge while the content sheet covers it.
    expect(heldHero.y).toBeCloseTo(Math.max(initialHero.y - travel, stickyTop), 0);
    expect(initialSheet.y - risingSheet.y).toBeCloseTo(travel, 0);
    expect(risingSheet.y).toBeLessThan(heldHero.y + heldHero.height);
    const surface = await sheet.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, layer: Number(style.zIndex) };
    });
    expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(surface.layer).toBeGreaterThan(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
    // Preference changes remove the hold and its added travel immediately.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(hero).toHaveCSS("position", "relative");
    expect(await page.locator(".hero-scroll-stage").evaluate((element) => parseFloat(getComputedStyle(element, "::after").height))).toBe(0);
    await expect(sheet).toHaveCSS("margin-top", "0px");
  });

  test(`${locale} historical attendance counts once while its accessible value stays final`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    const total = page.locator(".history-total dd");
    const visual = total.locator(".history-count");
    const accessible = total.locator(".sr-only");
    await expect(accessible).toHaveText(finalCount);
    await expect(visual).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".history-numbers [aria-live]")).toHaveCount(0);
    await visual.scrollIntoViewIfNeeded();
    await expect(visual).toHaveAttribute("data-counting", "true");
    await expect(accessible).toHaveText(finalCount);
    await expect(visual).toHaveText(finalCount);
    await expect(visual).toHaveAttribute("data-counting", "false");
    await visual.evaluate((element) => {
      element.setAttribute("data-test-mutations", "0");
      const observer = new MutationObserver((records) => {
        const changes = records.filter((record) => record.type === "childList" || record.type === "characterData").length;
        if (changes) element.setAttribute("data-test-mutations", String(Number(element.getAttribute("data-test-mutations")) + changes));
      });
      observer.observe(element, { childList: true, characterData: true, subtree: true });
    });
    await page.locator("#top").scrollIntoViewIfNeeded();
    await visual.scrollIntoViewIfNeeded();
    // Observe several rendered frames after re-entry; a restarted 1.4s count
    // changes text immediately and cannot hide behind its eventual final value.
    await page.evaluate(() => new Promise<void>((resolve) => {
      let frames = 0;
      const sample = () => { if (++frames === 18) resolve(); else requestAnimationFrame(sample); };
      requestAnimationFrame(sample);
    }));
    await expect(visual).toHaveAttribute("data-test-mutations", "0");
    await expect(visual).toHaveText(finalCount);
    await expect(accessible).toHaveText(finalCount);
    await expect(page.locator(".history-total dt")).toContainText(locale === "ar" ? "إجمالي الزوار" : "Total visitors");
  });

  test(`${locale} scientific artwork pauses from the keyboard and settles on reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    const artwork = page.locator(".research-artwork");
    const image = artwork.locator(".research-artwork-image");
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toHaveAttribute("data-running", "true");
    await expect(image).toHaveCSS("animation-play-state", "running");
    const control = artwork.getByRole("button");
    await expect(control).toHaveAccessibleName(locale === "ar" ? "إيقاف الحركة" : "Pause animation");
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control).toHaveAccessibleName(locale === "ar" ? "تشغيل الحركة" : "Play animation");
    await expect(artwork).toHaveAttribute("data-running", "false");
    await expect(image).toHaveCSS("animation-play-state", "paused");
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(artwork).toHaveAttribute("data-running", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(artwork).toHaveAttribute("data-running", "false");
    await expect(artwork.getByRole("button")).toHaveCount(0);
    await expect(image).toHaveCSS("animation-name", "none");
    await expect(artwork.locator("img")).toBeVisible();
  });

  test(`${locale} reduced motion starts with final history values and static artwork`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator(".history-total .history-count")).toHaveText(finalCount);
    await expect(page.locator(".history-count[data-counting='true']")).toHaveCount(0);
    const artwork = page.locator(".research-artwork");
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toHaveAttribute("data-running", "false");
    await expect(artwork.getByRole("button")).toHaveCount(0);
    await expect(artwork.locator(".research-artwork-image")).toHaveCSS("animation-name", "none");
    await page.locator(".history-numbers").scrollIntoViewIfNeeded();
    await expect(page.locator(".history-total .history-count")).toHaveText(finalCount);
    await expect(page.locator(".history-count[data-counting='true']")).toHaveCount(0);
  });

  test(`${locale} the revised story presents benefits and the real venue without obsolete sections`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator("main #about, main #partners, main .brand-marquee, main .sponsor-tiers")).toHaveCount(0);
    await expect(page.locator(`a[href='/${locale}/about']`)).toHaveCount(0);
    await expect(page.locator(".program-experiences > article")).toHaveCount(6);
    await expect(page.locator(".program-experiences")).toContainText(locale === "ar" ? "بعد تأكيدها" : "when confirmed");
    await expect(page.locator(".benefit-cme")).toHaveAttribute("aria-label", locale === "ar" ? /مثال بصري فقط، العدد غير مؤكد/ : /illustrative only, hours unconfirmed/);
    await expect(page.locator(".benefit-cme-note")).toHaveText(locale === "ar" ? "مثال بصري" : "Illustrative");
    await expect(page.locator(".program-experiences")).toContainText(locale === "ar" ? "في اليومين" : "on both days");
    await expect(page.locator("#speakers .speaker-preview-card")).toHaveCount(4);
    await expect(page.locator("#speakers .portrait-placeholder")).toHaveCount(4);
    await expect(page.locator("#speakers img, .demo-chip, .portrait-provenance, .pathways-archive-note")).toHaveCount(0);
    const venue = page.locator("#venue");
    await venue.scrollIntoViewIfNeeded();
    await expect(venue.getByRole("heading", { level: 3 })).toHaveText(locale === "ar" ? "مركز الملك فيصل للمؤتمرات" : "King Faisal Conference Center");
    const photo = venue.locator("img");
    await expect(photo).toHaveAttribute("alt", /\S+/);
    await expect.poll(() => photo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(venue.locator("a")).toHaveAttribute("href", `/${locale}/dates-venue`);
  });

  test(`${locale} editorial benefits, statistics and venue reflow at 280px with doubled text`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Extreme text-reflow matrix runs once per locale.");
    await page.setViewportSize({ width: 280, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    for (const id of ["program", "legacy", "venue", "faq"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), id).toBe(true);
      const clipped = await page.locator(`#${id} h2, #${id} h3, #${id} p, #${id} dt, #${id} .history-count`).evaluateAll((elements) => elements.some((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
      }));
      expect(clipped, `${id} text stays within the reading viewport`).toBe(false);
    }
  });
}
