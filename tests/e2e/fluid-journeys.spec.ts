import { expect, test } from "@playwright/test";

const routes = [
  ["registration", "attend-majed-9744.jpg", 5],
  ["workshops", "learn-doing-manar-2529.jpg", 4],
  ["hackathon", "build-idea-majed-9846.jpg", 4],
  ["3mt", "gallery-presentation.jpg", 2],
] as const;

for (const locale of ["en", "ar"] as const) {
  test(`${locale} photographic paths show benefits, simple steps and truthful closed actions`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    for (const [route, image, count] of routes) {
      expect((await page.goto(`/${locale}/${route}`))?.status()).toBe(200);
      await expect(page.locator(".premium-hero-image img")).toHaveAttribute("src", new RegExp(image.replace(".", "\\.")));
      await expect(page.locator(".premium-hero-image img")).toHaveAttribute("alt", "");
      await expect(page.locator(".participation-benefit")).toHaveCount(count);
      // ORG-054: the date/edition/venue block appears only on Participate and Attend.
      await expect(page.locator(".experience-location")).toHaveCount(route === "registration" ? 1 : 0);
      expect(await page.locator(".participation-steps li").count()).toBeGreaterThanOrEqual(3);
      await expect(page.locator(".journey-steps, .journey-next")).toHaveCount(0);
      await expect(page.getByTestId("journey-closed")).toBeVisible();
      await expect(page.locator(".fluid-resource-grid a[href$='#faq']")).toHaveAttribute("href", `/${locale}#faq`);
      await expect(page.locator("main form, main input, main textarea, main button[type=submit]")).toHaveCount(0);
    }
    // ORG-054: two distinct hackathon tracks and the two-day format.
    await page.goto(`/${locale}/hackathon`);
    const tracks = page.locator(".participation-track");
    await expect(tracks).toHaveCount(2);
    await expect(tracks.locator("h3")).toHaveText(locale === "en" ? ["Evidence to Impact", "Research Reimagined"] : ["من الدليل إلى الأثر", "البحث برؤية جديدة"]);
    for (const title of await tracks.locator("h3").all()) { await expect(title).toHaveAttribute("lang", locale); await expect(title).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); }
    await expect(page.locator(".participation-schedule-day")).toHaveText(locale === "en" ? ["Day 1", "Day 2"] : ["اليوم الأول", "اليوم الثاني"]);
    await expect(page.locator(".participation-schedule-list h3")).toHaveText(locale === "en" ? ["Mentoring", "Pitching and judging"] : ["الإرشاد", "العرض والتحكيم"]);
    await page.goto(`/${locale}/abstracts`);
    await expect(page.locator(".research-hero-photo")).toHaveAttribute("src", /share-research-manar-2560/);
    await expect(page.locator(".research-guidelines li")).toHaveCount(6);
    await expect(page.locator(".research-word-limit")).toContainText(locale === "en" ? "350" : "٣٥٠");
    await expect(page.locator(".research-submission-cta")).toHaveCount(2);
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("ticket-unavailable")).toBeDisabled();
    await expect(page.getByTestId("brochure-unavailable")).toBeDisabled();
    expect(writes).toEqual([]);
  });

  test(`${locale} large workshop covers keep the native keyboard rail and narrow reflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Explicit narrow viewport matrix runs once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [route] of routes) {
      const width = route === "3mt" ? 280 : 320;
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${locale}/${route}`);
      await expect(page.locator(".site-header")).toHaveAttribute("data-header-ready", "true");
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
      const clippedText = await page.locator(".participation-benefit h3, .participation-benefit p, .participation-steps p, .fluid-resource p, .fluid-journey-availability h2, .fluid-journey-availability p").evaluateAll((nodes) => nodes.some((node) => {
        const range = document.createRange(); range.selectNodeContents(node);
        return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
      }));
      expect(clippedText, route).toBe(false);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/${locale}/workshops`);
    const rail = page.locator(".fluid-workshop-rail .rail-track");
    await expect(rail).toHaveAttribute("tabindex", "0");
    const cards = page.locator(".fluid-workshop-card");
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      const cover = card.locator(".fluid-workshop-image");
      await expect(cover).toHaveAttribute("aria-hidden", "true");
      await expect(cover.locator("img")).toHaveAttribute("src", /19-workshops\.webp/);
      const frame = (await cover.boundingBox())!;
      expect(frame.width).toBeGreaterThanOrEqual(235);
      expect(frame.height).toBeGreaterThanOrEqual(145);
      expect(frame.width / frame.height).toBeCloseTo(1.6, 1);
    }
    await expect(page.getByTestId("workshops-empty")).toBeVisible();
    await rail.focus();
    await expect(rail).toBeFocused();
    const next = page.locator(".fluid-workshop-rail .rail-buttons button").last();
    await next.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => rail.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
  });
}
