import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { conferenceExpectations } from "../../src/content/conference-expectations";
import { cinematicCopy, demoImages } from "../../src/content/cinematic-demo";
import { homepageNarrative } from "../../src/content/homepage-narrative";
import { homepageCopy } from "../../src/content/public-site";

// ORG-072 / ENG-094: owner-visible geometry, content, fonts and memory limits.
async function ready(page: Page, locale: "en" | "ar", width = 390, motion: "reduce" | "no-preference" = "reduce") {
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(`/${locale}`);
  await page.evaluate(() => document.fonts.ready);
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} v2 title is exactly two lines from 320 to 1920 and its gradient crosses both`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "The exact viewport matrix runs once.");
    for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
      await ready(page, locale, width);
      const title = page.locator("#hero-title");
      const geometry = await title.evaluate((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const tops = new Set<number>();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const box of range.getClientRects()) if (box.width > 0) tops.add(Math.round(box.top));
        }
        return { lines: tops.size, overflow: element.scrollWidth - element.clientWidth };
      });
      expect(geometry.lines, `${locale} at ${width}`).toBe(2);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      await expect(title).toHaveCSS("background-clip", "text");
      await expect(title).toHaveCSS("background-image", new RegExp(locale === "ar" ? "245deg" : "115deg"));
      for (const span of await title.locator(":scope > span").all()) {
        await expect(span).toHaveCSS("transform", "none");
        await expect(span).toHaveCSS("clip-path", "none");
        await expect(span).toHaveCSS("animation-name", "none");
      }
      await noOverflow(page);
    }
  });

  test(`${locale} v2 header, title, actions, chapters and footer share the content edge`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "The exact viewport matrix runs once.");
    for (const width of [390, 768, 1024, 1440, 1920]) {
      await ready(page, locale, width, "no-preference");
      const edges = await page.evaluate(() => {
        const journey = document.querySelector(".homepage-journey")!;
        const style = getComputedStyle(journey);
        // Read the gutter in used pixels through a zero-impact measurement element.
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;width:var(--container-gutter);height:0";
        journey.append(probe);
        const gutter = probe.getBoundingClientRect().width;
        probe.remove();
        const edge = Math.max(gutter, (innerWidth - parseFloat(style.getPropertyValue("--home-container")) * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 2);
        const selectors = [".hero-conference-name", "#hero-title", ".hero-actions a:first-child", ".hero-actions a:last-child", ".hero-location", ".wordmark-logo", "#participate h2", ".path-bento", "#practical-title", ".footer-brand img", ".footer-directory-group"];
        return { edge, items: selectors.map((selector) => {
          const box = document.querySelector(selector)!.getBoundingClientRect();
          return { selector, edge: document.documentElement.dir === "rtl" ? innerWidth - box.right : box.left };
        }) };
      });
      for (const item of edges.items) expect(Math.abs(item.edge - edges.edge), `${width} ${item.selector}: ${item.edge} vs ${edges.edge}`).toBeLessThanOrEqual(1);
      if (locale === "en") {
        const spacing = await page.locator(".section-heading h2").evaluateAll((headings) => headings.map((heading) => {
          const style = getComputedStyle(heading);
          return { tracking: parseFloat(style.letterSpacing) / parseFloat(style.fontSize), words: parseFloat(style.wordSpacing) / parseFloat(style.fontSize) };
        }));
        for (const heading of spacing) {
          expect(heading.tracking).toBeCloseTo(-.005, 4);
          expect(heading.words).toBeCloseTo(.04, 4);
        }
      }
      if (width >= 801) {
        const lines = await page.locator("#program-title").evaluate((heading) => {
          const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
          const tops = new Set<number>();
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const range = document.createRange(); range.selectNodeContents(node);
            for (const rect of range.getClientRects()) if (rect.width) tops.add(Math.round(rect.top));
          }
          return tops.size;
        });
        expect(lines, `Program stays on two lines at ${width}`).toBe(2);
      }
      // ENG-094: the restored two-column FAQ rows are an explicit edge exception.
      const intro = (await page.locator(".faq-introduction").boundingBox())!;
      const firstRow = (await page.locator(".faq-item").first().boundingBox())!;
      if (width >= 801) {
        expect(locale === "ar" ? firstRow.x + firstRow.width : intro.x + intro.width).toBeLessThan(locale === "ar" ? intro.x : firstRow.x);
        expect(Math.abs(firstRow.y - intro.y)).toBeLessThanOrEqual(1);
      } else expect(Math.abs((locale === "ar" ? width - firstRow.x - firstRow.width : firstRow.x) - edges.edge)).toBeLessThanOrEqual(1);
      const venue = (await page.locator(".home-venue-figure").boundingBox())!;
      expect(Math.abs(venue.width - (width - 2 * edges.edge))).toBeLessThanOrEqual(1);
      await expect(page.locator(".home-venue-photo img")).toHaveAttribute("sizes", "(max-width: 800px) 94vw, 1200px");
      for (const part of await page.locator(".countdown-time-part").all()) await expect(part).toHaveCSS("text-align", "start");
      const actions = page.locator(".hero-actions a");
      await expect(actions).toHaveCount(2);
      const primary = (await actions.nth(0).boundingBox())!;
      const secondary = (await actions.nth(1).boundingBox())!;
      expect(Math.abs(primary.x - secondary.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(primary.width - secondary.width)).toBeLessThanOrEqual(1);
      expect(secondary.y).toBeGreaterThanOrEqual(primary.y + primary.height);
      if (width > 700) {
        const control = page.locator(".hero-media-controls");
        await expect(control.locator(".hero-media-control")).toBeVisible();
        const box = (await control.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(Math.abs((locale === "ar" ? box.x : width - box.x - box.width) - edges.edge)).toBeLessThanOrEqual(1);
        for (const selector of [".hero-countdown", ".conference-hero > .flow-ribbon"]) {
          const other = (await page.locator(selector).boundingBox())!;
          expect(box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y, `control clears ${selector}`).toBe(false);
        }
      }
    }
  });

  test(`${locale} v2 removes the cue, stacks and default-build placeholders`, async ({ page }) => {
    await ready(page, locale);
    await expect(page.locator(".hero-scroll, .hero-bottom, [data-pathway-deck], .pathway-track-nav, .sponsor-belt, .hero-social, .social-item--placeholder")).toHaveCount(0);
    await expect(page.locator("main").getByText(homepageCopy[locale].lead, { exact: true })).toHaveCount(0);
    for (const script of await page.locator("script[src]").evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).src))) {
      expect(await (await page.request.get(script)).text()).not.toContain("MSRC_HOME_PLACEHOLDERS");
    }
  });

  test(`${locale} v2 bento has one named route per tile and reflows with enlarged text`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "The exact viewport matrix runs once.");
    for (const [width, columns] of [[320, 1], [390, 2], [768, 4], [1280, 12]]) {
      await ready(page, locale, width);
      expect(await page.locator(".path-bento").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(columns);
      const cards = page.locator(".pathway-list > article");
      await expect(cards).toHaveCount(5);
      const expectedHrefs = ["registration", "abstracts", "workshops", "hackathon", "3mt"].map((path) => `/${locale}/${path}`);
      expect(await cards.locator(".pathway-action").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(expectedHrefs);
      for (const card of await cards.all()) {
        const link = card.locator(".pathway-action");
        await expect(link).toHaveAccessibleName((await link.innerText()).trim());
        const kicker = await link.getAttribute("aria-describedby");
        expect(kicker).toBeTruthy();
        await expect(page.locator(`[id="${kicker}"]`)).toHaveClass("pathway-kicker");
        await expect(card.locator("a[href], button, [tabindex='0']")).toHaveCount(1);
      }
      await expect(cards.locator(":is(a,button) :is(a,button)")).toHaveCount(0);
      await expect(cards.locator(".status-badge")).toHaveCount(4);
      await expect(cards.locator(".brand-icon img[alt='']")).toHaveCount(4);
      if (locale === "ar" && width >= 768) expect((await cards.first().boundingBox())!.x).toBeGreaterThan((await cards.nth(1).boundingBox())!.x);
      await page.keyboard.press("Tab");
      await cards.nth(1).locator("a").focus();
      expect(await cards.nth(1).evaluate((element) => {
        const card = getComputedStyle(element);
        const link = getComputedStyle(element.querySelector("a")!);
        return (card.outlineStyle !== "none" && parseFloat(card.outlineWidth) >= 3) || (link.outlineStyle !== "none" && parseFloat(link.outlineWidth) >= 3);
      })).toBe(true);
    }
    await ready(page, locale, 320);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.locator(".path-bento").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
    await noOverflow(page);
  });

  test(`${locale} v2 public controls are rounded rectangles and official logos sit on purple`, async ({ page }) => {
    await ready(page, locale);
    const circles = await page.locator("main :is(a,button), .header-primary-action, .language-switch, .menu-toggle, .header-dropdown-toggle").evaluateAll((elements) => elements.flatMap((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (!box.height || !box.width) return [];
      return parseFloat(style.borderTopLeftRadius) >= box.height / 2 - 1 ? [`${element.className}: ${style.borderTopLeftRadius} / ${box.height}`] : [];
    }));
    expect(circles).toEqual([]);
    await expect(page.locator('.wordmark img[src*="msrc27-logo-on-purple"]')).toHaveAttribute("alt", "");
    await expect(page.locator('.footer-brand img[src*="msrc27-logo-on-purple"]')).toHaveAttribute("alt", "");
    await expect(page.locator(".header-glass")).toHaveCSS("background-color", "rgb(59, 30, 109)");
    await expect(page.locator(".site-footer")).toHaveCSS("background-color", "rgb(59, 30, 109)");
    await page.goto(`/${locale}/dates-venue`);
    await page.getByTestId("venue-arrival-journey").scrollIntoViewIfNeeded();
    await expect(page.locator(".header-glass")).toHaveCSS("background-color", "rgb(59, 30, 109)");
  });

  test(`${locale} v2 iOS materials, image sizes and phone positioning stay within budget`, async ({ page }) => {
    await ready(page, locale);
    const violations = await page.evaluate(() => [...document.querySelectorAll("*")].flatMap((element) => {
      const style = getComputedStyle(element);
      const faults = [];
      if (style.backdropFilter !== "none") faults.push("backdrop");
      if (style.mixBlendMode !== "normal") faults.push("blend");
      if (element.closest("main") && /blur\((?!0(?:px)?\))/.test(style.filter)) faults.push(`filter ${style.filter}`);
      if (element.closest("main") && style.position === "sticky") faults.push("phone sticky");
      if (element instanceof HTMLImageElement && [...element.sizes.matchAll(/(\d+(?:\.\d+)?)vw/g)].some((match) => Number(match[1]) > 100)) faults.push("sizes");
      return faults.map((fault) => `${element.tagName}.${element.className}: ${fault}`);
    }));
    expect(violations).toEqual([]);
  });

  test(`${locale} v2 hero decoder and countdown pause off-screen and resume on return`, async ({ page }) => {
    await ready(page, locale, 390, "no-preference");
    const video = page.locator(".conference-hero video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await page.locator("#program").scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    const mutations = await page.locator(".hero-countdown").evaluate((element) => new Promise<number>((resolve) => {
      let count = 0;
      const observer = new MutationObserver((records) => { count += records.length; });
      observer.observe(element, { childList: true, subtree: true, characterData: true, attributes: true });
      setTimeout(() => { observer.disconnect(); resolve(count); }, 3000);
    }));
    expect(mutations).toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused)).toBe(true);
  });

  test(`${locale} v2 never runs more than ten CSS animations`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Sample each exact viewport once.");
    await ready(page, locale, 390, "no-preference");
    const samples = [];
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 300) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      // Two paints allow IO/reveal state to commit without waiting for animations to finish.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const sample = await page.evaluate(() => {
        const animations = document.getAnimations().filter((animation) => animation instanceof CSSAnimation && animation.playState === "running");
        return animations.map((animation) => ({ name: (animation as CSSAnimation).animationName, properties: Object.keys((animation.effect as KeyframeEffect).getKeyframes()[0] ?? {}).filter((key) => !["offset", "computedOffset", "easing", "composite"].includes(key)) }));
      });
      samples.push({ y, animations: sample });
      expect(sample.length, `at ${y}: ${JSON.stringify(sample)}`).toBeLessThanOrEqual(10);
      for (const animation of sample) expect(animation.properties.every((property) => ["opacity", "transform", "translate", "scale", "rotate", "strokeDashoffset"].includes(property)), JSON.stringify(animation)).toBe(true);
    }
    await testInfo.attach("animation-budget", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
  });

  test(`${locale} v2 lower sections preserve approved text and honesty qualifiers`, async ({ page }) => {
    await ready(page, locale);
    const expectations = conferenceExpectations[locale];
    const narrative = homepageNarrative[locale];
    const demo = cinematicCopy[locale];
    const program = page.locator("#program");
    await expect(program).toContainText(expectations.introduction);
    for (const benefit of expectations.benefits) {
      await expect(program).toContainText(benefit.title);
      await expect(program).toContainText(benefit.homepageBody ?? benefit.body);
    }
    await expect(program.locator(".benefit-cme-note")).toHaveText(locale === "en" ? "Illustrative" : "مثال بصري");
    await expect(program.locator(".benefit-cme")).toHaveAccessibleName(locale === "en" ? "7 CME hours: illustrative only, hours unconfirmed" : "٧ ساعات تعليم طبي مستمر: مثال بصري فقط، العدد غير مؤكد");
    const speakers = page.locator("#speakers");
    await expect(speakers).toContainText(narrative.speakersBody);
    await expect(speakers.getByText(demo.speakerTitle, { exact: true })).toHaveCount(4);
    await expect(speakers.getByText(demo.speakerPending, { exact: true })).toHaveCount(4);
    await expect(speakers.locator("img")).toHaveCount(0);
    const legacy = page.locator("#legacy");
    for (const text of [expectations.historyBody, expectations.attendance, expectations.editions, expectations.historyEdition, expectations.lastEdition, expectations.research]) await expect(legacy).toContainText(text);
    expect(await legacy.locator(".history-numbers > div").evaluateAll((groups) => groups.map((group) => [...group.children].map((child) => child.tagName)))).toEqual([["DT", "DD"], ["DT", "DD"], ["DT", "DD"]]);
    await expect(legacy.locator(".history-total .history-count-suffix")).toBeVisible();
    await expect(legacy.locator(".history-total .history-count-suffix")).toHaveText("+");
    await expect(legacy.locator(".history-total dd > .sr-only")).toHaveText(locale === "en" ? "4,007+" : "٤٬٠٠٧+");
    for (const edition of await legacy.locator(".history-numbers bdi").all()) {
      if (locale === "en") await expect(edition).toHaveAttribute("lang", "en");
      else await expect(edition).not.toHaveAttribute("lang", "en");
    }
    for (const image of demoImages.gallery) await expect(legacy).toContainText(image.caption[locale]);
    const venue = page.locator("#venue");
    for (const text of [expectations.venueName, expectations.venueBody, expectations.venueLocation]) await expect(venue).toContainText(text);
    for (const text of [narrative.datesLink, demo.contact, ...narrative.faq.map((item) => item.question)]) await expect(page.locator("#faq")).toContainText(text);
    await expect(page.locator("#closing-title")).toHaveText(homepageCopy[locale].endingTitle);
    for (const text of await page.locator(".hero-location > span:not([aria-hidden])").allTextContents()) {
      await expect(page.locator(".closing-date")).toContainText(text);
    }
    for (const label of [expectations.link, narrative.speakersLink, expectations.legacyLink, expectations.venueLink, narrative.datesLink, demo.contact]) {
      await expect(page.locator("main").getByRole("link", { name: label, exact: true }).first()).toHaveCount(1);
    }
    await expect(page.getByTestId("watch-opening-film")).toHaveAccessibleName(narrative.filmLink);
  });

  for (const width of [390, 1440]) {
    test(`${locale} v2 ${width} font swap CLS stays below 0.05`, async ({ page, browserName }, testInfo) => {
      test.skip(browserName !== "chromium" || testInfo.project.name !== "chromium-desktop", "Chromium font-swap matrix runs once.");
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(() => {
        Object.assign(window, { homeV2LayoutShifts: [] });
        new PerformanceObserver((list) => {
          const entries = list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[];
          (window as unknown as { homeV2LayoutShifts: number[] }).homeV2LayoutShifts.push(...entries.filter((entry) => !entry.hadRecentInput).map((entry) => entry.value));
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.route("**/*.woff2", async (route) => { await new Promise((resolve) => setTimeout(resolve, 800)); await route.continue(); });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const cls = await page.evaluate(() => (window as unknown as { homeV2LayoutShifts: number[] }).homeV2LayoutShifts.reduce((sum, value) => sum + value, 0));
      await testInfo.attach("font-swap-cls", { body: JSON.stringify({ locale, width, cls }), contentType: "application/json" });
      expect(cls).toBeLessThan(.05);
    });
  }

  test(`${locale} v2 is accessible with reduced motion`, async ({ page }) => {
    await ready(page, locale);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations).toEqual([]);
  });

  test(`${locale} review fixes keep phone rails, footer and dark focus readable`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Exact phone and desktop geometry runs once.");
    for (const width of [320, 390, 1024, 1440]) {
      await ready(page, locale, width);
      for (const rail of await page.locator(".homepage-journey .rail-track").all()) {
        const boxes = await rail.evaluate((element) => {
          const items = [...element.children].map((item) => item.getBoundingClientRect());
          const gutter = parseFloat(getComputedStyle(element).paddingInlineStart);
          const rtl = document.documentElement.dir === "rtl";
          return { start: rtl ? innerWidth - items[0].right : items[0].left, gutter, peek: rtl ? items[1].right : innerWidth - items[1].left, end: rtl ? element.getBoundingClientRect().left : innerWidth - element.getBoundingClientRect().right };
        });
        expect(Math.abs(boxes.start - boxes.gutter)).toBeLessThanOrEqual(1);
        expect(Math.abs(boxes.end)).toBeLessThanOrEqual(1);
        if (width <= 800) expect(boxes.peek).toBeGreaterThanOrEqual(39);
      }
      const maxHeight = width <= 800 ? 350 : 220;
      expect((await page.locator(".history-numbers").boundingBox())!.height).toBeLessThanOrEqual(maxHeight);
      const next = page.locator(".legacy-section .rail-buttons button").last();
      await next.focus();
      await expect(next).toHaveCSS("outline-color", "rgb(201, 162, 74)");
      await expect(next).toHaveCSS("outline-width", "3px");
      const footerRule = await page.locator(".site-footer").evaluate((element) => {
        const box = element.querySelector(".site-container")!.getBoundingClientRect();
        const rule = getComputedStyle(element, "::before");
        return { edge: parseFloat(rule.insetInlineStart), content: box.left };
      });
      expect(Math.abs(footerRule.edge - footerRule.content)).toBeLessThanOrEqual(1);
      if (width <= 480) {
        expect(await page.locator(".footer-directory li").first().evaluate((element) => parseFloat(getComputedStyle(element).lineHeight) / parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(1.4, 1);
        expect(await page.locator(".footer-directory ul").first().evaluate((element) => parseFloat(getComputedStyle(element).rowGap))).toBeGreaterThanOrEqual(4);
      }
      await noOverflow(page);
    }
    await page.emulateMedia({ forcedColors: "active" });
    for (const selector of [".community-image", ".community-flow", ".pathway-photo"]) await expect(page.locator(selector)).toBeHidden();
    await expect(page.locator(".path-tile--registration h3")).toBeVisible();
    await expect(page.locator(".history-total .history-count")).toBeVisible();
    await page.emulateMedia({ forcedColors: "none", media: "print" });
    await expect(page.locator(".rail-tools").first()).toBeHidden();
    await expect(page.locator(".rail-track").first()).toHaveCSS("display", "grid");
    await expect(page.locator(".rail-track").first()).toHaveCSS("overflow", "visible");
  });

  test(`${locale} v2 public first paint requests only its public font roles`, async ({ page }, testInfo) => {
    const fonts: { url: string; bytes: number }[] = [];
    const pending: Promise<void>[] = [];
    page.on("response", (response) => {
      if (/\.woff2(?:\?|$)/.test(response.url())) pending.push(response.body().then((body) => { fonts.push({ url: response.url(), bytes: body.byteLength }); }));
    });
    await ready(page, locale);
    await Promise.all(pending);
    const forbidden = await page.evaluate((locale) => {
      const style = getComputedStyle(document.documentElement);
      const roles = ["--font-inter", "--font-manrope", ...(locale === "en" ? ["--font-el-messiri"] : [])];
      const families = roles.flatMap((role) => style.getPropertyValue(role).split(",").map((family) => family.trim().replaceAll(/["']/g, "")).filter(Boolean));
      return [...document.styleSheets].flatMap((sheet) => {
        try { return [...sheet.cssRules].flatMap((rule) => {
          if (!(rule instanceof CSSFontFaceRule) || !families.includes(rule.style.fontFamily.replaceAll(/["']/g, ""))) return [];
          return [...rule.style.getPropertyValue("src").matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((match) => new URL(match[1], sheet.href ?? location.href).href);
        }); } catch { return []; }
      });
    }, locale);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.filter((font) => forbidden.includes(font.url))).toEqual([]);
    await testInfo.attach("first-paint-font-payload", { body: JSON.stringify({ locale, fonts, total: fonts.reduce((sum, font) => sum + font.bytes, 0) }, null, 2), contentType: "application/json" });
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} speaker bleed stays inside a classic-scrollbar viewport`, async ({ playwright }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Classic desktop scrollbar regression.");
    // Playwright hides headless scrollbars by default. Restore native scrollbars
    // so clientWidth really excludes the 15px gutter and catches the vw bleed.
    const browser = await playwright.chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    try {
      const page = await browser.newPage();
      await ready(page, locale, 1440);
      await page.addStyleTag({ content: "html { overflow-y: scroll; } ::-webkit-scrollbar { width: 15px; }" });
      await page.locator("#speakers").scrollIntoViewIfNeeded();
      const widths = await page.evaluate(() => ({ viewport: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(widths.viewport - widths.client).toBe(15);
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    } finally {
      await browser.close();
    }
  });

  test(`${locale} a future live social link retains a 44px target at 320`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Synthetic live-link style fixture runs once.");
    await ready(page, locale, 320);
    // All official URLs remain null. Exercise the real live-link classes locally.
    await page.locator(".hero-introduction").evaluate((node) => {
      const row = document.createElement("ul");
      row.className = "hero-social";
      row.innerHTML = '<li><a class="social-item" href="#program" aria-label="Synthetic social target">X</a></li><li aria-hidden="true"><span class="social-item social-item--placeholder">X</span></li><li class="social-soon" aria-hidden="true"><span>Soon</span></li>';
      node.append(row);
    });
    const box = await page.getByRole("link", { name: "Synthetic social target" }).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await noOverflow(page);
  });
}

