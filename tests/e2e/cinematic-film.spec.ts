import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// DSN-01/02, ACC-01, LOC-01/03, MED-01/02/04: the cinema view reuses
// the exact approved homepage film. It is not a new public media catalogue,
// a second player, a download surface or an operational workflow.
const mediaRoot = "/media/msrc2026/";

async function expectCinemaView(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-cinematic", "true");
  const film = page.locator(".conference-hero");
  await expect(film).toHaveAttribute("role", "dialog");
  await expect(film).toHaveAttribute("aria-modal", "true");
  await expect(film).toHaveAccessibleName(/2026|٢٠٢٦/);
  await expect(page.locator("#hero-title")).toBeHidden();
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".hero-content")).toHaveJSProperty("inert", true);
  const close = page.getByTestId("cinematic-close");
  await expect(close).toBeVisible();
  await expect(close).toBeFocused();
  const viewport = page.viewportSize()!;
  const bounds = await film.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.width).toBeGreaterThanOrEqual(viewport.width * .9);
  expect(bounds!.height).toBeGreaterThanOrEqual(viewport.height * .9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  const closeBounds = await close.boundingBox();
  expect(closeBounds!.width).toBeGreaterThanOrEqual(44);
  expect(closeBounds!.height).toBeGreaterThanOrEqual(44);
  expect(closeBounds!.x).toBeGreaterThanOrEqual(0);
  expect(closeBounds!.y).toBeGreaterThanOrEqual(0);
  expect(closeBounds!.x + closeBounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(closeBounds!.y + closeBounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} clean film view retains its approved player and Escape, close and Back restore the conference`, async ({ page }, testInfo) => {
    const writes: string[] = [];
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
      if (new URL(request.url()).pathname.endsWith(".mp4")) requests.push(new URL(request.url()).pathname);
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (testInfo.project.name === "chromium-mobile") await page.setViewportSize({ width: 320, height: 850 });
    await page.goto(`/${locale}?view=cinema#legacy`);
    const watch = page.getByTestId("watch-opening-film");
    const video = page.locator(".conference-hero video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    const player = await video.elementHandle();
    const source = await video.getAttribute("src");
    await watch.scrollIntoViewIfNeeded();
    await watch.focus();
    const origin = { url: page.url(), scroll: await page.evaluate(() => window.scrollY) };

    for (const exit of ["escape", "close", "back"] as const) {
      await watch.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=cinema#film$`));
      await expectCinemaView(page);
      await expect(page.getByTestId("cinematic-close")).toHaveAccessibleName(locale === "ar" ? "العودة إلى المؤتمر" : "Back to conference");
      await expect(video).toHaveCount(1);
      await expect(video).toHaveAttribute("src", source!);
      expect(await player!.evaluate((element) => element.isConnected)).toBe(true);
      await expect(video).toHaveCSS("object-fit", "contain");
      await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
      const background = page.locator(".conference-hero .hero-media-toggle");
      await page.keyboard.press("Tab");
      await expect(background).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.getByTestId("cinematic-close")).toBeFocused();
      if (exit === "escape") {
        const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        await testInfo.attach(`${locale}-cinema-accessibility`, {
          body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2), contentType: "application/json",
        });
        expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
        await testInfo.attach(`${locale}-cinema-${testInfo.project.name}`, {
          body: await page.screenshot(), contentType: "image/png",
        });
        await page.keyboard.press("Escape");
      } else if (exit === "close") await page.getByTestId("cinematic-close").click();
      else await page.goBack();
      await expect(page.locator("html")).not.toHaveAttribute("data-cinematic", "true");
      await expect(page).toHaveURL(origin.url);
      await expect(watch).toBeFocused();
      await expect(page.locator("#hero-title")).toBeVisible();
      await expect(page.locator(".site-header")).toBeVisible();
      await expect(page.locator(".hero-content")).toHaveJSProperty("inert", false);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(origin.scroll, 0);
      expect(await player!.evaluate((element) => element.isConnected)).toBe(true);
    }
    expect([...new Set(requests)]).toEqual([source]);
    expect(source).toMatch(new RegExp(`^${mediaRoot}hero-(desktop|mobile)-v1\\.mp4$`));
    await expect(page.locator("iframe, a[download]")).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });

  test(`${locale} reduced motion loads no background film until a deliberate watch action`, async ({ page }) => {
    const requests: string[] = [];
    const writes: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) requests.push(new URL(request.url()).pathname);
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    expect(requests).toEqual([]);
    const watch = page.getByTestId("watch-opening-film");
    await watch.scrollIntoViewIfNeeded();
    await watch.click();
    await expectCinemaView(page);
    const video = page.locator(".conference-hero video");
    await expect(video).toHaveCount(1);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await expect(watch).toBeFocused();
    await expect(page.locator("#hero-title")).toBeVisible();
    expect([...new Set(requests)]).toHaveLength(1);
    expect(requests.every((path) => path.startsWith(mediaRoot))).toBe(true);
    expect(writes).toEqual([]);
  });

  test(`${locale} media opens the homepage cinema while respecting the visitor's motion preference`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) requests.push(new URL(request.url()).pathname);
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/media?view=archive`);
    await expect(page.getByTestId("media-catalogue").locator("video, iframe")).toHaveCount(0);
    const filmLink = page.getByRole("link", { name: locale === "ar" ? "شاهد الفيلم الافتتاحي" : "Watch the opening film", exact: true });
    await expect(filmLink).toHaveAttribute("href", new RegExp(`^/${locale}/?#film$`));
    await filmLink.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/?#film$`));
    await expectCinemaView(page);
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    expect(requests).toEqual([]);
    const start = page.getByRole("button", { name: locale === "ar" ? "تشغيل الفيلم" : "Play film", exact: true });
    await expect(start).toBeVisible();
    await start.focus();
    await page.keyboard.press("Enter");
    const video = page.locator(".conference-hero video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(start).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-toggle")).toBeFocused();
    expect([...new Set(requests)]).toHaveLength(1);
    expect(requests.every((path) => path.startsWith(mediaRoot))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveAttribute("data-cinematic", "true");
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await expect(page.locator("iframe, a[download]")).toHaveCount(0);
  });

  test(`${locale} cinema returns to the watching position after navigation through the participation chapter`, async ({ page }) => {
    await page.goto(`/${locale}?view=chapters`);
    await page.locator(".section-journey a[href='#participate']").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=chapters#participate$`));
    await expect(page.locator("#participate")).toBeFocused();
    const watch = page.getByTestId("watch-opening-film");
    await watch.scrollIntoViewIfNeeded();
    await watch.focus();
    // Browser actionability can scroll the button before dispatching its click.
    // Capture the actual activation position before React opens the film.
    await watch.evaluate((element) => {
      element.addEventListener("click", () => {
        element.setAttribute("data-test-watch-origin", JSON.stringify({ url: location.href, scroll: window.scrollY }));
      }, { capture: true, once: true });
    });
    await watch.click();
    const origin = await watch.evaluate((element) => {
      const captured = element.getAttribute("data-test-watch-origin");
      if (!captured) throw new Error("The real Watch click did not capture its activation position.");
      element.removeAttribute("data-test-watch-origin");
      return JSON.parse(captured) as { url: string; scroll: number };
    });
    await expectCinemaView(page);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(origin.url);
    await expect(page.locator("html")).not.toHaveAttribute("data-cinematic", "true");
    // History traversal can restore the earlier chapter after the immediate
    // dialog cleanup. Require focus and scroll to remain correct after it settles.
    await page.waitForTimeout(200);
    await expect(watch).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(origin.scroll, 0);
    await expect(page.locator(".hero-content")).toHaveJSProperty("inert", false);
  });

  test(`${locale} browser Forward reopens the film and keeps the original watching position for its next close`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}?view=forward#legacy`);
    const watch = page.getByTestId("watch-opening-film");
    await watch.scrollIntoViewIfNeeded();
    await watch.focus();
    const origin = { url: page.url(), scroll: await page.evaluate(() => window.scrollY) };
    await watch.click();
    await expectCinemaView(page);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(origin.url);
    await expect(watch).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(origin.scroll, 0);

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=forward#film$`));
    await expectCinemaView(page);
    await page.getByTestId("cinematic-close").click();
    await expect(page).toHaveURL(origin.url);
    await expect(page.locator("html")).not.toHaveAttribute("data-cinematic", "true");
    await page.waitForTimeout(200);
    await expect(watch).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(origin.scroll, 0);
    await expect(page.locator(".hero-content")).toHaveJSProperty("inert", false);
  });

  test(`${locale} enabling reduced motion during a direct film visit offers deliberate playback and returns to a safe poster`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".mp4")) requests.push(new URL(request.url()).pathname);
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}?view=preferences#film`);
    await expectCinemaView(page);
    const video = page.locator(".conference-hero video");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(video).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    const start = page.getByRole("button", { name: locale === "ar" ? "تشغيل الفيلم" : "Play film", exact: true });
    await expect(start).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-cinematic", "true");
    await start.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
    await expect(start).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-toggle")).toBeFocused();
    await page.getByTestId("cinematic-close").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-cinematic", "true");
    await expect(page).toHaveURL(new RegExp(`/${locale}\\?view=preferences$`));
    await expect(video).toHaveCount(0);
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    await expect(page.locator("#main-content")).toBeFocused();
    expect([...new Set(requests)]).toHaveLength(1);
    expect(requests.every((path) => new RegExp(`^${mediaRoot}hero-(desktop|mobile)-v1\\.mp4$`).test(path))).toBe(true);
  });
}

test("cinema respects the visitor's paused background state after a deliberate viewing", async ({ page }) => {
  await page.goto("/en");
  const video = page.locator(".conference-hero video");
  const background = page.locator(".conference-hero .hero-media-toggle");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);
  await background.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const retainedVideo = await video.elementHandle();
  const watch = page.getByTestId("watch-opening-film");
  await watch.scrollIntoViewIfNeeded();
  await watch.click();
  await expectCinemaView(page);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(watch).toBeFocused();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await expect(background).toHaveAccessibleName("Play background video");
  expect(await retainedVideo!.evaluate((element) => element.isConnected)).toBe(true);
});

test("tablet film view keeps its close action reachable in both directions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "The phone project already exercises the 320px cinema view.");
  await page.setViewportSize({ width: 791, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/#film`);
    await expectCinemaView(page);
    await expect(page.locator(".conference-hero video")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveAttribute("data-cinematic", "true");
    await expect(page.locator("#main-content")).toBeFocused();
  }
});
