import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sponsorBeltCopy } from "../../src/content/sponsor-belt";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} preview belt is illustrative and pauses on hover, touch and off-screen`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const copy = sponsorBeltCopy[locale];
    const belt = page.locator(".sponsor-belt");
    await expect(belt).toHaveAccessibleName(copy.caption);
    await expect(belt.locator(".belt-caption")).toHaveText(copy.caption);
    const groups = belt.locator(".belt-group");
    await expect(groups).toHaveCount(2);
    for (const group of await groups.all()) {
      await expect(group).toHaveAttribute("aria-hidden", "true");
      await expect(group.locator(".belt-item")).toHaveCount(8);
      expect(await group.locator(".belt-item > span").allTextContents()).toEqual(Array(8).fill(copy.placeholder));
    }
    await expect(groups.nth(1)).toHaveJSProperty("inert", true);
    await expect(belt.getByRole("button")).toHaveCount(0);
    const track = belt.locator(".belt-track");
    await belt.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(belt).toHaveClass(/is-visible/);
    await expect(track).toHaveCSS("animation-name", locale === "ar" ? "belt-rtl" : "belt-ltr");
    await expect(track).toHaveCSS("animation-play-state", "running");
    await belt.locator(".belt-window").hover();
    await expect(track).toHaveCSS("animation-play-state", "paused");
    await page.mouse.move(0, 0);
    await expect(track).toHaveCSS("animation-play-state", "running");
    await belt.locator(".belt-window").dispatchEvent("touchstart");
    await expect(track).toHaveCSS("animation-play-state", "paused");
    await belt.locator(".belt-window").dispatchEvent("touchend");
    await expect(track).toHaveCSS("animation-play-state", "running");
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await expect(belt).not.toHaveClass(/is-visible/);
    await expect(track).toHaveCSS("animation-play-state", "paused");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await page.locator(".conference-hero .flow-ribbon").evaluate((element) => getComputedStyle(element).getPropertyValue("--ribbon-end").trim().toLowerCase())).toBe("#f8f6f0");
  });

  test(`${locale} preview belt is static under reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const belt = page.locator(".sponsor-belt");
    await belt.scrollIntoViewIfNeeded();
    await expect(belt.locator(".belt-track")).toHaveCSS("animation-name", "none");
    await expect(belt.locator(".belt-group").nth(1)).toHaveCSS("display", "none");
    await expect(belt.locator(".icon-button")).toBeHidden();
    await expect(belt.locator(".belt-caption")).toBeVisible();
    await expect(belt.locator(".belt-group").first().locator(".sparkle").first()).toBeHidden();
    const rows = await belt.locator(".belt-group").first().locator(".belt-item").evaluateAll((items) => new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size);
    expect(rows).toBeLessThanOrEqual(4);
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await belt.locator(".belt-group").first().locator(".belt-item").evaluateAll((items) => new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size)).toBeLessThanOrEqual(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test(`${locale} preview social placeholders are visible and add no keyboard stop`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const social = page.locator("ul.hero-social");
    await expect(social).toHaveAttribute("aria-hidden", "true");
    await expect(social.locator("span.social-item--placeholder")).toHaveCount(4);
    await expect(social.locator("a")).toHaveCount(0);
    await expect(social.locator(".social-soon > span")).toHaveText(locale === "en" ? "Soon" : "\u0642\u0631\u064a\u0628\u064b\u0627");
    expect(await social.locator("span.social-item--placeholder").evaluateAll((elements) => elements.every((element) => (element as HTMLElement).tabIndex === -1))).toBe(true);
    const edge = await page.locator(".hero-actions a").last().boundingBox();
    const socialBox = await social.boundingBox();
    const tops = await social.locator(":scope > li").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(12);
    expect(Math.abs(locale === "ar" ? socialBox!.x + socialBox!.width - edge!.x - edge!.width : socialBox!.x - edge!.x)).toBeLessThanOrEqual(1);
    await page.locator(".hero-actions a").last().focus();
    await page.keyboard.press("Tab");
    await expect(page.locator(".pathway-action").first()).toBeFocused();
  });

  test(`${locale} preview decorative regions remain accessible`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page }).include(".sponsor-belt").include(".hero-social")
      .withTags(["wcag2a", "wcag2aa", "best-practice"]).analyze();
    expect(result.violations).toEqual([]);
  });
}
