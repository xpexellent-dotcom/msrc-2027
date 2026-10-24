import { expect, test } from "@playwright/test";
import { prepareHeroCue } from "./helpers/hero-navigation";

// Regressions found in live QA (2026-10-01). Kept separate from feature specs.

// Letter-spacing pulls joined Arabic letters apart in WebKit, so on every iPhone browser:
// the hero kicker, caption and film provenance were tracked at 0.06–0.1em.
test("Arabic words are never letter-spaced", async ({ page }) => {
  for (const path of ["/ar", "/ar/speakers", "/ar/dates-venue", "/ar/program", "/ar/participate", "/ar/media"]) {
    await page.goto(path);
    const spaced = await page.evaluate(() => {
      const found: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement;
        // Arabic letters only: Arabic-Indic digits do not join, so tracked numerals are fine.
        if (!element || !/[ء-ي]{2,}/.test(node.textContent ?? "")) continue;
        const spacing = getComputedStyle(element).letterSpacing;
        if (spacing !== "normal" && Math.abs(parseFloat(spacing)) > 0.01) found.push(`${element.className} ${spacing} "${node.textContent?.trim().slice(0, 24)}"`);
      }
      return found;
    });
    expect(spaced, path).toEqual([]);
  }
});

// Axiom revision: one reading-edge "Step inside" cue without the MSRC2026 caption. It glides to the dates
// band when motion is allowed and jumps under reduced motion; the band clears the header.
for (const [motion, glides] of [["no-preference", true], ["reduce", false]] as const) {
  for (const locale of ["en", "ar"] as const) {
    test(`${locale} Step inside follows the reading edge and ${glides ? "glides" : "jumps"} to the dates band (${motion})`, async ({ page, browserName }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto(`/${locale}`);
      // Before hydration a click is a plain fragment jump; the live countdown marks hydration,
      // which took over 5 s once on a loaded local run.
      await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
      await expect(page.locator(".conference-hero .hero-caption")).toHaveCount(0);
      const cue = await prepareHeroCue(page);
      await expect(cue).toHaveAttribute("href", "#essentials");
      expect(await cue.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const row = element.closest(".hero-bottom")!.getBoundingClientRect();
        return Math.abs(document.documentElement.dir === "rtl" ? box.right - row.right : box.left - row.left);
      })).toBeLessThanOrEqual(1);
      expect(await page.locator(".scroll-line").evaluate((line) => getComputedStyle(line, "::after").animationName)).toBe(glides ? "scroll-cue" : "none");

      // The cue is already fully visible and hit-tested above the sheet. Record
      // the native pointer activation from this actual reading position.
      const startingPosition = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => {
        const positions: number[] = [];
        Object.assign(window, { scrollSamples: positions });
        const timer = setInterval(() => positions.push(window.scrollY), 10);
        setTimeout(() => clearInterval(timer), 1500);
      });
      await cue.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}#essentials$`));
      await expect(page.locator("#essentials")).toBeFocused();
      await page.waitForTimeout(1600);
      const positions = await page.evaluate(() => (window as unknown as { scrollSamples: number[] }).scrollSamples);
      const settled = positions[positions.length - 1];
      expect(settled).toBeGreaterThan(0);
      // Headless WebKit advances a smooth scroll on this page in one or two coarse steps; a jump
      // is still asserted there, the glide only where frames are rendered (Chromium, CI).
      if (!(glides && browserName === "webkit")) expect(positions.some((y) => y > startingPosition + 1 && y < settled - 1), positions.join(",")).toBe(glides);
      expect(await page.evaluate(() => document.querySelector("#event-details")!.getBoundingClientRect().top
        - document.querySelector(".site-header")!.getBoundingClientRect().bottom)).toBeGreaterThan(0);
    });
  }
}

// Printing: browsers drop background colours, so light text on the dark sections vanished, and
// the fixed header repeated over the top of every printed page.
test("print shows the content in black without screen furniture", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  for (const path of ["/en", "/ar", "/en/dates-venue", "/ar/program"]) {
    await page.goto(path);
    for (const selector of [".site-header", ".site-footer", ".preview-banner", ".section-journey", ".hero-media"]) {
      await expect(page.locator(selector).first(), `${path} ${selector}`).toBeHidden();
    }
    await expect(page.locator("h1")).toBeVisible();
    const colours = await page.locator("main h1, main h2, main p").evaluateAll((elements) => [...new Set(elements.map((element) => getComputedStyle(element).color))]);
    expect(colours, path).toEqual(["rgb(0, 0, 0)"]);
  }
});

