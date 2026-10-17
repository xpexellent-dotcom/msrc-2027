import { expect, test } from "@playwright/test";
import { prepareHeroCue } from "./helpers/hero-navigation";

// MED-01/02, ACC-01, LOC-01/03: exercise the previously intercepted central
// film surface, not just the uncovered eight-pixel gutter.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} empty hero space pauses the film while copy and links stay usable`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    const video = page.locator(".conference-hero video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    const point = await page.evaluate(() => {
      const header = document.querySelector(".site-header")!.getBoundingClientRect();
      const hero = document.querySelector(".conference-hero")!.getBoundingClientRect();
      const copy = document.querySelector(".hero-editorial")!.getBoundingClientRect();
      const top = Math.max(header.bottom, hero.top);
      const bottom = Math.min(copy.top, hero.bottom, window.innerHeight);
      return { x: document.documentElement.clientWidth / 2, y: (top + bottom) / 2, emptyHeight: bottom - top };
    });
    // Exercise the visible open film above the poster copy, never a header or text target.
    expect(point.emptyHeight).toBeGreaterThan(16);
    const phone = (page.viewportSize()?.width ?? 1280) <= 700;
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.classList.contains("hero-media-toggle"), point)).toBe(!phone);
    for (const paused of [true, false]) {
      if (isMobile) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(phone ? false : paused);
    }
    const heading = page.locator("#hero-title");
    await expect(heading).toHaveCSS("pointer-events", "auto");
    if (!isMobile) {
      const line = heading.locator("span").last();
      // Each line spans the heading's width. Its centre can be blank beside shorter
      // RTL text, so double-click a rendered word while still exercising native selection.
      const wordPoint = await line.evaluate((element) => {
        const text = element.firstChild as Text;
        const word = text.data.match(/\S+/)!;
        const range = document.createRange();
        range.setStart(text, word.index!);
        range.setEnd(text, word.index! + word[0].length);
        const wordBounds = range.getBoundingClientRect();
        const lineBounds = element.getBoundingClientRect();
        return {
          x: wordBounds.left + wordBounds.width / 2 - lineBounds.left,
          y: wordBounds.top + wordBounds.height / 2 - lineBounds.top,
        };
      });
      await line.dblclick({ position: wordPoint });
      expect(await page.evaluate(() => window.getSelection()?.toString().trim().length)).toBeGreaterThan(0);
      expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    }
    // Read the tall sticky hero through its final row before activating its CTA.
    // Generic centering can scroll its covering content sheet over the pinned link.
    if (!isMobile) await prepareHeroCue(page);
    const action = page.locator(".hero-actions a").first();
    await expect(action).toBeInViewport({ ratio: 1 });
    await expect.poll(() => action.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit !== null && element.contains(hit);
    }), { message: "The visible registration link receives a real pointer hit." }).toBe(true);
    await action.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/participate$`));
  });

  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`${locale} film recovery remains centred through ${reducedMotion} interaction`, async ({ page, isMobile }) => {
      // Save-data gives both motion preferences the same deliberate Play entry.
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: Object.assign(new EventTarget(), { saveData: true, effectiveType: "4g" }),
        });
      });
      await page.emulateMedia({ reducedMotion });
      await page.goto(`/${locale}#film`);
      const start = page.locator(".cinematic-start");
      await expect(start).toBeVisible();
      await expect(page.locator(".conference-hero video")).toHaveCount(0);
      async function expectCentred() {
        const bounds = await start.boundingBox();
        const viewport = page.viewportSize()!;
        expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThan(2);
        expect(Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2)).toBeLessThan(2);
      }
      await expectCentred();
      if (isMobile) await start.tap();
      else {
        await start.hover();
        await expectCentred();
        await page.mouse.down();
        await expectCentred();
        await page.mouse.up();
      }
      const video = page.locator(".conference-hero video");
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
      await expect(start).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("main")).toBeFocused();
      await expect(page.locator(".conference-hero video")).toHaveCount(0);
    });
  }
}
