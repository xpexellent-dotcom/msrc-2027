import { languageLink } from "./helpers/header-navigation";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// SCP-02 / CFG-01 / TIM-01 / LOC-01 / ACC-01:
// ORG-031 confirms the venue; event times and workflow openings stay unset.
const copy = {
  en: {
    title: "Dates & venue | MSRC 2027", heading: "Your way to MSRC.",
    first: "27 January 2027", second: "28 January 2027", venue: "King Faisal Conference Center",
    host: "King Abdulaziz University", closed: "Registration not open yet",
    breadcrumb: "Breadcrumb", home: "Home", footer: "Dates & venue",
  },
  ar: {
    title: "المواعيد والمقر | MSRC 2027", heading: "طريقك إلى المؤتمر.",
    first: "٢٧ يناير ٢٠٢٧", second: "٢٨ يناير ٢٠٢٧", venue: "مركز الملك فيصل للمؤتمرات",
    host: "جامعة الملك عبدالعزيز", closed: "لم يُفتح التسجيل بعد",
    breadcrumb: "مسار التنقل", home: "الرئيسية", footer: "المواعيد والمقر",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  test(`${locale} venue introduces four views and Program keeps exact days unset`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/dates-venue`);
    await expect(page.locator(".dates-calendar")).toHaveCount(0);
    const photos = page.locator(".venue-photo-gallery img");
    await expect(photos).toHaveCount(4);
    await expect(page.locator(".venue-gallery-hero").getByTestId("venue-geographic-map")).toHaveCount(1);
    await expect(page.getByTestId("venue-geographic-map")).toHaveCount(1);
    await expect(photos.first()).toHaveAttribute("alt", /\S/);
    await expect.poll(() => photos.first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const begin = page.locator(".venue-journey-invitation .venue-hero-action");
    await expect(begin).toHaveCount(1);
    await expect(begin).toHaveAttribute("href", "#journey-airport");
    await begin.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#journey-airport$`));
    await expect(page.locator("#journey-airport")).toBeFocused();
    await expect(page.locator('.venue-journey-index a[href="#journey-airport"]')).toHaveAttribute("aria-current", "location");
    await expect(page.locator("#journey-airport").getByRole("heading").first()).toBeInViewport();
    await expect(page.locator("#journey-airport .venue-journey-reading")).toHaveCSS("opacity", "1");
    await page.goto(`/${locale}/program`);
    await expect(page.locator(".program-date-panel")).toContainText(locale === "en" ? "April 2027" : "أبريل ٢٠٢٧");
    await expect(page.locator(".program-date-panel a, .program-date-panel time")).toHaveCount(0);
    await expect(page.getByTestId("program-day-all")).toHaveAttribute("aria-current", "true");
    await expect(page.locator(".premium-hero-image img")).toHaveCount(1);
    expect(await page.locator(".premium-hero-image img").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} Venue shows its gallery and practical information with pending times and accessible layout`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      errors.push(message.text());
    });
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });

    const response = await page.goto(`/${locale}/dates-venue`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(copy[locale].title);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[locale].heading);
    const photoHeader = page.locator(".venue-photo-header.premium-photo-hero");
    await expect(photoHeader).toHaveCount(1);
    await expect(photoHeader.locator("h1 .premium-title-accent")).toHaveCount(1);
    const heroImage = photoHeader.locator(".premium-hero-image img");
    await expect(heroImage).toHaveCount(1);
    await expect(heroImage).toHaveAttribute("alt", "");
    await expect.poll(() => heroImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await heroImage.evaluate((image: HTMLImageElement) => new URL(image.currentSrc).origin === location.origin)).toBe(true);
    expect(await heroImage.getAttribute("src")).toContain("king-faisal-venue.jpg");
    const stage = page.locator(".venue-gallery-stage");
    await expect(stage.getByTestId("venue-geographic-map")).toHaveCount(1);
    await expect(photoHeader.locator(".venue-header-collage .venue-photo-gallery")).toHaveCount(1);
    await expect(stage.locator(".venue-photo-gallery")).toHaveCount(0);
    await expect(stage.locator(".venue-stage-layout")).toHaveCount(1);
    await expect(stage.locator("#international-attendees details")).toHaveCount(1);
    const begin = page.locator(".venue-journey-invitation .venue-hero-action");
    await expect(begin).toHaveCount(1);
    const centeredBegin = await begin.evaluate((element) => {
      const button = element.getBoundingClientRect();
      const invitation = element.closest(".venue-journey-invitation")!.getBoundingClientRect();
      return { offset: Math.abs(button.left + button.width / 2 - invitation.left - invitation.width / 2), height: button.height };
    });
    expect(centeredBegin.offset).toBeLessThanOrEqual(1);
    expect(centeredBegin.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("main").locator("time, .dates-calendar")).toHaveCount(0);
    await expect(page.locator(".venue-photo-gallery img")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: locale === "en" ? "The final approach." : "الخطوة الأخيرة.", exact: true })).toHaveCount(0);
    await expect(page.locator(".venue-photo-gallery")).not.toContainText(locale === "en" ? "A different light" : "في ضوء مختلف");
    await expect(page.locator(".venue-gallery-hero #venue-orientation").getByTestId("venue-geographic-map")).toHaveCount(1);
    await expect(stage.locator(".venue-stage-intro")).toContainText(copy[locale].host);
    await expect(page.locator(".dates-location-details")).toContainText(copy[locale].venue);
    await expect(page.locator(".dates-location-details")).toContainText("22254");
    await expect(page.locator(".dates-note")).toHaveCount(0);
    // Closed registration is communicated on its dedicated destination rather
    // than repeated in the shortened Venue footer.
    await expect(page.locator(".header-primary-action")).toHaveAttribute("aria-haspopup", "dialog");
    await expect(page.getByRole("main").locator(".dates-program-link")).toHaveCount(1);
    await expect(stage.locator(".dates-program-link")).toHaveAttribute("href", `/${locale}/program`);
    await expect(stage.locator(`a[href="/${locale}#faq"]`)).toHaveCount(1);
    await expect(page.getByRole("main")).not.toContainText(/09:00|9:00 AM/);
    await expect(page.locator('a[href*="/api/workflows/"], a[href*="/payment"]')).toHaveCount(0);
    const directions = page.locator('.dates-directions-link');
    await expect(directions).toHaveCount(1);
    await expect(directions).toHaveAttribute("target", "_blank");
    await expect(directions).toHaveAttribute("rel", /noopener/);
    await expect(directions).toHaveAccessibleName(locale === "en" ? /Get directions.*King Faisal Conference Center.*new tab/i : /الاتجاهات.*مركز الملك فيصل للمؤتمرات.*علامة تبويب جديدة/);
    expect(new URL((await directions.getAttribute("href"))!).searchParams.get("destination")).toContain("King Faisal Conference Center");
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
    // The font-change observer restores natural reading flow on the next frame.
    // Verify that adaptation before measuring the resulting enlarged layout.
    await expect(page.getByTestId("venue-arrival-journey")).toHaveAttribute("data-reading-flow", "true");
    await assertReadable();
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });

    await page.getByRole("navigation", { name: copy[locale].breadcrumb })
      .getByRole("link", { name: copy[locale].home, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    const footerDates = page.getByRole("contentinfo").getByRole("link", { name: copy[locale].footer, exact: true });
    await expect(footerDates).toHaveAttribute("href", `/${locale}/dates-venue`);
    await footerDates.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue$`));
    await page.getByRole("main").locator('.dates-program-link').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.getByTestId("program-empty")).toBeVisible();
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
  const arabic = await languageLink(page, "View this page in Arabic");
  await arabic.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar\/dates-venue\?view=planning#venue$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#venue")).toBeInViewport();
  const english = await languageLink(page, "View this page in English");
  await english.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/dates-venue\?view=planning#venue$/);
  await expect(page.locator("#venue")).toBeInViewport();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});

for (const [locale, label] of [["en", "Add to calendar"], ["ar", "أضف إلى التقويم"]] as const) {
  test(`${locale} calendar stays unavailable while exact days are unset`, async ({ page }) => {
    await page.goto(`/${locale}/program`);
    await expect(page.locator(".program-date-panel")).toContainText(locale === "en" ? "April 2027" : "أبريل ٢٠٢٧");
    await expect(page.locator(".program-date-panel time")).toHaveCount(0);
    await expect(page.getByRole("link", { name: label })).toHaveCount(0);
    expect((await page.request.get(`/${locale}/msrc-2027.ics`)).status()).toBe(404);
  });
}