// ORG-008: the versioned film and posters were served with max-age=0, so every repeat visit
// revalidated them before the hero could play. Pages themselves keep their default caching.
test("versioned hero media may be cached by the browser for 30 days", async ({ request }) => {
  for (const file of ["hero-desktop-v1.mp4", "hero-mobile-v1.mp4", "poster-desktop-v1.jpg", "poster-mobile-v1.jpg"]) {
    const response = await request.head(`/media/msrc2026/${file}`);
    expect(response.status(), file).toBe(200);
    expect(response.headers()["cache-control"], file).toBe("public, max-age=2592000, stale-while-revalidate=86400");
  }
  expect((await request.head("/en")).headers()["cache-control"]).not.toContain("2592000");
});

// The Arabic subset has no "0". While its face covered the space, 1ch fell to 0.5em once it
// loaded, so ch-based measures narrowed after first paint (CLS 0.2 on /ar/media) and headings
// authored as two lines broke into four. 1ch must come from the fallback before and after.
test("the Arabic webfont leaves 1ch unchanged, so authored two-line headings stay two lines", async ({ page }) => {
  for (const path of ["/ar/media", "/ar/program", "/ar/registration"]) {
    await page.goto(path);
    const result = await page.evaluate(async () => {
      await document.fonts.ready;
      const heading = document.querySelector("h1")!;
      const probe = document.createElement("span");
      probe.style.cssText = "display:inline-block;inline-size:10ch;block-size:0";
      heading.append(probe);
      const chInEm = probe.getBoundingClientRect().width / 10 / parseFloat(getComputedStyle(heading).fontSize);
      probe.remove();
      const range = document.createRange();
      range.selectNodeContents(heading);
      return {
        arabicFaceLoaded: [...document.fonts].some((face) => face.status === "loaded" && /arabic/i.test(face.family)),
        chInEm,
        lines: new Set([...range.getClientRects()].filter((rect) => rect.width > 1).map((rect) => Math.round(rect.top))).size,
        // Keyword spans now express the authored break with <br>; textContent
        // omits that break. Preserve the exact authored-versus-rendered check.
        authoredLines: heading.textContent!.split("\n").length + heading.querySelectorAll("br").length,
      };
    });
    expect(result.arabicFaceLoaded, path).toBe(true);
    expect(result.chInEm, path).toBeGreaterThan(0.52);
    if ((page.viewportSize()?.width ?? 0) >= 1024) expect(result.lines, path).toBe(result.authoredLines);
  }
});

// 41 of 490 paragraphs and list items ended with one word alone on the last line.
test("paragraphs and list items wrap without a lone last word where supported", async ({ page }) => {
  for (const path of ["/en", "/ar/submissions"]) {
    await page.goto(path);
    const styles = await page.locator("main p, main li").evaluateAll((elements) => {
      if (!CSS.supports("text-wrap-style", "pretty")) return ["unsupported"];
      return [...new Set(elements.map((element) => getComputedStyle(element).getPropertyValue("text-wrap-style")))];
    });
    if (styles[0] !== "unsupported") expect(styles, path).toEqual(["pretty"]);
  }
});

// The clock counts whole days to 00:00 Riyadh on Day 1 (2027-01-26T21:00Z); each instant sits
// half a day before a boundary. Plural categories alone gave «٠ يومًا» and «١٠٠ يومًا».
for (const [instant, days, unit] of [
  ["2027-01-26T09:00:00Z", "٠", "يوم"],
  ["2027-01-24T09:00:00Z", "٢", "يومان"],
  ["2026-10-19T09:00:00Z", "٩٩", "يومًا"],
  ["2026-10-18T09:00:00Z", "١٠٠", "يوم"],
] as const) {
  test(`Arabic countdown pairs ${days} with ${unit}`, async ({ page }) => {
    await page.clock.install({ time: new Date(instant) });
    await page.goto("/ar");
    const countdown = page.locator('[data-countdown="before"]');
    await expect(countdown.locator('[data-countdown-unit="days"]')).toHaveText(days);
    await expect(countdown.locator(".countdown-unit")).toHaveText(unit);
  });
}

// The hero clock has one top rule and separators between time units. Its days and time
// may stack or sit side by side; both layouts must retain readable, unclipped content.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} homepage countdown stays readable when days and clock reflow`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-07T09:00:00Z") });
    for (const width of [320, 375, 414, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      const layout = await page.locator(".hero-countdown .countdown-clock").evaluate((clock) => {
        const days = clock.querySelector(".countdown-remaining")!.getBoundingClientRect();
        const time = clock.querySelector<HTMLElement>(".countdown-time")!;
        const timeBox = time.getBoundingClientRect();
        const clippedText = Array.from(clock.querySelectorAll(".countdown-number, .countdown-unit, .countdown-time-number, .countdown-time-label")).some((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
        });
        return {
          fits: time.scrollWidth <= time.clientWidth + 1 && clock.scrollWidth <= clock.clientWidth + 1,
          separated: timeBox.top >= days.bottom - 1 || timeBox.bottom <= days.top + 1 || timeBox.left >= days.right - 1 || timeBox.right <= days.left + 1,
          clippedText,
        };
      });
      expect(layout.fits, `${width}px`).toBe(true);
      expect(layout.separated, `${width}px days and time overlap`).toBe(true);
      expect(layout.clippedText, `${width}px countdown text`).toBe(false);
    }
  });
}

