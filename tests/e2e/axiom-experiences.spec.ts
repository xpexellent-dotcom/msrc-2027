import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// DSN-01/02, ACC-01, LOC-01/03, MED-01/04: the local visual demo must
// retain native navigation and honest pending names without photographic roster stand-ins.
for (const locale of ["en", "ar"] as const) {
  const nextName = locale === "ar" ? "التالي" : "Next";
  const previousName = locale === "ar" ? "السابق" : "Previous";

  for (const route of ["speakers"] as const) {
    test(`${locale} ${route} rail supports keyboard controls and native scrolling`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}/${route}`);
      const gallery = page.locator(".speaker-page-preview");
      const track = gallery.getByRole("region");
      const next = gallery.getByRole("button", { name: nextName, exact: true });
      const previous = gallery.getByRole("button", { name: previousName, exact: true });
      await expect(track).toHaveAttribute("tabindex", "0");
      await expect(track).toHaveAttribute("aria-label", /.+/);
      await expect(previous).toBeDisabled();
      await expect(next).toBeEnabled();
      expect(await track.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

      await next.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => track.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(20);
      expect(await track.evaluate((element) => Math.sign(element.scrollLeft))).toBe(locale === "ar" ? -1 : 1);
      await expect(previous).toBeEnabled();

      await previous.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => track.evaluate((element) => Math.abs(element.scrollLeft))).toBeLessThan(2);
      await expect(previous).toBeDisabled();

      // Focusable overflow regions remain scrollable with the browser's own keys.
      await track.focus();
      await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
      await expect.poll(() => track.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(2);
      await expect(track).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      if (route === "speakers") {
        await expect(page.getByTestId("speakers-empty")).toBeVisible();
        await expect(gallery.locator(".portrait-placeholder")).toHaveCount(4);
        await expect(gallery.locator("img, .portrait-provenance, .demo-chip")).toHaveCount(0);
        await expect(gallery.locator(".speaker-preview-content h3")).toHaveText(Array(4).fill(locale === "ar" ? "سيُعلن المتحدث لاحقًا" : "Speaker to be announced"));
      }
    });
  }

  test(`${locale} media archive keeps native vertical navigation through previous editions`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/media`);
    const firstEdition = page.locator('.conference-media-edition[data-edition="2026"]');
    const lastEdition = page.locator('.conference-media-edition[data-edition="2023"]');
    await firstEdition.getByRole("heading", { level: 2 }).scrollIntoViewIfNeeded();
    const start = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(start + 100);
    await page.keyboard.press("End");
    await expect.poll(() => page.evaluate(() => Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight))).toBeLessThan(2);
    expect(await lastEdition.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
    await page.keyboard.press("Home");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test(`${locale} homepage omits sponsor sections and photographic speaker placeholders`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator("main .brand-marquee, main .sponsor-tiers")).toHaveCount(0);
    const speakers = page.locator(".speaker-preview-card");
    expect(await speakers.count()).toBeGreaterThan(0);
    await expect(speakers.locator("img, .demo-chip, .portrait-provenance")).toHaveCount(0);
    await expect(speakers.locator(".portrait-placeholder")).toHaveCount(await speakers.count());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  for (const route of ["team", "sponsors"] as const) {
    test(`${locale} ${route} is accessible`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const response = await page.goto(`/${locale}/${route}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.msrc2027.com/${locale}/${route}`);
      await expect(page.locator(`link[rel="alternate"][hreflang="${locale === "ar" ? "en" : "ar"}"]`)).toHaveAttribute("href", `https://www.msrc2027.com/${locale === "ar" ? "en" : "ar"}/${route}`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      const main = page.getByRole("main");
      await expect(main.locator("form, input, select, textarea")).toHaveCount(0);
      if (route === "team") {
        await page.evaluate(() => document.fonts.ready);
        // ORG-050: two conference leaders, then one row per committee lead (9 scientific, 10 organization).
        await expect(main.locator(".team-leader")).toHaveCount(2);
        await expect(main.locator(".team-committee--scientific .team-row")).toHaveCount(9);
        await expect(main.locator(".team-committee--organization .team-row")).toHaveCount(10);
        await expect(main.locator(".team-photo img")).toHaveCount(8);
        for (const image of await main.locator(".team-photo img").all()) await expect(image).toHaveAttribute("alt", "");
        await expect(main.locator(".team-leader--scientific")).toContainText(locale === "ar" ? "عبدالرحمن إسماعيل مقبول" : "Abdulrahman Ismail Maqbool");
        await expect(main.locator(".team-leader--organization")).toContainText(locale === "ar" ? "فاطمة سالم الفرحة" : "Fatima Salem Alfrhah");
        for (const link of await main.locator(".team-profile").all()) {
          await expect(link).toHaveAttribute("href", /^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+$/);
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
        // Photos open the same profile for pointer users only; the text link is the single keyboard stop.
        await expect(main.locator("a.team-photo--linked")).toHaveCount(await main.locator(".team-profile").count());
        for (const photo of await main.locator("a.team-photo--linked").all()) await expect(photo).toHaveAttribute("tabindex", "-1");
        await expect(main.locator('.people-next a')).toHaveAttribute("href", `/${locale}/participate`);
      } else {
        const tiers = page.getByTestId("sponsor-tiers");
        await expect(tiers.locator(".sponsor-tier")).toHaveCount(3);
        await expect(tiers.locator(".sponsor-brand-word")).toHaveText(Array(6).fill("Brand"));
        await expect(tiers.locator("img, a")).toHaveCount(0);
        const action = main.getByRole("link", { name: locale === "ar" ? "كن راعيًا للمؤتمر" : "Become a sponsor" });
        await expect(action).toHaveAttribute("href", `/${locale}/contact`);
        const actionBox = (await action.boundingBox())!;
        const introBox = (await main.locator(".people-page-intro").boundingBox())!;
        expect(actionBox.height).toBeGreaterThanOrEqual(44);
        expect(actionBox.height).toBeLessThan(90);
        expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(introBox.y + introBox.height);
      }
      await expect(main.locator(".people-demo-notice, .sponsor-demo-notice, .team-portrait-label")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      await testInfo.attach(`${locale}-${route}-accessibility`, { body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2), contentType: "application/json" });
      expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
}
