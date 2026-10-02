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
      // Before hydration a click is a plain fragment jump; the live countdown marks hydration.
      await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before");
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