// Live QA 2026-10-03. Browsers and link unfurlers still ask for /favicon.ico; it returned the 404 page.
test("/favicon.ico serves the MSRC icon", async ({ request }) => {
  const response = await request.get("/favicon.ico");
  expect(response.status()).toBe(200);
  // next start says image/x-icon; Vercel's CDN says image/vnd.microsoft.icon.
  expect(response.headers()["content-type"]).toMatch(/^image\/(x-icon|vnd\.microsoft\.icon)/);
});

// The mobile header remains explicit, including short landscape screens.
test("a short landscape screen retains an accessible Menu during down and up scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 340 });
  await page.goto("/en/participate");
  const toggle = page.locator(".menu-toggle");
  for (const top of [400, 900, 500, 0]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
    await expect(toggle).toBeInViewport();
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".mobile-menu")).toBeVisible();
    const menuBox = await page.locator(".mobile-menu").boundingBox();
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(340);
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
  }
});
test("a portrait phone keeps the header in view while reading down", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/participate");
  const header = page.locator(".site-header");
  await expect.poll(async () => { await page.evaluate(() => window.scrollBy(0, 300)); return header.getAttribute("data-scrolled"); }, { timeout: 15_000 }).toBe("true");
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(600);
  expect(await header.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
});

// Earlier editions share a gallery: each photograph keeps a meaningful caption
// and accessible description without repeating archive disclaimers on every card.
test("homepage gallery captions describe the previous editions in each language", async ({ page }) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}`);
    const captions = page.locator(".gallery-card figcaption > span");
    await expect(captions).toHaveCount(6);
    for (const caption of await captions.all()) {
      await expect(caption).toHaveText(/\S+/);
      await expect(caption).not.toHaveText(locale === "en" ? "MSRC 2026" : "مؤتمر ٢٠٢٦");
    }
    await expect(page.locator(".gallery-rail [role='region']")).toHaveAccessibleName(locale === "en" ? "MSRC previous editions photograph gallery" : "معرض صور النسخ السابقة للمؤتمر");
    for (const photograph of await page.locator(".gallery-card img").all()) {
      await expect(photograph).toHaveAttribute("alt", /\S+/);
    }
    await expect(page.locator(".hero-edition-art, .visual-edition, .legacy-art-years")).toHaveCount(0);
  }
});
// The header's "Join MSRC" arrow was a plain ↗ that pointed up-right on Arabic pages too,
// away from the reading direction, while every other button arrow mirrors.
test("the header action arrow points along each language's reading direction", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const [locale, transform] of [["en", "matrix(1, 0, 0, 1, 0, 0)"], ["ar", "matrix(-1, 0, 0, 1, 0, 0)"]] as const) {
    await page.goto(`/${locale}/participate`);
    const arrow = page.locator(".header-primary-action svg.directional-arrow");
    await expect(arrow).toHaveCount(1);
    await expect(arrow).toHaveAttribute("aria-hidden", "true");
    await expect(arrow.locator("path")).toHaveAttribute("d", /\S+/);
    expect(await arrow.evaluate((element) => getComputedStyle(element).transform), locale).toBe(transform);
  }
});

// The wordmark link was named "MSRC 2027 home" while it shows "MSRC 2027 Fifth edition", so a
// speech user saying the visible words could miss it (WCAG 2.5.3 Label in Name).
test("the wordmark's accessible name starts with its visible words", async ({ page }) => {
  for (const [locale, name] of [["en", /^MSRC 2027 Fifth edition\s*, home page$/], ["ar", /^MSRC 2027 النسخة الخامسة\s*، الصفحة الرئيسية$/]] as const) {
    await page.goto(`/${locale}`);
    await expect(page.getByRole("banner").getByRole("link", { name }), locale).toHaveCount(1);
  }
});

// Before Noto Sans Arabic arrived, Arabic fell back to Arial, whose Arabic is about 25% narrower,
// so the /ar/participate lead grew from one line to two at the swap (CLS 0.096). The fallback face
// uses Tahoma, so this only applies where Tahoma is installed (Windows, macOS).
test("Arabic text keeps its wrap when the Arabic webfont arrives", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/*noto_sans_arabic*", async (route) => { await held; await route.continue(); });
  await page.goto("/ar/participate", { waitUntil: "domcontentloaded" });
  const hasTahoma = await page.evaluate(() => document.fonts.check('16px "MSRC Arabic Fallback"', "ا") && (() => {
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = "40px Tahoma, monospace"; const a = c.measureText("ابتثج").width;
    c.font = "40px monospace"; return a !== c.measureText("ابتثج").width;
  })());
  test.skip(!hasTahoma, "Tahoma is not installed, so the fallback face is skipped");
  const lead = page.locator(".experience-lead").first();
  const before = await lead.evaluate((element) => element.getBoundingClientRect().height);
  release();
  await page.waitForFunction(() => document.fonts.check('16px "arabicFont"', "ا") && document.fonts.status === "loaded");
  await page.waitForTimeout(200);
  expect(await lead.evaluate((element) => element.getBoundingClientRect().height)).toBe(before);
});

// Each filter change wrote every filter from the last render, so a second change before React
// caught up put back the old value: choosing an edition and then a kind dropped the edition.
test("quick successive filter changes keep each other", async ({ page }) => {
  await page.goto("/en/media");
  await expect(page.getByTestId("media-edition")).toBeEnabled();
  await expect(page.getByTestId("media-kind")).toBeEnabled();
  await page.evaluate(() => {
    const choose = (id: string, value: string) => {
      const select = document.getElementById(id) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    choose("media-edition", "2026");
    choose("media-kind", "recording");
  });
  await expect.poll(() => new URL(page.url()).searchParams.toString()).toBe("edition=2026&kind=recording");
  await expect(page.getByTestId("media-edition")).toHaveValue("2026");
  await expect(page.getByTestId("media-kind")).toHaveValue("recording");
});

// Contrast themes must retain selected programme days and a visible keyboard path.
test("forced colours retain programme selection and keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const keepsFill = (selector: string) => page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return style.forcedColorAdjust === "none" && style.backgroundColor !== "rgba(0, 0, 0, 0)";
  });
  await page.goto("/en/program");
  const day1 = page.getByTestId("program-day-day1");
  await expect(async () => { await day1.click(); await expect(day1).toHaveAttribute("aria-current", "true", { timeout: 500 }); }).toPass();
  expect(await keepsFill('[data-testid="program-day-day1"]')).toBe(true);
  expect(await keepsFill('[data-testid="program-day-all"]')).toBe(false);
  // Establish keyboard modality after the pointer selection so :focus-visible is exercised.
  await page.keyboard.press("Tab");
  const toggle = page.locator(".menu-toggle");
  if (await toggle.isVisible()) {
    await toggle.focus();
    await page.keyboard.press("Enter");
  }
  const navigation = page.locator(await toggle.isVisible() ? ".mobile-menu nav" : ".desktop-nav");
  const current = navigation.locator('a[href="/en/program"]');
  await expect(current).toHaveAttribute("aria-current", "page");
  await current.focus();
  await expect(current).toBeFocused();
  expect(await current.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
  })).toBe(true);
});
// Live QA 2026-10-08. On desktop the homepage zeroes scroll-padding for its chapter jumps, so
// tabbing scrolled controls (an Arabic FAQ question) under the sticky chapter bar.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} desktop homepage keeps keyboard focus clear of the floating header`, async ({ page, isMobile }) => {
    test.skip(isMobile, "The desktop keyboard traversal runs once per locale.");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before");
    const covered: string[] = [];
    for (let step = 0; step < 100; step++) {
      await page.keyboard.press("Tab");
      const state = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || !element.closest(".homepage-journey")) return element?.closest("footer") ? "done" : null;
        const box = element.getBoundingClientRect();
        const overlaps = (selector: string) => {
          const cover = document.querySelector(selector)!.getBoundingClientRect();
          return box.top < cover.bottom - 1 && box.bottom > cover.top + 1;
        };
        return box.height > 0 && overlaps(".site-header-inner") ? `${element.tagName}: ${element.textContent?.trim().slice(0, 30)}` : null;
      });
      if (state === "done") break;
      if (state) covered.push(state);
    }
    expect(covered).toEqual([]);
  });
}

// Live QA (2026-10-13): the four identical placeholder speaker cards each added a separate
// "Meet the speakers" tab stop to the same page. The section action is the one keyboard route.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} placeholder speaker cards add no duplicate keyboard stops`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const name = locale === "ar" ? "تعرّف إلى المتحدثين" : "Meet the speakers";
    await expect(page.locator("#speakers").getByRole("link", { name, exact: true })).toHaveCount(1);
    await expect(page.locator(".speaker-preview-link")).toHaveCount(4);
    for (const link of await page.locator(".speaker-preview-link").all()) {
      await expect(link).toHaveAttribute("tabindex", "-1");
      await expect(link).toHaveAttribute("href", `/${locale}/speakers`);
    }
  });
}
