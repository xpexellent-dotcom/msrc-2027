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

  test(`${locale} the content sheet follows native phone flow and covers the held desktop film`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator(".hero-scroll-stage > .conference-hero");
    const sheet = page.locator(".homepage-content-sheet");
    if (isMobile) {
      await expect(hero).toHaveCSS("position", "relative");
      expect(await page.locator(".hero-scroll-stage").evaluate((element) => parseFloat(getComputedStyle(element, "::after").height))).toBe(0);
      const initialHero = (await hero.boundingBox())!;
      const initialSheet = (await sheet.boundingBox())!;
      expect(initialSheet.y).toBeCloseTo(initialHero.y + initialHero.height - 16, 0);
      await page.mouse.wheel(0, 240);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(240);
      expect((await hero.boundingBox())!.y).toBeCloseTo(initialHero.y - 240, 0);
      await expect(page.locator(".hero-layout")).toHaveCSS("opacity", "1");
      await expect(page.locator(".hero-bottom")).toHaveCSS("opacity", "1");
      await page.mouse.wheel(0, -240);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      expect((await hero.boundingBox())!.y).toBeCloseTo(initialHero.y, 0);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(sheet).toHaveCSS("margin-top", "0px");
      return;
    }
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

  test(`${locale} phone benefit icons align beside readable titles and full-width copy`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone composition; desktop layout is covered separately.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("navigation", { name: locale === "ar" ? "مسارات المشاركة" : "Participation tracks" })).toHaveCount(0);
      await expect(page.locator(".pathway-list > article")).toHaveCount(5);
      const cards = page.locator(".benefit-card");
      await expect(cards).toHaveCount(6);
      for (const card of await cards.all()) {
        const icon = (await card.locator(":scope > .benefit-artwork").boundingBox())!;
        const title = (await card.locator("h3").boundingBox())!;
        const body = (await card.locator("p").boundingBox())!;
        expect(Math.abs(icon.y + icon.height / 2 - title.y - title.height / 2)).toBeLessThan(2);
        expect(body.width).toBeGreaterThan(title.width + 40);
        expect(body.y).toBeGreaterThanOrEqual(Math.max(icon.y + icon.height, title.y + title.height));
        expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
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

  test(`${locale} scientific artwork settles once without controls and respects reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    const artwork = page.locator(".research-artwork");
    const image = artwork.locator(".research-artwork-image");
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toHaveAttribute("data-running", "true");
    await expect(image).toHaveCSS("animation-play-state", "running");
    await expect(artwork.locator("button")).toHaveCount(0);
    await expect(artwork).toHaveAttribute("data-settled", "true", { timeout: 6000 });
    await expect(artwork).toHaveAttribute("data-running", "false");
    const finalTransform = await image.evaluate((element) => getComputedStyle(element).transform);
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toHaveAttribute("data-running", "false");
    await expect(image).toHaveCSS("animation-name", "none");
    await expect(image).toHaveCSS("transform", finalTransform);
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
    // Owner decision (15 October 2026): the benefits describe joining the organizing team; no CME figure is shown.
    await expect(page.locator(".program-experiences")).toContainText(locale === "ar" ? "شهادة من العميد" : "A Dean’s certificate");
    await expect(page.locator(".program-experiences")).toContainText(locale === "ar" ? "مقاعد ورش العمل" : "workshop seats");
    await expect(page.locator(".benefit-cme")).toHaveCount(0);
    await expect(page.locator(".program-experiences .benefit-artwork")).toHaveCount(6);
    await expect(page.locator("a.editorial-action", { hasText: locale === "ar" ? "تعرّف على الفريق" : "Meet the team" })).toHaveAttribute("href", `/${locale}/team`);
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
