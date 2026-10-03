import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// ORG-010: phones have no chapter bar. Each chapter title arrives big and centred, holds while
// the reader scrolls, then shrinks to its own size and is placed back as the section meets it.
const chapters = ["about", "participate", "program", "speakers", "legacy", "partners", "faq"] as const;

function chapter(page: Page, id: string) {
  return page.evaluate((id) => {
    const stage = document.querySelector<HTMLElement>(`#${id} .chapter-stage`)!;
    const words = [...stage.querySelectorAll(".title-word")].map((word) => word.getBoundingClientRect());
    const box = stage.getBoundingClientRect();
    return {
      state: stage.dataset.chapter ?? null,
      pin: parseFloat(stage.style.getPropertyValue("--chapter-pin")),
      runway: parseFloat(stage.style.getPropertyValue("--chapter-runway")),
      top: box.top + window.scrollY,
      lockup: stage.firstElementChild!.getBoundingClientRect().top,
      box: { left: box.left, right: box.right, bottom: box.bottom },
      rows: new Set(words.map((word) => Math.round(word.top))).size,
      lines: stage.querySelector("h2")!.textContent!.split("\n").length,
      words: {
        left: Math.min(...words.map((word) => word.left)), right: Math.max(...words.map((word) => word.right)),
        bottom: Math.max(...words.map((word) => word.bottom)), height: Math.max(...words.map((word) => word.height)),
      },
      line: parseFloat(getComputedStyle(stage.querySelector("h2")!).lineHeight),
      width: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    };
  }, id);
}

const scrollTo = (page: Page, y: number) => page.evaluate((y) => window.scrollTo(0, y), y);
// The live countdown marks hydration; titles are staged once the fonts are ready.
async function hydrated(page: Page) {
  await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} phone chapter titles arrive big and centred, then settle into place`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phones only: wider screens keep their titles, with the chapter bar from 1100px.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await expect(page.locator(".section-journey")).toBeHidden();
    await expect(page.locator(".chapter-stage[data-chapter='armed']")).toHaveCount(chapters.length);

    for (const id of chapters) {
      const stage = page.locator(`#${id} .chapter-stage`);
      const start = await chapter(page, id);
      // Rising towards its hold: large, centred, inside its stage and never wider than the page.
      await scrollTo(page, start.top - start.pin - 80);
      const big = await chapter(page, id);
      expect(big.state, id).toBe("armed");
      expect(big.words.height, id).toBeGreaterThan(big.line * 1.15);
      expect(Math.abs((big.words.left + big.words.right) / 2 - big.width / 2), id).toBeLessThan(3);
      expect(big.words.left, id).toBeGreaterThanOrEqual(big.box.left - 1);
      expect(big.words.right, id).toBeLessThanOrEqual(big.box.right + 1);
      expect(big.words.bottom, id).toBeLessThanOrEqual(big.box.bottom);
      expect(big.pageWidth, id).toBe(big.width);

      // Held at the pin, it settles on its own: its own size, back at the start edge.
      await scrollTo(page, start.top - start.pin);
      await expect(stage, id).toHaveAttribute("data-chapter", "played", { timeout: 4000 });
      const settled = await chapter(page, id);
      expect(settled.words.height, id).toBeCloseTo(settled.line, 0);
      expect(settled.rows, id).toBe(settled.lines);
      expect(Math.abs(settled.lockup - settled.pin), id).toBeLessThan(2);
      const fromStart = locale === "ar" ? settled.box.right - settled.words.right : settled.words.left - settled.box.left;
      expect(fromStart, id).toBeLessThan(2);
    }

    // Screen readers hear each title as one phrase, and the page passes axe.
    const names = await page.locator(".chapter-stage h2").evaluateAll((titles) => titles.map((title) => [title.getAttribute("aria-label"), title.textContent!.replace(/\s+/g, " ").trim()]));
    expect(names).toHaveLength(chapters.length);
    for (const [label, text] of names) expect(label).toBe(text);
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  });

  test(`${locale} scrolling through a chapter's hold finishes its settle first`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phones only.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    const start = await chapter(page, "program");
    await scrollTo(page, start.top - start.pin);
    await expect(page.locator("#program .chapter-stage")).toHaveAttribute("data-chapter", "playing");
    // A quick flick to where the section's content meets the title: the title is already home.
    await scrollTo(page, start.top - start.pin + start.runway);
    await expect(page.locator("#program .chapter-stage")).toHaveAttribute("data-chapter", "played", { timeout: 600 });
  });

  test(`${locale} only chapters still below the screen are staged`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phones only.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}#legacy`);
    await hydrated(page);
    for (const id of ["partners", "faq"]) await expect(page.locator(`#${id} .chapter-stage`), id).toHaveAttribute("data-chapter", "armed");
    for (const id of ["about", "participate", "program", "speakers", "legacy"]) {
      await expect(page.locator(`#${id} .chapter-stage`), id).not.toHaveAttribute("data-chapter");
    }
  });

  test(`${locale} reduced motion and wide screens keep every title as rendered`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: isMobile ? "reduce" : "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await expect(page.locator(".chapter-stage[data-chapter]")).toHaveCount(0);
    expect(await page.locator(".chapter-stage > .section-heading").evaluateAll((lockups) => lockups.map((lockup) => getComputedStyle(lockup).position))).toEqual(Array(chapters.length).fill("static"));
  });
}
