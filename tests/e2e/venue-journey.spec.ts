import { expect, test, type Locator, type Page } from "@playwright/test";
import { setTimeout as gestureFrame } from "node:timers/promises";

// ENG-030 / DSN-01, ACC-01, LOC-01/03, MED-01/04, PRV-03:
// exercise native reading and information discovery, not animation declarations.
const chapters = ["airport", "city", "arrival"] as const;
const galleryLabel = { en: "Views of King Faisal Conference Center", ar: "صور مركز الملك فيصل للمؤتمرات" };
const mapLabels = {
  en: { zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Reset map", close: "Close map details" },
  ar: { zoomIn: "تكبير الخريطة", zoomOut: "تصغير الخريطة", reset: "إعادة ضبط الخريطة", close: "أغلق تفاصيل الخريطة" },
} as const;

async function scrollPosition(rail: Locator) {
  return rail.evaluate((element) => Math.abs(element.scrollLeft));
}

async function expectOneGalleryCard(rail: Locator, expected: number) {
  await expect.poll(() => rail.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    return [...element.children].flatMap((item, index) => {
      const box = item.getBoundingClientRect();
      const visible = Math.max(0, Math.min(viewport.right, box.right) - Math.max(viewport.left, box.left));
      return visible > 1 ? [{ index, fillsFrame: visible / viewport.width > .99 }] : [];
    });
  })).toEqual([{ index: expected, fillsFrame: true }]);
}

async function swipeGalleryHorizontally(page: Page, rail: Locator, locale: "en" | "ar") {
  const box = (await rail.boundingBox())!;
  const before = { rail: await scrollPosition(rail), document: await page.evaluate(() => window.scrollY) };
  const client = await page.context().newCDPSession(page);
  const start = box.x + box.width * (locale === "ar" ? .1 : .9);
  const direction = locale === "ar" ? 1 : -1;
  const y = box.y + box.height * .5;
  try {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start, y }] });
    for (let step = 1; step <= 8; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start + direction * box.width * .8 * step / 8, y }] });
      // Native gestures need realistic input cadence even in the no-JavaScript
      // context, whose document cannot deliver requestAnimationFrame callbacks.
      await gestureFrame(16);
    }
    // Model a deliberate drag that stops before lift. CDP acknowledges moves
    // before the compositor consumes them; a stationary terminal sample lets
    // native scroll-snap receive the completed drag rather than a queued flick.
    await gestureFrame(100);
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start + direction * box.width * .8, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => scrollPosition(rail)).toBeGreaterThan(before.rail + 44);
    expect(await page.evaluate(() => window.scrollY)).toBe(before.document);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  } finally { await client.detach(); }
}

async function readChapter(page: Page, chapter: typeof chapters[number]) {
  const section = page.locator(`[data-journey-chapter="${chapter}"]`);
  const heading = section.getByRole("heading").first();
  const journey = page.getByTestId("venue-arrival-journey");
  const compact = await journey.getAttribute("data-map-compact") === "true";
  const flowing = await journey.getAttribute("data-reading-flow") === "true";
  if (compact && !flowing) await section.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  else await heading.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(heading).toBeInViewport();
}

async function settleCamera(page: Page) {
  await expect.poll(() => page.getByTestId("venue-journey-camera").evaluate((element) => {
    const wanted = new DOMMatrixReadOnly((element as HTMLElement).style.transform);
    const actual = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return Math.max(...(["a", "b", "c", "d", "e", "f"] as const).map(key => Math.abs(actual[key] - wanted[key])));
  })).toBeLessThan(.02);
}

async function sceneScrollOffsets(page: Page) {
  return page.locator(".venue-journey-atlas").evaluate((element) => ({
    document: { x: window.scrollX, y: window.scrollY },
    atlas: { x: element.scrollLeft, y: element.scrollTop },
  }));
}

async function cameraScale(page: Page) {
  return page.getByTestId("venue-journey-camera").evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
}

