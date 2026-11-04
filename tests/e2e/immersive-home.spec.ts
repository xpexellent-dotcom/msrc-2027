import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { homepageCopy } from "../../src/content/public-site";
import { homepageNarrative } from "../../src/content/homepage-narrative";
import { cinematicCopy } from "../../src/content/cinematic-demo";
import { conferenceExpectations } from "../../src/content/conference-expectations";

// ORG-071 / ENG-093; DSN-01, ACC-01, LOC-01/03. Exact phone matrix runs once.
const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
async function ready(page: Page, locale: "en" | "ar") {
  await page.goto(`/${locale}`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-pathway-deck]")).toHaveAttribute("data-deck", /stack|static/);
}
async function scroll(page: Page, top: number) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}
async function metrics(page: Page) {
  return page.locator("[data-pathway-deck]").evaluate((list) => ({
    top: list.getBoundingClientRect().top + scrollY,
    height: list.getBoundingClientRect().height,
    card: list.firstElementChild!.getBoundingClientRect().height,
  }));
}
async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    headings: [...document.querySelectorAll<HTMLElement>("h1,h2,h3")].filter((heading) => heading.scrollWidth > heading.clientWidth + 1).map((heading) => ({ text: heading.textContent, scroll: heading.scrollWidth, client: heading.clientWidth })),
  }));
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.headings, `Viewport ${page.viewportSize()?.width}: ${JSON.stringify(overflow)}`).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  test.describe(`${locale} immersive homepage`, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== "chromium-mobile", "Explicit viewport coverage runs in the mobile project once per locale.");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
    });

    test("removed filler stays absent at phone and desktop while qualifiers survive", async ({ page }) => {
      const copy = homepageCopy[locale], narrative = homepageNarrative[locale], demo = cinematicCopy[locale], expectations = conferenceExpectations[locale];
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await ready(page, locale);
        const main = page.getByRole("main");
        const removed = [copy.lead, copy.pathwaysBody, demo.pathwaysLink, ...copy.pathways.map((path) => path.description), demo.threeMinute.description,
          expectations.introduction, ...expectations.benefits.filter((benefit) => ["practice", "network", "research"].includes(benefit.icon)).map((benefit) => benefit.body),
          narrative.speakersBody, demo.speakerTitle, demo.speakerPending, expectations.historyBody, expectations.venueBody, narrative.datesLink,
          locale === "en" ? "Scroll to explore" : "اسحب لاستكشاف المزيد"];
        for (const text of removed) await expect(main).not.toContainText(text);
        await expect(page.locator("#essentials,#event-details,.hero-lead,.pathway-description,.speaker-preview-card")).toHaveCount(0);
        await expect(page.locator(".pathway-meta .status-badge")).toHaveCount(4);
        await expect(page.locator('[data-pathway="/registration"] .status-badge')).toHaveCount(0);
        await expect(page.locator(".speakers-pending")).toHaveText(narrative.speakersPending);
        for (const benefit of expectations.benefits.filter((benefit) => ["cme", "award", "certificate"].includes(benefit.icon))) await expect(page.locator(".program-experiences")).toContainText(benefit.icon === "cme" ? benefit.homepageBody! : benefit.body);
        await expect(page.locator(".benefit-cme-note")).toHaveText(locale === "en" ? "Illustrative" : "مثال بصري");
        await expect(page.locator(".history-numbers")).toContainText(expectations.editions);
        await expect(page.locator(".home-photo-edition")).toHaveCount(6);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", expect.stringContaining(copy.lead));
      }
    });

    test("headings, short 3MT display and links retain their accessible names", async ({ page }) => {
      await ready(page, locale);
      const paths = [...homepageCopy[locale].pathways, cinematicCopy[locale].threeMinute];
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const cards = page.locator(".pathway-list > article");
      for (let index = 0; index < paths.length; index++) {
        await expect(cards.nth(index).getByRole("heading", { level: 3 })).toHaveAccessibleName(paths[index].category);
        await expect(cards.nth(index).locator(".pathway-action")).toHaveAccessibleName(`${homepageNarrative[locale].pathwayLink}: ${paths[index].category}`);
        expect(await cards.nth(index).evaluate((card) => Boolean(card.querySelector(".pathway-kicker")!.compareDocumentPosition(card.querySelector("h3")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      }
      await expect(cards.last().locator("h3 > span[aria-hidden='true']")).toHaveText("3MT");
      await expect(page.locator("#venue a")).toHaveCount(1);
      await expect(page.locator(".closing-grid a")).toHaveCount(1);
      await expect(page.locator(".hero-scroll")).toHaveAccessibleName(homepageNarrative[locale].scroll);
      expect((await page.locator(".hero-scroll-label").boundingBox())!.width).toBeGreaterThan(1);
      await expect(page.locator(".hero-scroll")).toHaveAttribute("href", "#participate");
      for (const orb of await page.locator(".pathway-action").all()) expect((await orb.boundingBox())!.width).toBe(56);
    });

    test("headings fit narrow screens without silent mid-word wrapping and reflow at 200%", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await ready(page, locale);
      for (const width of [320, 360, 390, 412, 791, 1280, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await assertNoOverflow(page);
      }
      const style = await page.addStyleTag({ content: "h1,h2,h3{overflow-wrap:normal!important}" });
      for (const width of [320, 360, 390, 412]) {
        await page.setViewportSize({ width, height: 844 });
        await assertNoOverflow(page);
      }
      await style.evaluate((element) => element.parentNode?.removeChild(element));
      await page.setViewportSize({ width: 280, height: 844 });
      await page.addStyleTag({ content: "html{font-size:200%!important}" });
      await assertNoOverflow(page);
    });

    test("native deck pins, overlaps, recedes and releases without runway", async ({ page }) => {
      await ready(page, locale);
      const list = page.locator("[data-pathway-deck]");
      await expect(list).toHaveAttribute("data-deck", "stack");
      await expect(list).toHaveCSS("display", "block");
      const badAncestors = await list.evaluate((element) => {
        const failures: string[] = [];
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (![style.overflowX, style.overflowY].every((value) => ["visible", "clip"].includes(value))) failures.push(`${ancestor.className}: ${style.overflow}`);
        }
        return failures;
      });
      expect(badAncestors).toEqual([]);
      const cards = list.locator(":scope > article");
      for (const card of await cards.all()) { await expect(card).toHaveCSS("position", "sticky"); await expect(card).toHaveCSS("top", "0px"); }
      const m = await metrics(page);
      await scroll(page, m.top + 1.5 * m.card);
      const second = (await cards.nth(1).boundingBox())!, third = (await cards.nth(2).boundingBox())!;
      expect(Math.abs(second.y)).toBeLessThanOrEqual(1);
      expect(third.y).toBeLessThan(second.y + second.height);
      if (await page.evaluate(() => CSS.supports("animation-timeline: view()"))) {
        expect(await cards.first().locator(".pathway-tile").evaluate((tile) => parseFloat(getComputedStyle(tile).scale))).toBeLessThan(1);
        expect(await cards.first().locator(".pathway-tile").evaluate((tile) => parseFloat(getComputedStyle(tile, "::after").opacity))).toBeGreaterThan(0);
      }
      for (const card of await cards.all()) { await expect(card).toHaveCSS("opacity", "1"); await expect(card).toHaveCSS("transform", "none"); }
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
      expect(await list.evaluate((element) => Math.abs(element.getBoundingClientRect().height - [...element.children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0)))).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => Math.abs(document.querySelector("#program")!.getBoundingClientRect().top - document.querySelector("[data-pathway-deck]")!.getBoundingClientRect().bottom))).toBeLessThanOrEqual(1);
      await scroll(page, Math.ceil(m.top + 1.05 * m.card));
      for (const selector of [".pathway-name", ".pathway-meta"]) await expect.poll(() => cards.nth(1).locator(selector).evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.99);
      expect(await cards.nth(1).locator(".pathway-name").evaluate((element) => getComputedStyle(element).translate)).toMatch(/^(none|0px(?: 0px)?)$/);
    });

    test("keyboard focus raises a covered card with a reachable full-strength orb", async ({ page }) => {
      await ready(page, locale);
      const m = await metrics(page);
      await scroll(page, m.top + 3.5 * m.card);
      const orb = page.locator("#pathway-workshops .pathway-action");
      // Establish keyboard modality, then traverse onto the requested destination.
      await page.keyboard.press("Tab");
      await orb.focus();
      await expect(orb).toBeFocused();
      await expect(page.locator("#pathway-workshops")).toHaveCSS("z-index", "2");
      expect(await page.locator("#pathway-workshops .pathway-tile").evaluate((element) => getComputedStyle(element).scale)).toMatch(/^(none|1)$/);
      expect(await orb.evaluate((element) => { const r = element.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === element || !!hit && element.contains(hit); })).toBe(true);
    });

    test("whole tile and orb navigate on phone and desktop without persistent tap raising", async ({ page }) => {
      await ready(page, locale);
      const deck = await metrics(page);
      await scroll(page, deck.top + 2.5 * deck.card);
      await page.mouse.click(30, 200);
      await expect(page).toHaveURL(new RegExp(`/${locale}/workshops$`));
      await page.goBack();
      await expect(page.locator("[data-pathway-deck]")).toHaveAttribute("data-deck", "stack");
      expect(await page.locator(".pathway-card").evaluateAll((cards) => cards.some((card) => getComputedStyle(card).zIndex === "2"))).toBe(false);
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        for (const target of ["tile", "orb"]) {
          await ready(page, locale);
          const tile = page.locator("#pathway-abstracts .pathway-tile");
          await tile.scrollIntoViewIfNeeded();
          if (target === "tile") {
            const r = (await tile.boundingBox())!;
            const headerBottom = await page.locator(".site-header-inner").evaluate((header) => header.getBoundingClientRect().bottom);
            await page.mouse.click(locale === "ar" ? r.x + r.width - 20 : r.x + 20, Math.max(r.y + 24, headerBottom + 20));
          } else await page.locator("#pathway-abstracts .pathway-action").click();
          await expect(page).toHaveURL(new RegExp(`/${locale}/abstracts$`));
          await page.goBack();
          await expect(page.locator("[data-pathway-deck]")).toHaveAttribute("data-deck", "static");
          expect(await page.locator(".pathway-card").evaluateAll((cards) => cards.some((card) => getComputedStyle(card).zIndex === "2"))).toBe(false);
        }
      }
    });

    test("reduced motion and fit gate keep every control reachable and restore the deck on resize", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await ready(page, locale);
      const list = page.locator("[data-pathway-deck]");
      await expect(list).toHaveAttribute("data-deck", "static");
      await expect(list.locator("article").first()).toHaveCSS("position", "static");
      await expect(list.locator(".pathway-tile").first()).toHaveCSS("scale", "none");
      for (const selector of [".pathway-tile", ".pathway-kicker", ".pathway-name", ".pathway-meta"]) await expect(list.locator(selector).first()).toHaveCSS("animation-name", "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(list).toHaveAttribute("data-deck", "stack");
      await page.setViewportSize({ width: 390, height: 500 });
      await expect(list).toHaveAttribute("data-deck", "static");
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(list).toHaveAttribute("data-deck", "stack");
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(list).toHaveAttribute("data-deck", "static");
      await page.setViewportSize({ width: 320, height: 600 });
      await page.addStyleTag({ content: "html{font-size:200%!important}" });
      await expect(list).toHaveAttribute("data-deck", "static");
      for (const orb of await list.locator(".pathway-action").all()) { await orb.focus(); await expect(orb).toBeInViewport({ ratio: 1 }); }
    });

    test("RTL orb placement and the bottom-anchored hero stay readable", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await ready(page, locale);
      const tile = page.locator(".pathway-tile").first(), orb = tile.locator(".pathway-action"), title = tile.locator("h3");
      const o = (await orb.boundingBox())!, h = (await title.boundingBox())!, t = (await tile.boundingBox())!;
      if (locale === "ar") expect(o.x).toBeLessThan(h.x + 40);
      else expect(t.x + t.width - o.x - o.width).toBeLessThanOrEqual(22);
      await expect(page.locator(".hero-bottom")).toHaveCSS("opacity", "1");
      const hero = (await page.locator(".conference-hero").boundingBox())!, headline = (await page.locator("h1").boundingBox())!;
      expect(headline.y + headline.height).toBeGreaterThan(hero.y + Math.min(hero.height, 844) / 2);
      if (locale === "en") { const size = await page.locator("h1").evaluate((element) => parseFloat(getComputedStyle(element).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize)); expect(size).toBeGreaterThanOrEqual(2.8); expect(size).toBeLessThanOrEqual(5.5); }
      const location = page.locator(".hero-location > span");
      expect((await location.nth(2).boundingBox())!.y).toBeGreaterThan((await location.first().boundingBox())!.y);
      await expect(location.nth(1)).toBeHidden();
    });

    test("photo text passes sampled pixel contrast against ivory", async ({ page }, info) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await ready(page, locale);
      const regions = [
        ...["registration", "abstracts", "workshops", "hackathon", "3mt"].map((slug) => ({ section: `#pathway-${slug}`, text: ".pathway-kicker,.pathway-name,.status-badge" })),
        { section: "#legacy", text: "h2" }, { section: ".home-venue-copy", text: ".home-venue-kicker,h3" }, { section: ".city-closing", text: "h2,.closing-date" },
      ];
      const luminance = (rgb: number[]) => rgb.map((v) => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, n, index) => sum + n * [.2126, .7152, .0722][index], 0);
      const ivory = luminance([248, 246, 240]);
      for (const region of regions) {
        const section = page.locator(region.section);
        const target = section.locator(region.text).first();
        await target.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const boxes = await section.locator(region.text).evaluateAll((elements) => elements.map((element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
        const shot = await page.screenshot({ style: `${region.section} :is(${region.text}),${region.section} :is(${region.text}) *{color:transparent!important;-webkit-text-fill-color:transparent!important;background-image:none!important;text-shadow:none!important}${region.section} :is(${region.text})::before,${region.section} :is(${region.text})::after,${region.section} :is(${region.text}) *::after,${region.section} .status-badge-dot{visibility:hidden!important}` });
        await info.attach(`${locale}-${region.section}-contrast`, { body: shot, contentType: "image/png" });
        const { data, info: pixels } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const samples: number[] = [];
        const scaleX = pixels.width / 390, scaleY = pixels.height / 844;
        for (const box of boxes) for (let y = Math.max(0, Math.ceil(box.y + 2)); y < Math.min(844, box.y + box.height - 2); y += 5) for (let x = Math.max(0, Math.ceil(box.x + 2)); x < Math.min(390, box.x + box.width - 2); x += 5) {
          const offset = (Math.floor(y * scaleY) * pixels.width + Math.floor(x * scaleX)) * pixels.channels;
          samples.push((ivory + .05) / (luminance([...data.subarray(offset, offset + 3)]) + .05));
        }
        expect(samples.length, region.section).toBeGreaterThan(0);
        expect(Math.min(...samples), `${region.section}: lightest sampled background fails 4.5:1`).toBeGreaterThanOrEqual(4.5);
      }
    });

    test("axe finds no mobile or desktop violations", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of locale === "en" ? [390, 1440] : [390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await ready(page, locale);
        expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
      }
    });
  });
}