test("Arabic history grouping keeps its final value through motion and no JavaScript", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "History number rendering matrix runs once.");
  await ready(page, "ar", 390);
  const counts = page.locator(".history-count");
  const final = await counts.allTextContents();
  // Visual grouping is a baseline Latin comma in DM Sans; the sr-only value keeps Intl's U+066C.
  await expect(page.locator(".history-count-group").first()).toHaveText(",");
  await expect(page.locator(".history-total dd > .sr-only")).toHaveText("\u0664\u066c\u0660\u0660\u0667+");
  const usesTextFace = await page.locator(".history-count-group").evaluateAll((nodes) => nodes.every((node) => {
    const probe = document.createElement("span");
    probe.style.fontFamily = "var(--font-dm-sans), Arial, sans-serif";
    node.append(probe);
    const expected = getComputedStyle(probe).fontFamily;
    probe.remove();
    return getComputedStyle(node).fontFamily === expected;
  }));
  expect(usesTextFace).toBe(true);
  await ready(page, "ar", 390, "no-preference");
  await page.locator(".history-numbers").scrollIntoViewIfNeeded();
  await expect.poll(() => counts.allTextContents()).toEqual(final);
  await expect(page.locator('.history-count[data-counting="true"]')).toHaveCount(0);
  await expect(page.locator(".history-count-group")).toHaveCount(2);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const staticPage = await context.newPage();
  await staticPage.goto(new URL("/ar", page.url()).href);
  expect(await staticPage.locator(".history-count").allTextContents()).toEqual(final);
  await expect(staticPage.locator(".history-count-group")).toHaveCount(2);
  await context.close();
});
