import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { languageLink, revealDesktopHeader } from "./helpers/header-navigation";

// SCP-02/03/05, PRG-01, WKS-01/02, LOC-01/02/03, MED-01/02/04,
// CMS-03/04, ACC-01: public information remains distinct from operational
// records. Empty approved catalogues must not be filled with fictional people,
// prices, sessions or recording permissions to make the preview look complete.
const routes = [
  "program", "speakers", "media", "participate",
  "registration", "submissions", "hackathon", "workshops", "3mt",
] as const;
const journeys = ["registration", "submissions", "hackathon", "workshops", "3mt"] as const;

// Independently inspected source-coordinate bounds around faces and the lectern.
// These catch a clipped edge panelist or speaker even when every frame is uniform.
const archiveSubjects: Record<string, { left: number; right: number; top: number; bottom: number }> = {
  "/media/editions/2025/photo-4.webp": { left: .13, right: .935, top: .30, bottom: .62 },
  "/media/editions/2025/photo-3.webp": { left: .08, right: .81, top: .32, bottom: .65 },
  "/media/editions/2024/photo-1.webp": { left: .56, right: .75, top: .43, bottom: .86 },
  "/media/editions/2023/photo-2.webp": { left: .03, right: .60, top: .055, bottom: .56 },
  "/media/editions/2026/photo-9.webp": { left: .06, right: .86, top: .36, bottom: .62 },
  "/media/editions/2026/photo-6.webp": { left: .22, right: .77, top: .52, bottom: .83 },
};

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const content = document.documentElement.scrollWidth;
    return {
      content, viewport, route: location.pathname, rootFont: getComputedStyle(document.documentElement).fontSize,
      // Native rails intentionally contain offscreen cards. Report escaping page
      // controls/containers instead, so a failed reflow assertion identifies its cause.
      offenders: content <= viewport ? [] : [...document.querySelectorAll<HTMLElement>("main *, .site-header-inner, .wordmark, .menu-toggle")]
        .filter((element) => !element.closest(".rail-track") && element.getClientRects().length)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return { selector: element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}.${String(element.className).trim().replace(/\s+/g, ".")}`,
            left: box.left, right: box.right, width: box.width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
        })
        .filter((element) => element.left < -1 || element.right > viewport + 1 || element.scrollWidth > element.clientWidth + 1)
        .slice(0, 20),
    };
  });
  expect(widths.content, JSON.stringify(widths, null, 2)).toBeLessThanOrEqual(widths.viewport);
}

async function followPublicDestination(page: Page, href: string) {
  if (href.endsWith("/media")) {
    // Media remains a real footer destination after Our Team replaced it in the header.
    await page.getByRole("contentinfo").locator(`a[href="${href}"]`).click();
    return;
  }
  const toggle = page.locator(".menu-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.locator(".mobile-menu").locator(`a[href="${href}"]`).click();
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
  } else {
    await revealDesktopHeader(page);
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
      await expect(page.getByRole("main")).not.toContainText(/Abdulrahman Ismail|Fatimah Al Farhah/i);
      await expect(page.locator('a[href*="/admin"], a[href*="/reviewer"]')).toHaveCount(0);
      // Program exposes only the confirmed all-day calendar file. Unpublished
      // brochures, scientific records and other downloads remain unavailable.
      if (route === "program") {
        await expect(page.locator("a[download]")).toHaveCount(1);
        await expect(page.locator("a[download]")).toHaveAttribute("href", `/${locale}/msrc-2027.ics`);
        await expect(page.locator("a[download]")).toHaveAttribute("download", "msrc-2027.ics");
      } else {
        await expect(page.locator("a[download]")).toHaveCount(0);
      }
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
    await expect(page.getByTestId("media-catalogue").locator(".conference-media-card")).toHaveCount(21);
    await expect(page.getByTestId("media-catalogue").locator("iframe, audio")).toHaveCount(0);
    await page.getByTestId("media-edition").selectOption("2027");
    await expect(page.getByTestId("media-catalogue").locator("video, .conference-media-card")).toHaveCount(0);
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
        // Decorative fill images do not determine layout; readiness depends on the document and fonts.
        await page.goto(`/${locale}/${route}`, { waitUntil: "domcontentloaded" });
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
    await (await languageLink(page, otherLocale === "ar" ? "View this page in Arabic" : "View this page in English")).click();
    await expect(page).toHaveURL(new RegExp(`/${otherLocale}/program(?:\\?|$)`));
    await expect(page.locator("html")).toHaveAttribute("lang", otherLocale);
    await expect(page.getByTestId("program-search")).toHaveValue("unmatched scientific session");
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await (await languageLink(page, locale === "ar" ? "View this page in Arabic" : "View this page in English")).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program(?:\\?|$)`));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(search).toHaveValue("unmatched scientific session");
    await expect(second).toHaveAttribute("aria-pressed", "true");
    expect(new URL(page.url()).searchParams.get("day")).toBe("day2");
    expect(new URL(page.url()).searchParams.get("q")).toBe("unmatched scientific session");
    await page.getByTestId("program-clear").click();
    await expect(search).toHaveValue("");
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("program-empty")).toContainText(locale === "en" ? /announced/i : /سيُعلن|الإعلان/);
    await expect(page.locator('a[href*="/program/"]')).toHaveCount(0);
  });

  test(`${locale} media filters distinguish the supplied archive from unpublished 2027 recordings`, async ({ page }) => {
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
    await expect(page.locator(".conference-media-card")).toHaveCount(13);
    await expect(page.locator(".conference-media-card[data-media-kind=photograph]")).toHaveCount(9);
    await expect(page.locator(".conference-media-card video")).toHaveCount(4);
    await page.getByTestId("media-kind").selectOption("recording");
    await expect(page.locator(".conference-media-card")).toHaveCount(0);
    await expect(page.getByTestId("media-empty")).toContainText(locale === "en" ? /no.*match/i : /مطابق/);
    await page.getByTestId("media-kind").selectOption("all");
    const search = page.getByTestId("media-search");
    await search.fill("a recording that does not exist");
    await expect(page.getByTestId("media-empty")).toContainText(locale === "en" ? /no.*match/i : /مطابق/);
    expect(new URL(page.url()).searchParams.get("edition")).toBe("2026");
    expect(new URL(page.url()).searchParams.get("q")).toBe("a recording that does not exist");
    const otherLocale = locale === "en" ? "ar" : "en";
    await (await languageLink(page, otherLocale === "ar" ? "View this page in Arabic" : "View this page in English")).click();
    await expect(page.getByTestId("media-search")).toHaveValue("a recording that does not exist");
    await expect(page.getByTestId("media-edition")).toHaveValue("2026");
    await expect(page.getByTestId("media-catalogue").locator("video, iframe, audio, .conference-media-card")).toHaveCount(0);
    await expect(page.locator("a[download]")).toHaveCount(0);
    await page.getByTestId("media-clear").click();
    await expect(page.getByTestId("media-search")).toHaveValue("");
    await expect(page.getByTestId("media-edition")).toHaveValue("all");
    await expect(page.getByTestId("media-kind")).toHaveValue("all");
    await expect(page.locator(".conference-media-card")).toHaveCount(21);
    expect(writes).toEqual([]);
  });

  test(`${locale} archive starts with 2026 and keeps subjects in uniform frames with years inside the bottom right`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/media`);
    const groups = page.locator(".conference-media-edition");
    await expect(groups).toHaveCount(4);
    expect(await groups.evaluateAll((sections) => sections.map((section) => section.getAttribute("data-edition"))))
      .toEqual(["2026", "2025", "2024", "2023"]);
    for (const [year, count] of [["2026", 13], ["2025", 4], ["2024", 2], ["2023", 2]] as const) {
      const group = page.locator(`.conference-media-edition[data-edition="${year}"]`);
      await expect(group.getByRole("heading", { level: 2 })).toHaveText(`MSRC ${year}`);
      await expect(group.locator(".conference-media-card")).toHaveCount(count);
    }

    const photos = page.locator(".conference-media-player--photo");
    await expect(photos).toHaveCount(17);
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      const picture = photo.locator("img");
      await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      const frame = await photo.evaluate((element) => {
        const image = element.querySelector("img")!;
        const year = element.querySelector(".conference-media-year")!;
        const imageBox = image.getBoundingClientRect();
        const frameBox = element.getBoundingClientRect();
        const yearBox = year.getBoundingClientRect();
        const aspect = image.naturalWidth / image.naturalHeight;
        const coveredWidth = Math.max(imageBox.width, imageBox.height * aspect);
        const coveredHeight = coveredWidth / aspect;
        const [x, y] = getComputedStyle(image).objectPosition.split(" ").map(parseFloat);
        const contentLeft = imageBox.left + (imageBox.width - coveredWidth) * x / 100;
        const contentTop = imageBox.top + (imageBox.height - coveredHeight) * y / 100;
        const imageUrl = new URL(image.currentSrc);
        return {
          source: imageUrl.searchParams.get("url") ?? imageUrl.pathname,
          visibleSourceLeft: (frameBox.left - contentLeft) / coveredWidth,
          visibleSourceRight: (frameBox.right - contentLeft) / coveredWidth,
          visibleSourceTop: (frameBox.top - contentTop) / coveredHeight,
          visibleSourceBottom: (frameBox.bottom - contentTop) / coveredHeight,
          renderedRatio: imageBox.width / imageBox.height,
          imageWidth: imageBox.width, frameWidth: frameBox.width,
          imageHeight: imageBox.height, frameHeight: frameBox.height,
          fit: getComputedStyle(image).objectFit, transform: getComputedStyle(image).transform,
          year: year.textContent, edition: element.closest("[data-edition]")!.getAttribute("data-edition"),
          rightInset: imageBox.right - yearBox.right, bottomInset: imageBox.bottom - yearBox.bottom,
          rightHalf: yearBox.left > imageBox.left + imageBox.width / 2,
          bottomHalf: yearBox.top > imageBox.top + imageBox.height / 2,
          imageAlt: image.alt,
        };
      });
      expect(frame.imageAlt).not.toBe("");
      expect(frame.renderedRatio).toBeCloseTo(16 / 9, 2);
      expect(frame.imageWidth).toBeCloseTo(frame.frameWidth, 0);
      expect(frame.imageHeight).toBeCloseTo(frame.frameHeight, 0);
      expect(frame.fit).toBe("cover");
      expect(frame.transform).toBe("none");
      const subject = archiveSubjects[frame.source];
      if (subject) {
        expect(frame.visibleSourceLeft, frame.source).toBeLessThan(subject.left);
        expect(frame.visibleSourceRight, frame.source).toBeGreaterThan(subject.right);
        expect(frame.visibleSourceTop, frame.source).toBeLessThan(subject.top);
        expect(frame.visibleSourceBottom, frame.source).toBeGreaterThan(subject.bottom);
      }
      expect(frame.year).toBe(frame.edition);
      expect(frame.year).toMatch(/^202[3-6]$/);
      expect(frame.rightInset).toBeGreaterThan(0);
      expect(frame.bottomInset).toBeGreaterThan(0);
      expect(frame.rightHalf).toBe(true);
      expect(frame.bottomHalf).toBe(true);
    }
    await expectNoHorizontalOverflow(page);
    await testInfo.attach(`${locale}-archive-last-edition`, { body: await groups.last().screenshot(), contentType: "image/png" });

    const edition = page.getByTestId("media-edition");
    const kind = page.getByTestId("media-kind");
    await kind.selectOption("photograph");
    await expect(page.locator(".conference-media-card")).toHaveCount(17);
    for (const [year, count] of [["2026", 9], ["2025", 4], ["2024", 2], ["2023", 2]] as const) {
      await edition.selectOption(year);
      await expect(page.locator(".conference-media-card")).toHaveCount(count);
      await expect(page.locator(".conference-media-year")).toHaveText(Array.from({ length: count }, () => year));
    }
    await page.getByTestId("media-clear").click();
    await kind.selectOption("highlight");
    await expect(page.locator(".conference-media-card")).toHaveCount(4);
    const videos = page.locator(".conference-media-card video");
    await expect(videos).toHaveCount(4);
    for (const video of await videos.all()) {
      await expect(video).toHaveAttribute("controls", "");
      await expect(video).toHaveAttribute("preload", "none");
      await expect(video).not.toHaveAttribute("autoplay");
    }

    await page.goto(`/${locale}`);
    const gallery = page.locator(".gallery-photo");
    await expect(gallery).toHaveCount(6);
    // Edition marks belong to gallery photos, never homepage pathway or scenery photos.
    await expect(page.locator(".home-photo-edition")).toHaveCount(6);
    for (const photo of await gallery.all()) {
      await photo.scrollIntoViewIfNeeded();
      const image = photo.locator("img");
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      const geometry = await photo.evaluate((element) => {
        const frame = element.getBoundingClientRect();
        const year = element.querySelector(".home-photo-edition")!.getBoundingClientRect();
        return { ratio: frame.width / frame.height, right: frame.right - year.right, bottom: frame.bottom - year.bottom };
      });
      expect(geometry.ratio).toBeCloseTo(16 / 9, 2);
      expect(geometry.right).toBeGreaterThan(0);
      expect(geometry.right).toBeLessThan(20);
      expect(geometry.bottom).toBeGreaterThan(0);
      expect(geometry.bottom).toBeLessThan(20);
    }
  });

  test(`${locale} same-route programme and media navigation clears selected filters`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/program`);
    await page.getByTestId("program-day-day2").click();
    await page.getByTestId("program-search").fill("selected programme query");
    expect(new URL(page.url()).searchParams.get("q")).toBe("selected programme query");
    await followPublicDestination(page, `/${locale}/program`);
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
    await followPublicDestination(page, `/${locale}/media`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/media$`));
    await expect(page.getByTestId("media-search")).toHaveValue("");
    await expect(page.getByTestId("media-edition")).toHaveValue("all");
    await expect(page.getByTestId("media-kind")).toHaveValue("all");
    await expect(page.getByTestId("media-empty")).toHaveCount(0);
    await expect(page.locator(".conference-media-card")).toHaveCount(21);
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
      const language = await languageLink(page, otherLocale === "ar" ? "View this page in Arabic" : "View this page in English");
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
    await page.locator(`.pathway-card a[href="/${locale}/3mt"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/3mt$`));
    await expect(page.getByTestId("journey-closed")).toBeVisible();
    await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
    // Existing shared participation fragments still lead to the real thesis section.
    await page.goto(`/${locale}/participate#three-minute-thesis`);
    const thesis = page.locator("#three-minute-thesis");
    await expect(thesis).toBeInViewport();
    await thesis.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/3mt$`));
    await expect(page.getByTestId("journey-closed")).toBeVisible();
    await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
    expect(writes).toEqual([]);
  });

  test(`${locale} programme, media and participation pass automated accessibility checks`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of ["program", "media", "participate", "registration", "workshops"]) {
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
    const language = await languageLink(page, nextLocale === "ar" ? "View this page in Arabic" : "View this page in English");
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
