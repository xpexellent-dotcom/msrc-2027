import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// LOC-01/03, SEC-01, INF-04, REL-06: static public browsing stays separate
// from closed operational flows. This is a smoke check, not a launch audit.
test("the default route opens the English public page", async ({ page, request }) => {
  // Temporary, so browsers do not cache the default-locale choice permanently.
  const redirect = await request.get("/", { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  expect(redirect.headers()["location"]).toBe("/en");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const locale of ["en", "ar"] as const) {
  test(`${locale} homepage is readable without opening a workflow`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    const response = await page.goto(`/${locale}`);

    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("form, input, textarea, select")).toHaveCount(0);
    await expect(page.locator('a[href*="/api/workflows/"], a[href*="/payment"], a[href*="/admin"]')).toHaveCount(0);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    // ORG-001/002: explicit date and montage approval does not open operations.
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("[data-countdown]")).toHaveCount(1);
    await expect(page.locator(".event-strip")).toContainText(locale === "en" ? /27\D+28 January 2027/ : /٢٧\D+٢٨ يناير ٢٠٢٧/);
    const missingAnchors = await page.locator('a[href*="#"]').evaluateAll((links) => links
      .map((link) => new URL((link as HTMLAnchorElement).href))
      .filter((url) => url.pathname === location.pathname)
      .map((url) => url.hash.slice(1))
      .filter((id) => id && !document.getElementById(decodeURIComponent(id))));
    expect(missingAnchors).toEqual([]);

    // Detect horizontal clipping at desktop, tablet, and phone project sizes.
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    await testInfo.attach(`${locale}-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await testInfo.attach(`${locale}-${testInfo.project.name}-entrance`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    // ACC-01: text-only enlargement must not require horizontal scrolling.
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const clippedHeadline = await page.locator("h1 > span").evaluateAll((spans) => spans.some((span) => {
      const range = document.createRange();
      range.selectNodeContents(span);
      const text = range.getBoundingClientRect();
      return text.left < 0 || text.right > document.documentElement.clientWidth + 1;
    }));
    expect(clippedHeadline).toBe(false);
    if (testInfo.project.name === "chromium-mobile") {
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
      await page.setViewportSize({ width: 320, height: 850 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      const clippedYears = await page.locator(".legacy-art-years span").evaluateAll((spans) => spans.some((span) => {
        const artwork = span.closest(".legacy-art")!.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(span);
        const text = range.getBoundingClientRect();
        return text.left < artwork.left || text.right > artwork.right;
      }));
      expect(clippedYears).toBe(false);
      await testInfo.attach(`${locale}-small-phone-entrance`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    }
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });
}

test("shared links carry a working preview image and language alternates", async ({ page, request }) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}`);
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toMatch(new RegExp(`/${locale}/opengraph-image`));
    const response = await request.get(new URL(image!).pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
  }
});

test("public pages pass axe best-practice rules, including landmark coverage", async ({ page }) => {
  for (const path of ["/en", "/ar", "/en/about", "/ar/about", "/en/dates-venue", "/ar/dates-venue"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["best-practice"]).analyze();
    expect(results.violations.map((violation) => `${path} ${violation.id}`)).toEqual([]);
  }
});

test("public pages send baseline security headers", async ({ request }) => {
  for (const path of ["/en", "/ar/about", "/ar/missing-page"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    for (const directive of ["base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'"]) {
      expect(headers["content-security-policy"]).toContain(directive);
    }
  }
});

test("English pages do not download the Arabic webfont", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (request) => { if (request.resourceType() === "font") fonts.push(request.url()); });
  await page.goto("/en", { waitUntil: "networkidle" });
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.filter((url) => /arabic/i.test(url))).toEqual([]);
});

test("keyboard access reaches content and changes language without losing location", async ({ page }) => {
  await page.goto("/en?view=preview");
  await page.keyboard.press("Tab");
  await expect(page.locator('a[href="#main-content"]')).toBeFocused();
  await expect(page.locator('a[href="#main-content"]')).toBeVisible();
  expect(await page.locator('a[href="#main-content"]').evaluate((element) => {
    const outline = getComputedStyle(element);
    return outline.outlineStyle !== "none" && parseFloat(outline.outlineWidth) >= 2;
  })).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const arabic = page.getByRole("link", { name: "View this page in Arabic" });
  await arabic.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar\?view=preview#main-content$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const english = page.getByRole("link", { name: "View this page in English" });
  await english.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\?view=preview#main-content$/);
});

test("responsive navigation is keyboard usable in both languages", async ({ page }) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}`);
    const toggle = page.locator(".menu-toggle");
    const menu = page.locator(".mobile-menu");
    if ((page.viewportSize()?.width ?? 1280) >= 1100) {
      await expect(toggle).toBeHidden();
      await expect(page.locator(".desktop-nav")).toBeVisible();
      await expect(menu).toHaveCount(0);
      continue;
    }
    await expect(page.locator(".desktop-nav")).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveCount(0);
    const size = await toggle.boundingBox();
    expect(size?.width).toBeGreaterThanOrEqual(44);
    expect(size?.height).toBeGreaterThanOrEqual(44);
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(menu).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("reduced-motion preference keeps native page navigation usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ar");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  const movingElements = await page.locator("body *").evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      return style.animationName !== "none" || style.transitionDuration.split(",").some((duration) => parseFloat(duration) > 0);
    })
    .map((element) => element.tagName));
  expect(movingElements).toEqual([]);
  await page.getByRole("main").focus();
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "View this page in English" }).click();
  await expect(page).toHaveURL(/\/en$/);
});

test("unsupported locales and missing localized pages return real 404s", async ({ page }) => {
  expect((await page.goto("/fr"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect((await page.goto("/ar/missing-page"))?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
