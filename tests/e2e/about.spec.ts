import { languageLink } from "./helpers/header-navigation";
import { expect, test } from "@playwright/test";

// ENG-023 explicitly retires About. General shell coverage moves to Participate;
// the removed route must not silently redirect or reappear in public navigation.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} About is removed and no public shell link advertises it`, async ({ page, request }) => {
    const removed = await request.get(`/${locale}/about`, { maxRedirects: 0 });
    expect(removed.status()).toBe(404);
    await page.goto(`/${locale}`);
    await expect(page.locator('a[href$="/about"]')).toHaveCount(0);
    if (await page.locator(".menu-toggle").isVisible()) await page.locator(".menu-toggle").click();
    const nav = page.locator(await page.locator(".menu-toggle").isVisible() ? ".mobile-menu nav" : ".desktop-nav");
    await expect(nav.locator("a").first()).toHaveAttribute("href", `/${locale}/participate`);
    await expect(nav.locator(`a[href="/${locale}/contact"]`)).toBeVisible();
    await expect(nav.locator('a[href*="program?"]')).toHaveCount(0);
    await expect(page.locator('a[href$="/about"]')).toHaveCount(0);
  });
}

test("Participate keyboard and language navigation preserve page, query and section", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/participate?view=editorial");
  await page.keyboard.press("Tab");
  const skip = page.locator('a[href="#main-content"]');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  expect(await skip.evaluate((element) => {
    const outline = getComputedStyle(element);
    return outline.outlineStyle !== "none" && parseFloat(outline.outlineWidth) >= 2;
  })).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.goto("/en/participate?view=editorial#three-minute-thesis");
  const arabic = await languageLink(page, "View this page in Arabic");
  await arabic.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar\/participate\?view=editorial#three-minute-thesis$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#three-minute-thesis")).toBeInViewport();
  const english = await languageLink(page, "View this page in English");
  await english.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/participate\?view=editorial#three-minute-thesis$/);
  await expect(page.locator("#three-minute-thesis")).toBeInViewport();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});