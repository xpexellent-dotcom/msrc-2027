import { expect, type Page } from "@playwright/test";

/** Scroll a tall opening to its last row, as a reader does, before pointer activation. */
export async function prepareHeroCue(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero-scroll-stage")).toHaveAttribute("data-hold-ready", "true");
  await page.locator(".conference-hero").evaluate((hero) => {
    window.scrollTo({ top: Math.max(0, hero.getBoundingClientRect().height - window.innerHeight), behavior: "instant" });
  });
  const cue = page.locator('.hero-scroll[href="#essentials"]');
  await expect(cue).toBeInViewport({ ratio: 1 });
  await expect.poll(() => cue.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit !== null && element.contains(hit);
  }), { message: "The visible hero cue receives a real pointer hit above the rising sheet." }).toBe(true);
  return cue;
}

export async function clickHeroCue(page: Page) {
  const cue = await prepareHeroCue(page);
  await cue.click();
}
