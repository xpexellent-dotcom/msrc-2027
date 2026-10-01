import { expect, test } from "@playwright/test";

const mediaRoot = "/media/msrc2026";
const mediaPaths = {
  desktop: `${mediaRoot}/hero-desktop-v1.mp4`,
  mobile: `${mediaRoot}/hero-mobile-v1.mp4`,
  desktopPoster: `${mediaRoot}/poster-desktop-v1.jpg`,
  mobilePoster: `${mediaRoot}/poster-mobile-v1.jpg`,
};

// MED-01/02/04, DSN-01, ACC-01, LOC-01: these are the exact organizer-approved
// derivatives. The current revision keeps preference-aware background motion
// and semantic keyboard/tap pause without a permanent visible Pause button;
// browser refusal still provides a discoverable manual Play recovery.
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
    const control = page.locator(".conference-hero .hero-media-toggle");
    await expect(video).toHaveAttribute("src", source);
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("tabindex", "-1");
    await expect(video).toHaveAttribute("aria-hidden", "true");
    expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(page.locator(".conference-hero .hero-media-poster"))
      .toHaveJSProperty("currentSrc", new URL(poster, page.url()).href);
    expect([...new Set(videoRequests)]).toEqual([source]);
    await expect(page.locator(".conference-hero iframe")).toHaveCount(0);

    await expect(control).toHaveCount(1);
    await expect(control).toHaveAttribute("aria-keyshortcuts", "Space Enter");
    await expect(control).toBeEmpty();
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    const dimensions = await control.boundingBox();
    expect(dimensions?.width).toBeGreaterThanOrEqual(44);
    expect(dimensions?.height).toBeGreaterThanOrEqual(44);
    await control.focus();
    await expect(control).toBeFocused();
    await expect(control).toHaveAccessibleName(locale === "ar" ? "إيقاف فيديو الخلفية مؤقتًا" : "Pause background video");
    expect(await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
    })).toBe(true);
    await page.keyboard.press("Space");
    await expect(control).toBeFocused();
    await expect(control).toHaveAccessibleName(locale === "ar" ? "تشغيل فيديو الخلفية" : "Play background video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(page.locator(".conference-hero .hero-media")).toHaveAttribute("data-media-state", "paused");
    await expect(video).toHaveClass(/is-playing/);
    await expect.poll(() => video.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    const frozenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await page.keyboard.press("Tab");
    await expect(control).not.toBeFocused();
    await page.waitForTimeout(200);
    expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(frozenTime, 2);
    await page.keyboard.press("Shift+Tab");
    await expect(control).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(control).toBeFocused();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    const uncoveredFilm = { x: 8, y: Math.min((dimensions?.height ?? 300) / 2, 180) };
    if (mobile) await control.tap({ position: uncoveredFilm });
    else await control.click({ position: uncoveredFilm });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    if (mobile) await control.tap({ position: uncoveredFilm });
    else await control.click({ position: uncoveredFilm });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    expect(errors).toEqual([]);
  });

  test(`${locale} reduced motion keeps the poster without requesting or overriding video`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) videoRequests.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const video = page.locator(".conference-hero video");
    await expect(video).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media")).toHaveAttribute("data-playback-policy", "respect-preferences");
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(videoRequests).toEqual([]);
  });

  test(`${locale} a failed public film returns to its poster with a translated accessible status`, async ({ page }) => {
    await page.route(`**${mediaRoot}/*.mp4`, (route) => route.abort("failed"));
    await page.goto(`/${locale}`);
    const status = page.getByRole("status").filter({
      hasText: locale === "ar" ? "فيديو الخلفية غير متاح. تُعرض صورة ثابتة." : "Background video unavailable. Showing a still image.",
    });
    await expect(status).toHaveCount(1);
    await expect(status).toHaveClass(/sr-only/);
    await expect(page.locator(".conference-hero .hero-media-status, .conference-hero .hero-media-toggle")).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
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
  test(`public film avoids video requests with ${preference.name}`, async ({ page }) => {
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
    const video = page.locator(".conference-hero video");
    await expect(video).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(videoRequests).toEqual([]);
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
  const control = page.locator(".conference-hero .hero-media-toggle");
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

  await control.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await changeVisibility("hidden");
  await changeVisibility("visible");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCount(0);
  await expect(control).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(video).toHaveCount(1);
  await expect(control).toHaveAccessibleName("Play background video");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await control.focus();
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
