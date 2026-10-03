import { expect, test, type Page } from "@playwright/test";

// ORG-012: chapter titles follow the reader's scroll on phones and desktop. Their state is a
// function of scroll position alone, so scrolling up and down can never strand a title, and
// nothing pins or adds scroll distance.
const chapters = ["about", "participate", "program", "speakers", "legacy", "partners", "faq"] as const;

async function hydrated(page: Page) {
  await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("data-scenes", "on");
}

function title(page: Page, id: string) {
  return page.evaluate((id) => {
    const stage = document.querySelector<HTMLElement>(`#${id} .chapter-stage`)!;
    const words = [...stage.querySelectorAll<HTMLElement>(".title-word")];
    const heading = stage.querySelector<HTMLElement>(".section-heading")!;
    return {
      stageTop: stage.getBoundingClientRect().top + window.scrollY,
      lift: new DOMMatrixReadOnly(getComputedStyle(heading).transform).m42,
      opacities: words.map((word) => Number(getComputedStyle(word).opacity)),
      position: getComputedStyle(heading).position,
    };
  }, id);
}
const scrollTo = (page: Page, y: number) => page.evaluate((y) => new Promise<void>((resolve) => {
  window.scrollTo(0, y);
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
}), y);

for (const locale of ["en", "ar"] as const) {
  test(`${locale} chapter titles light up with the scroll and reverse when scrolling back`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    const height = page.viewportSize()!.height;
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    for (const id of chapters) {
      const start = await title(page, id);
      expect(start.position, id).toBe("static");
      // Just entering at the bottom edge: lowered and dim.
      await scrollTo(page, start.stageTop - height * .9);
      const entering = await title(page, id);
      expect(entering.lift, id).toBeGreaterThan(10);
      expect(Math.max(...entering.opacities), id).toBeLessThan(.6);
      // At the reading line: in place and fully lit.
      await scrollTo(page, start.stageTop - height * .35);
      const read = await title(page, id);
      expect(Math.abs(read.lift), id).toBeLessThan(.5);
      expect(Math.min(...read.opacities), id).toBe(1);
      // Back up: the same state as on the way down, with no replay or hold.
      await scrollTo(page, start.stageTop - height * .9);
      const again = await title(page, id);
      expect(again.lift, id).toBeCloseTo(entering.lift, 0);
      expect(again.stageTop, id).toBeCloseTo(start.stageTop, 0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(pageHeight);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

    // Screen readers hear each title as one phrase.
    const names = await page.locator(".chapter-stage h2").evaluateAll((titles) => titles.map((heading) => [heading.getAttribute("aria-label"), heading.textContent!.replace(/\s+/g, " ").trim()]));
    for (const [label, text] of names) expect(label).toBe(text);
  });

  test(`${locale} direct chapter entry shows the title in place and lit`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}#legacy`);
    await hydrated(page);
    await expect.poll(async () => Math.min(...(await title(page, "legacy")).opacities)).toBe(1);
    expect(Math.abs((await title(page, "legacy")).lift)).toBeLessThan(.5);
  });

  test(`${locale} reduced motion keeps titles, hero and content static`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
    await expect(page.locator("html")).not.toHaveAttribute("data-scenes");
    await expect(page.locator(".reveal[data-reveal-state='waiting']")).toHaveCount(0);
    for (const id of chapters) {
      await scrollTo(page, (await title(page, id)).stageTop - page.viewportSize()!.height * .9);
      const state = await title(page, id);
      expect(state.lift, id).toBe(0);
      expect(Math.min(...state.opacities), id).toBe(1);
    }
  });
}

test("the opening headline is large and leaves with the scroll", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  await hydrated(page);
  const headline = page.locator(".hero-editorial h1");
  const size = await headline.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(size).toBeGreaterThanOrEqual(page.viewportSize()!.width < 700 ? 46 : 80);
  expect(await headline.evaluate((element) => getComputedStyle(element).fontWeight)).toBe("700");
  const layout = page.locator(".conference-hero .hero-layout");
  await expect.poll(() => layout.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  await scrollTo(page, page.viewportSize()!.height * .5);
  expect(await layout.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(.8);
  await scrollTo(page, 0);
  expect(await layout.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
});

test("content below the screen fades up once when it scrolls in", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  await hydrated(page);
  const pathways = page.locator(".pathway-list");
  await expect(pathways).toHaveAttribute("data-reveal-state", "waiting");
  await pathways.scrollIntoViewIfNeeded();
  await expect(pathways).toHaveClass(/reveal--rise/);
  await expect.poll(() => pathways.locator(":scope > article").evaluateAll((rows) => rows.every((row) => Number(getComputedStyle(row).opacity) === 1))).toBe(true);
});
