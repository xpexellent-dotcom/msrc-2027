import { mkdirSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

/** Viewport evidence avoids Chrome's tall mobile fullPage raster limit. */
export async function captureAbstractViews(page: Page, project: string, locale: string, stage: string, targets: readonly [string, string][] = []) {
  mkdirSync(".tools/abstract-page/screenshots", { recursive: true });
  if (project.includes("mobile")) for (const [name, selector] of targets) {
    const target = page.locator(selector).first();
    await target.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 100, behavior: "instant" }));
    await expect(target).toBeInViewport();
    await page.screenshot({ path: `.tools/abstract-page/screenshots/${project}-${locale}-${stage}-${name}.png`, scale: "css", animations: "disabled" });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: `.tools/abstract-page/screenshots/${project}-${locale}-${stage}.png`, fullPage: !project.includes("mobile"), scale: "css", animations: "disabled" });
}
