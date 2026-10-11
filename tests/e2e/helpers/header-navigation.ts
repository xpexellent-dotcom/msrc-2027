import { expect, type Page } from "@playwright/test";

/** A reader brings the compact desktop navigation back by scrolling upward. */
export async function revealDesktopHeader(page: Page) {
  const header = page.locator(".axiom-header");
  // A fill can scroll before the header's rAF observes it, while an anchor can
  // still be scrolling smoothly. Observe the resting position across rendering
  // frames before reversing direction; data-compact alone can be stale.
  const scrollY = await page.evaluate(() => new Promise<number>((resolve) => {
    let previousY = window.scrollY;
    let restingFrames = 0;
    const observe = () => {
      const y = window.scrollY;
      restingFrames = y === previousY ? restingFrames + 1 : 0;
      previousY = y;
      if (restingFrames >= 2) resolve(y);
      else requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  }));
  if (scrollY > 0) {
    // Wheel over the page's top edge, away from nested form or catalogue scrollers.
    // Pointer proximity itself must never reopen the compact navigation.
    await page.mouse.move((page.viewportSize()?.width ?? 1280) / 2, 8);
    await page.mouse.wheel(0, -160);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(scrollY);
  }
  await expect(header).toHaveAttribute("data-compact", "false");
  await expect(header.locator(".header-middle")).toHaveCSS("opacity", "1");
}

/** Language is directly available in the phone header and in the full desktop bar. */
export async function languageLink(page: Page, name: string) {
  const toggle = page.locator(".menu-toggle");
  if (!await toggle.isVisible()) await revealDesktopHeader(page);
  return page.getByRole("link", { name, exact: true });
}