async function expectButtonBounds(page: Page, button: Locator) {
  const viewport = page.viewportSize()!;
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
}

async function expectControlBounds(page: Page, controls: Locator) {
  for (const button of await controls.getByRole("button").all()) {
    await expectButtonBounds(page, button);
  }
}

async function expectPinClearOfMapFurniture(page: Page, point: Locator) {
  const pin = (await point.boundingBox())!;
  for (const furniture of await page.locator(".venue-map-controls button, .venue-journey-map-caption").all()) {
    const box = (await furniture.boundingBox())!;
    const overlaps = pin.x < box.x + box.width && pin.x + pin.width > box.x
      && pin.y < box.y + box.height && pin.y + pin.height > box.y;
    expect(overlaps, JSON.stringify({ pin, furniture: await furniture.getAttribute("class"), box })).toBe(false);
  }
}

async function expectThinCompactFrame(page: Page) {
  const journey = page.getByTestId("venue-arrival-journey");
  await expect(journey).toHaveAttribute("data-map-compact", "true");
  await expect(journey).toHaveAttribute("data-reading-flow", "false");
  await expect(journey).toHaveAttribute("data-frame-pinned", "true");
  const frame = page.locator(".venue-journey-frame");
  const box = (await frame.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.height).toBeLessThanOrEqual(viewport.height * .36);
  const headerBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
  expect(box.y).toBeGreaterThanOrEqual(headerBottom - 1);
  expect(box.y + box.height).toBeLessThan(viewport.height);
  const scrim = await frame.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return { opacity: style.opacity, backdropFilter: style.backdropFilter || style.getPropertyValue("-webkit-backdrop-filter"), pointerEvents: style.pointerEvents };
  });
  expect(scrim.backdropFilter).toMatch(/blur\(/);
  expect(scrim.opacity).toBe("1");
  expect(scrim.pointerEvents).toBe("none");
  const chapterLinks = journey.locator(".venue-journey-index a");
  const heights = await chapterLinks.evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
  for (const link of await chapterLinks.all()) await expectButtonBounds(page, link);
  await expectControlBounds(page, page.locator(".venue-map-controls"));
}

async function activateWithPressedBounds(page: Page, button: Locator) {
  await button.focus();
  try {
    await page.keyboard.down("Space");
    await expect.poll(() => button.evaluate((element) => element.matches(":active"))).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await expectButtonBounds(page, button);
  } finally { await page.keyboard.up("Space"); }
}

async function zoomAndReset(page: Page, locale: keyof typeof mapLabels, isMobile: boolean) {
  const controls = page.locator(".venue-map-controls");
  await expect(controls).toBeVisible();
  // Fixed controls can look stable while native document momentum is still
  // running; the first tap would cancel that scroll instead of activating Zoom.
  await page.evaluate(() => new Promise<void>((resolve) => {
    let priorX = window.scrollX;
    let priorY = window.scrollY;
    let stable = 0;
    const observe = () => {
      const x = window.scrollX;
      const y = window.scrollY;
      stable = x === priorX && y === priorY ? stable + 1 : 0;
      priorX = x; priorY = y;
      if (stable >= 3) resolve(); else requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  }));
  const labels = mapLabels[locale];
  const initial = await cameraScale(page);
  const zoomIn = controls.getByRole("button", { name: labels.zoomIn, exact: true });
  await expect(zoomIn).toBeEnabled();
  if (isMobile) await zoomIn.tap(); else { await zoomIn.focus(); await page.keyboard.press("Enter"); }
  await expect.poll(() => cameraScale(page)).toBeGreaterThan(initial);
  await settleCamera(page);
  const zoomOut = controls.getByRole("button", { name: labels.zoomOut, exact: true });
  await zoomOut.focus();
  await page.keyboard.press("Enter");
  await zoomOut.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => cameraScale(page)).toBeLessThan(initial);
  const reset = controls.getByRole("button", { name: labels.reset, exact: true });
  await activateWithPressedBounds(page, reset);
  await expect.poll(() => cameraScale(page)).toBeCloseTo(initial, 3);
  await settleCamera(page);
  await expectControlBounds(page, controls);
}

