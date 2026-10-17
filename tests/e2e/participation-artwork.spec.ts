import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const routes = ["registration", "submissions", "workshops", "hackathon", "3mt"] as const;
const locales = ["en", "ar"] as const;
const screenshotDirectory = ".tools/participation-artwork/after";

// DSN-01/02, LOC-01/03, ACC-01: decoration must occupy genuinely unused
// space. Compare rendered boxes and text fragments, rather than reproducing
// the artwork's CSS placement formula or trusting a translucent mask.
async function artworkGeometry(page: Page) {
  return page.evaluate(() => {
    type Box = { left: number; right: number; top: number; bottom: number };
    const describe = (element: Element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}.${Array.from(element.classList).join(".")}`;
    const intersects = (a: Box, b: Box) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    // Full-page evidence includes below-fold content. Clip to real overflow
    // ancestors and the horizontal viewport, but not to the viewport's height.
    const paintedBox = (rect: DOMRect, element: Element): Box | null => {
      const box = { left: Math.max(0, rect.left), right: Math.min(document.documentElement.clientWidth, rect.right), top: rect.top, bottom: rect.bottom };
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0) return null;
        const bounds = ancestor.getBoundingClientRect();
        if (/hidden|clip|scroll|auto/.test(style.overflowX)) {
          box.left = Math.max(box.left, bounds.left);
          box.right = Math.min(box.right, bounds.right);
        }
        if (/hidden|clip|scroll|auto/.test(style.overflowY) && ancestor !== document.documentElement && ancestor !== document.body) {
          box.top = Math.max(box.top, bounds.top);
          box.bottom = Math.min(box.bottom, bounds.bottom);
        }
      }
      return box.right > box.left && box.bottom > box.top ? box : null;
    };
    const protectedBoxes: { label: string; box: Box }[] = [];
    const main = document.querySelector("main")!;
    const textNodes = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (textNodes.nextNode()) {
      const node = textNodes.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || parent.closest("svg, script, style, .journey-art-slot")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        const box = paintedBox(rect, parent);
        if (box) protectedBoxes.push({ label: `${describe(parent)}: ${node.textContent.trim().slice(0, 70)}`, box });
      }
    }
    const protectedSurfaces = ".participation-benefit, .participation-good-to-know, .participation-track, .participation-schedule-list li, .fluid-resource, .fluid-workshop-card, .participation-steps li, a, button, input, select, textarea";
    for (const element of main.querySelectorAll(protectedSurfaces)) {
      const box = paintedBox(element.getBoundingClientRect(), element);
      if (box) protectedBoxes.push({ label: describe(element), box });
    }
    const slots = Array.from(main.querySelectorAll(".journey-art-slot")).flatMap((element) => {
      const box = paintedBox(element.getBoundingClientRect(), element);
      const svg = element.querySelector(".journey-art");
      if (!box || !svg || !paintedBox(svg.getBoundingClientRect(), svg)) return [];
      const container = element.closest("section")?.querySelector(":scope > .site-container");
      const containerBox = container?.getBoundingClientRect();
      const copyBox = element.closest(".participation-heading")?.querySelector(".participation-heading-copy")?.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      const startSide = element.classList.contains("journey-art-slot--start");
      const endSide = element.classList.contains("journey-art-slot--end") || element.classList.contains("journey-art-slot--mobile");
      const wrongDirection = (startSide && (rtl ? box.left < document.documentElement.clientWidth / 2 : box.right > document.documentElement.clientWidth / 2))
        || (endSide && (rtl ? box.right > document.documentElement.clientWidth / 2 : box.left < document.documentElement.clientWidth / 2))
        || Boolean(copyBox && (rtl ? box.right > copyBox.left + 1 : box.left < copyBox.right - 1));
      return [{
        label: describe(element), box,
        margin: element.classList.contains("journey-art-slot--margin"),
        mobile: element.classList.contains("journey-art-slot--mobile"),
        overlaps: protectedBoxes.filter((target) => intersects(box, target.box)),
        intrudesOnContainer: Boolean(element.classList.contains("journey-art-slot--margin") && containerBox && intersects(box, containerBox)),
        wrongDirection,
        pointerEvents: getComputedStyle(element).pointerEvents,
      }];
    });
    return {
      slots,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      direction: document.documentElement.dir,
    };
  });
}

async function expectSafeGeometry(page: Page, width: number, locale: string) {
  const geometry = await artworkGeometry(page);
  expect(geometry.direction).toBe(locale === "ar" ? "rtl" : "ltr");
  expect(geometry.overflow, "Decorative edges must not create horizontal scrolling").toBeLessThanOrEqual(0);
  expect(geometry.slots.filter((slot) => slot.overlaps.length), "Artwork must not cross text, card surfaces, or controls").toEqual([]);
  expect(geometry.slots.filter((slot) => slot.intrudesOnContainer), "Margin artwork must stay outside the actual content container").toEqual([]);
  expect(geometry.slots.filter((slot) => slot.wrongDirection), "Artwork mirrors its placement with the reading direction").toEqual([]);
  expect(geometry.slots.filter((slot) => slot.pointerEvents !== "none")).toEqual([]);
  if (width < 900) {
    expect(geometry.slots.length, "Phone artwork stays quiet across the whole page").toBeLessThanOrEqual(1);
    expect(geometry.slots.every((slot) => slot.mobile)).toBe(true);
  } else {
    expect(geometry.slots.length, "Desktop artwork is distributed across sections").toBeGreaterThanOrEqual(3);
    const marginSlots = geometry.slots.filter((slot) => slot.margin);
    if (width >= 1600) {
      expect(marginSlots.some((slot) => slot.box.right <= width / 2), "Wide left margin is used").toBe(true);
      expect(marginSlots.some((slot) => slot.box.left >= width / 2), "Wide right margin is used").toBe(true);
      expect(new Set(marginSlots.map((slot) => Math.round(slot.box.top))).size, "Margin pieces have varied vertical placements").toBeGreaterThanOrEqual(3);
    } else expect(marginSlots, "Narrow desktop margins stay clear").toEqual([]);
  }
}

async function expectStaticDecoration(page: Page) {
  expect(await page.locator(".journey-art-slot, .journey-art-slot *").evaluateAll((elements) => elements.filter((element) => {
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
        expect((await artworkGeometry(page)).slots, "Forced colors removes decorative artwork").toEqual([]);
        expect(errors, "No page exceptions or hydration errors").toEqual([]);
      });
    }

    for (const width of [1600, 2560]) {
      test(`${locale} ${route} artwork stays in real margins at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/${locale}/${route}`);
        await page.evaluate(() => document.fonts.ready);
        await expectSafeGeometry(page, width, locale);
      });
    }
  }
}
