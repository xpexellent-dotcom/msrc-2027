import { expect, test, type Page } from "@playwright/test";
import { setTimeout as pause } from "node:timers/promises";

// One deliberate gesture moves exactly one journey stop, whatever its speed:
// overview -> airport -> getting there -> venue, then ordinary scrolling.
const stopNames = ["overview", "airport", "city", "arrival"] as const;

async function stops(page: Page) {
  return page.evaluate(() => {
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
    const stage = document.querySelector<HTMLElement>(".venue-gallery-stage");
    const gate = Number(stage?.style.getPropertyValue("--venue-entry-boundary"));
    const chapters = [...document.querySelectorAll<HTMLElement>(".venue-journey-chapter")].map(chapter =>
      scrollY + chapter.getBoundingClientRect().top - (Number.parseFloat(getComputedStyle(chapter).scrollMarginBlockStart) || 0) - padding);
    return [gate, ...chapters].map(Math.round);
  });
}

async function settled(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    moving: document.querySelector<HTMLElement>(".venue-arrival-journey")?.dataset.journeyMoving === "true",
    releasing: document.querySelector<HTMLElement>(".venue-entry-portal")?.dataset.entryState === "releasing",
  })), { timeout: 4000 }).toEqual({ moving: false, releasing: false });
  // Let any trailing inertia arrive and be consumed before measuring.
  await pause(250);
  return page.evaluate(() => Math.round(scrollY));
}

async function stopAt(page: Page) {
  const y = await settled(page);
  const index = (await stops(page)).findIndex(stop => Math.abs(stop - y) <= 3);
  return index < 0 ? `native@${y}` : stopNames[index];
}

async function openAtOverview(page: Page, locale: "en" | "ar") {
  await page.goto(`/${locale}/dates-venue`);
  await expect(page.getByTestId("venue-arrival-journey")).toHaveAttribute("data-journey-ready", "true");
  const [gate] = await stops(page);
  await page.evaluate(top => scrollTo({ top: top - 200, behavior: "instant" }), gate);
}

async function fastSpin(page: Page, direction: 1 | -1) {
  // A hard flick of the wheel: many notches with no pause between them.
  for (let notch = 0; notch < 14; notch++) await page.mouse.wheel(0, direction * 120);
}

async function trackpadSwipe(page: Page, direction: 1 | -1) {
  // Rising then long decaying deltas, as a precision trackpad's inertia sends.
  for (let sample = 0; sample < 70; sample++) {
    const size = sample < 5 ? 12 * (sample + 1) : 60 * .93 ** (sample - 5);
    await page.mouse.wheel(0, direction * Math.max(1, size));
    await pause(16);
  }
}

