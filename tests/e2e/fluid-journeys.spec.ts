import { expect, test } from "@playwright/test";

const routes = [
  ["registration", "attend-majed-9744.jpg", 4],
  ["submissions", "share-research-manar-2560.jpg", 6],
  ["workshops", "share-research-manar-2560.jpg", 4],
  ["hackathon", "build-idea-majed-9846.jpg", 6],
  ["3mt", "gallery-presentation.jpg", 3],
] as const;

for (const locale of ["en", "ar"] as const) {
  test(`${locale} photographic paths keep complete requirements and truthful closed actions`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    for (const [route, image, count] of routes) {
      expect((await page.goto(`/${locale}/${route}`))?.status()).toBe(200);
      await expect(page.locator(".premium-hero-image img")).toHaveAttribute("src", new RegExp(image.replace(".", "\\.")));
      await expect(page.locator(".premium-hero-image img")).toHaveAttribute("alt", "");
      await expect(page.locator(".fluid-requirement-card")).toHaveCount(count);
      await expect(page.locator(".journey-steps, .journey-next")).toHaveCount(0);
      await expect(page.getByTestId("journey-closed")).toBeVisible();
      await expect(page.locator(".fluid-resource-grid a[href$='#faq']")).toHaveAttribute("href", `/${locale}#faq`);
      await expect(page.locator("main form, main input, main textarea, main button[type=submit]")).toHaveCount(0);
    }
    await page.goto(`/${locale}/submissions`);
    const submit = page.locator(".fluid-journey-hero-actions a");
    await expect(submit).toHaveText(locale === "en" ? "Submit your abstract" : "قدّم ملخصك البحثي");
    await submit.click();
    await expect(page).toHaveURL(/#journey-availability$/);
    await expect(page.getByTestId("journey-closed")).toBeInViewport();
    await expect(page.locator("#journey-availability")).toBeFocused();
    await expect(page.locator(".journey-guidelines")).toContainText(locale === "en" ? "300" : "٣٠٠");
    await expect(page.locator(".journey-guidelines")).toContainText(locale === "en" ? "A supervisor is required only after selection" : "يُطلب المشرف فقط بعد اختيار");
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("ticket-unavailable")).toBeDisabled();
    await expect(page.getByTestId("brochure-unavailable")).toBeDisabled();
    expect(writes).toEqual([]);
  });

  test(`${locale} workshop placeholders are a keyboard-accessible native rail and paths reflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Explicit narrow viewport matrix runs once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 844 });
    for (const [route] of routes) {
      await page.goto(`/${locale}/${route}`);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(320);
      const clippedText = await page.locator(".fluid-requirement-card h3, .fluid-requirement-card p, .fluid-resource p").evaluateAll((nodes) => nodes.some((node) => {
        const range = document.createRange(); range.selectNodeContents(node);
        return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
      }));
      expect(clippedText, route).toBe(false);
    }
    await page.goto(`/${locale}/workshops`);
    const rail = page.locator(".fluid-workshop-rail .rail-track");
    await expect(rail).toHaveAttribute("tabindex", "0");
    await expect(page.locator(".fluid-workshop-card")).toHaveCount(3);
    await expect(page.locator(".fluid-workshop-card img")).toHaveCount(0);
    await expect(page.getByTestId("workshops-empty")).toBeVisible();
    await rail.focus();
    await expect(rail).toBeFocused();
    const next = page.locator(".fluid-workshop-rail .rail-buttons button").last();
    await next.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => rail.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
  });
}
