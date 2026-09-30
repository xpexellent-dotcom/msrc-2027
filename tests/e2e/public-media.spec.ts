import { expect, test } from "@playwright/test";

const mediaRoot = "/media/msrc2026";
const mediaPaths = {
  desktop: `${mediaRoot}/hero-desktop-v1.mp4`,
  mobile: `${mediaRoot}/hero-mobile-v1.mp4`,
  desktopPoster: `${mediaRoot}/poster-desktop-v1.jpg`,
  mobilePoster: `${mediaRoot}/poster-mobile-v1.jpg`,
};

// MED-01/02/04, DSN-01, ACC-01, LOC-01: these are the exact organizer-approved
// derivatives. The original source and local-only review endpoints remain private.
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
    await expect(video).toHaveAttribute("src", source);
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("tabindex", "-1");
    expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(page.locator(".conference-hero .hero-media-poster"))
      .toHaveJSProperty("currentSrc", new URL(poster, page.url()).href);
    expect([...new Set(videoRequests)]).toEqual([source]);
    await expect(page.locator(".conference-hero iframe")).toHaveCount(0);

    const pauseName = locale === "ar" ? "إيقاف فيديو الخلفية مؤقتًا" : "Pause background video";
    const playName = locale === "ar" ? "تشغيل فيديو الخلفية" : "Play background video";
    const pause = page.getByRole("button", { name: pauseName, exact: true });
    const dimensions = await pause.boundingBox();
    expect(dimensions?.width).toBeGreaterThanOrEqual(44);
    expect(dimensions?.height).toBeGreaterThanOrEqual(44);
    await pause.focus();
    await page.keyboard.press("Enter");
    const resume = page.getByRole("button", { name: playName, exact: true });
    await expect(resume).toBeFocused();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(page.locator(".conference-hero .hero-media")).toHaveAttribute("data-media-state", "paused");
    await expect(video).toHaveClass(/is-playing/);
    await expect.poll(() => video.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    const frozenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await page.waitForTimeout(200);
    expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(frozenTime, 2);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: pauseName, exact: true })).toBeFocused();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    expect(errors).toEqual([]);
  });

  test(`${locale} public film honors reduced motion without requesting an MP4`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) videoRequests.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.getByText(locale === "ar" ? "وضع الصورة الثابتة" : "Still image mode", { exact: true })).toBeVisible();
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    expect(videoRequests).toEqual([]);
  });

  test(`${locale} a failed public film returns to its poster with a translated status`, async ({ page }) => {
    await page.route(`**${mediaRoot}/*.mp4`, (route) => route.abort("failed"));
    await page.goto(`/${locale}`);
    await expect(page.getByRole("status").filter({
      hasText: locale === "ar" ? "فيديو الخلفية غير متاح. تُعرض صورة ثابتة." : "Background video unavailable. Showing a still image.",
    })).toBeVisible();
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
  test(`public film uses only the poster for ${preference.name}`, async ({ page }) => {
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
    await expect(page.getByText("Still image mode", { exact: true })).toBeVisible();
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    expect(videoRequests).toEqual([]);
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
