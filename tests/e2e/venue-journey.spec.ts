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
type EntrySceneStyles = { selector: string; properties: { name: string; value: string; priority: string }[] }[];
type EntrySceneSnapshot = { position: string; inert: boolean; translateY: number; placeholders: { hidden: string | null; height: number }[]; opacity: number; viewportHeight: number; blur: number };
type EntryInputStart = { type: "wheel" | "touchmove"; at: number; delta: number; trusted: boolean; cancelable: boolean; beforeState: string; beforeY: number; beforeHistory: number; beforeReleases: number };
type EntryInputObservation = EntryInputStart & { afterState: string; afterY: number; afterHistory: number; afterReleases: number; prevented: boolean; scene: EntrySceneSnapshot | null };
type EntryNativeInput = { type: "wheel" | "touchmove"; at: number; delta: number; trusted: boolean; cancelable: boolean; state: string; y: number; afterState?: string; afterY?: number; prevented?: boolean };
type EntryChargeFrame = { at: number; y: number; charge: number; glow: number; frame: string; headerBottom: number; viewportHeight: number; viewportWidth: number; boxes: { selector: string; left: number; right: number; top: number; bottom: number }[] };
type EntryReceipt = { changes: { state: string; at: number }[]; observer: MutationObserver; historyLength: number; sceneStyles: EntrySceneStyles; inputs: EntryInputObservation[]; nativeInputs: EntryNativeInput[]; chargeFrames: EntryChargeFrame[]; stopInputRecording(): void };

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

async function alignEntryBoundary(page: Page, approach = 0) {
  const stage = page.locator(".venue-gallery-stage");
  await expect(stage).toHaveAttribute("data-entry-boundary", "true");
  await expect(stage).toHaveAttribute("data-entry-frame", /^(overview|continuation)$/);
  await stage.evaluate((element, approach) => {
    const box = element.getBoundingClientRect();
    const header = document.querySelector(".site-header")!.getBoundingClientRect();
    const distance = (element as HTMLElement).dataset.entryFrame === "overview"
      ? box.top - header.bottom - 16 : box.bottom - window.innerHeight;
    window.scrollBy({ top: distance - approach, behavior: "instant" });
  }, approach);
  // Let the actual document scroll event arm the boundary before delivering
  // input; geometric alignment alone can precede that event's delivery.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await expect.poll(() => stage.evaluate((element, approach) => {
    const box = element.getBoundingClientRect();
    const header = document.querySelector(".site-header")!.getBoundingClientRect();
    const distance = (element as HTMLElement).dataset.entryFrame === "overview"
      ? box.top - header.bottom - 16 : box.bottom - window.innerHeight;
    return Math.abs(distance - approach);
  }, approach)).toBeLessThanOrEqual(1);
  return page.evaluate(() => window.scrollY);
}

async function expectOverviewFrame(page: Page) {
  const stage = page.locator(".venue-gallery-stage");
  await expect(stage).toHaveAttribute("data-entry-frame", "overview");
  const viewport = page.viewportSize()!;
  const headerBottom = await page.locator(".site-header").evaluate(element => element.getBoundingClientRect().bottom);
  for (const selector of [".venue-stage-intro", "#venue-orientation", ".venue-stage-guidance", ".venue-hero-action"]) {
    const content = stage.locator(selector);
    await expect(content).toBeVisible();
    const box = (await content.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(headerBottom + 8);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 8);
  }
  for (const link of await stage.locator(".venue-map-links a, .venue-stage-resources a, .venue-hero-action").all()) await expectButtonBounds(page, link);
  await expectButtonBounds(page, stage.locator("#international-attendees summary"));
  const columns = await stage.locator(".venue-stage-layout > *").evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));
  expect(columns).toHaveLength(3);
  for (let index = 0; index < columns.length; index++) for (const other of columns.slice(index + 1)) {
    const column = columns[index];
    expect(column.left < other.right && column.right > other.left && column.top < other.bottom && column.bottom > other.top).toBe(false);
  }
}

async function entryCharge(page: Page) {
  return page.locator(".venue-entry-portal").evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--venue-entry-charge")));
}

