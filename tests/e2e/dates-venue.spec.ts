import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// SCP-02 / CFG-01 / TIM-01 / LOC-01 / ACC-01:
// approved calendar days must not invent a venue, event time or workflow opening.
const copy = {
  en: {
    title: "Dates & venue | MSRC 2027", heading: "Two days in Jeddah.",
    first: "27 January 2027", second: "28 January 2027", pending: "Awaiting confirmation",
    city: "Jeddah, Saudi Arabia", closed: "Registration not open yet",
    breadcrumb: "Breadcrumb", home: "Home", footer: "Dates & venue",
  },
  ar: {
    title: "المواعيد والمقر | MSRC 2027", heading: "يومان في جدة.",
    first: "٢٧ يناير ٢٠٢٧", second: "٢٨ يناير ٢٠٢٧", pending: "بانتظار التأكيد",
    city: "جدة، المملكة العربية السعودية", closed: "لم يُفتح التسجيل بعد",
    breadcrumb: "مسار التنقل", home: "الرئيسية", footer: "المواعيد والمقر",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  test(`${locale} Dates and Venue show approved days, honest pending details and accessible layout`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });

    const response = await page.goto(`/${locale}/dates-venue`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(copy[locale].title);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[locale].heading);
    await expect(page.locator('time[datetime="2027-01-27"]')).toHaveText(copy[locale].first);
    await expect(page.locator('time[datetime="2027-01-28"]')).toHaveText(copy[locale].second);
    await expect(page.locator("time")).toHaveCount(2);
    await expect(page.locator(".dates-location-details")).toContainText(copy[locale].city);
    await expect(page.locator(".dates-location-details")).toContainText(copy[locale].pending);
    await expect(page.locator(".dates-note")).toHaveCount(0);
    await expect(page.locator(".dates-closed-note")).toContainText(copy[locale].closed);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.getByRole("main")).not.toContainText(/King Faisal Conference Center|مركز الملك فيصل|09:00|9:00 AM/);
    await expect(page.locator('a[href*="/api/workflows/"], a[href*="/payment"], a[href*="maps"]')).toHaveCount(0);
    await expect(page.locator("form, input, textarea, select, iframe, video")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.msrc2027.com/${locale}/dates-venue`);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://www.msrc2027.com/en/dates-venue");
    await expect(page.locator('link[hreflang="ar"]')).toHaveAttribute("href", "https://www.msrc2027.com/ar/dates-venue");

    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    await testInfo.attach(`${locale}-dates-accessibility`, {
      body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2),
      contentType: "application/json",
    });
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    const assertReadable = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
      const clipping = await page.locator("main h1, main h2:not(.sr-only), main time").evaluateAll((elements) => elements.some((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
      }));
      expect(clipping).toBe(false);
    };
    await assertReadable();
    await testInfo.attach(`${locale}-dates-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    if (testInfo.project.name === "chromium-mobile") {
      await page.setViewportSize({ width: 320, height: 850 });
      await assertReadable();
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await assertReadable();
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });

    await page.getByRole("navigation", { name: copy[locale].breadcrumb })
      .getByRole("link", { name: copy[locale].home, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    const footerDates = page.getByRole("contentinfo").getByRole("link", { name: copy[locale].footer, exact: true });
    await expect(footerDates).toHaveAttribute("href", `/${locale}/dates-venue`);
    await footerDates.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue$`));
    await page.getByRole("main").locator('a[href$="#program"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/?#program$`));
    await expect(page.locator("#program")).toBeInViewport();
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
    if (locale === "en") expect((await page.request.get("/fr/dates-venue")).status()).toBe(404);
  });
}

test("Dates and Venue keyboard and language navigation preserve the section and reduced-motion behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/dates-venue?view=planning");
  await page.keyboard.press("Tab");
  const skip = page.locator('a[href="#main-content"]');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  expect(await skip.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.goto("/en/dates-venue?view=planning#venue");
  const arabic = page.getByRole("link", { name: "View this page in Arabic" });
  await arabic.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar\/dates-venue\?view=planning#venue$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#venue")).toBeInViewport();
  const english = page.getByRole("link", { name: "View this page in English" });
  await english.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/dates-venue\?view=planning#venue$/);
  await expect(page.locator("#venue")).toBeInViewport();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});
