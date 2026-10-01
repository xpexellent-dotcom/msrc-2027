import { expect, test } from "@playwright/test";

const mediaRoot = "/media/msrc2026";
const mediaPaths = {
  desktop: `${mediaRoot}/hero-desktop-v1.mp4`,
  mobile: `${mediaRoot}/hero-mobile-v1.mp4`,
  desktopPoster: `${mediaRoot}/poster-desktop-v1.jpg`,
  mobilePoster: `${mediaRoot}/poster-mobile-v1.jpg`,
};

// MED-01/02/04, DSN-01, ACC-01, LOC-01: these are the exact organizer-approved
// derivatives. The organizer explicitly selected public autoplay on 1 October
// 2026; manual pause and genuine browser/asset failure recovery remain available.
// The original source and local-only review endpoints remain private.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} public film selects one responsive source and keyboard pause freezes its frame`, async ({ page }) => {
    const videoRequests: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith(".mp4")) videoRequests.push(pathname);
    });
    await page.goto(`/${locale}`);
    const mobile = (page.viewportSize()?.width ?? 1280) <= 700;
    const source = mobile ? mediaPaths.mobile : mediaPaths.desktop;
    const poster = mobile ? mediaPaths.mobilePoster : mediaPaths.desktopPoster;
    const video = page.locator(".conference-hero video");
    const backgroundToggle = page.locator(".conference-hero .hero-media-toggle");
    await expect(video).toHaveAttribute("src", source);
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("tabindex", "-1");
    await expect(video).toHaveAttribute("aria-hidden", "true");
    await expect(backgroundToggle).toHaveAttribute("aria-keyshortcuts", "Space Enter");
    expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(page.locator(".conference-hero .hero-media-poster"))
      .toHaveJSProperty("currentSrc", new URL(poster, page.url()).href);
    expect([...new Set(videoRequests)]).toEqual([source]);
    await expect(page.locator(".conference-hero iframe")).toHaveCount(0);

    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    const dimensions = await backgroundToggle.boundingBox();
    expect(dimensions?.width).toBeGreaterThanOrEqual(44);
    expect(dimensions?.height).toBeGreaterThanOrEqual(44);
    await backgroundToggle.focus();
    await expect(backgroundToggle).toBeFocused();
    await expect(backgroundToggle).toHaveAttribute("aria-label", locale === "ar" ? "إيقاف فيديو الخلفية مؤقتًا" : "Pause background video");
    await expect.poll(() => backgroundToggle.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px");
    await page.keyboard.press("Space");
    await expect(backgroundToggle).toBeFocused();
    await expect(backgroundToggle).toHaveAttribute("aria-label", locale === "ar" ? "تشغيل فيديو الخلفية" : "Play background video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(page.locator(".conference-hero .hero-media")).toHaveAttribute("data-media-state", "paused");
    await expect(video).toHaveClass(/is-playing/);
    await expect.poll(() => video.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    const frozenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await page.keyboard.press("Tab");
    await expect(backgroundToggle).not.toBeFocused();
    await page.waitForTimeout(200);
    expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(frozenTime, 2);
    await page.keyboard.press("Shift+Tab");
    await expect(backgroundToggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(backgroundToggle).toBeFocused();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    const backgroundPosition = { x: 8, y: Math.min((dimensions?.height ?? 300) / 2, 180) };
    if (mobile) await backgroundToggle.tap({ position: backgroundPosition });
    else await backgroundToggle.click({ position: backgroundPosition });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    if (mobile) await backgroundToggle.tap({ position: backgroundPosition });
    else await backgroundToggle.click({ position: backgroundPosition });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    expect(errors).toEqual([]);
  });

  test(`${locale} public film autoplays with reduced motion and has no still-mode selector`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) videoRequests.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const source = (page.viewportSize()?.width ?? 1280) <= 700 ? mediaPaths.mobile : mediaPaths.desktop;
    const video = page.locator(".conference-hero video");
    await expect(video).toHaveAttribute("src", source);
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(page.locator(".conference-hero .hero-media")).toHaveAttribute("data-playback-policy", "autoplay");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect.poll(() => video.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    await expect(page.getByText(locale === "ar" ? "وضع الصورة الثابتة" : "Still image mode", { exact: true })).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    expect([...new Set(videoRequests.map((url) => new URL(url).pathname))]).toEqual([source]);
  });

  test(`${locale} a failed public film returns to its poster with a nonvisual translated status`, async ({ page }) => {
    await page.route(`**${mediaRoot}/*.mp4`, (route) => route.abort("failed"));
    await page.goto(`/${locale}`);
    const status = page.getByRole("status").filter({
      hasText: locale === "ar" ? "فيديو الخلفية غير متاح. تُعرض صورة ثابتة." : "Background video unavailable. Showing a still image.",
    });
    await expect(status).toHaveClass("sr-only");
    await expect(page.locator(".conference-hero .hero-media-status, .conference-hero .hero-media-control")).toHaveCount(0);
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    await expect(page.locator(".conference-hero .hero-media")).toHaveAttribute("data-media-state", "poster");
  });
}

