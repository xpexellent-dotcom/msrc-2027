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
      hasTechnologyArtwork: Boolean(document.querySelector("main .hackathon-tech-art")),
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
  if (geometry.hasTechnologyArtwork) expect(geometry.backdrops, "Hackathon uses its technology studies without extra generic backdrops").toEqual([]);
  else if (width < 900) expect(geometry.backdrops.length, "Phone artwork stays quiet across the whole page").toBeLessThanOrEqual(1);
  else {
    expect(geometry.backdrops.length, "A few large pieces fill the background").toBeGreaterThanOrEqual(1);
    expect(geometry.backdrops.length, "Only a few pieces, never a scatter").toBeLessThanOrEqual(2);
  }
}

async function expectHackathonTechnology(page: Page, width: number, locale: string) {
  const pieces = page.locator(".hackathon-tech-art");
  const art = page.locator(".experience-intro--hackathon .experience-intro-art .hackathon-tech-art--hero");
  const field = page.locator(".participation-benefits > .hackathon-tech-art--field");
  const closing = page.locator(".fluid-journey-resources > .hackathon-tech-art--closing");
  await expect(pieces).toHaveCount(3);
  await expect(art).toHaveCount(1);
  await expect(field).toHaveCount(1);
  await expect(closing).toHaveCount(1);
  for (const piece of await pieces.all()) {
    await expect(piece).toHaveAttribute("aria-hidden", "true");
    await expect(piece.locator(".hackathon-tech-svg")).toHaveCount(1);
    expect(await piece.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
    await expect(piece.locator("a, button, [tabindex]:not([tabindex='-1'])")).toHaveCount(0);
    expect(await piece.evaluate((element) => !element.hasAttribute("tabindex") || Number(element.getAttribute("tabindex")) < 0)).toBe(true);
  }
  await expect(field).toBeVisible();

  if (width <= 1000) {
    await expect(art).toBeHidden();
    await expect(closing).toBeHidden();
  }
  else {
    await expect(art).toBeVisible();
    await expect(closing).toBeVisible();
    const bounds = await art.evaluate((element) => {
      const drawing = element.getBoundingClientRect();
      const cell = element.closest(".experience-intro-art")!.getBoundingClientRect();
      const copy = element.closest(".experience-intro-grid")!.firstElementChild!.getBoundingClientRect();
      return {
        overlapsCopy: Math.min(drawing.right, copy.right) - Math.max(drawing.left, copy.left) > 1
          && Math.min(drawing.bottom, copy.bottom) - Math.max(drawing.top, copy.top) > 1,
        contained: drawing.left >= cell.left - 1 && drawing.right <= cell.right + 1
          && drawing.top >= cell.top - 1 && drawing.bottom <= cell.bottom + 1,
        onReadingEnd: document.documentElement.dir === "rtl" ? drawing.right <= copy.left + 1 : drawing.left >= copy.right - 1,
      };
    });
    expect(bounds.overlapsCopy, `${locale} technology artwork stays clear of hero copy and actions`).toBe(false);
    expect(bounds.contained, "The artwork stays in the existing empty hero cell").toBe(true);
    expect(bounds.onReadingEnd, "The hero artwork swaps physical sides in Arabic").toBe(true);
  }

  const backgrounds = await page.locator(".hackathon-tech-art--field, .hackathon-tech-art--closing").evaluateAll((elements) => elements.flatMap((element) => {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility !== "visible") return [];
    const box = element.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    const center = (Math.max(0, box.left) + Math.min(viewport, box.right)) / 2;
    const rtl = document.documentElement.dir === "rtl";
    const start = element.classList.contains("hackathon-tech-art--closing");
    return [{
      label: element.className,
      wrongDirection: start ? (rtl ? center < viewport / 2 : center > viewport / 2) : (rtl ? center > viewport / 2 : center < viewport / 2),
      behindContent: Number(style.zIndex) <= 0,
    }];
  }));
  expect(backgrounds.filter((piece) => piece.wrongDirection || !piece.behindContent), "Large technology backgrounds mirror their edges and sit beneath content").toEqual([]);
  await expect(page.locator(".participation-journey--hackathon .journey-art-backdrop")).toHaveCount(0);
  expect(backgrounds.length + Number(await art.isVisible()), "Hackathon keeps three large desktop studies and one on narrow screens").toBe(width > 1000 ? 3 : 1);
}

