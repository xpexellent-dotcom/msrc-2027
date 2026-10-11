import { expect, test, type Page } from "@playwright/test";

const routes = ["registration", "submissions", "workshops", "hackathon", "3mt"] as const;

async function readCard(page: Page, route: string) {
  await page.locator(`#pathway-${route}`).evaluate((card) => {
    window.scrollTo({ top: window.scrollY + card.getBoundingClientRect().top - window.innerHeight * .3, behavior: "instant" });
  });
  await expect(page.locator(`.pathway-track-link[href='#pathway-${route}']`)).toHaveAttribute("aria-current", "location");
  await expect(page.locator(".pathway-track-link[aria-current='location']")).toHaveCount(1);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} track index follows every card down and back up without altering the URL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Sticky desktop reading index; mobile anchor behavior is covered separately.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator(".pathway-track-link")).toHaveCount(5);
    for (const route of routes) await readCard(page, route);
    for (const route of [...routes].reverse()) await readCard(page, route);
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    await expect(page.locator(".pathways-introduction")).toHaveCSS("position", "sticky");
    await readCard(page, "submissions");
    const before = await page.locator(".pathways-introduction").boundingBox();
    await readCard(page, "workshops");
    const after = await page.locator(".pathways-introduction").boundingBox();
    expect(Math.abs((before?.y ?? 0) - (after?.y ?? 0))).toBeLessThan(2);
    expect(await page.locator(".pathway-track-link[aria-current='location'] .pathway-track-label").evaluate((label) => getComputedStyle(label).textDecorationLine)).toContain("underline");
  });

  test(`${locale} track anchors move keyboard focus directly to the requested card`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const target = page.locator(".pathway-track-link[href='#pathway-hackathon']");
    await target.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#pathway-hackathon$/);
    await expect(page.locator("#pathway-hackathon")).toBeFocused();
    await expect(page.locator("#pathway-hackathon")).toBeInViewport();
    await expect(target).toHaveAttribute("aria-current", "location");
    await expect(target).toHaveCSS("transition-duration", "0s");
    await expect(page.locator("#pathway-hackathon .pathway-action")).toHaveAttribute("href", `/${locale}/hackathon`);
  });

  test(`${locale} narrow doubled-text index stays in normal flow and preserves all five links`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Explicit narrow reflow matrix runs once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto(`/${locale}`);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".pathways-introduction")).toHaveCSS("position", "static");
    await expect(page.locator(".pathway-track-link")).toHaveCount(5);
    const outside = await page.locator(".pathway-track-label").evaluateAll((labels) => labels.some((label) => {
      const range = document.createRange(); range.selectNodeContents(label);
      return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
    }));
    expect(outside).toBe(false);
    const target = page.locator(".pathway-track-link[href='#pathway-3mt']");
    await target.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#pathway-3mt")).toBeFocused();
    await expect(target).toHaveAttribute("aria-current", "location");
  });
}