for (const preference of [
  { name: "data saving", saveData: true, effectiveType: "4g" },
  { name: "3G", saveData: false, effectiveType: "3g" },
  { name: "2G", saveData: false, effectiveType: "2g" },
] as const) {
  test(`public film autoplays the responsive derivative with ${preference.name}`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) videoRequests.push(request.url());
    });
    await page.addInitScript((values) => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: Object.assign(new EventTarget(), { saveData: values.saveData, effectiveType: values.effectiveType }),
      });
    }, preference);
    await page.goto("/en");
    const source = (page.viewportSize()?.width ?? 1280) <= 700 ? mediaPaths.mobile : mediaPaths.desktop;
    const video = page.locator(".conference-hero video");
    await expect(video).toHaveAttribute("src", source);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(page.getByText("Still image mode", { exact: true })).toHaveCount(0);
    expect([...new Set(videoRequests.map((url) => new URL(url).pathname))]).toEqual([source]);
  });
}

test("public film pauses when hidden, resumes when visible, and preserves an explicit pause", async ({ page }) => {
  await page.addInitScript(() => {
    let visibility: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    Object.defineProperty(window, "setTestDocumentVisibility", {
      value: (state: DocumentVisibilityState) => {
        visibility = state;
        document.dispatchEvent(new Event("visibilitychange"));
      },
    });
  });
  await page.goto("/en");
  const video = page.locator(".conference-hero video");
  const backgroundToggle = page.locator(".conference-hero .hero-media-toggle");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
  const retainedVideo = await video.elementHandle();
  const source = await video.getAttribute("src");
  const changeVisibility = async (state: DocumentVisibilityState) => {
    await page.evaluate((nextState) => {
      (window as unknown as { setTestDocumentVisibility: (value: DocumentVisibilityState) => void })
        .setTestDocumentVisibility(nextState);
    }, state);
  };

  await changeVisibility("hidden");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("src", source!);
  expect(await retainedVideo!.evaluate((element) => element.isConnected)).toBe(true);
  const frozenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await page.waitForTimeout(150);
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(frozenTime, 2);
  await changeVisibility("visible");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  expect(await retainedVideo!.evaluate((element) => element.isConnected)).toBe(true);

  await backgroundToggle.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await changeVisibility("hidden");
  await changeVisibility("visible");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(backgroundToggle).toHaveAttribute("aria-label", "Play background video");
  await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  expect(await retainedVideo!.evaluate((element) => element.isConnected)).toBe(true);
  await backgroundToggle.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
});

for (const locale of ["en", "ar"] as const) {
  test(`${locale} browser autoplay denial keeps a manual Play control and recovers without an asset failure`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const nativePlay = HTMLMediaElement.prototype.play;
      let firstAttempt = true;
      HTMLMediaElement.prototype.play = function () {
        if (firstAttempt) {
          firstAttempt = false;
          // Suppress native attribute playback as a browser autoplay policy would.
          // Only this denial case changes the browser behavior; the subsequent
          // trusted-button attempt uses the real decoder and native play promise.
          this.autoplay = false;
          this.pause();
          return Promise.reject(new DOMException("Autoplay requires a user gesture", "NotAllowedError"));
        }
        return nativePlay.call(this);
      };
    });
    await page.goto(`/${locale}`);
    const video = page.locator(".conference-hero video");
    const play = page.locator(".conference-hero .hero-media-controls").getByRole("button", {
      name: locale === "ar" ? "تشغيل فيديو الخلفية" : "Play background video", exact: true,
    });
    await expect(video).toHaveCount(1);
    await expect(play).toBeVisible();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(page.getByRole("status").filter({
      hasText: locale === "ar" ? "فيديو الخلفية غير متاح" : "Background video unavailable",
    })).toHaveCount(0);
    await play.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".conference-hero .hero-media-toggle")).toBeFocused();
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("only approved derivatives are served with video range support and image MIME types", async ({ request }) => {
  for (const path of [mediaPaths.desktop, mediaPaths.mobile]) {
    const response = await request.get(path, { headers: { Range: "bytes=0-31" } });
    expect(response.status(), path).toBe(206);
    expect(response.headers()["content-type"]).toContain("video/mp4");
    expect(response.headers()["content-range"]).toMatch(/^bytes 0-31\/\d+$/);
    expect(response.headers()["accept-ranges"]).toBe("bytes");
    expect((await response.body()).byteLength).toBe(32);
  }
  for (const path of [mediaPaths.desktopPoster, mediaPaths.mobilePoster]) {
    const response = await request.head(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/jpeg");
    expect(Number(response.headers()["content-length"])).toBeGreaterThan(0);
  }
  for (const path of [`${mediaRoot}/Montage_3.mp4`, "/api/preview-media/Montage_3.mp4", "/.tools/media/source/Montage_3.mp4"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
