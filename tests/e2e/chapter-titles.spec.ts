import { expect, test, type Page } from "@playwright/test";

// DSN-01 / ACC-01 / LOC-01: phone chapter arrivals enhance the existing layout once.
// A settled heading must move with ordinary scrolling, including when the reader returns.
const chapters = ["about", "participate", "program", "speakers", "legacy", "partners", "faq"] as const;

async function hydrated(page: Page) {
  await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function settleChapter(page: Page, id: string) {
  await page.locator(`#${id} .chapter-stage`).evaluate((stage) => stage.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(page.locator(`#${id} .chapter-stage`)).toHaveAttribute("data-chapter", "played", { timeout: 4000 });
  await expect.poll(() => page.locator(`#${id}`).evaluate((section) => section.getAnimations({ subtree: true })
    .filter((animation) => animation.playState === "running").length)).toBe(0);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} phone chapters settle once without adding scroll space or sticky holds`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone chapter treatment only.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await expect(page.locator(".section-journey")).toBeHidden();
    await expect(page.locator(".chapter-stage[data-chapter='armed']")).toHaveCount(chapters.length);
    const arrivals = await page.locator(".chapter-stage[data-chapter='armed']").evaluateAll((stages) => stages.map((stage) => {
      const space = stage.getBoundingClientRect();
      const heading = stage.querySelector(".section-heading")!.getBoundingClientRect();
      const title = stage.querySelector("h2")!;
      const range = document.createRange();
      range.selectNodeContents(title);
      const text = range.getBoundingClientRect();
      return { id: stage.closest("section")!.id, centered: Math.abs((heading.left + heading.right - space.left - space.right) / 2) < 2,
        fits: text.left >= space.left - 1 && text.right <= space.right + 1 && text.left >= -1 && text.right <= document.documentElement.clientWidth + 1 };
    }));
    for (const arrival of arrivals) {
      expect(arrival.centered, arrival.id).toBe(true);
      expect(arrival.fits, arrival.id).toBe(true);
    }
    const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const stageHeights = await page.locator(".chapter-stage").evaluateAll((stages) => stages.map((stage) => (stage as HTMLElement).offsetHeight));

    for (const id of chapters) {
      await settleChapter(page, id);
      const title = page.locator(`#${id} .chapter-stage h2`);
      await expect(title).toBeVisible();
      expect(await title.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return box.left >= -1 && box.right <= document.documentElement.clientWidth + 1;
      }), id).toBe(true);
    }

    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(initialHeight);
    expect(await page.locator(".chapter-stage").evaluateAll((stages) => stages.map((stage) => (stage as HTMLElement).offsetHeight))).toEqual(stageHeights);

    // Reverse through chapters, then revisit: the title follows the document immediately.
    for (const id of ["legacy", "program", "about", "program"]) {
      const before = await page.locator(`#${id} .chapter-stage`).evaluate((stage) => {
        const top = stage.getBoundingClientRect().top + window.scrollY;
        const header = document.querySelector(".site-header-inner")!.getBoundingClientRect();
        window.scrollTo({ top: top - header.bottom - 32, behavior: "instant" });
        return top;
      });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const start = await page.locator(`#${id} .section-heading`).evaluate((heading) => ({ top: heading.getBoundingClientRect().top, scroll: window.scrollY }));
      await page.evaluate(() => window.scrollBy({ top: -72, behavior: "instant" }));
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const returned = await page.locator(`#${id} .section-heading`).evaluate((heading) => ({ top: heading.getBoundingClientRect().top, scroll: window.scrollY }));
      expect(returned.top - start.top, id).toBeCloseTo(start.scroll - returned.scroll, 0);
      expect(await page.locator(`#${id} .chapter-stage`).evaluate((stage) => stage.getBoundingClientRect().top + window.scrollY), id).toBeCloseTo(before, 0);
      await expect(page.locator(`#${id} .chapter-stage`)).toHaveAttribute("data-chapter", "played");
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(initialHeight);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test(`${locale} direct chapter entry keeps visible titles in their natural position`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone chapter treatment only.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}#legacy`);
    await hydrated(page);
    for (const id of ["about", "participate", "program", "speakers", "legacy"]) {
      await expect(page.locator(`#${id} .chapter-stage`), id).not.toHaveAttribute("data-chapter");
    }
    const heading = page.locator("#legacy .section-heading");
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((element) => getComputedStyle(element).position)).toBe("static");
  });

  test(`${locale} reduced motion and wide screens retain static chapter headings`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: isMobile ? "reduce" : "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await expect(page.locator(".chapter-stage[data-chapter]")).toHaveCount(0);
    expect(await page.locator(".chapter-stage > .section-heading").evaluateAll((lockups) => lockups.map((lockup) => getComputedStyle(lockup).position))).toEqual(Array(chapters.length).fill("static"));
  });

  test(`${locale} changing motion preference clears staged headings without shifting the page`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone chapter treatment only.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await expect(page.locator(".chapter-stage[data-chapter='armed']")).toHaveCount(chapters.length);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".chapter-stage[data-chapter]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    expect(await page.locator(".chapter-stage > .section-heading").evaluateAll((headings) => headings.every((heading) => {
      const style = getComputedStyle(heading);
      return style.transform === "none" && style.position === "static";
    }))).toBe(true);
  });

  test(`${locale} an interrupted chapter arrival stays complete after viewport or motion changes`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone chapter treatment only.");
    const viewport = page.viewportSize()!;
    for (const interruption of ["width", "motion"] as const) {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(`/${locale}`);
      await hydrated(page);
      const stage = page.locator("#program .chapter-stage");
      await expect(stage).toHaveAttribute("data-chapter", "armed");
      await stage.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight * .65, behavior: "instant" }));
      await expect(stage).toHaveAttribute("data-chapter", "playing");
      if (interruption === "width") await page.setViewportSize({ width: 701, height: viewport.height });
      else await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(stage).not.toHaveAttribute("data-chapter");
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      if (interruption === "width") await page.setViewportSize(viewport);
      else await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(stage, interruption).not.toHaveAttribute("data-chapter", "armed");
      expect(await stage.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length), interruption).toBe(0);
    }
  });

  test(`${locale} enlarged chapter text stays readable before and after staging`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone chapter treatment only.");
    for (const enlargement of ["before", "after"] as const) {
      await page.emulateMedia({ reducedMotion: enlargement === "before" ? "reduce" : "no-preference" });
      await page.goto(`/${locale}`);
      await hydrated(page);
      if (enlargement === "after") await expect(page.locator(".chapter-stage[data-chapter='armed']")).toHaveCount(chapters.length);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      if (enlargement === "before") await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(page.locator(".chapter-stage[data-chapter='armed']")).toHaveCount(chapters.length);
      // A text-only resize changes the measured phrase without changing the viewport width.
      await expect.poll(() => page.locator(".chapter-stage").evaluateAll((stages) => stages.every((stage) => {
        const box = stage.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(stage.querySelector("h2")!);
        const text = range.getBoundingClientRect();
        return text.left >= box.left - 1 && text.right <= box.right + 1 && text.left >= -1 && text.right <= document.documentElement.clientWidth + 1;
      })), { message: `${locale} ${enlargement} staging at 200% text` }).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const stage = page.locator("#program .chapter-stage");
      const natural = await stage.evaluate((element) => (element as HTMLElement).offsetHeight);
      await settleChapter(page, "program");
      expect(await stage.evaluate((element) => (element as HTMLElement).offsetHeight)).toBe(natural);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    }
  });
}
