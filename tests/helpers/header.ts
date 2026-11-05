import { expect, type Page } from "@playwright/test";

/**
 * The public header compacts while reading down (ENG-028): its purple capsule and
 * centre links fade over 220ms. A programmatic scroll just before axe (focus moved
 * to a status, a preview opening) can catch that fade mid-way, where ivory text sits
 * on a partly transparent capsule. Axe should judge the settled header, so wait for
 * its transitions to finish. Pages without the public header pass immediately.
 */
export async function expectHeaderSettled(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector(".axiom-header");
    if (!header) return 0;
    return header.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length;
  }), { message: "Public header transitions must settle before axe" }).toBe(0);
}
