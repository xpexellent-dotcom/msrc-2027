import { expect, test } from "@playwright/test";

// Regressions found in live QA (2026-10-01). Kept separate from feature specs.

// Letter-spacing pulls joined Arabic letters apart in WebKit, so on every iPhone browser:
// the hero kicker, caption and film provenance were tracked at 0.06–0.1em.
test("Arabic words are never letter-spaced", async ({ page }) => {
  for (const path of ["/ar", "/ar/about", "/ar/dates-venue", "/ar/program", "/ar/participate", "/ar/media"]) {
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

// ORG-007: one centred "Step inside" cue without the MSRC2026 caption. It glides to the dates
// band when motion is allowed and jumps under reduced motion; the band clears the header.
for (const [motion, glides] of [["no-preference", true], ["reduce", false]] as const) {
  for (const locale of ["en", "ar"] as const) {
    test(`${locale} Step inside is centred and ${glides ? "glides" : "jumps"} to the dates band (${motion})`, async ({ page, browserName }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto(`/${locale}`);
      // Before hydration a click is a plain fragment jump; the live countdown marks hydration,
      // which took over 5 s once on a loaded local run.
      await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
      await expect(page.locator(".conference-hero .hero-caption")).toHaveCount(0);
      const cue = page.locator(".hero-scroll");
      await expect(cue).toHaveAttribute("href", "#essentials");
      expect(await cue.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const row = element.closest(".hero-bottom")!.getBoundingClientRect();
        return Math.abs(box.left + box.width / 2 - (row.left + row.width / 2));
      })).toBeLessThanOrEqual(1);
      expect(await page.locator(".scroll-line").evaluate((line) => getComputedStyle(line, "::after").animationName)).toBe(glides ? "scroll-cue" : "none");

      // Sample the scroll position while the activation's scroll runs. The element is clicked
      // in the page: Playwright's own pre-click scrolling would add positions of its own.
      await page.evaluate(() => {
        const positions: number[] = [];
        Object.assign(window, { scrollSamples: positions });
        const timer = setInterval(() => positions.push(window.scrollY), 10);
        setTimeout(() => clearInterval(timer), 1500);
      });
      await cue.evaluate((element) => (element as HTMLElement).click());
      await expect(page).toHaveURL(new RegExp(`/${locale}#essentials$`));
      await expect(page.locator("#essentials")).toBeFocused();
      await page.waitForTimeout(1600);
      const positions = await page.evaluate(() => (window as unknown as { scrollSamples: number[] }).scrollSamples);
      const settled = positions[positions.length - 1];
      expect(settled).toBeGreaterThan(0);
      // Headless WebKit advances a smooth scroll on this page in one or two coarse steps; a jump
      // is still asserted there, the glide only where frames are rendered (Chromium, CI).
      if (!(glides && browserName === "webkit")) expect(positions.some((y) => y > 0 && y < settled - 1), positions.join(",")).toBe(glides);
      expect(await page.evaluate(() => document.querySelector("#event-details-title")!.getBoundingClientRect().top
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
        authoredLines: heading.textContent!.split("\n").length,
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
