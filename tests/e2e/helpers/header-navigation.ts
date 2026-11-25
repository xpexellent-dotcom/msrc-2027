import { expect, type Page } from "@playwright/test";

/** The wide public navigation becomes available again on upward scroll. */
export async function revealDesktopHeader(page: Page) {
  const header = page.locator(".axiom-header");
  // An anchor or form fill can still be moving when a navigation click is next.
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
  if (scrollY >= 160 && await header.getAttribute("data-compact") === "true") {
    await page.mouse.move((page.viewportSize()?.width ?? 1280) / 2, 8);
    await page.mouse.wheel(0, -160);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(scrollY);
  }
  await expect(header).not.toHaveAttribute("data-compact");
  await expect(header.locator(".header-middle")).toHaveCSS("opacity", "1");
}

/** Language is directly available in the phone header and in the full desktop bar. */
export async function languageLink(page: Page, name: string) {
  const toggle = page.locator(".menu-toggle");
  if (!await toggle.isVisible()) await revealDesktopHeader(page);
  return page.getByRole("link", { name, exact: true });
}
