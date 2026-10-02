import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// ORG-009: below 1100px the in-flow chapter index scrolls away, so a floating pill follows the
// reader and opens the chapters in a side panel. Desktop keeps the sticky index without the pill.
const sections = { en: { participate: "Participation", program: "Programme" }, ar: { participate: "المشاركة", program: "البرنامج" } } as const;

for (const locale of ["en", "ar"] as const) {
  test(`${locale} chapter navigation stays at hand while reading`, async ({ page }) => {
    await page.goto(`/${locale}`);
    // The live countdown marks hydration; before it the pill has no scroll state yet.
    await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before");
    const pill = page.locator(".chapter-dock-toggle");

    if ((page.viewportSize()?.width ?? 0) >= 1100) {
      await expect(page.locator(".chapter-dock")).toBeHidden();
      await page.evaluate(() => document.getElementById("participate")!.scrollIntoView({ block: "start" }));
      await expect(page.locator(".section-journey")).toBeInViewport();
      return;
    }

    await expect(pill).toBeHidden();
    await page.evaluate(() => document.getElementById("participate")!.scrollIntoView({ block: "start" }));
    await expect(pill).toBeVisible();
    await expect(pill).toContainText(sections[locale].participate);

    await pill.click();
    const sheet = page.locator("#chapter-sheet");
    await expect(sheet).toBeVisible();
    await expect(pill).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#chapter-sheet-title")).toBeFocused();
    await expect(sheet.locator('a[aria-current="location"]')).toHaveAttribute("href", "#participate");
    // The panel slides from the inline end: right in English, left in Arabic.
    expect(await sheet.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left < 2 ? "left" : box.right > innerWidth - 2 ? "right" : "middle";
    })).toBe(locale === "ar" ? "left" : "right");
    expect((await new AxeBuilder({ page }).include("#chapter-sheet").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(pill).toBeFocused();

    await pill.click();
    await sheet.locator('a[href="#program"]').click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/${locale}#program$`));
    await expect(page.locator("#program")).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.querySelector("#program h2")!.getBoundingClientRect().top
      - document.querySelector(".site-header")!.getBoundingClientRect().bottom)).toBeGreaterThan(0);
    await expect(pill).toContainText(sections[locale].program);

    // The pill leaves with the last chapter, clear of the footer.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(pill).toBeHidden();
  });
}