async function swipeMapVertically(page: Page, direction: "down" | "up" = "down") {
  const box = (await page.locator(".venue-journey-atlas").boundingBox())!;
  const before = await page.evaluate(() => window.scrollY);
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width * .7;
  const startY = box.y + box.height * (direction === "down" ? .8 : .2);
  const distance = Math.min(160, box.height * .5);
  try {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
    for (let step = 1; step <= 8; step++) {
      const y = startY + (direction === "down" ? -1 : 1) * distance * step / 8;
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    }
    // Finish a deliberate scroll before lift; a rapid synthetic flick can
    // suppress the next compatibility click even after coordinates stop moving.
    await gestureFrame(100);
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
      x, y: startY + (direction === "down" ? -1 : 1) * distance,
    }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    if (direction === "down") await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 40);
    else await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before - 40);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  } finally { await client.detach(); }
}

async function inspectPointPanel(page: Page, point: Locator, pointName: "airport" | "arrival", locale: keyof typeof mapLabels, isMobile: boolean) {
  const panel = page.getByTestId("venue-map-detail");
  const originalURL = page.url();
  await expect(point).toHaveAttribute("role", "button");
  await expect(point).toHaveAttribute("aria-controls", "venue-map-detail");
  await expect(point).toHaveAttribute("aria-expanded", "false");
  if (isMobile) await point.tap(); else { await point.focus(); await page.keyboard.press("Enter"); }
  await expect(point).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute("aria-modal", "true");
  await expect(panel.getByRole("heading")).toHaveText(locale === "en"
    ? pointName === "airport" ? "King Abdulaziz International Airport" : "King Faisal Conference Center"
    : pointName === "airport" ? "مطار الملك عبدالعزيز الدولي" : "مركز الملك فيصل للمؤتمرات");
  if (!isMobile) await expect(panel.getByRole("heading")).toBeFocused();
  await expect(page).toHaveURL(originalURL);
  const viewport = page.viewportSize()!;
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await expectControlBounds(page, panel);
  const close = panel.getByRole("button", { name: mapLabels[locale].close, exact: true });
  await activateWithPressedBounds(page, close);
  await expect(panel).toBeHidden();
  await expect(point).toHaveAttribute("aria-expanded", "false");
  await expect(point).toBeFocused();
  await page.keyboard.press("Space");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(point).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading")).toBeFocused();
  if (pointName === "arrival") {
    const afterScroll = await page.locator("#international-attendees").evaluate((element) => {
      element.scrollIntoView({ block: "start", behavior: "instant" });
      return { x: window.scrollX, y: window.scrollY };
    });
    await expect(panel).toBeHidden();
    await expect(point).not.toBeFocused();
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(afterScroll);
    await expect(page).toHaveURL(originalURL);
    await readChapter(page, "arrival");
    await settleCamera(page);
    await point.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading")).toBeFocused();
  }
  const destination = pointName === "airport" ? "journey-city" : "venue-orientation";
  const action = panel.getByRole("link");
  await expect(action).toHaveAttribute("href", `#${destination}`);
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#${destination}$`));
  await expect(page.locator(`#${destination}`)).toBeFocused();
  // Fragment/focus commits precede the queued native scroll. Verify actual
  // arrival before beginning another chapter's independent scrolling action.
  if (pointName === "airport") {
    await expect(page.locator('.venue-journey-index a[href="#journey-city"]')).toHaveAttribute("aria-current", "location");
    await expect(page.locator("#journey-city").getByRole("heading").first()).toBeInViewport();
  } else await expect(page.locator("#venue-orientation")).toBeInViewport();
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

    const next = gallery.getByRole("button", { name: locale === "ar" ? "التالي" : "Next", exact: true });
    const previous = gallery.getByRole("button", { name: locale === "ar" ? "السابق" : "Previous", exact: true });
    await expect(previous).toBeDisabled();
    await expectOneGalleryCard(rail, 0);
    await expectControlBounds(page, gallery.locator(".rail-buttons"));
    if (isMobile) await swipeGalleryHorizontally(page, rail, locale); else await next.click();
    await expect.poll(() => scrollPosition(rail)).toBeGreaterThan(0);
    await expectOneGalleryCard(rail, 1);
    await expect(previous).toBeEnabled();
    await previous.focus();
    await expect(previous).toBeFocused();
    await page.keyboard.press("Enter");
    // Keyboard navigation must select the frame immediately, without a smooth
    // scroll still showing the previous photo after activation returns.
    expect(await scrollPosition(rail)).toBeLessThan(2);
    await expectOneGalleryCard(rail, 0);
    for (const [index, photo] of (await photos.all()).entries()) {
      if (index) { if (isMobile) await next.tap(); else await next.click(); }
      await expectOneGalleryCard(rail, index);
      await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await photo.evaluate((image: HTMLImageElement) => new URL(image.currentSrc).origin === location.origin)).toBe(true);
    }
    await expect(photos.last()).toBeInViewport();
    await expect(next).toBeDisabled();
  });

  test(`${locale} native scrolling follows the arrival chapters and reverses without rewriting the URL`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=journey`);
    await page.evaluate(() => document.fonts.ready);
    const journey = page.getByTestId("venue-arrival-journey");
    const camera = page.getByTestId("venue-journey-camera");
    await expect(journey).toHaveAttribute("data-journey-ready", "true");
    await expect(journey.locator("[data-journey-chapter]")).toHaveCount(3);
    const entryLight = journey.locator(".venue-journey-entry-light");
    await expect(entryLight).toHaveCount(1);
    await expect(entryLight).toHaveAttribute("aria-hidden", "true");
    await expect(entryLight).toHaveCSS("pointer-events", "none");
    // Sample the actual visible entry phase rather than the offscreen default.
    // Native document scrolling leaves the URL and input behavior untouched.
    await journey.locator(".venue-journey-atlas").evaluate((element) => window.scrollBy({
      top: element.getBoundingClientRect().top - window.innerHeight / 2, behavior: "instant",
    }));
    await expect.poll(() => entryLight.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0);
    const initialEntryOpacity = await entryLight.evaluate((element) => Number(getComputedStyle(element).opacity));
    const originalURL = page.url();
    if (isMobile) {
      const originalViewport = page.viewportSize()!;
      await expect(journey).toHaveAttribute("data-frame-pinned", "false");
      expect(await journey.locator(".venue-journey-frame").evaluate((element) => getComputedStyle(element, "::before").opacity)).toBe("0");
      for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 720 }]) {
        await page.setViewportSize(viewport);
        await readChapter(page, "airport");
        await settleCamera(page);
        await expectThinCompactFrame(page);
      }
      await page.setViewportSize(originalViewport);
      await expect(journey).toHaveAttribute("data-map-compact", "true");
      await expect(journey).toHaveAttribute("data-reading-flow", "false");
      await readChapter(page, "airport");
      await settleCamera(page);
      const atlas = (await journey.locator(".venue-journey-atlas").boundingBox())!;
      const headerBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
      expect(atlas.y).toBeGreaterThanOrEqual(headerBottom - 1);
      expect(atlas.y + atlas.height).toBeLessThan(page.viewportSize()!.height);
      await swipeMapVertically(page);
      await expect(page).toHaveURL(originalURL);
    }
    const positions: string[] = [];
    for (const chapter of chapters) {
      await readChapter(page, chapter);
      const current = journey.locator(`a[href="#journey-${chapter}"][aria-current="location"]`);
      await expect(current).toHaveCount(1);
      await expect(journey.locator('a[aria-current="location"]')).toHaveCount(1);
      await settleCamera(page);
      const currentCopy = page.locator(`#journey-${chapter} .venue-journey-reading`);
      await expect.poll(() => currentCopy.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.9);
      if (chapter !== "airport") {
        await expect.poll(() => page.locator("#journey-airport .venue-journey-reading").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(.9);
      } else {
        await expect.poll(() => entryLight.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(initialEntryOpacity);
      }
      await expect(camera).toHaveAttribute("dir", "ltr");
      const matrix = await camera.evaluate((element) => {
        const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        return { x: transform.a, y: transform.d, b: transform.b, c: transform.c };
      });
      expect(matrix.x).toBeGreaterThan(0);
      expect(matrix.y).toBeGreaterThan(0);
      expect(matrix.b).toBe(0);
      expect(matrix.c).toBe(0);
      if (positions.length) {
        await expect.poll(() => camera.evaluate((element) => getComputedStyle(element).transform)).not.toBe(positions[0]);
      }
      positions.push(await camera.evaluate((element) => getComputedStyle(element).transform));
      await expect(page).toHaveURL(originalURL);
    }
    expect(new Set(positions).size).toBeGreaterThan(1);
    // Essential guidance must remain fully readable while keyboard users open
    // it, independently of the surrounding cinematic chapter fading.
    const essentials = page.locator("#at-venue details");
    await essentials.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(essentials).toHaveAttribute("open", "");
    await expect(page.locator("#journey-arrival .venue-journey-reading")).toHaveCSS("opacity", "1");
    for (const detail of await essentials.locator("dd").all()) await expect(detail).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(essentials).not.toHaveAttribute("open", "");
    // Passive input returns control to native scrolling before reversing.
    await page.mouse.move((page.viewportSize()?.width ?? 1280) * .75, 120);
    await page.mouse.wheel(0, 1);
    const before = await page.evaluate(() => window.scrollY);
    if (isMobile) await swipeMapVertically(page, "up");
    else {
      await page.mouse.move((page.viewportSize()?.width ?? 1280) * .75, 120);
      await page.mouse.wheel(0, -240);
    }
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before);
    for (const chapter of [...chapters].reverse()) {
      await readChapter(page, chapter);
      await expect(journey.locator(`a[href="#journey-${chapter}"][aria-current="location"]`)).toHaveCount(1);
      await settleCamera(page);
      await expect.poll(() => page.locator(`#journey-${chapter} .venue-journey-reading`).evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.9);
      await expect(page).toHaveURL(originalURL);
    }
    if (isMobile) {
      await zoomAndReset(page, locale, true);
      await expect(page).toHaveURL(originalURL);
      await expectReadable(page);
    }
  });

  test(`${locale} chapter anchors, short phone reading and reduced motion retain every arrival option`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 480 });
    await page.goto(`/${locale}/dates-venue?view=arrival`);
    await page.evaluate(() => document.fonts.ready);
    const journey = page.getByTestId("venue-arrival-journey");
    const camera = page.getByTestId("venue-journey-camera");
    await expect(journey).toHaveAttribute("data-journey-ready", "true");
    await settleCamera(page);
    const initialTransform = await camera.evaluate((element) => getComputedStyle(element).transform);
    for (const chapter of chapters) {
      const anchor = journey.locator(`.venue-journey-index a[href="#journey-${chapter}"]`);
      await anchor.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue\\?view=arrival#journey-${chapter}$`));
      await expect(page.locator(`#journey-${chapter}`)).toBeFocused();
      await expect(camera).toHaveCSS("transform", initialTransform);
    }
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    // The resize can briefly enable compact mode before the font mutation's
    // observer restores reading flow; measure the resulting enlarged layout.
    await expect(journey).toHaveAttribute("data-reading-flow", "true");
    await expectReadable(page);
    for (const chapter of chapters) {
      await readChapter(page, chapter);
      await expectReadable(page);
    }
    await expect(journey.locator("[data-travel-mode]")).toHaveCount(3);
    await expect(journey.locator("[data-venue-detail]")).toHaveCount(6);
    await journey.locator(".venue-journey-atlas").scrollIntoViewIfNeeded();
    await settleCamera(page);
    await zoomAndReset(page, locale, isMobile);
    await expectReadable(page);
    if (isMobile) {
      // Reduced motion on a normal phone must preserve tappable stop framing;
      // the full overview is reserved for desktop and short/enlarged flow above.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/dates-venue`);
      await page.evaluate(() => document.fonts.ready);
      await expect(journey).toHaveAttribute("data-reading-flow", "false");
      for (const chapter of ["airport", "arrival"] as const) {
        await readChapter(page, chapter);
        await settleCamera(page);
        const point = journey.locator(`[data-map-point="${chapter}"]`);
        await expect(point).toHaveAttribute("data-point-visible", "true");
        await expect(point).toBeInViewport();
        await expectPinClearOfMapFurniture(page, point);
        expect(await camera.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
        await inspectPointPanel(page, point, chapter, locale, true);
      }
    }
  });

  test(`${locale} transport guidance responds to keyboard, touch and deliberate hover`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/dates-venue`);
    await readChapter(page, "city");
    const details = page.locator('[data-travel-mode="taxi"] details');
    const summary = details.locator("summary");
    await expect(details).not.toHaveAttribute("open", "");
    await expect(details.locator("p").first()).toBeHidden();
    const target = await summary.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
    if (isMobile) {
      await summary.tap();
      await expect(details).toHaveAttribute("open", "");
      await expect(details.locator("p").first()).toBeVisible();
      await summary.tap();
      await expect(details).not.toHaveAttribute("open", "");
      await expect(details.locator("p").first()).toBeHidden();
      await summary.tap();
      await expect(details).toHaveAttribute("open", "");
    } else {
      await page.mouse.move(0, 0);
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(details).toHaveAttribute("open", "");
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
        // Touch selects actual information; it must not silently jump to a chapter.
        await expect(journey).toHaveAttribute("data-map-compact", "true");
        await readChapter(page, chapter);
        await settleCamera(page);
        await expect(point).toHaveAttribute("data-point-visible", "true");
        await expect(tooltip).toBeHidden();
        await expectPinClearOfMapFurniture(page, point);
      } else {
        await page.evaluate(() => document.fonts.ready);
        await readChapter(page, chapter);
        await settleCamera(page);
        await expect(point).toHaveAttribute("data-point-visible", "true");
        await expect(point).toBeInViewport();
        const scrollOffsets = await sceneScrollOffsets(page);
        const pin = await point.boundingBox();
        await page.mouse.move(pin!.x + pin!.width / 2, pin!.y + pin!.height / 2);
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(locale === "en" ? pointName === "airport" ? "King Abdulaziz International Airport" : "Abdullah Sulayman" : pointName === "airport" ? "مطار الملك عبدالعزيز الدولي" : "عبدالله سليمان");
        const box = await tooltip.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
        expect(box!.y + box!.height).toBeLessThanOrEqual(900);
        // Cross the real gap on the pin-facing side, including a flipped popup.
        const bridgeX = Math.max(box!.x + 1, Math.min(pin!.x + pin!.width / 2, box!.x + box!.width - 1));
        const bridgeY = box!.y < pin!.y ? box!.y + box!.height + 8 : box!.y - 8;
        await page.mouse.move(bridgeX, bridgeY);
        await expect(tooltip).toBeVisible();
        const entryX = Math.max(box!.x + 8, Math.min(bridgeX, box!.x + box!.width - 8));
        await page.mouse.move(entryX, box!.y + box!.height / 2, { steps: 12 });
        await expect(tooltip).toBeVisible();
        expect(await sceneScrollOffsets(page)).toEqual(scrollOffsets);
        await page.keyboard.press("Escape");
        await expect(tooltip).toBeHidden();
        await page.mouse.move(0, 0);
        await point.focus();
        await expect(point).toBeFocused();
        await expect(tooltip).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(tooltip).toBeHidden();
        await expect(point).toBeFocused();
      }
      await inspectPointPanel(page, point, pointName, locale, isMobile);
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
      await page.mouse.move(pin!.x + pin!.width / 2, pin!.y + pin!.height / 2);
      await expect(point).toHaveAttribute("data-tip-side", "below");
      await expect(tooltip).toBeVisible();
      const popup = await tooltip.boundingBox();
      expect(popup!.x).toBeGreaterThanOrEqual(0);
      expect(popup!.y).toBeGreaterThanOrEqual(pin!.y + pin!.height);
      expect(popup!.x + popup!.width).toBeLessThanOrEqual(width);
      expect(popup!.y + popup!.height).toBeLessThanOrEqual(900);
      const reading = await page.locator("#journey-airport .venue-journey-reading").boundingBox();
      if (locale === "en") expect(popup!.x).toBeGreaterThanOrEqual(reading!.x + reading!.width + 15);
      else expect(popup!.x + popup!.width).toBeLessThanOrEqual(reading!.x - 15);
      const entryX = Math.max(popup!.x + 8, Math.min(pin!.x + pin!.width / 2, popup!.x + popup!.width - 8));
      await page.mouse.move(entryX, popup!.y + 8, { steps: 12 });
      await expect(tooltip).toBeVisible();
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
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, hasTouch: true, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      expect((await page.goto(`/${locale}/dates-venue`, { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
      const gallery = page.locator(".venue-photo-gallery");
      const galleryRail = gallery.getByRole("region", { name: galleryLabel[locale], exact: true });
      await expect(gallery.getByRole("img")).toHaveCount(4);
      await galleryRail.scrollIntoViewIfNeeded();
      await expectOneGalleryCard(galleryRail, 0);
      await swipeGalleryHorizontally(page, galleryRail, locale);
      await expectOneGalleryCard(galleryRail, 1);
      await expect(page.locator(".venue-gallery-hero").getByTestId("venue-geographic-map")).toHaveCount(1);
      const journey = page.getByTestId("venue-arrival-journey");
      await expect(journey.locator("[data-journey-chapter]")).toHaveCount(3);
      const travel = journey.locator('[data-travel-mode="taxi"] details');
      const summary = travel.locator("summary");
      await expect(travel).not.toHaveAttribute("open", "");
      await summary.click();
      await expect(travel).toHaveAttribute("open", "");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(travel).not.toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await expect(travel).toHaveAttribute("open", "");
      await expect(travel.locator("p").first()).toBeVisible();
      const city = journey.locator('a[href="#journey-city"]').first();
      await city.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#journey-city$`));
      await expect(page.locator("#journey-city")).toBeInViewport();
      const essentials = page.locator("#at-venue details");
      await expect(essentials).not.toHaveAttribute("open", "");
      await essentials.locator("summary").click();
      await expect(essentials).toHaveAttribute("open", "");
      await expect(page.locator("#at-venue [data-venue-detail]")).toHaveCount(6);
      for (const item of await page.locator("#at-venue [data-venue-detail] dd").all()) await expect(item).toBeVisible();
      await expect(page.locator("#journey-arrival .venue-journey-reading")).toHaveCSS("opacity", "1");
      await page.locator("#international-attendees summary").click();
      await expect(page.locator("#international-attendees")).toContainText("UTC+3");
      await expect(page.getByTestId("venue-map-detail")).toBeHidden();
      for (const [point, chapter] of [["airport", "airport"], ["arrival", "arrival"]] as const) {
        const anchor = journey.locator(`[data-map-point="${point}"]`);
        await expect(anchor).toHaveAttribute("href", `#journey-${chapter}`);
        await expect(anchor).not.toHaveAttribute("role", "button");
      }
      await expectReadable(page);
    } finally { await context.close(); }
  });
}
