import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

// DSN-01/02, ACC-01, LOC-01, MED-01: final settled geometry, not an
// intermediate smooth-scroll frame, is the acceptance boundary.
async function expectItemInView(track: Locator, index: number) {
  await expect.poll(() => track.evaluate((element, itemIndex) => {
    const viewport = element.getBoundingClientRect();
    const item = element.children[itemIndex].getBoundingClientRect();
    const position = Math.abs(element.scrollLeft);
    const atEdge = position < 2 || position >= element.scrollWidth - element.clientWidth - 2;
    return item.left >= viewport.left - 1 && item.right <= viewport.right + 1
      && (atEdge || Math.abs(item.left + item.width / 2 - viewport.left - element.clientWidth / 2) <= 2);
  }, index), { message: `Item ${index + 1} is fully visible at its settled centre or end stop` }).toBe(true);
}

for (const locale of ["en", "ar"] as const) {
  for (const width of [390, 1440, 1920]) {
    test(`${locale} homepage ${width}: mirrored benefits, continuous surfaces and accessible ambience`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-desktop", "Exact viewport checks run once per locale.");
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#program").scrollIntoViewIfNeeded();
      const heading = await page.locator(".program-opening > .chapter-stage").boundingBox();
      const intro = await page.locator(".program-opening > div:last-child").boundingBox();
      const cards = await page.locator(".program-experiences").boundingBox();
      const artwork = await page.locator(".research-artwork").boundingBox();
      if (width > 800) {
        expect(locale === "ar" ? heading!.x < intro!.x : heading!.x > intro!.x).toBe(true);
        expect(locale === "ar" ? cards!.x > artwork!.x : cards!.x < artwork!.x).toBe(true);
        await expect(page.locator(".program-opening > .chapter-stage")).toHaveCSS("text-align", "end");
      } else {
        expect(heading!.y + heading!.height).toBeLessThanOrEqual(intro!.y);
        expect(intro!.y + intro!.height).toBeLessThanOrEqual(cards!.y);
      }
      const boundary = await page.evaluate(() => {
        const program = document.querySelector("#program")!;
        const speakers = document.querySelector("#speakers")!;
        return Math.abs(program.getBoundingClientRect().bottom - speakers.getBoundingClientRect().top);
      });
      expect(boundary).toBeLessThanOrEqual(1);
      for (const selector of ["#program > .ambient-art", ".speaker-atmosphere"]) {
        await expect(page.locator(selector)).toHaveCSS("mask-image", /linear-gradient/);
      }

      const flow = page.locator(".community-flow");
      await page.locator("#legacy").scrollIntoViewIfNeeded();
      await expect(flow).toHaveAttribute("aria-hidden", "true");
      await expect(flow).toHaveCSS("pointer-events", "none");
      await expect(flow).toHaveCSS("animation-name", "none");
      expect(await flow.evaluate(element => {
        const art = element.getBoundingClientRect();
        return [".history-numbers", ".gallery-rail"].every(selector => {
          const content = document.querySelector(selector)!.getBoundingClientRect();
          return art.top <= content.top && art.bottom >= content.bottom;
        });
      })).toBe(true);
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibility.violations).toEqual([]);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(flow).toHaveCSS("animation-name", "community-flow-drift");
      const initialTransform = await flow.evaluate(element => getComputedStyle(element).transform);
      await expect.poll(() => flow.evaluate(element => getComputedStyle(element).transform)).not.toBe(initialTransform);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(flow).toHaveCSS("animation-name", "none");
      await expect(flow).toHaveCSS("transform", "none");
    });
  }
  test(`${locale} rail handles rapid taps, resizing and unequal item widths`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Shared rail stress check runs once per locale.");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}`);
    const gallery = page.locator(".gallery-rail");
    const track = gallery.locator(".rail-track");
    const next = gallery.getByRole("button", { name: locale === "ar" ? "التالي" : "Next", exact: true });
    const previous = gallery.getByRole("button", { name: locale === "ar" ? "السابق" : "Previous", exact: true });
    await gallery.scrollIntoViewIfNeeded();
    await next.dblclick();
    await expectItemInView(track, 2);
    await previous.dblclick();
    await expectItemInView(track, 0);
    await expect(previous).toBeDisabled();
    await page.setViewportSize({ width: 320, height: 568 });
    await track.locator(":scope > *").evaluateAll(items => items.forEach((item, index) => {
      (item as HTMLElement).style.inlineSize = `${index % 2 ? 75 : 90}%`;
    }));
    await track.focus();
    await page.keyboard.press("Home");
    await expectItemInView(track, 0);
    for (let index = 1; index < await track.locator(":scope > *").count(); index++) {
      await next.click();
      await expectItemInView(track, index);
    }
    await expect(next).toBeDisabled();
  });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    for (const motion of ["reduce", "no-preference"] as const) {
      test(`${locale} homepage ${viewport.width} ${motion}: compact cards, one-item rail and film controls`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "chromium-desktop", "Exact viewport matrix runs once; standard mobile suite runs separately.");
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: motion });
        const errors: string[] = [];
        const videos: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", request => { if (new URL(request.url()).pathname.endsWith(".mp4")) videos.push(request.url()); });
        await page.goto(`/${locale}`);
        await page.evaluate(() => document.fonts.ready);
        const phone = viewport.width <= 700;
        const hero = page.locator(".conference-hero");
        if (motion === "reduce") {
          await expect(hero.locator("video")).toHaveCount(0);
          await expect(hero.locator(".hero-media-poster")).toBeVisible();
        } else {
          await expect.poll(() => hero.locator("video").evaluate((video: HTMLVideoElement) => !video.paused && video.readyState >= 2)).toBe(true);
          if (phone) await expect(hero.getByRole("button", { name: /background video|فيديو الخلفية/ })).toHaveCount(0);
          else await expect(hero.locator(".hero-media-toggle")).toBeVisible();
        }

        const benefits = page.locator(".program-experiences");
        await benefits.scrollIntoViewIfNeeded();
        for (const card of await benefits.locator(".benefit-card").all()) {
          const layout = await card.evaluate(element => {
            const box = element.getBoundingClientRect();
            const body = element.querySelector("p")!.getBoundingClientRect();
            const title = element.querySelector("h3")!;
            return { bottomSpace: box.bottom - body.bottom, padding: parseFloat(getComputedStyle(element).paddingBottom), title: parseFloat(getComputedStyle(title).fontSize) };
          });
          if (phone) {
            expect(layout.padding).toBeLessThanOrEqual(18);
            expect(layout.bottomSpace).toBeLessThanOrEqual(layout.padding + 2);
            expect(layout.title).toBeGreaterThanOrEqual(25.6);
          }
        }
        if (motion === "reduce") await benefits.screenshot({ path: testInfo.outputPath(`${locale}-${viewport.width}-benefits.png`), style: ".site-header { visibility: hidden; }" });

        const numbers = page.locator(".history-numbers");
        await numbers.scrollIntoViewIfNeeded();
        expect((await numbers.boundingBox())!.height).toBeLessThan(phone ? 350 : 220);
        await expect(page.locator(".history-total dd .sr-only")).toHaveText(locale === "ar" ? "٤٬٠٠٧+" : "4,007+");
        if (motion === "reduce") await numbers.screenshot({ path: testInfo.outputPath(`${locale}-${viewport.width}-numbers.png`) });

        const gallery = page.locator(".gallery-rail");
        const track = gallery.locator(".rail-track");
        await gallery.scrollIntoViewIfNeeded();
        await expect(track).toHaveCSS("scroll-snap-type", "x mandatory");
        const previous = gallery.getByRole("button", { name: locale === "ar" ? "السابق" : "Previous", exact: true });
        const next = gallery.getByRole("button", { name: locale === "ar" ? "التالي" : "Next", exact: true });
        const count = await track.locator(":scope > *").count();
        await expect(previous).toBeDisabled();
        await expectItemInView(track, 0);
        for (let i = 1; i < count; i++) {
          await next.click();
          await expectItemInView(track, i);
        }
        await expect(next).toBeDisabled();
        for (let i = count - 2; i >= 0; i--) {
          await previous.click();
          await expectItemInView(track, i);
        }
        await expect(previous).toBeDisabled();
        await track.focus();
        const y = await page.evaluate(() => window.scrollY);
        await page.keyboard.press("End");
        await expectItemInView(track, count - 1);
        await expect(next).toBeDisabled();
        await page.keyboard.press("Home");
        await expectItemInView(track, 0);
        await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
        await expectItemInView(track, 1);
        await page.keyboard.press(locale === "ar" ? "ArrowRight" : "ArrowLeft");
        await expectItemInView(track, 0);
        expect(await page.evaluate(() => window.scrollY)).toBe(y);
        if (motion === "reduce") await gallery.screenshot({ path: testInfo.outputPath(`${locale}-${viewport.width}-gallery.png`) });

        const closing = page.locator(".city-closing");
        await closing.scrollIntoViewIfNeeded();
        if (motion === "reduce") {
          await expect(closing.locator("video")).toHaveCount(0);
          await expect(closing.locator(".city-media img")).toBeVisible();
          expect(videos).toEqual([]);
        } else {
          await expect.poll(() => closing.locator("video").evaluate((video: HTMLVideoElement) => !video.paused && video.readyState >= 2)).toBe(true);
          if (phone) await expect(closing.getByRole("button", { name: /Jeddah video|فيديو جدة/ })).toHaveCount(0);
          else await expect(closing.locator(".city-control")).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        expect(errors).toEqual([]);
      });
    }
  }
}