async function expectSoftHeroEdges(page: Page) {
  // Render the actual mask, glow and SVG onto transparency. Screenshot-only CSS
  // is restored by Playwright, including on failure; it changes no art geometry.
  const png = await page.locator(".hackathon-tech-art--hero").screenshot({
    omitBackground: true,
    animations: "disabled",
    style: `
      html, body { background: transparent !important; }
      body *, html::before, html::after, body::before, body::after,
      body *::before, body *::after { visibility: hidden !important; }
      .hackathon-tech-art--hero, .hackathon-tech-art--hero *,
      .hackathon-tech-art--hero::before, .hackathon-tech-art--hero::after,
      .hackathon-tech-art--hero *::before, .hackathon-tech-art--hero *::after { visibility: visible !important; }
    `,
  });
  const alpha = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const edge = { top: 0, right: 0, bottom: 0, left: 0 };
    let interior = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const value = data[(y * canvas.width + x) * 4 + 3];
      if (y === 0) edge.top = Math.max(edge.top, value);
      if (x === canvas.width - 1) edge.right = Math.max(edge.right, value);
      if (y === canvas.height - 1) edge.bottom = Math.max(edge.bottom, value);
      if (x === 0) edge.left = Math.max(edge.left, value);
      if (x > 0 && x < canvas.width - 1 && y > 0 && y < canvas.height - 1) interior = Math.max(interior, value);
    }
    return { edge, interior };
  }, png.toString("base64"));
  expect(alpha.interior, "The isolated artwork has a visible interior; an empty capture cannot pass").toBeGreaterThan(16);
  for (const [edge, opacity] of Object.entries(alpha.edge)) {
    expect(opacity, `${edge} boundary fades to transparency instead of visibly cutting off`).toBeLessThanOrEqual(5);
  }
  return png;
}

async function expectTechnologyHidden(page: Page) {
  for (const piece of await page.locator(".hackathon-tech-art").all()) await expect(piece).toBeHidden();
}

async function expectStaticDecoration(page: Page) {
  expect(await page.locator(".journey-art-backdrop, .journey-art-backdrop *, .hackathon-tech-art, .hackathon-tech-art *").evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return style.animationName !== "none" || style.transitionDuration.split(",").some((duration) => Number.parseFloat(duration) !== 0)
      || element.getAnimations().length > 0;
  }).map((element) => element.outerHTML.slice(0, 160))), "Artwork stays static").toEqual([]);
  await expect(page.locator(":is(.journey-art, .hackathon-tech-svg) :is(animate, animateTransform, set)")).toHaveCount(0);
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
        await expect(page.locator(".journey-art, .hackathon-tech-svg").first()).toHaveAttribute("aria-hidden", "true");

        // Compare the actual response SVGs with the hydrated DOM. Deterministic
        // motifs must not change paths, seeds, or coordinates during hydration.
        const serverMarkup = await page.evaluate((html) => Array.from(new DOMParser().parseFromString(html, "text/html").querySelectorAll(".journey-art, .hackathon-tech-svg"), (element) => element.outerHTML), await response!.text());
        const clientMarkup = await page.locator(".journey-art, .hackathon-tech-svg").evaluateAll((elements) => elements.map((element) => element.outerHTML));
        expect(clientMarkup).toEqual(serverMarkup);
        expect(await page.locator(".journey-art, .hackathon-tech-svg").evaluateAll((elements) => elements.every((element) => element.getAttribute("aria-hidden") === "true"
          && element.getAttribute("focusable") === "false"
          && !element.querySelector("a, button, [tabindex]:not([tabindex='-1'])")
          && (!element.hasAttribute("tabindex") || Number(element.getAttribute("tabindex")) < 0)
          && getComputedStyle(element).pointerEvents === "none"))).toBe(true);

        mkdirSync(screenshotDirectory, { recursive: true });
        const screenshot = `${screenshotDirectory}/${locale}-${route}-${width}.png`;
        await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
        await testInfo.attach(`${locale}-${route}-${width}`, { path: screenshot, contentType: "image/png" });
        await expectSafeGeometry(page, width, locale);
        if (route === "hackathon") await expectHackathonTechnology(page, width, locale);
        await expectStaticDecoration(page);
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        expect(axe.violations, JSON.stringify(axe.violations)).toEqual([]);
        if (route === "hackathon" && width === 1440) {
          await testInfo.attach(`${locale}-hackathon-transparent-hero`, { body: await expectSoftHeroEdges(page), contentType: "image/png" });
        }

        await page.emulateMedia({ reducedMotion: "no-preference" });
        await expectStaticDecoration(page);
        await page.emulateMedia({ forcedColors: "active" });
        expect((await artworkGeometry(page)).backdrops, "Forced colors removes decorative artwork").toEqual([]);
        if (route === "hackathon") await expectTechnologyHidden(page);
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
        if (route === "hackathon") await expectHackathonTechnology(page, width, locale);
      });
    }
  }

  test(`${locale} hackathon keeps only the field study when the hero becomes one column`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1000, height: 1000 });
    await page.goto(`/${locale}/hackathon`);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1000, 1001]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectSafeGeometry(page, width, locale);
      await expectHackathonTechnology(page, width, locale);
    }
    await page.emulateMedia({ forcedColors: "active" });
    await expectTechnologyHidden(page);
  });
}
