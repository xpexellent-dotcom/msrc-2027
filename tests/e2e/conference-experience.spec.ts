import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// SCP-02/03/05, PRG-01, WKS-01/02, LOC-01/02/03, MED-01/02/04,
// CMS-03/04, ACC-01: public information remains distinct from operational
// records. Empty approved catalogues must not be filled with fictional people,
// prices, sessions or recording permissions to make the preview look complete.
const routes = [
  "program", "speakers", "media", "participate",
  "registration", "submissions", "hackathon", "workshops", "3mt",
] as const;
const journeys = ["registration", "submissions", "hackathon", "workshops", "3mt"] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
}

async function followHeaderDestination(page: Page, href: string) {
  const toggle = page.locator(".menu-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.locator(".mobile-menu").locator(`a[href="${href}"]`).click();
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
  } else {
    await page.locator(".desktop-nav").locator(`a[href="${href}"]`).click();
  }
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} public destinations render without participant writes or invented published records`, async ({ page }) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });

    for (const route of routes) {
      const response = await page.goto(`/${locale}/${route}`);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("iframe, textarea, input[type=email], input[type=password], input[type=file]")).toHaveCount(0);
      await expect(page.getByRole("main")).not.toContainText(/King Faisal Conference Center|Abdulrahman Ismail|Fatimah Al Farhah/i);
      await expect(page.locator('a[href*="/admin"], a[href*="/reviewer"], a[download]')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      expect(response?.headers()["x-robots-tag"]).toContain("noindex");
      await expectNoHorizontalOverflow(page);
    }

    await page.goto(`/${locale}/program`);
    await expect(page.getByTestId("program-empty")).toBeVisible();
    await expect(page.locator(".conference-session-row")).toHaveCount(0);
    await page.goto(`/${locale}/speakers`);
    await expect(page.locator(".conference-speaker-card")).toHaveCount(0);
    await page.goto(`/${locale}/media`);
    await expect(page.getByTestId("media-catalogue").locator("video, iframe, audio, .conference-media-card")).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });

  test(`${locale} pages fit narrow phone, tablet and desktop with enlarged text`, async ({ page }, testInfo) => {
    // Explicit widths include the tablet size even when the existing Playwright
    // project allowlist does not include this new suite. Avoid duplicate matrix
    // work in the mobile project; its separate interaction tests still run.
    test.skip(testInfo.project.name !== "chromium-desktop", "Responsive matrix runs once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 791, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 850 : 1000 });
      for (const route of routes) {
        await page.goto(`/${locale}/${route}`);
        await page.evaluate(() => document.fonts.ready);
        await expectNoHorizontalOverflow(page);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        if (["program", "media", "participate"].includes(route)) {
          await testInfo.attach(`${locale}-${route}-${width}`, {
            body: await page.screenshot({ fullPage: true }), contentType: "image/png",
          });
        }
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        await expectNoHorizontalOverflow(page);
        const clippedHeadings = await page.locator("main h1, main h2").evaluateAll((headings) => headings.some((heading) => {
          const range = document.createRange();
          range.selectNodeContents(heading);
          return Array.from(range.getClientRects()).some((text) => text.left < -1 || text.right > document.documentElement.clientWidth + 1);
        }));
        expect(clippedHeadings, `${route} at ${width}px`).toBe(false);
      }
    }
  });

  test(`${locale} programme exposes confirmed days and honest empty and no-results states`, async ({ page }) => {
    await page.goto(`/${locale}/program`);
    const all = page.getByTestId("program-day-all");
    const first = page.getByTestId("program-day-day1");
    const second = page.getByTestId("program-day-day2");
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(first).toContainText(locale === "en" ? /27/ : /٢٧/);
    await expect(second).toContainText(locale === "en" ? /28/ : /٢٨/);
    await expect(page.getByRole("main")).toContainText(/Asia\/Riyadh|UTC\+0?3(?::00)?/);
    const category = page.getByTestId("program-category");
    await expect(category.locator("option")).toHaveCount(1);
    await expect(category).toBeDisabled();
    await expect(page.getByTestId("program-room")).toBeDisabled();
    await expect(page.getByTestId("program-room").locator("option")).toHaveCount(1);
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /announced/i : /سيُعلن|الإعلان/);

    await second.focus();
    await page.keyboard.press("Space");
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await expect(first).toHaveAttribute("aria-pressed", "false");
    const search = page.getByTestId("program-search");
    await search.fill("unmatched scientific session");
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /no.*match/i : /مطابق/);
    expect(new URL(page.url()).searchParams.get("day")).toBe("day2");
    expect(new URL(page.url()).searchParams.get("q")).toBe("unmatched scientific session");
    const otherLocale = locale === "en" ? "ar" : "en";
    await page.getByRole("link", { name: otherLocale === "ar" ? "View this page in Arabic" : "View this page in English" }).click();
    await expect(page.getByTestId("program-search")).toHaveValue("unmatched scientific session");
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: locale === "ar" ? "View this page in Arabic" : "View this page in English" }).click();
    await page.getByTestId("program-clear").click();
    await expect(search).toHaveValue("");
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /announced/i : /سيُعلن|الإعلان/);
    await expect(page.locator('a[href*="/program/"]')).toHaveCount(0);
  });

  test(`${locale} media filters distinguish editions without inventing a playable recording`, async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    await page.goto(`/${locale}/media`);
    await expect(page.getByTestId("media-access-note")).toBeVisible();
    const edition = page.getByTestId("media-edition");
    await expect(edition.locator('option[value="2026"]')).toHaveCount(1);
    await expect(edition.locator('option[value="2027"]')).toHaveCount(1);
    await edition.selectOption("2027");
    await expect(page.getByTestId("media-empty")).toContainText(locale === "en" ? /2027/ : /٢٠٢٧/);
    await edition.selectOption("2026");
    await expect(page.getByTestId("media-empty")).toContainText(locale === "en" ? /2026/ : /٢٠٢٦/);
    const search = page.getByTestId("media-search");
    await search.fill("a recording that does not exist");
    await expect(page.getByTestId("media-empty")).toContainText(locale === "en" ? /no.*match/i : /مطابق/);
    expect(new URL(page.url()).searchParams.get("edition")).toBe("2026");
    expect(new URL(page.url()).searchParams.get("q")).toBe("a recording that does not exist");
    const otherLocale = locale === "en" ? "ar" : "en";
    await page.getByRole("link", { name: otherLocale === "ar" ? "View this page in Arabic" : "View this page in English" }).click();
    await expect(page.getByTestId("media-search")).toHaveValue("a recording that does not exist");
    await expect(page.getByTestId("media-edition")).toHaveValue("2026");
    await expect(page.getByTestId("media-catalogue").locator("video, iframe, audio, .conference-media-card")).toHaveCount(0);
    await expect(page.locator("a[download]")).toHaveCount(0);
    await page.getByTestId("media-clear").click();
    await expect(page.getByTestId("media-search")).toHaveValue("");
    await expect(page.getByTestId("media-edition")).toHaveValue("all");
    await expect(page.getByTestId("media-kind")).toHaveValue("all");
    expect(writes).toEqual([]);
  });

  test(`${locale} same-route programme and media navigation clears selected filters`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/program`);
    await page.getByTestId("program-day-day2").click();
    await page.getByTestId("program-search").fill("selected programme query");
    expect(new URL(page.url()).searchParams.get("q")).toBe("selected programme query");
    await followHeaderDestination(page, `/${locale}/program`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.getByTestId("program-search")).toHaveValue("");
    await expect(page.getByTestId("program-day-all")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("program-category")).toHaveValue("all");
    await expect(page.getByTestId("program-room")).toHaveValue("all");
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /announced/i : /سيُعلن|الإعلان/);

    await page.goto(`/${locale}/media`);
    await page.getByTestId("media-edition").selectOption("2026");
    await page.getByTestId("media-kind").selectOption("recording");
    await page.getByTestId("media-search").fill("selected media query");
    expect(new URL(page.url()).searchParams.get("q")).toBe("selected media query");
    await followHeaderDestination(page, `/${locale}/media`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/media$`));
    await expect(page.getByTestId("media-search")).toHaveValue("");
    await expect(page.getByTestId("media-edition")).toHaveValue("all");
    await expect(page.getByTestId("media-kind")).toHaveValue("all");
    await expect(page.getByTestId("media-empty")).not.toContainText(locale === "en" ? /no.*match/i : /مطابق/);
  });

  test(`${locale} rendered language links preserve current filters and fragment when followed in a new tab`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const otherLocale = locale === "en" ? "ar" : "en";
    for (const route of ["program", "media"] as const) {
      await page.goto(`/${locale}/${route}?view=review#main-content`);
      if (route === "program") {
        await page.getByTestId("program-day-day2").click();
        await page.getByTestId("program-search").fill("session & topic");
      } else {
        await page.getByTestId("media-edition").selectOption("2026");
        await page.getByTestId("media-kind").selectOption("recording");
        await page.getByTestId("media-search").fill("speaker & topic");
      }
      const language = page.getByRole("link", { name: otherLocale === "ar" ? "View this page in Arabic" : "View this page in English" });
      await expect.poll(async () => {
        const href = await language.getAttribute("href");
        if (!href) return null;
        const destination = new URL(href, page.url());
        const current = new URL(page.url());
        return {
          path: destination.pathname, hash: destination.hash,
          filters: [...destination.searchParams.entries()].sort(),
          expectedFilters: [...current.searchParams.entries()].sort(),
        };
      }).toEqual({
        path: `/${otherLocale}/${route}`, hash: "#main-content",
        filters: [...new URL(page.url()).searchParams.entries()].sort(),
        expectedFilters: [...new URL(page.url()).searchParams.entries()].sort(),
      });
      const href = await language.getAttribute("href");
      const translated = await page.context().newPage();
      try {
        // Following the rendered href bypasses onClick rewriting, as opening
        // the link in a new tab or copying its address would do.
        await translated.goto(href!);
        await expect(translated.locator("html")).toHaveAttribute("lang", otherLocale);
        await expect(translated.locator("html")).toHaveAttribute("dir", otherLocale === "ar" ? "rtl" : "ltr");
        expect(new URL(translated.url()).hash).toBe("#main-content");
        if (route === "program") {
          await expect(translated.getByTestId("program-search")).toHaveValue("session & topic");
          await expect(translated.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
        } else {
          await expect(translated.getByTestId("media-search")).toHaveValue("speaker & topic");
          await expect(translated.getByTestId("media-edition")).toHaveValue("2026");
          await expect(translated.getByTestId("media-kind")).toHaveValue("recording");
        }
        expect(new URL(page.url()).pathname).toBe(`/${locale}/${route}`);
      } finally {
        await translated.close();
      }
    }
  });

  test(`${locale} participation links reach distinct closed journeys without pretending to submit`, async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    for (const route of journeys) {
      await page.goto(`/${locale}/participate`);
      const destination = page.getByRole("main").locator(`a[href="/${locale}/${route}"]`).first();
      await expect(destination).toBeVisible();
      await destination.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/${route}$`));
      await expect(page.getByTestId("journey-closed")).toBeVisible();
      await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
      await expect(page.getByRole("main")).not.toContainText(/submission successful|application received|payment successful/i);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.locator(`a[href="/${locale}/participate#three-minute-thesis"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/participate#three-minute-thesis$`));
    const thesis = page.locator("#three-minute-thesis");
    await expect(thesis).toBeFocused();
    await expect(thesis).toBeInViewport();
    await thesis.getByRole("heading").getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/3mt$`));
    await expect(page.getByTestId("journey-closed")).toBeVisible();
    await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
    expect(writes).toEqual([]);
  });

  test(`${locale} programme, media and participation pass automated accessibility checks`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of ["program", "media", "participate", "registration"]) {
      await page.goto(`/${locale}/${route}`);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      await testInfo.attach(`${locale}-${route}-accessibility`, {
        body: JSON.stringify({ violations: results.violations, needsManualReview: results.incomplete }, null, 2),
        contentType: "application/json",
      });
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    }
  });
}

test("floating mobile navigation supports keyboard dismissal, current page and language continuity", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/program?view=review#main-content`);
    const toggle = page.locator(".menu-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const menu = page.locator(".mobile-menu");
    await expect(menu).toBeVisible();
    const program = menu.locator(`a[href="/${locale}/program"]`);
    await expect(program).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
    const nextLocale = locale === "en" ? "ar" : "en";
    const language = page.getByRole("link", { name: nextLocale === "ar" ? "View this page in Arabic" : "View this page in English" });
    await language.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${nextLocale}/program\\?view=review#main-content$`));
    await expect(page.locator("html")).toHaveAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
  }
});

test("unpublished session and speaker detail URLs return real 404s", async ({ page }) => {
  for (const locale of ["en", "ar"] as const) {
    for (const path of ["program/unpublished-session", "speakers/unpublished-speaker"]) {
      expect((await page.goto(`/${locale}/${path}`))?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    }
  }
});