async function recordEntryRelease(page: Page) {
  await page.evaluate(() => {
    const portal = document.querySelector<HTMLElement>(".venue-entry-portal");
    if (!portal) throw new Error("Expected the hydrated Venue entrance to record its release");
    const changes = [{ state: portal.dataset.entryState ?? "", at: performance.now() }];
    const sceneStyles = [
      { selector: ".venue-arrival-journey", names: ["position", "left", "right", "top", "bottom", "width", "height", "min-height", "max-height", "overflow", "overflow-x", "overflow-y", "z-index", "transform", "filter", "will-change", "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "transition-behavior"] },
      { selector: ".venue-journey-world", names: ["transform", "will-change", "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "transition-behavior"] },
      { selector: ".venue-journey-frame", names: ["transform", "will-change", "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "transition-behavior"] },
      { selector: "#journey-airport .venue-journey-title", names: ["transform", "opacity", "will-change", "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "transition-behavior"] },
      { selector: "#journey-airport .venue-journey-reading", names: ["opacity", "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "transition-behavior"] },
    ].map(({ selector, names }) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Expected ${selector} before the entrance reveal`);
      return { selector, properties: names.map(name => ({ name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) })) };
    });
    const observer = new MutationObserver(() => {
      const state = portal.dataset.entryState ?? "";
      if (changes.at(-1)?.state !== state) changes.push({ state, at: performance.now() });
    });
    observer.observe(portal, { attributes: true, attributeFilter: ["data-entry-state"] });
    const inputs: EntryInputObservation[] = [];
    const nativeInputs: EntryNativeInput[] = [];
    const nativePending = new WeakMap<Event, EntryNativeInput>();
    const chargeFrames: EntryChargeFrame[] = [];
    let chargeFrame = 0;
    const observeCharge = () => {
      const stage = document.querySelector<HTMLElement>(".venue-gallery-stage");
      const header = document.querySelector(".site-header");
      const glow = document.querySelector(".venue-entry-glow");
      if (portal.dataset.entryState === "charging" && stage && header && glow) {
        const opacity = Number(getComputedStyle(glow).opacity);
        if (opacity > 0) chargeFrames.push({ at: performance.now(), y: scrollY,
          charge: Number(getComputedStyle(portal).getPropertyValue("--venue-entry-charge")), glow: opacity,
          frame: stage.dataset.entryFrame ?? "", headerBottom: header.getBoundingClientRect().bottom,
          viewportHeight: innerHeight, viewportWidth: innerWidth,
          boxes: [".venue-stage-intro", "#venue-orientation", ".venue-stage-guidance", ".venue-hero-action"].map(selector => {
            const element = stage.querySelector(selector);
            if (!element) throw new Error(`Expected ${selector} in the charged overview`);
            const box = element.getBoundingClientRect();
            return { selector, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
          }) });
      }
      chargeFrame = requestAnimationFrame(observeCharge);
    };
    chargeFrame = requestAnimationFrame(observeCharge);
    const pending = new WeakMap<Event, EntryInputStart>();
    let previousTouchY: number | undefined;
    const touchStart = (event: TouchEvent) => { previousTouchY = event.touches.length === 1 ? event.touches[0].clientY : undefined; };
    const touchEnd = () => { previousTouchY = undefined; };
    const captureInput = (event: WheelEvent | TouchEvent) => {
      let delta: number;
      if (event.type === "wheel") delta = (event as WheelEvent).deltaY;
      else {
        const point = (event as TouchEvent).touches[0];
        if (!point) return;
        delta = previousTouchY === undefined ? 0 : previousTouchY - point.clientY;
        previousTouchY = point.clientY;
      }
      const native = { type: event.type as "wheel" | "touchmove", at: performance.now(), delta,
        trusted: event.isTrusted, cancelable: event.cancelable, state: portal.dataset.entryState ?? "", y: scrollY };
      nativeInputs.push(native); nativePending.set(event, native);
      if (portal.dataset.entryState !== "releasing" || delta <= 0) return;
      pending.set(event, { type: event.type as "wheel" | "touchmove", at: performance.now(), delta,
        trusted: event.isTrusted, cancelable: event.cancelable, beforeState: portal.dataset.entryState,
        beforeY: scrollY, beforeHistory: history.length, beforeReleases: Number(portal.dataset.entryReleases ?? "0") });
    };
    const afterInput = (event: WheelEvent | TouchEvent) => {
      const native = nativePending.get(event);
      if (native) {
        native.afterState = portal.dataset.entryState ?? "";
        native.afterY = scrollY; native.prevented = event.defaultPrevented;
        nativePending.delete(event);
      }
      const before = pending.get(event);
      if (!before) return;
      const journey = document.querySelector<HTMLElement>(".venue-arrival-journey");
      const reading = document.querySelector("#journey-airport .venue-journey-reading");
      const layout = document.querySelector(".venue-stage-layout");
      const placeholders = [...document.querySelectorAll("[data-venue-entry-placeholder]")];
      inputs.push({ ...before, afterState: portal.dataset.entryState ?? "", afterY: scrollY,
        afterHistory: history.length, afterReleases: Number(portal.dataset.entryReleases ?? "0"), prevented: event.defaultPrevented,
        scene: journey && reading && layout ? { position: getComputedStyle(journey).position, inert: journey.inert,
          translateY: new DOMMatrix(getComputedStyle(journey).transform).f,
          placeholders: placeholders.map(element => ({ hidden: element.getAttribute("aria-hidden"), height: element.getBoundingClientRect().height })),
          opacity: Number(getComputedStyle(reading).opacity), viewportHeight: innerHeight,
          blur: Number.parseFloat(getComputedStyle(layout).filter.match(/blur\(([^)]+)\)/)?.[1] ?? "0") } : null });
      pending.delete(event);
    };
    // Capture sees the real input before the controller; the later window
    // listener sees whether that same trusted event was actually consumed.
    // The controller is already hydrated before this recorder is installed.
    window.addEventListener("touchstart", touchStart, { capture: true, passive: true });
    window.addEventListener("touchend", touchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", touchEnd, { capture: true, passive: true });
    for (const type of ["wheel", "touchmove"] as const) {
      window.addEventListener(type, captureInput, { capture: true, passive: true });
      window.addEventListener(type, afterInput, { passive: true });
    }
    const stopInputRecording = () => {
      cancelAnimationFrame(chargeFrame);
      window.removeEventListener("touchstart", touchStart, { capture: true });
      window.removeEventListener("touchend", touchEnd, { capture: true });
      window.removeEventListener("touchcancel", touchEnd, { capture: true });
      for (const type of ["wheel", "touchmove"] as const) {
        window.removeEventListener(type, captureInput, { capture: true });
        window.removeEventListener(type, afterInput);
      }
    };
    (window as unknown as { venueEntryReceipt: EntryReceipt })
      .venueEntryReceipt = { changes, observer, historyLength: history.length, sceneStyles, inputs, nativeInputs, chargeFrames, stopInputRecording };
  });
}

async function expectOneEntryRelease(page: Page, expected = { historyEntries: 1, totalReleases: 1 }) {
  const receipt = await page.evaluate(() => {
    const receipt = (window as unknown as { venueEntryReceipt: EntryReceipt }).venueEntryReceipt;
    receipt.observer.disconnect();
    receipt.stopInputRecording();
    return { changes: receipt.changes, addedHistoryEntries: history.length - receipt.historyLength, inputs: receipt.inputs,
      nativeInputs: receipt.nativeInputs, chargeFrames: receipt.chargeFrames,
      priorStyles: receipt.sceneStyles, restoredStyles: receipt.sceneStyles.map(({ selector, properties }) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Expected ${selector} after the entrance reveal`);
        return { selector, properties: properties.map(({ name }) => ({ name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) })) };
      }) };
  });
  const releases = receipt.changes.filter(change => change.state === "releasing");
  expect(releases, JSON.stringify(receipt)).toHaveLength(1);
  const completion = receipt.changes.find(change => change.state === "completed");
  expect(completion, JSON.stringify(receipt)).toBeDefined();
  // A deliberate reveal remains visible through its authored 850ms, then
  // completes after draining residual input. A brief jump is not equivalent.
  expect(completion!.at - releases[0].at).toBeGreaterThanOrEqual(800);
  expect(receipt.addedHistoryEntries).toBe(expected.historyEntries);
  expect(receipt.restoredStyles).toEqual(receipt.priorStyles);
  await expect(page.locator("[data-venue-entry-placeholder]")).toHaveCount(0);
  expect(await page.getByTestId("venue-arrival-journey").evaluate(element => (element as HTMLElement).inert)).toBe(false);
  await expect(page.locator(".venue-entry-portal")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".venue-entry-portal")).toHaveAttribute("data-entry-releases", String(expected.totalReleases));
  return receipt;
}

function expectEntryRevealScene(scene: EntrySceneSnapshot) {
  expect(scene.position).toBe("fixed");
  expect(scene.inert).toBe(true);
  expect(scene.translateY).toBeGreaterThan(0);
  expect(scene.placeholders).toHaveLength(1);
  expect(scene.placeholders[0].hidden).toBe("true");
  expect(scene.placeholders[0].height).toBeGreaterThan(scene.viewportHeight);
  expect(scene.opacity).toBeGreaterThanOrEqual(.95);
  expect(scene.blur).toBeGreaterThan(0);
  expect(scene.blur).toBeLessThanOrEqual(6);
}

function expectBlockedReleaseInput(inputs: EntryInputObservation[], type: EntryInputObservation["type"], boundary: number) {
  const residual = inputs.filter(input => input.type === type);
  expect(residual.length, JSON.stringify(inputs)).toBeGreaterThanOrEqual(1);
  for (const input of residual) {
    expect(input.trusted).toBe(true);
    expect(input.cancelable).toBe(true);
    expect(input.delta).toBeGreaterThan(0);
    expect(input.beforeState).toBe("releasing");
    expect(input.afterState).toBe("releasing");
    expect(input.prevented).toBe(true);
    expect(input.afterY).toBe(input.beforeY);
    expect(input.afterHistory).toBe(input.beforeHistory);
    expect(input.afterReleases).toBe(input.beforeReleases);
  }
  const liveScenes = residual.filter(input => input.scene && input.scene.translateY > 0 && input.scene.blur > 0);
  expect(liveScenes.length, JSON.stringify(residual)).toBeGreaterThanOrEqual(1);
  for (const input of liveScenes) {
    expectEntryRevealScene(input.scene!);
    expect(Math.abs(input.beforeY - boundary)).toBeLessThanOrEqual(1);
  }
}

function expectChargedOverviewFrames(frames: EntryChargeFrame[], boundary: number) {
  expect(frames.length, JSON.stringify(frames)).toBeGreaterThanOrEqual(2);
  expect(frames.at(-1)!.at - frames[0].at).toBeGreaterThan(0);
  for (const frame of frames) {
    expect(frame.frame).toBe("overview");
    expect(frame.charge).toBeGreaterThan(0);
    expect(frame.glow).toBeGreaterThan(0);
    expect(Math.abs(frame.y - boundary)).toBeLessThanOrEqual(1);
    for (const box of frame.boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(frame.viewportWidth);
      expect(box.top).toBeGreaterThanOrEqual(frame.headerBottom + 8);
      expect(box.bottom).toBeLessThanOrEqual(frame.viewportHeight - 8);
    }
  }
}

function expectCompactChargeFrames(frames: EntryChargeFrame[], boundary: number) {
  expect(frames.length, JSON.stringify(frames)).toBeGreaterThanOrEqual(2);
  expect(frames.at(-1)!.at - frames[0].at).toBeGreaterThan(0);
  for (const frame of frames) {
    expect(frame.frame).toBe("continuation");
    expect(frame.charge).toBeGreaterThan(0);
    expect(frame.glow).toBeGreaterThan(0);
    expect(Math.abs(frame.y - boundary)).toBeLessThanOrEqual(1);
    const begin = frame.boxes.find(box => box.selector === ".venue-hero-action")!;
    expect(begin.left).toBeGreaterThanOrEqual(0);
    expect(begin.right).toBeLessThanOrEqual(frame.viewportWidth);
    expect(begin.top).toBeGreaterThanOrEqual(frame.headerBottom + 8);
    expect(begin.bottom).toBeLessThanOrEqual(frame.viewportHeight - 8);
  }
}

async function retreatFromEntry(page: Page, isMobile: boolean, boundary: number) {
  await entryInput(page, isMobile, -180);
  await expect.poll(() => entryCharge(page)).toBe(0);
  await expect(page.locator(".venue-entry-portal")).toHaveAttribute("data-entry-state", "approaching");
  // Once charge is empty, a separate deliberate upward gesture must pass
  // straight through to the document rather than leave a permanent hold.
  const beforeRetreat = await page.evaluate(() => window.scrollY);
  await entryInput(page, isMobile, -180);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(beforeRetreat - 40);
  // A wheel returns before its compositor movement necessarily finishes. Wait
  // for this packet's actual180px displacement before positioning a new scene;
  // the first reverse may already satisfy the older gate-relative predicate.
  if (!isMobile) await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(Math.max(0, beforeRetreat - 180));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(boundary - 40);
}

async function completeEntryWithScroll(page: Page, isMobile: boolean) {
  if (isMobile) {
    const approach = await naturalEntrySnapshot(page);
    const distance = Math.max(0, approach.remaining) + 360;
    await entryInput(page, true, distance, undefined, Math.max(8, Math.ceil(distance / 60)));
  } else {
    const approach = await naturalEntrySnapshot(page);
    // Earned travel counts even when a coarse wheel reports it in one packet;
    // the entrance still renders its buildup before the authored reveal.
    await entryInput(page, false, Math.max(0, approach.remaining) + 900);
  }
}

async function naturalEntrySnapshot(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".venue-gallery-stage");
    const portal = document.querySelector<HTMLElement>(".venue-entry-portal");
    const header = document.querySelector(".site-header");
    const glow = document.querySelector(".venue-entry-glow");
    if (!stage || !portal || !header || !glow) throw new Error("Expected the hydrated Venue entrance for the natural-input snapshot");
    const box = stage.getBoundingClientRect();
    const boundary = scrollY + (stage.dataset.entryFrame === "overview"
      ? box.top - header.getBoundingClientRect().bottom - 16 : box.bottom - innerHeight);
    return { url: location.href, y: scrollY, viewport: { width: innerWidth, height: innerHeight },
      frame: stage.dataset.entryFrame, boundary, remaining: boundary - scrollY,
      state: portal.dataset.entryState, ready: portal.dataset.entryReady,
      charge: Number(getComputedStyle(portal).getPropertyValue("--venue-entry-charge")),
      glow: Number(getComputedStyle(glow).opacity) };
  });
}

async function entryInput(page: Page, isMobile: boolean, distance: number, whileHeld?: () => Promise<void>, samples = 8) {
  const viewport = page.viewportSize()!;
  // Use the stage's outer gutter so a link or disclosure never owns the input.
  const x = viewport.width * .98;
  const startY = distance > 0 ? viewport.height - 24 : viewport.height * .6;
  if (!isMobile) {
    await page.mouse.move(x, startY);
    await page.mouse.wheel(0, distance);
    await whileHeld?.();
    return;
  }
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
    for (let step = 1; step <= samples; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: startY - distance * step / samples }] });
      await gestureFrame(16);
    }
    await whileHeld?.();
    // A stationary terminal sample models a completed deliberate drag. It also
    // leaves subsequent taps available rather than merely cancelling a flick.
    await gestureFrame(100);
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: startY - distance }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally { await client.detach(); }
}

