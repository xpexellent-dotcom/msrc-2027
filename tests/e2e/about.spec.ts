import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// SCP-02, LOC-01/03, ACC-01, CMS-04, CFG-01/12: one public content slice.
// These checks exercise navigation, language continuity and content boundaries;
// the shared foundation suite separately tests all server workflow denials.
const copy = {
  en: {
    title: "About MSRC 2027",
    heading: "Research begins with a question.",
    about: "About",
    home: "Home",
    breadcrumb: "Breadcrumb",
  },
  ar: {
    title: "عن مؤتمر أبحاث طلاب الطب | MSRC 2027",
    heading: "يبدأ البحث بسؤال.",
    about: "عن المؤتمر",
    home: "الرئيسية",
    breadcrumb: "مسار التنقل",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  test(`${locale} About is a readable, accessible preview with no open operations`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    const response = await page.goto(`/${locale}/about`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(copy[locale].title);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[locale].heading);
    await expect(page.locator("form, input, textarea, select, iframe, video, [data-countdown]")).toHaveCount(0);
    await expect(page.locator('a[href*="/api/workflows/"], a[href*="/payment"], a[href*="/admin"]')).toHaveCount(0);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator(".about-identity")).toContainText(locale === "en" ? /27\D+28 January 2027/ : /٢٧\D+٢٨ يناير ٢٠٢٧/);
    await expect(page.getByRole("main")).not.toContainText(/Abdulrahman Ismail|Fatimah Al Farhah/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");

    // Confirm native in-page anchors resolve, without mistaking cross-page
    // homepage section links in the shared shell for broken local anchors.
    const missingAnchors = await page.locator('a[href*="#"]').evaluateAll((links) => links
      .map((link) => new URL((link as HTMLAnchorElement).href))
      .filter((url) => url.pathname === location.pathname && url.hash)
      .map((url) => decodeURIComponent(url.hash.slice(1)))
      .filter((id) => !document.getElementById(id)));
    expect(missingAnchors).toEqual([]);
    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await testInfo.attach(`${locale}-about-accessibility`, {
      body: JSON.stringify({
        violations: accessibility.violations,
        needsManualReview: accessibility.incomplete,
        contrast: accessibility.passes.find((rule) => rule.id === "color-contrast")?.nodes,
      }, null, 2),
      contentType: "application/json",
    });
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    await testInfo.attach(`${locale}-about-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true }), contentType: "image/png",
    });
    await testInfo.attach(`${locale}-about-${testInfo.project.name}-entrance`, {
      body: await page.screenshot(), contentType: "image/png",
    });

    if (testInfo.project.name === "chromium-mobile") {
      const originalViewport = page.viewportSize()!;
      await page.setViewportSize({ width: 320, height: 850 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      await testInfo.attach(`${locale}-about-small-phone-entrance`, {
        body: await page.screenshot(), contentType: "image/png",
      });
      await page.setViewportSize(originalViewport);
    }

    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    const clippedHeadings = await page.locator("main h1, main h2").evaluateAll((headings) => headings.some((heading) => {
      const range = document.createRange();
      range.selectNodeContents(heading);
      return Array.from(range.getClientRects()).some((text) => text.left < -1 || text.right > document.documentElement.clientWidth + 1);
    }));
    expect(clippedHeadings).toBe(false);
    if (locale === "en") expect((await page.request.get("/fr/about")).status()).toBe(404);
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });

  test(`${locale} header and footer open About and breadcrumb returns home`, async ({ page }) => {
    await page.goto(`/${locale}`);
    if ((page.viewportSize()?.width ?? 1280) < 1100) {
      await page.locator(".menu-toggle").click();
      const about = page.locator(".mobile-menu").getByRole("link", { name: copy[locale].about, exact: true });
      await expect(about).toHaveAttribute("href", `/${locale}/about`);
      await about.click();
      await expect(page.locator(".mobile-menu")).toHaveCount(0);
    } else {
      const about = page.locator(".desktop-nav").getByRole("link", { name: copy[locale].about, exact: true });
      await expect(about).toHaveAttribute("href", `/${locale}/about`);
      await about.click();
    }
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[locale].heading);
    await page.getByRole("navigation", { name: copy[locale].breadcrumb })
      .getByRole("link", { name: copy[locale].home, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    const footerAbout = page.getByRole("contentinfo").getByRole("link", { name: copy[locale].about, exact: true });
    await expect(footerAbout).toHaveAttribute("href", `/${locale}/about`);
    await footerAbout.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    if ((page.viewportSize()?.width ?? 1280) < 1100) {
      await page.locator(".menu-toggle").click();
      await page.locator(".mobile-menu").getByRole("link", { name: copy[locale].about, exact: true }).click();
      await expect(page.locator(".mobile-menu")).toHaveCount(0);
      await expect(page.getByRole("main")).toBeFocused();
    }
    for (const section of ["participate", "program"]) {
      await page.getByRole("main").locator(`a[href$="#${section}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/?#${section}$`));
      await expect(page.locator(`#${section}`)).toBeInViewport();
      await page.goto(`/${locale}/about`);
    }
  });
}

test("About keyboard and language navigation preserve page, query and section", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/about?view=editorial");
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
  await page.goto("/en/about?view=editorial#purpose");
  const arabic = page.getByRole("link", { name: "View this page in Arabic" });
  await arabic.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar\/about\?view=editorial#purpose$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#purpose")).toBeInViewport();
  const english = page.getByRole("link", { name: "View this page in English" });
  await english.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/about\?view=editorial#purpose$/);
  await expect(page.locator("#purpose")).toBeInViewport();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});
