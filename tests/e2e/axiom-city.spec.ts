import { expect, test } from "@playwright/test";

// MED-01/04, ACC-01, DSN-01, LOC-01/03: the requested local-demo Jeddah
// derivative has no audio stream (media manifest/ffprobe evidence). These browser
// checks use its actual playback; HTMLMediaElement.play is never replaced.
const cityVideoPath = "/media/msrc-demo/jeddah-opening-cropped.mp4";
const cityPosterPath = "/media/msrc-demo/jeddah-opening-cropped-poster.jpg";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} Jeddah video loads only on approach and supports real keyboard playback`, async ({ page }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === cityVideoPath) requests.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    // The opening film confirms that client playback policy has initialized.
    await expect.poll(() => page.locator(".conference-hero video").evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    const closing = page.locator(".city-closing");
    const video = closing.locator("video");
    expect(await closing.evaluate((element) => element.getBoundingClientRect().top > window.innerHeight + 160)).toBe(true);
    await expect(video).toHaveCount(0);
    await expect(closing.locator(".city-control")).toHaveCount(0);
    expect(requests).toEqual([]);

    // Enter the documented 160px approach zone without first making the section visible.
    await closing.evaluate((element) => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - window.innerHeight - 80, behavior: "instant" }));
    await expect(video).toHaveAttribute("src", cityVideoPath);
    await expect(video).toHaveAttribute("poster", cityPosterPath);
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video).toHaveAttribute("tabindex", "-1");
    await expect(closing.locator(".city-media")).toHaveAttribute("aria-hidden", "true");
    expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2 && element.currentTime > 0)).toBe(true);
    expect(requests.length).toBeGreaterThan(0);
    // Chromium exposes decoded-audio bytes. When supported, the silent asset decodes none.
    const audioBytes = await video.evaluate((element: HTMLVideoElement & { webkitAudioDecodedByteCount?: number }) => element.webkitAudioDecodedByteCount);
    if (audioBytes !== undefined) expect(audioBytes).toBe(0);

    await closing.scrollIntoViewIfNeeded();
    const control = closing.locator(".city-control");
    await expect(control).toHaveAccessibleName(locale === "ar" ? "إيقاف فيديو جدة" : "Pause Jeddah video");
    const size = await control.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(44);
    expect(size!.height).toBeGreaterThanOrEqual(44);
    await control.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(control).toHaveAccessibleName(locale === "ar" ? "تشغيل فيديو جدة" : "Play Jeddah video");
    await expect(control).toBeFocused();
    await page.keyboard.press("Space");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(control).toHaveAccessibleName(locale === "ar" ? "إيقاف فيديو جدة" : "Pause Jeddah video");
    expect(errors).toEqual([]);
  });
}

for (const preference of [
  { name: "reduced motion", locale: "en", reducedMotion: "reduce", saveData: false },
  { name: "data saving", locale: "ar", reducedMotion: "no-preference", saveData: true },
] as const) {
  test(`${preference.name} keeps the Jeddah poster without a video request`, async ({ page }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === cityVideoPath) requests.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((saveData) => {
      Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData, effectiveType: "4g" }) });
    }, preference.saveData);
    await page.emulateMedia({ reducedMotion: preference.reducedMotion });
    await page.goto(`/${preference.locale}`);
    const closing = page.locator(".city-closing");
    await closing.scrollIntoViewIfNeeded();
    await expect(page.locator(".site-header")).toHaveAttribute("data-scrolled", "true");
    await expect(closing.locator(".closing-grid")).toHaveAttribute("data-reveal-state", "complete");
    const poster = closing.locator(".city-media img");
    await expect(poster).toBeVisible();
    await expect.poll(() => poster.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(closing.locator("video, .city-control")).toHaveCount(0);
    await expect(closing.locator("#closing-title")).toBeVisible();
    await expect(closing.getByRole("link")).toHaveAttribute("href", `/${preference.locale}/registration`);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("missing IntersectionObserver leaves a readable Jeddah poster without a runtime error", async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === cityVideoPath) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: undefined }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  const closing = page.locator(".city-closing");
  await closing.scrollIntoViewIfNeeded();
  await expect(page.locator(".site-header")).toHaveAttribute("data-scrolled", "true");
  await expect(closing.locator(".closing-grid")).toHaveAttribute("data-reveal-state", "complete");
  await expect(closing.locator("#closing-title")).toBeVisible();
  await expect(closing.locator(".city-media img")).toBeVisible();
  await expect(closing.locator("video, .city-control")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