async function expectAirportEntry(page: Page) {
  const airport = page.locator("#journey-airport");
  await expect(airport.getByRole("heading").first()).toBeInViewport();
  await expect(page.locator('.venue-journey-index a[href="#journey-airport"]')).toHaveAttribute("aria-current", "location");
  await expect.poll(() => airport.locator(".venue-journey-reading").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.9);
  await expect(page.locator(".venue-entry-portal")).toHaveAttribute("data-entry-state", "completed");
  await expect.poll(() => entryCharge(page)).toBe(0);
  // The charged transition must land at the same real position as the native
  // destination anchor, rather than merely somewhere with the heading visible.
  const settledY = await page.evaluate(() => window.scrollY);
  await airport.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(Math.abs(await page.evaluate(() => window.scrollY) - settledY)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
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
  for (const input of ["single large wheel", "native noncancelable mouse fling"] as const) {
    test(`${locale} fresh ${input} earns a visible overview and one precise entrance`, async ({ page, isMobile, browserName }, testInfo) => {
      test.skip(isMobile || browserName !== "chromium", "This case exercises Chromium's native desktop wheel input; phone gestures have separate coverage.");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(`/${locale}/dates-venue?view=fast-${input === "single large wheel" ? "wheel" : "fling"}`);
      await page.evaluate(() => document.fonts.ready);
      const portal = page.locator(".venue-entry-portal");
      await expect(portal).toHaveAttribute("data-entry-ready", "true");
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const before = await naturalEntrySnapshot(page);
      expect(before.remaining).toBeGreaterThan(0);
      await recordEntryRelease(page);
      if (input === "single large wheel") {
        await page.mouse.move(720, 450);
        await page.mouse.wheel(0, before.remaining + 2000);
      } else {
        const client = await page.context().newCDPSession(page);
        try {
          // Browser-generated scrolling includes trusted noncancelable wheel
          // events. It never calls an app function or prepositions the gate.
          await client.send("Input.synthesizeScrollGesture", {
            x: 720, y: 450, yDistance: -4000, speed: 10000,
            gestureSourceType: "mouse", preventFling: false,
          });
        } finally { await client.detach(); }
      }
      await testInfo.attach(`${locale}-fast-input-before-landing`, {
        body: JSON.stringify({ before, after: await naturalEntrySnapshot(page), inputs: await page.evaluate(() => (window as unknown as { venueEntryReceipt: EntryReceipt }).venueEntryReceipt.nativeInputs) }, null, 2),
        contentType: "application/json",
      });
      await expectAirportEntry(page);
      const receipt = await expectOneEntryRelease(page);
      await testInfo.attach(`${locale}-fast-input-complete-receipt`, { body: JSON.stringify(receipt, null, 2), contentType: "application/json" });
      expect(receipt.nativeInputs.some(event => event.trusted && event.delta > 0)).toBe(true);
      if (input === "native noncancelable mouse fling") expect(receipt.nativeInputs.some(event => event.trusted && !event.cancelable && event.delta > 0)).toBe(true);
      expectChargedOverviewFrames(receipt.chargeFrames, before.boundary);
      await expect(page).toHaveURL(`${before.url}#journey-airport`);
      const landed = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 180);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(landed + 40);
      await expect(portal).toHaveAttribute("data-entry-state", "completed");
      await expect(portal).toHaveAttribute("data-entry-releases", "1");
      await expectReadable(page);
    });
  }

  test(`${locale} fresh coarse phone travel earns one perceptible entrance`, async ({ page, isMobile, browserName }, testInfo) => {
    test.skip(!isMobile || browserName !== "chromium", "This case uses native Chromium phone touch input; other engines retain keyboard and touch-target checks.");
    await page.setViewportSize({ width: 412, height: 839 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=coarse-phone`);
    await page.evaluate(() => document.fonts.ready);
    const portal = page.locator(".venue-entry-portal");
    await expect(portal).toHaveAttribute("data-entry-ready", "true");
    expect(await page.evaluate(() => scrollY)).toBe(0);
    const before = await naturalEntrySnapshot(page);
    await recordEntryRelease(page);
    let approach = before;
    for (let step = 0; step < 10 && approach.remaining > 400; step++) {
      const prior = approach.y;
      await entryInput(page, true, 240);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(prior + 40);
      approach = await naturalEntrySnapshot(page);
    }
    expect(approach.remaining).toBeGreaterThan(0);
    expect(approach.remaining).toBeLessThanOrEqual(400);
    const distance = approach.remaining + 360;
    expect(distance).toBeLessThan(839 - 24);
    // Three coarse moves carry the same earned travel as many tiny packets.
    // The gesture starts naturally before the boundary and stays on-screen.
    await entryInput(page, true, distance, undefined, 3);
    await testInfo.attach(`${locale}-coarse-phone-before-landing`, {
      body: JSON.stringify({ before, approach, after: await naturalEntrySnapshot(page), inputs: await page.evaluate(() => (window as unknown as { venueEntryReceipt: EntryReceipt }).venueEntryReceipt.nativeInputs) }, null, 2),
      contentType: "application/json",
    });
    await expectAirportEntry(page);
    const receipt = await expectOneEntryRelease(page);
    await testInfo.attach(`${locale}-coarse-phone-complete-receipt`, { body: JSON.stringify(receipt, null, 2), contentType: "application/json" });
    expect(receipt.nativeInputs.some(input => input.type === "touchmove" && input.trusted && input.delta > 100)).toBe(true);
    expectCompactChargeFrames(receipt.chargeFrames, before.boundary);
    await expect(page).toHaveURL(`${before.url}#journey-airport`);
    const landed = await page.evaluate(() => scrollY);
    await swipeMapVertically(page);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(landed + 40);
    await expect(portal).toHaveAttribute("data-entry-releases", "1");
    await expectReadable(page);
  });

  test(`${locale} a genuine native return above the overview permits one new entrance`, async ({ page, isMobile, browserName }, testInfo) => {
    test.skip(isMobile || browserName !== "chromium", "Native desktop reentry is distinct from compact swipe reversal coverage.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=native-reentry`);
    await page.evaluate(() => document.fonts.ready);
    const portal = page.locator(".venue-entry-portal");
    await expect(portal).toHaveAttribute("data-entry-ready", "true");
    const before = await naturalEntrySnapshot(page);
    expect(before.y).toBe(0);
    await recordEntryRelease(page);
    await page.mouse.move(720, 450);
    // Full earned effort completes in two coarse packets from the header.
    // Extra packets after the 850ms reveal are intentional native continuation.
    for (let step = 0; step < 2; step++) await page.mouse.wheel(0, 900);
    await expectAirportEntry(page);
    await expectOneEntryRelease(page);
    const enteredURL = page.url();
    const landed = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, -(landed - before.boundary + 180));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before.boundary - 128);
    await testInfo.attach(`${locale}-native-return-before-reentry`, { body: JSON.stringify(await naturalEntrySnapshot(page), null, 2), contentType: "application/json" });
    await expect(portal).toHaveAttribute("data-entry-state", "approaching");
    expect(await entryCharge(page)).toBe(0);
    await expect(page).toHaveURL(enteredURL);
    const returned = await naturalEntrySnapshot(page);
    await recordEntryRelease(page);
    await page.mouse.wheel(0, returned.remaining + 2000);
    await expectAirportEntry(page);
    // A native scroll never removed the existing fragment. Replaying the same
    // destination creates a second reveal without duplicating browser history.
    const receipt = await expectOneEntryRelease(page, { historyEntries: 0, totalReleases: 2 });
    await testInfo.attach(`${locale}-native-reentry-complete-receipt`, { body: JSON.stringify(receipt, null, 2), contentType: "application/json" });
    expectChargedOverviewFrames(receipt.chargeFrames, before.boundary);
    await expect(page).toHaveURL(enteredURL);
  });

  test(`${locale} fresh natural wheel scrolling catches a large crossing input`, async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, "This case uses a physical wheel; the separate natural-touch case covers phones.");
    for (const viewport of [{ width: 738, height: 923 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(`/${locale}/dates-venue?view=natural-wheel`);
      await page.evaluate(() => document.fonts.ready);
      const portal = page.locator(".venue-entry-portal");
      await expect(portal).toHaveAttribute("data-entry-ready", "true");
      await expect(portal).toHaveAttribute("data-entry-state", "approaching");
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const before = await naturalEntrySnapshot(page);
      expect(before.remaining).toBeGreaterThan(0);
      // One finite wheel movement starts on the header screen and crosses the
      // overview. No programmatic scrolling arms or positions the gate first.
      await entryInput(page, false, before.remaining + 120);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      const after = await naturalEntrySnapshot(page);
      await testInfo.attach(`${locale}-natural-wheel-${viewport.width}`, {
        body: JSON.stringify({ before, after }, null, 2), contentType: "application/json",
      });
      await expect(portal).toHaveAttribute("data-entry-state", "charging");
      expect(Math.abs(after.y - before.boundary)).toBeLessThanOrEqual(1);
      await expect.poll(() => entryCharge(page)).toBeGreaterThan(0);
      expect(await entryCharge(page)).toBeLessThan(1);
      await expect.poll(() => page.locator(".venue-entry-glow").evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0);
      await expect(page).toHaveURL(before.url);
      if (after.frame === "overview") await expectOverviewFrame(page);
      await retreatFromEntry(page, false, before.boundary);
      await completeEntryWithScroll(page, false);
      await expectAirportEntry(page);
      await expect(page).toHaveURL(`${before.url}#journey-airport`);
    }
  });

  test(`${locale} fresh natural touch scrolling charges from a gesture begun outside the short approach`, async ({ page, isMobile }, testInfo) => {
    test.skip(!isMobile, "This case requires native phone touch input.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=natural-touch`);
    await page.evaluate(() => document.fonts.ready);
    const portal = page.locator(".venue-entry-portal");
    await expect(portal).toHaveAttribute("data-entry-ready", "true");
    await expect(portal).toHaveAttribute("data-entry-state", "approaching");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    let approach = await naturalEntrySnapshot(page);
    const nativeApproach = [approach];
    // Read from the top through ordinary repeated swipes. Geometry is observed
    // to stop before the final gesture; it is never changed through evaluate.
    for (let step = 0; step < 10 && approach.remaining > 480; step++) {
      const previous = approach.y;
      await entryInput(page, true, 240);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previous + 40);
      approach = await naturalEntrySnapshot(page);
      nativeApproach.push(approach);
    }
    expect(approach.remaining).toBeGreaterThan(160);
    expect(approach.remaining).toBeLessThanOrEqual(480);
    await entryInput(page, true, approach.remaining + 80, async () => {
      const held = await naturalEntrySnapshot(page);
      await testInfo.attach(`${locale}-natural-touch-approach`, {
        body: JSON.stringify({ nativeApproach, held }, null, 2), contentType: "application/json",
      });
      await expect(portal).toHaveAttribute("data-entry-state", "charging");
      expect(Math.abs(held.y - approach.boundary)).toBeLessThanOrEqual(1);
      await expect.poll(() => entryCharge(page)).toBeGreaterThan(0);
      expect(await entryCharge(page)).toBeLessThan(1);
      await expect.poll(() => page.locator(".venue-entry-glow").evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0);
      await expect(page).toHaveURL(approach.url);
    });
    await retreatFromEntry(page, true, approach.boundary);
    await completeEntryWithScroll(page, true);
    await expectAirportEntry(page);
    await expect(page).toHaveURL(`${approach.url}#journey-airport`);
  });

  test(`${locale} charged entry persists between inputs, reverses and releases native scrolling once`, async ({ page, isMobile }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=charged-entry`);
    await page.evaluate(() => document.fonts.ready);
    const portal = page.locator(".venue-entry-portal");
    const originalURL = page.url();
    const enteredURL = `${originalURL}#journey-airport`;
    await expect(portal).toHaveCount(1);
    await expect(portal).toHaveAttribute("data-entry-state", "approaching");
    const glow = page.locator(".venue-entry-glow");
    const veil = page.locator(".venue-entry-veil");
    for (const effect of [glow, veil]) {
      await expect(effect).toHaveAttribute("aria-hidden", "true");
      await expect(effect).toHaveCSS("pointer-events", "none");
    }
    const readingLayout = page.locator(".venue-stage-layout");
    const normalFilter = await readingLayout.evaluate(element => getComputedStyle(element).filter);
    if (isMobile) {
      // A natural approach starts before the boundary rather than depending on
      // an exactly aligned touchstart. It reaches the boundary, then charges.
      const approach = await alignEntryBoundary(page, 100);
      await entryInput(page, true, 140, async () => {
        await expect(portal).toHaveAttribute("data-entry-state", "charging");
        await expect.poll(() => entryCharge(page)).toBeGreaterThan(0);
        expect(await entryCharge(page)).toBeLessThan(1);
        expect(Math.abs(await page.evaluate(() => window.scrollY) - approach - 100)).toBeLessThanOrEqual(1);
        await expect.poll(() => page.locator(".venue-gallery-stage").evaluate(element => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight))).toBeLessThanOrEqual(1);
        await expect(page).toHaveURL(originalURL);
      });
      await retreatFromEntry(page, true, approach + 100);
    }
    const boundary = await alignEntryBoundary(page);
    if (await page.locator(".venue-gallery-stage").getAttribute("data-entry-frame") === "overview") {
      await expectOverviewFrame(page);
      await expect(glow).toHaveCSS("opacity", "0");
      await expect(veil).toHaveCSS("opacity", "0");
      await expect(readingLayout).toHaveCSS("filter", normalFilter);
    }
    let partialCharge = 0;
    await entryInput(page, isMobile, 80, async () => {
      await expect(portal).toHaveAttribute("data-entry-state", "charging");
      await expect.poll(() => entryCharge(page)).toBeGreaterThan(0);
      partialCharge = await entryCharge(page);
      expect(partialCharge).toBeLessThan(1);
      await expect.poll(() => glow.evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0);
      const blur = await readingLayout.evaluate(element => Number.parseFloat(getComputedStyle(element).filter.match(/blur\(([^)]+)\)/)?.[1] ?? "0"));
      expect(blur).toBe(0);
      expect(Math.abs(await page.evaluate(() => window.scrollY) - boundary)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => [document.documentElement, document.body].some(element => getComputedStyle(element).overflowY === "hidden"))).toBe(false);
      await expect(page).toHaveURL(originalURL);
    });
    // A quiet pause must neither charge by time nor decay the held overview.
    await gestureFrame(1000);
    await expect(portal).toHaveAttribute("data-entry-state", "charging");
    expect(await entryCharge(page)).toBe(partialCharge);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - boundary)).toBeLessThanOrEqual(1);
    await entryInput(page, isMobile, -40);
    await expect.poll(() => entryCharge(page)).toBeLessThan(partialCharge);
    expect(await entryCharge(page)).toBeGreaterThan(0);
    await expect(portal).toHaveAttribute("data-entry-state", "charging");
    expect(Math.abs(await page.evaluate(() => window.scrollY) - boundary)).toBeLessThanOrEqual(1);
    await retreatFromEntry(page, isMobile, boundary);
    await expect(page).toHaveURL(originalURL);

    const readyBoundary = await alignEntryBoundary(page);
    await entryInput(page, isMobile, 40);
    await expect(portal).toHaveAttribute("data-entry-state", "charging");
    const persistentCharge = await entryCharge(page);
    expect(persistentCharge).toBeGreaterThan(0);
    await gestureFrame(1000);
    expect(await entryCharge(page)).toBe(persistentCharge);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - readyBoundary)).toBeLessThanOrEqual(1);
    await expect(page).toHaveURL(originalURL);
    await recordEntryRelease(page);
    if (isMobile) await entryInput(page, true, 520, undefined, 24);
    else for (let step = 0; step < 6; step++) {
      const prior = await entryCharge(page);
      await entryInput(page, false, 80);
      if (step < 5) {
        await expect(portal).toHaveAttribute("data-entry-state", "charging");
        await expect.poll(() => entryCharge(page)).toBeGreaterThan(prior);
        expect(Math.abs(await page.evaluate(() => window.scrollY) - readyBoundary)).toBeLessThanOrEqual(1);
      }
    }
    // The continuous phone gesture includes real samples after earned glow
    // catchup and release begin. The recorder determines their actual phase.
    // A desktop wheel waits for that same public phase and a rendered frame,
    // so its residual event never assumes the threshold packet begins release.
    if (!isMobile) {
      await expect(portal).toHaveAttribute("data-entry-state", "releasing");
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.mouse.wheel(0, 180);
    }
    await expectAirportEntry(page);
    const receipt = await expectOneEntryRelease(page);
    await testInfo.attach(`${locale}-entry-native-event-phases`, {
      body: JSON.stringify({ changes: receipt.changes, inputs: receipt.inputs }, null, 2), contentType: "application/json",
    });
    // Residual input must be cancelled in its actual releasing event, preserve
    // the held scene and history, and never trigger a second release.
    expectBlockedReleaseInput(receipt.inputs, isMobile ? "touchmove" : "wheel", readyBoundary);
    await expect(page).toHaveURL(enteredURL);
    await expect(glow).toHaveCSS("opacity", "0");
    await expect(veil).toHaveCSS("opacity", "0");
    await expect(readingLayout).toHaveCSS("filter", normalFilter);
    const entered = await page.evaluate(() => window.scrollY);
    if (isMobile) await swipeMapVertically(page); else await page.mouse.wheel(0, 180);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(entered + 40);
    const afterDown = await page.evaluate(() => window.scrollY);
    if (isMobile) await swipeMapVertically(page, "up"); else await page.mouse.wheel(0, -180);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(afterDown - 40);
    await expect(portal).toHaveAttribute("data-entry-state", "completed");
    await expect(page).toHaveURL(enteredURL);
  });

  test(`${locale} centered Begin action enters once without requiring more scroll input`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=begin`);
    await page.evaluate(() => document.fonts.ready);
    const portal = page.locator(".venue-entry-portal");
    await expect(portal).toHaveAttribute("data-entry-ready", "true");
    const begin = page.locator(".venue-journey-invitation .venue-hero-action");
    await expect(begin).toHaveAttribute("href", "#journey-airport");
    await begin.scrollIntoViewIfNeeded();
    await expectButtonBounds(page, begin);
    await recordEntryRelease(page);
    if (isMobile) await begin.tap(); else await begin.click();
    await expect(portal).toHaveAttribute("data-entry-state", "releasing");
    await expectAirportEntry(page);
    await expectOneEntryRelease(page);
    await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue\\?view=begin#journey-airport$`));
    await expect(page.locator("#journey-airport")).toBeFocused();
    await expectReadable(page);
  });

  test(`${locale} Begin uses the same reveal from partial charge and ignores duplicate activation`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=partial-begin`);
    await page.evaluate(() => document.fonts.ready);
    const portal = page.locator(".venue-entry-portal");
    await expect(portal).toHaveAttribute("data-entry-ready", "true");
    const originalURL = page.url();
    const boundary = await alignEntryBoundary(page);
    await entryInput(page, isMobile, 120);
    await expect(portal).toHaveAttribute("data-entry-state", "charging");
    const charge = await entryCharge(page);
    expect(charge).toBeGreaterThan(0);
    expect(charge).toBeLessThan(1);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - boundary)).toBeLessThanOrEqual(1);
    const begin = page.locator(".venue-journey-invitation .venue-hero-action");
    await expectButtonBounds(page, begin);
    await begin.focus();
    expect(await entryCharge(page)).toBe(charge);
    await recordEntryRelease(page);
    // Real keyboard activations exercise the same public button twice while
    // it still owns focus; they do not invoke a private animation function.
    await page.keyboard.press("Enter");
    await expect(portal).toHaveAttribute("data-entry-state", "releasing");
    await page.keyboard.press("Enter");
    await expect(portal).toHaveAttribute("data-entry-state", "releasing");
    await expectAirportEntry(page);
    await expectOneEntryRelease(page);
    await expect(page).toHaveURL(`${originalURL}#journey-airport`);
    await expect(page.locator("#journey-airport")).toBeFocused();
    await expectReadable(page);
  });

  test(`${locale} document Home and End restore native flow when interrupting the reveal`, async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, "These terminal keys exercise desktop document navigation; native touch reversal is covered separately.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // This Windows shortcut is not WebKit's native document-navigation command.
    const keys = browserName === "chromium" ? ["Home", "End", "Control+Home"] as const : ["Home", "End"] as const;
    for (const activation of ["wheel", "keyboard"] as const) for (const key of keys) {
      await page.goto(`/${locale}/dates-venue?view=entry-${activation}-${key.toLowerCase()}`);
      await page.evaluate(() => document.fonts.ready);
      const portal = page.locator(".venue-entry-portal");
      await expect(portal).toHaveAttribute("data-entry-ready", "true");
      await alignEntryBoundary(page);
      const originalURL = page.url();
      const historyLength = await page.evaluate(() => history.length);
      const begin = page.locator(".venue-journey-invitation .venue-hero-action");
      if (activation === "wheel") {
        await entryInput(page, false, 900);
        expect(await page.evaluate(() => document.activeElement?.closest("a,button,input,select,textarea,summary,[contenteditable=true]")?.tagName ?? null)).toBeNull();
      } else {
        await begin.focus();
        await page.keyboard.press("Enter");
        // Begin retains focus until the reveal finishes. Its anchor must not
        // capture terminal keys whose native purpose is document navigation.
        await expect(begin).toBeFocused();
      }
      await expect(portal).toHaveAttribute("data-entry-state", "releasing");
      await page.keyboard.press(key);
      await expect(portal).toHaveAttribute("data-entry-state", "completed");
      await expect(page.locator("[data-venue-entry-placeholder]")).toHaveCount(0);
      expect(await page.getByTestId("venue-arrival-journey").evaluate(element => (element as HTMLElement).inert)).toBe(false);
      await expect(page.getByTestId("venue-arrival-journey")).not.toHaveCSS("position", "fixed");
      if (key !== "End") await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
      else await expect.poll(() => page.evaluate(() => Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY))).toBeLessThanOrEqual(1);
      await expect(page).toHaveURL(`${originalURL}#journey-airport`);
      expect(await page.evaluate(() => history.length)).toBe(historyLength + 1);
      expect(await entryCharge(page)).toBe(0);
      await expectReadable(page);
    }
  });

  test(`${locale} complete overview and side reading retain hierarchy with earlier reversible fades`, async ({ page, isMobile }) => {
    test.skip(isMobile, "The complete overview and side-column geometry apply to desktop; compact reading is covered separately.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}/dates-venue?view=side-reading`);
    await page.evaluate(() => document.fonts.ready);
    await alignEntryBoundary(page);
    await expectOverviewFrame(page);
    await expect(page.locator(".venue-entry-glow")).toHaveCSS("opacity", "0");
    const originalURL = page.url();
    const heroSize = await page.locator("h1").evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    for (const chapter of chapters) {
      const section = page.locator(`#journey-${chapter}`);
      await section.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
      await expect(page.locator(`.venue-journey-index a[href="#journey-${chapter}"]`)).toHaveAttribute("aria-current", "location");
      await settleCamera(page);
      const copy = section.locator(".venue-journey-reading");
      await expect.poll(() => copy.evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.9);
      const geometry = await copy.evaluate(element => {
        const box = element.getBoundingClientRect();
        const section = element.closest(".venue-journey-chapter");
        const indexElement = document.querySelector(".venue-journey-index");
        const title = element.querySelector(".venue-journey-title");
        if (!section || !indexElement || !title) throw new Error("Expected a journey chapter, index and title for the reading geometry check");
        const bounds = section.getBoundingClientRect();
        const chapterStyle = getComputedStyle(section);
        const index = indexElement.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width, centerX: (box.left + box.right) / 2,
          centerY: (box.top + box.bottom) / 2,
          contentCenterY: (bounds.top + Number.parseFloat(chapterStyle.paddingTop) + bounds.bottom - Number.parseFloat(chapterStyle.paddingBottom)) / 2,
          index: { left: index.left, right: index.right }, textAlign: getComputedStyle(element).textAlign,
          titleSize: Number.parseFloat(getComputedStyle(title).fontSize) };
      });
      expect(geometry.width).toBeLessThan(1440 * .4);
      expect(Math.abs(geometry.centerY - geometry.contentCenterY)).toBeLessThanOrEqual(1);
      expect(geometry.titleSize).toBeLessThan(heroSize);
      expect(geometry.titleSize).toBeGreaterThanOrEqual(32);
      if (locale === "en") {
        expect(geometry.centerX).toBeLessThan(720);
        expect(geometry.left).toBeGreaterThanOrEqual(geometry.index.right + 16);
        expect(["start", "left"]).toContain(geometry.textAlign);
      } else {
        expect(geometry.centerX).toBeGreaterThan(720);
        expect(geometry.right).toBeLessThanOrEqual(geometry.index.left - 16);
        expect(["start", "right"]).toContain(geometry.textAlign);
      }
      await expectReadable(page);
      await expect(page).toHaveURL(originalURL);
    }
    const airport = page.locator("#journey-airport");
    await airport.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
    await settleCamera(page);
    const title = airport.locator(".venue-journey-title");
    const copy = airport.locator(".venue-journey-reading");
    const originalTop = (await title.boundingBox())!.y;
    const headerBottom = await page.locator(".site-header").evaluate(element => element.getBoundingClientRect().bottom);
    const distance = originalTop - headerBottom - 24;
    expect(distance).toBeGreaterThan(0);
    await page.mouse.move(1440 * .98, 450);
    await page.mouse.wheel(0, distance);
    await expect.poll(async () => Math.abs((await title.boundingBox())!.y - headerBottom - 24)).toBeLessThanOrEqual(1);
    const fading = (await copy.boundingBox())!;
    expect(fading.y).toBeGreaterThan(headerBottom);
    expect(fading.y + fading.height).toBeLessThan(900);
    await expect.poll(() => copy.evaluate(element => Number(getComputedStyle(element).opacity))).toBeLessThan(.9);
    await page.mouse.wheel(0, -distance);
    await expect.poll(async () => Math.abs((await title.boundingBox())!.y - originalTop)).toBeLessThanOrEqual(1);
    await expect.poll(() => copy.evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.9);
    const incoming = page.locator("#journey-city .venue-journey-reading");
    const incomingTitle = incoming.locator(".venue-journey-title");
    const incomingDistance = (await incomingTitle.boundingBox())!.y - 900 + 24;
    expect(incomingDistance).toBeGreaterThan(0);
    await page.mouse.wheel(0, incomingDistance);
    await expect.poll(async () => Math.abs((await incomingTitle.boundingBox())!.y - 900 + 24)).toBeLessThanOrEqual(1);
    await expect.poll(() => incoming.evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(.25);
    await expect.poll(() => incoming.evaluate(element => Number(getComputedStyle(element).opacity))).toBeLessThan(.9);
    await expect(page).toHaveURL(originalURL);
  });

  test(`${locale} keyboard Begin shares the reveal while reduced and enlarged reading bypass the hold`, async ({ page, isMobile }) => {
    for (const mode of ["keyboard", "reduced", "short", "enlarged"] as const) {
      await page.emulateMedia({ reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
      await page.setViewportSize({ width: 390, height: mode === "short" ? 480 : 844 });
      await page.goto(`/${locale}/dates-venue?view=entry-${mode}`);
      await page.evaluate(() => document.fonts.ready);
      if (mode === "enlarged") {
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        await expect(page.getByTestId("venue-arrival-journey")).toHaveAttribute("data-reading-flow", "true");
      }
      const portal = page.locator(".venue-entry-portal");
      await expect(portal).toHaveAttribute("data-entry-state", "approaching");
      await expect(portal).toHaveAttribute("data-entry-ready", String(mode === "keyboard"));
      const begin = page.locator(".venue-journey-invitation .venue-hero-action");
      if (mode === "keyboard") {
        await begin.focus();
        await recordEntryRelease(page);
        await page.keyboard.press("Enter");
        await expect(portal).toHaveAttribute("data-entry-state", "releasing");
      } else {
        const boundary = await alignEntryBoundary(page);
        await entryInput(page, isMobile, 120);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(boundary + 40);
        await expect(portal).not.toHaveAttribute("data-entry-state", /^(charging|releasing)$/);
        expect(await entryCharge(page)).toBe(0);
        await begin.scrollIntoViewIfNeeded();
        if (isMobile) await begin.tap(); else await begin.click();
      }
      await expectAirportEntry(page);
      if (mode === "keyboard") await expectOneEntryRelease(page);
      await expect(page.locator("#journey-airport")).toBeFocused();
      if (mode !== "keyboard") await expect(page.locator("#journey-airport .venue-journey-reading")).toHaveCSS("opacity", "1");
      await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue\\?view=entry-${mode}#journey-airport$`));
      await expectReadable(page);
    }
  });

  test(`${locale} venue photographs load locally with desktop selection and native phone swiping`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/dates-venue`);
    await page.evaluate(() => document.fonts.ready);
    const gallery = page.locator(".venue-header-collage");
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

    if (!isMobile) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await rail.scrollIntoViewIfNeeded();
      const figures = gallery.locator(".venue-collage-photo");
      await expect(figures).toHaveCount(4);
      for (const figure of await figures.all()) {
        const select = figure.getByRole("button");
        await expect(select).toHaveAccessibleName(locale === "ar" ? /^اعرض الصورة: / : /^View photo: /);
        await select.focus();
        await page.keyboard.press("Enter");
        await expect(select).toHaveAttribute("aria-pressed", "true");
        await expect(figure).toHaveAttribute("data-photo-active", "true");
        await expect(gallery.locator('.venue-collage-photo button[aria-pressed="true"]')).toHaveCount(1);
        await expect.poll(() => figure.getByRole("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        expect(await figure.getByRole("img").evaluate((image: HTMLImageElement) => new URL(image.currentSrc).origin === location.origin)).toBe(true);
        await expect(select).toBeFocused();
      }
      // Verify pointer promotion independently of the keyboard focus layer.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const exposedPoint = await figures.first().evaluate((element) => {
        const box = element.getBoundingClientRect();
        for (const x of [.1, .3, .5, .7, .9]) for (const y of [.1, .3, .5, .7, .9]) {
          const point = { x: box.left + box.width * x, y: box.top + box.height * y };
          if (element.contains(document.elementFromPoint(point.x, point.y))) return point;
        }
        return null;
      });
      expect(exposedPoint).not.toBeNull();
      await page.mouse.move(exposedPoint!.x, exposedPoint!.y);
      await expect.poll(() => figures.evaluateAll(elements => {
        const layers = elements.map(element => Number(getComputedStyle(element).zIndex));
        return layers[0] > Math.max(...layers.slice(1));
      })).toBe(true);
      return;
    }

    const next = gallery.getByRole("button", { name: locale === "ar" ? "التالي" : "Next", exact: true });
    const previous = gallery.getByRole("button", { name: locale === "ar" ? "السابق" : "Previous", exact: true });
    await expect(previous).toBeDisabled();
    await expectOneGalleryCard(rail, 0);
    await expectControlBounds(page, gallery.locator(".rail-buttons"));
    await swipeGalleryHorizontally(page, rail, locale);
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
      if (index) await next.tap();
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
    // Native document scrolling leaves the URL and input behavior untouched.
    // Charged entry is covered separately; direct chapter reading stays native.
    await journey.locator(".venue-journey-atlas").evaluate((element) => window.scrollBy({
      top: element.getBoundingClientRect().top - window.innerHeight / 2, behavior: "instant",
    }));
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
      expect(locale === "en" ? ["start", "left"] : ["start", "right"]).toContain(await currentCopy.evaluate(element => getComputedStyle(element).textAlign));
      await expect.poll(() => currentCopy.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThanOrEqual(.9);
      if (chapter !== "airport") {
        await expect.poll(() => page.locator("#journey-airport .venue-journey-reading").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(.9);
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
      const begin = page.locator(".venue-journey-invitation .venue-hero-action");
      await expect(begin).toHaveAttribute("href", "#journey-airport");
      await begin.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/dates-venue#journey-airport$`));
      await expect(page.locator("#journey-airport").getByRole("heading").first()).toBeInViewport();
      await expect(page.locator("#journey-airport .venue-journey-reading")).toHaveCSS("opacity", "1");
      const gallery = page.locator(".venue-header-collage");
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
