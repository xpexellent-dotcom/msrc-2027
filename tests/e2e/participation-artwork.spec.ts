import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const routes = ["registration", "submissions", "workshops", "hackathon", "3mt"] as const;
const locales = ["en", "ar"] as const;
const screenshotDirectory = ".tools/participation-artwork/after";

// DSN-01/02, LOC-01/03, ACC-01: the owner asked for a few large studies that fill
// the background rather than many small pieces. Each sits behind a whole section at
// watermark strength, so the guarantees are quietness, direction and safety: no
// horizontal scrolling, no interaction, static drawing, and fewer pieces on phones.
async function artworkGeometry(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const backdrops = Array.from(document.querySelectorAll("main .journey-art-backdrop")).flatMap((element) => {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility !== "visible") return [];
      const box = element.getBoundingClientRect();
      const center = (Math.max(0, box.left) + Math.min(width, box.right)) / 2;
      const rtl = document.documentElement.dir === "rtl";
      const startSide = element.classList.contains("journey-art-backdrop--start");
      // The visible part leans to its own edge, mirrored with the reading direction.
      const wrongDirection = startSide ? (rtl ? center < width / 2 : center > width / 2) : (rtl ? center > width / 2 : center < width / 2);
      return [{ label: Array.from(element.classList).join("."), wrongDirection, pointerEvents: style.pointerEvents,
        behindContent: Number(style.zIndex) <= 0 }];
    });
    return {
      backdrops,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      direction: document.documentElement.dir,
    };
  });
}

async function expectSafeGeometry(page: Page, width: number, locale: string) {
  const geometry = await artworkGeometry(page);
  expect(geometry.direction).toBe(locale === "ar" ? "rtl" : "ltr");
  expect(geometry.overflow, "Decorative edges must not create horizontal scrolling").toBeLessThanOrEqual(0);
  expect(geometry.backdrops.filter((piece) => piece.wrongDirection), "Artwork mirrors its placement with the reading direction").toEqual([]);
  expect(geometry.backdrops.filter((piece) => piece.pointerEvents !== "none" || !piece.behindContent)).toEqual([]);
  if (width < 900) expect(geometry.backdrops.length, "Phone artwork stays quiet across the whole page").toBeLessThanOrEqual(1);
  else {
    expect(geometry.backdrops.length, "A few large pieces fill the background").toBeGreaterThanOrEqual(1);
    expect(geometry.backdrops.length, "Only a few pieces, never a scatter").toBeLessThanOrEqual(2);
  }
}

async function expectStaticDecoration(page: Page) {
  expect(await page.locator(".journey-art-backdrop, .journey-art-backdrop *").evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return style.animationName !== "none" || style.transitionDuration.split(",").some((duration) => Number.parseFloat(duration) !== 0)
      || element.getAnimations().length > 0;
  }).map((element) => element.outerHTML.slice(0, 160))), "Artwork stays static").toEqual([]);
  await expect(page.locator(".journey-art animate, .journey-art animateTransform, .journey-art set")).toHaveCount(0);
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "The explicit viewport matrix runs once, without duplicate mobile-project captures.");
});

for (const locale of locales) {
  for (const route of routes) {
    for (const width of [390, 1440, 1920]) {
      test(`${locale} ${route} decorative artwork is readable and accessible at ${width}px`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error" && /hydration|hydrate|did not match|server rendered/i.test(message.text())) errors.push(message.text());
        });
        await page.setViewportSize({ width, height: width < 900 ? 844 : 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        const response = await page.goto(`/${locale}/${route}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator(".menu-toggle")).toBeEnabled();
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".journey-art").first()).toHaveAttribute("aria-hidden", "true");

        // Compare the actual response SVGs with the hydrated DOM. Deterministic
        // motifs must not change paths, seeds, or coordinates during hydration.
        const serverMarkup = await page.evaluate((html) => Array.from(new DOMParser().parseFromString(html, "text/html").querySelectorAll(".journey-art"), (element) => element.outerHTML), await response!.text());
        const clientMarkup = await page.locator(".journey-art").evaluateAll((elements) => elements.map((element) => element.outerHTML));
        expect(clientMarkup).toEqual(serverMarkup);
        expect(await page.locator(".journey-art").evaluateAll((elements) => elements.every((element) => element.getAttribute("aria-hidden") === "true"
          && element.getAttribute("focusable") === "false"
          && !element.querySelector("a, button, [tabindex]:not([tabindex='-1'])")
          && (!element.hasAttribute("tabindex") || Number(element.getAttribute("tabindex")) < 0)
          && getComputedStyle(element).pointerEvents === "none"))).toBe(true);

        mkdirSync(screenshotDirectory, { recursive: true });
        const screenshot = `${screenshotDirectory}/${locale}-${route}-${width}.png`;
        await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
        await testInfo.attach(`${locale}-${route}-${width}`, { path: screenshot, contentType: "image/png" });
        await expectSafeGeometry(page, width, locale);
        await expectStaticDecoration(page);
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(axe.violations, JSON.stringify(axe.violations)).toEqual([]);

        await page.emulateMedia({ reducedMotion: "no-preference" });
        await expectStaticDecoration(page);
        await page.emulateMedia({ forcedColors: "active" });
        expect((await artworkGeometry(page)).backdrops, "Forced colors removes decorative artwork").toEqual([]);
        expect(errors, "No page exceptions or hydration errors").toEqual([]);
      });
    }

    for (const width of [1600, 2560]) {
      test(`${locale} ${route} artwork stays quiet and contained at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/${locale}/${route}`);
        await page.evaluate(() => document.fonts.ready);
        await expectSafeGeometry(page, width, locale);
      });
    }
  }
}
