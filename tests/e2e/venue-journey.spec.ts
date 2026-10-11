import { expect, test, type Locator, type Page } from "@playwright/test";

// ENG-030 / DSN-01, ACC-01, LOC-01/03, MED-01/04, PRV-03:
// exercise native reading and information discovery, not animation declarations.
const chapters = ["airport", "city", "arrival"] as const;
const galleryLabel = { en: "Views of King Faisal Conference Center", ar: "صور مركز الملك فيصل للمؤتمرات" };

async function scrollPosition(rail: Locator) {
  return rail.evaluate((element) => Math.abs(element.scrollLeft));
}

async function readChapter(page: Page, chapter: typeof chapters[number]) {
  const section = page.locator(`[data-journey-chapter="${chapter}"]`);
  const heading = section.getByRole("heading").first();
  await heading.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(heading).toBeInViewport();
}

async function settleCamera(page: Page) {
  await expect.poll(() => page.getByTestId("venue-journey-camera").evaluate((element) => {
    const wanted = new DOMMatrixReadOnly((element as HTMLElement).style.transform);
    const actual = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return Math.max(...(["a", "b", "c", "d", "e", "f"] as const).map(key => Math.abs(actual[key] - wanted[key])));
  })).toBeLessThan(.02);
}

async function expectReadable(page: Page) {
  const geometry = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const clipping = [...document.querySelectorAll("main h1, main h2:not(.sr-only), main h3:not(.sr-only), main h4:not(.sr-only), .venue-journey-place-name")]
      .filter((element) => element.getClientRects().length)
      .flatMap((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].filter((box) => box.left < -1 || box.right > width + 1)
          .map((box) => ({ text: element.textContent, left: box.left, right: box.right }));
      });
    const disclosureOverflow = [...document.querySelectorAll(".venue-journey-options summary")]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => ({ text: element.textContent, content: element.scrollWidth, client: element.clientWidth }));
    return { width, content: document.documentElement.scrollWidth, clipping, disclosureOverflow };
  });
  expect(geometry.content, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width);
  expect(geometry.clipping, JSON.stringify(geometry)).toEqual([]);
  expect(geometry.disclosureOverflow, JSON.stringify(geometry)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} venue photographs load locally and native gallery controls work in both directions`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/dates-venue`);
    await page.evaluate(() => document.fonts.ready);
    const gallery = page.locator(".venue-photo-gallery");
    const rail = gallery.getByRole("region", { name: galleryLabel[locale], exact: true });
    const photos = rail.getByRole("img");
    await expect(photos).toHaveCount(4);
    const sources = await photos.evaluateAll((images) => images.map((image) => {
      const address = new URL((image as HTMLImageElement).src);
      return address.searchParams.get("url") ?? address.pathname;
    }));
    expect([...sources].sort()).toEqual(["01", "02", "03", "04"].map((id) => `/media/msrc-demo/venue-journey-${id}.jpg`));
    for (const photo of await photos.all()) await expect(photo).toHaveAccessibleName(/\S/);
    await rail.scrollIntoViewIfNeeded();

    if (isMobile) {
      const next = gallery.getByRole("button", { name: locale === "ar" ? "التالي" : "Next", exact: true });
      const previous = gallery.getByRole("button", { name: locale === "ar" ? "السابق" : "Previous", exact: true });
      await expect(previous).toBeDisabled();
      await next.tap();
      await expect.poll(() => scrollPosition(rail)).toBeGreaterThan(0);
      await expect(previous).toBeEnabled();
      await previous.focus();
      await expect(previous).toBeFocused();
      await page.keyboard.press("Enter");
      await expect.poll(() => scrollPosition(rail)).toBeLessThan(2);
    }
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await photo.evaluate((image: HTMLImageElement) => new URL(image.currentSrc).origin === location.origin)).toBe(true);
    }
    if (isMobile) {
      await expect(photos.last()).toBeInViewport();
      await expect(gallery.getByRole("button", { name: locale === "ar" ? "التالي" : "Next", exact: true })).toBeDisabled();
    }
  });

  test(`${locale} native scrolling follows the arrival chapters and reverses without rewriting the URL`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=journey`);
    const journey = page.getByTestId("venue-arrival-journey");
    const camera = page.getByTestId("venue-journey-camera");
    await expect(journey.locator("[data-journey-chapter]")).toHaveCount(3);
    const originalURL = page.url();
    const positions: string[] = [];
    for (const chapter of chapters) {
      await readChapter(page, chapter);
      const current = journey.locator(`a[href="#journey-${chapter}"][aria-current="location"]`);
      await expect(current).toHaveCount(1);
      await expect(journey.locator('a[aria-current="location"]')).toHaveCount(1);
      const matrix = await camera.evaluate((element) => {
        const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        return { x: transform.a, y: transform.d };
      });
      expect(matrix.x).toBeGreaterThan(0);
      expect(matrix.y).toBeGreaterThan(0);
      if (!isMobile && positions.length) {
        await expect.poll(() => camera.evaluate((element) => getComputedStyle(element).transform)).not.toBe(positions[0]);
      }
      positions.push(await camera.evaluate((element) => getComputedStyle(element).transform));
      await expect(page).toHaveURL(originalURL);
    }
    if (!isMobile) expect(new Set(positions).size).toBeGreaterThan(1);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move((page.viewportSize()?.width ?? 1280) * .75, 120);
    await page.mouse.wheel(0, -240);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before);
    for (const chapter of [...chapters].reverse()) {
      await readChapter(page, chapter);
      await expect(journey.locator(`a[href="#journey-${chapter}"][aria-current="location"]`)).toHaveCount(1);
      await expect(page).toHaveURL(originalURL);
    }
  });

  test(`${locale} chapter anchors, short phone reading and reduced motion retain every arrival option`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 480 });
    await page.goto(`/${locale}/dates-venue?view=arrival`);
    await page.evaluate(() => document.fonts.ready);
    const journey = page.getByTestId("venue-arrival-journey");
    const camera = page.getByTestId("venue-journey-camera");
    const initialTransform = await camera.evaluate((element) => getComputedStyle(element).transform);
    for (const chapter of chapters) {
      const anchor = journey.locator(`a[href="#journey-${chapter}"]`).first();
      await anchor.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue\\?view=arrival#journey-${chapter}$`));
      await expect(page.locator(`#journey-${chapter}`)).toBeFocused();
      await expect(camera).toHaveCSS("transform", initialTransform);
    }
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expectReadable(page);
    for (const chapter of chapters) {
      await readChapter(page, chapter);
      await expectReadable(page);
    }
    await expect(journey.locator("[data-travel-mode]")).toHaveCount(3);
    await expect(journey.locator("[data-venue-detail]")).toHaveCount(6);
  });

  test(`${locale} transport guidance responds to keyboard, touch and deliberate hover`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/dates-venue`);
    await readChapter(page, "city");
    const details = page.locator('[data-travel-mode="taxi"] details');
    const summary = details.locator("summary");
    await expect(details).toHaveAttribute("open", "");
    const target = await summary.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
    if (isMobile) {
      await summary.tap();
      await expect(details).not.toHaveAttribute("open", "");
      await expect(details.locator("p").first()).toBeHidden();
      await summary.tap();
      await expect(details).toHaveAttribute("open", "");
    } else {
      await page.mouse.move(0, 0);
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(details).not.toHaveAttribute("open", "");
      await summary.hover();
      await expect(details).toHaveAttribute("open", "");
      await page.mouse.move(0, 0);
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(details).not.toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await expect(details).toHaveAttribute("open", "");
    }
    await expect(details.locator("p").first()).toBeVisible();
    await expect(details.locator(".venue-travel-time")).toContainText(locale === "en" ? "35–40" : "٣٥–٤٠");
  });

  test(`${locale} map information points remain readable, dismissible and linked to their arrival details`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/dates-venue`);
    if (!isMobile) await page.setViewportSize({ width: 1440, height: 900 });
    const journey = page.getByTestId("venue-arrival-journey");
    for (const [pointName, chapter, tooltipId] of [
      ["airport", "airport", "venue-airport-point-detail"],
      ["arrival", "arrival", "venue-arrival-point-detail"],
    ] as const) {
      const point = journey.locator(`[data-map-point="${pointName}"]`);
      const tooltip = point.getByRole("tooltip");
      await expect(point).toHaveAttribute("href", `#journey-${chapter}`);
      await expect(point).toHaveAttribute("aria-describedby", tooltipId);
      if (isMobile) {
        // The compact map remains a real native link, without a floating reading obstruction.
        await journey.locator(".venue-journey-atlas").scrollIntoViewIfNeeded();
        await expect(tooltip).toBeHidden();
        await point.tap();
        await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#journey-${chapter}$`));
        await expect(page.locator(`#journey-${chapter}`)).toBeFocused();
      } else {
        await readChapter(page, chapter);
        await expect(point).toHaveAttribute("data-point-visible", "true");
        await expect(point).toBeInViewport();
        await point.hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(locale === "en" ? pointName === "airport" ? "King Abdulaziz International Airport" : "Abdullah Sulayman" : pointName === "airport" ? "مطار الملك عبدالعزيز الدولي" : "عبدالله سليمان");
        const box = await tooltip.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
        expect(box!.y + box!.height).toBeLessThanOrEqual(900);
        // Cross the real gap on the pin-facing side, including a flipped popup.
        const pin = await point.boundingBox();
        const bridgeX = Math.max(box!.x + 1, Math.min(pin!.x + pin!.width / 2, box!.x + box!.width - 1));
        const bridgeY = box!.y < pin!.y ? box!.y + box!.height + 8 : box!.y - 8;
        await page.mouse.move(bridgeX, bridgeY);
        await expect(tooltip).toBeVisible();
        await tooltip.hover();
        await expect(tooltip).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(tooltip).toBeHidden();
        await page.mouse.move(0, 0);
        await point.focus();
        await expect(point).toBeFocused();
        await expect(tooltip).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(tooltip).toBeHidden();
        await expect(point).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#journey-${chapter}$`));
        await expect(page.locator(`#journey-${chapter}`)).toBeFocused();
      }
    }
    if (!isMobile) for (const width of [1300, 1200]) {
      // Reach a settled near-top point, including the exact cinematic breakpoint.
      // Its context must flip below and fit rather than being clipped above it.
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/dates-venue?view=marker-edge-${width}`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#journey-airport").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
      await settleCamera(page);
      const point = page.locator('[data-map-point="airport"]');
      const tooltip = point.getByRole("tooltip");
      await page.evaluate(() => window.scrollBy({ top: 360, behavior: "instant" }));
      await expect.poll(async () => (await point.boundingBox())!.y).toBeLessThan(180);
      await settleCamera(page);
      const pin = await point.boundingBox();
      expect(pin!.y).toBeGreaterThanOrEqual(100);
      expect(pin!.y).toBeLessThan(180);
      await expect(point).toHaveAttribute("data-point-visible", "true");
      await point.hover();
      await expect(point).toHaveAttribute("data-tip-side", "below");
      await expect(tooltip).toBeVisible();
      const popup = await tooltip.boundingBox();
      expect(popup!.x).toBeGreaterThanOrEqual(0);
      expect(popup!.y).toBeGreaterThanOrEqual(pin!.y + pin!.height);
      expect(popup!.x + popup!.width).toBeLessThanOrEqual(width);
      expect(popup!.y + popup!.height).toBeLessThanOrEqual(900);
      await tooltip.hover();
      await expect(tooltip).toBeVisible();
      await page.screenshot({
        path: `.impeccable/review/venue-journey/final-${locale}-edge-tooltip-${width}.jpg`,
        type: "jpeg",
        quality: 90,
      });
      await page.keyboard.press("Escape");
      await expect(tooltip).toBeHidden();
    }
  });

  test(`${locale} arrival chapters and transport disclosures remain usable without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      expect((await page.goto(`/${locale}/dates-venue`, { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
      const journey = page.getByTestId("venue-arrival-journey");
      await expect(journey.locator("[data-journey-chapter]")).toHaveCount(3);
      const travel = journey.locator('[data-travel-mode="taxi"] details');
      const summary = travel.locator("summary");
      await expect(travel).toHaveAttribute("open", "");
      await summary.click();
      await expect(travel).not.toHaveAttribute("open", "");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(travel).toHaveAttribute("open", "");
      await expect(travel.locator("p").first()).toBeVisible();
      const city = journey.locator('a[href="#journey-city"]').first();
      await city.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#journey-city$`));
      await expect(page.locator("#journey-city")).toBeInViewport();
      await expect(page.locator("#at-venue [data-venue-detail]")).toHaveCount(6);
      await expect(page.locator("#international-attendees")).toContainText("UTC+3");
      await expectReadable(page);
    } finally { await context.close(); }
  });
}