async function swipe(page: Page, direction: 1 | -1) {
  const client = await page.context().newCDPSession(page);
  const { width, height } = page.viewportSize()!;
  const x = width / 2;
  const start = height * (direction > 0 ? .8 : .45);
  try {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: start }] });
    for (let step = 1; step <= 8; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: start - direction * 260 * step / 8 }] });
      await pause(16);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally { await client.detach(); }
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} a fast wheel flick moves exactly one stop each time, both ways`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones are covered by the swipe case.");
    await openAtOverview(page, locale);
    await page.mouse.move(300, 300);
    const visited = [];
    for (let flick = 0; flick < 4; flick++) { await fastSpin(page, 1); visited.push(await stopAt(page)); }
    expect(visited).toEqual(["overview", "airport", "city", "arrival"]);
    await fastSpin(page, 1);
    expect(await stopAt(page)).toMatch(/^native@/);
    const back = [];
    for (let flick = 0; flick < 4; flick++) { await fastSpin(page, -1); back.push(await stopAt(page)); }
    expect(back).toEqual(["arrival", "city", "airport", "overview"]);
  });

  test(`${locale} single slow notches and trackpad inertia each move one stop`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones are covered by the swipe case.");
    await openAtOverview(page, locale);
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, 100);
    expect(await stopAt(page)).toBe("overview");
    await page.mouse.wheel(0, 100);
    expect(await stopAt(page)).toBe("airport");
    await trackpadSwipe(page, 1);
    expect(await stopAt(page)).toBe("city");
    await trackpadSwipe(page, -1);
    expect(await stopAt(page)).toBe("airport");
  });

  test(`${locale} keyboard paging moves one stop per key press`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard paging is a desktop interaction.");
    await openAtOverview(page, locale);
    await page.mouse.wheel(0, 100);
    expect(await stopAt(page)).toBe("overview");
    await page.locator("body").focus();
    for (const [key, expected] of [["PageDown", "airport"], ["ArrowDown", "city"], ["Space", "arrival"], ["ArrowUp", "city"], ["PageUp", "airport"]] as const) {
      await page.keyboard.press(key);
      expect(await stopAt(page)).toBe(expected);
    }
  });

  test(`${locale} one swipe moves one stop on a phone`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Touch swipes are a phone interaction.");
    await openAtOverview(page, locale);
    const visited = [];
    for (let gesture = 0; gesture < 4; gesture++) { await swipe(page, 1); visited.push(await stopAt(page)); }
    expect(visited).toEqual(["overview", "airport", "city", "arrival"]);
    const back = [];
    for (let gesture = 0; gesture < 3; gesture++) { await swipe(page, -1); back.push(await stopAt(page)); }
    expect(back).toEqual(["city", "airport", "overview"]);
  });

  test(`${locale} a move eases continuously and the camera follows every frame`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Frame sampling uses the desktop camera.");
    await openAtOverview(page, locale);
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, 100);
    await stopAt(page);
    await page.mouse.wheel(0, 100);
    expect(await stopAt(page)).toBe("airport");
    const samples = await page.evaluate(() => new Promise<{ y: number; at: number; camera: string }[]>(resolve => {
      const camera = document.querySelector<HTMLElement>(".venue-journey-camera")!;
      const frames: { y: number; at: number; camera: string }[] = [];
      const sample = (at: number) => {
        frames.push({ y: scrollY, at, camera: camera.style.transform });
        if (frames.length < 90) requestAnimationFrame(sample); else resolve(frames);
      };
      requestAnimationFrame(sample);
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, cancelable: true }));
    }));
    const ys = samples.map(sample => sample.y);
    const distance = ys.at(-1)! - ys[0];
    expect(distance).toBeGreaterThan(200);
    // Monotonic, and never faster than the eased curve allows (cubic peak
    // speed is 3x average over the shortest move), with headroom for frame jitter.
    for (let index = 1; index < ys.length; index++) {
      expect(ys[index]).toBeGreaterThanOrEqual(ys[index - 1]);
      // Each sample shows the position the stepper set one frame earlier.
      const elapsed = index > 1 ? samples[index - 1].at - samples[index - 2].at : samples[1].at - samples[0].at;
      expect(ys[index] - ys[index - 1]).toBeLessThanOrEqual(1.25 * 3 * distance / 620 * elapsed + 1);
    }
    const moving = samples.filter((sample, index) => index > 0 && sample.y !== samples[index - 1].y);
    expect(moving.length).toBeGreaterThan(12);
    expect(new Set(moving.map(sample => sample.camera)).size).toBe(moving.length);
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} the arrival thread draws with progress and only the current chapter reads at rest`, async ({ page }) => {
    await openAtOverview(page, locale);
    const all = await stops(page);
    const read = () => page.evaluate(() => ({
      offset: Number.parseFloat(getComputedStyle(document.querySelector(".venue-journey-thread-trail")!).strokeDashoffset),
      visible: [...document.querySelectorAll<HTMLElement>(".venue-journey-reading")].map(reading => reading.dataset.copyHidden !== "true"),
    }));
    for (const [index, expected] of [[1, 1], [2, .5], [3, 0]] as const) {
      await page.evaluate(top => scrollTo({ top, behavior: "instant" }), all[index]);
      await expect.poll(async () => (await read()).offset).toBeCloseTo(expected, 1);
      expect((await read()).visible).toEqual([0, 1, 2].map(chapter => chapter === index - 1));
    }
  });

  test(`${locale} the overview resource links share one height`, async ({ page }) => {
    await page.goto(`/${locale}/dates-venue`);
    const heights = await page.locator(".venue-stage-resources > *").evaluateAll(links => links.map(link => link.getBoundingClientRect().height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
  });
}
