import { expect, test, type Page } from "@playwright/test";
import { languageLink } from "./helpers/header-navigation";

// ACC-01, LOC-01/03, MED-01/04, DSN-01/02. Engine/device emulation is not
// physical pinch zoom, iOS jetsam, native calendar handoff or embedded app UAT.
function watchPage(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("crash", () => errors.push("Page crashed"));
  page.on("close", () => errors.push("Page closed unexpectedly"));
  return errors;
}

async function expectReadableTeam(page: Page) {
  expect(await page.locator(".team-roster").evaluate(element => {
    return Array.from(element.querySelectorAll<HTMLElement>(".team-name, .team-role, .team-description, .team-profile"))
      .filter(text => text.scrollWidth > text.clientWidth + 1)
      .map(text => text.textContent);
  }), "Team names, roles and descriptions must fit their own reading width").toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} Team remains readable at 200% text, rotation and CSS zoom without reload`, async ({ page }, testInfo) => {
    const errors = watchPage(page);
    await page.goto(`/${locale}/team`);
    await page.evaluate(() => document.fonts.ready);
    const documentIdentity = await page.evaluate(() => {
      const identity = crypto.randomUUID();
      (window as Window & { qaDocumentIdentity?: string }).qaDocumentIdentity = identity;
      return identity;
    });
    // Preserve the current mitigation against expensive animated/blurred Team
    // layers; only a physical iPhone can establish the original crash is gone.
    expect(await page.locator(".team-roster").evaluate(element => Array.from(element.querySelectorAll("*"))
      .filter(layer => getComputedStyle(layer).filter !== "none" || getComputedStyle(layer).backdropFilter !== "none")
      .map(layer => layer.className))).toEqual([]);
    await expectReadableTeam(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.locator(".team-row").last().scrollIntoViewIfNeeded();
    await expect(page.locator(".team-row").last()).toHaveAttribute("data-reveal-state", "complete");
    await expectReadableTeam(page);
    await testInfo.attach("Team enlarged text", { body: await page.screenshot(), contentType: "image/png" });
    const portrait = page.viewportSize()!;
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await expectReadableTeam(page);
    await page.setViewportSize(portrait);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; document.documentElement.style.zoom = "2"; });
    await page.locator(".team-row").first().scrollIntoViewIfNeeded();
    await page.locator(".team-row").last().scrollIntoViewIfNeeded();
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });
    expect(await page.evaluate(() => (window as Window & { qaDocumentIdentity?: string }).qaDocumentIdentity)).toBe(documentIdentity);
    expect(errors).toEqual([]);
  });

  for (const group of [0, 1]) {
  test(`${locale} every linked Team portrait opens its expected LinkedIn destination on one activation (group ${group + 1})`, async ({ page, context, isMobile }) => {
    const errors = watchPage(page);
    // A deterministic external navigation probe never signs into or scrapes a profile.
    await context.route("https://www.linkedin.com/**", route => route.fulfill({ status: 200, contentType: "text/html", body: "<title>LinkedIn destination probe</title>" }));
    await page.goto(`/${locale}/team`);
    const portraits = page.locator(".team-photo--linked");
    expect(await portraits.count()).toBeGreaterThan(0);
    for (const portrait of (await portraits.all()).filter((_, index) => index % 2 === group)) {
      const href = await portrait.getAttribute("href");
      expect(href).toMatch(/^https:\/\/www\.linkedin\.com\/in\//);
      const row = portrait.locator("..");
      await expect(row.locator(".team-profile")).toHaveAttribute("href", href!);
      await portrait.scrollIntoViewIfNeeded();
      const opened = page.waitForEvent("popup");
      if (isMobile) await portrait.tap();
      else await portrait.click();
      const popup = await opened;
      await popup.waitForLoadState();
      expect(popup.url()).toBe(href);
      await popup.close();
    }
    expect(errors).toEqual([]);
  });
  }

  test(`${locale} gallery Home End and arrow keys browse the album without moving the page`, async ({ page }) => {
    const errors = watchPage(page);
    await page.goto(`/${locale}`);
    const rail = page.locator(".gallery-rail .rail-track");
    await rail.scrollIntoViewIfNeeded();
    await rail.focus();
    // Let scroll snapping settle before comparing the document's reading position.
    await expect.poll(() => rail.evaluate(element => Math.abs(element.scrollLeft))).toBe(0);
    const documentY = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("End");
    await expect.poll(() => rail.evaluate(element => Math.abs(element.scrollLeft) >= element.scrollWidth - element.clientWidth - 2)).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(documentY, 0);
    await page.keyboard.press("Home");
    await expect.poll(() => rail.evaluate(element => Math.abs(element.scrollLeft))).toBeLessThan(2);
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(documentY, 0);
    await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
    await expect.poll(() => rail.evaluate(element => Math.abs(element.scrollLeft))).toBeGreaterThan(20);
    await page.keyboard.press("Home");
    await expect.poll(() => rail.evaluate(element => Math.abs(element.scrollLeft))).toBeLessThan(2);
    expect(errors).toEqual([]);
  });

  test(`${locale} gallery uses native Android touch scrolling in the correct direction`, async ({ page, browserName, isMobile }, testInfo) => {
    test.skip(browserName !== "chromium" || !isMobile, "Native touch-drag synthesis uses Chromium CDP; WebKit gesture requires physical-device UAT.");
    await page.goto(`/${locale}`);
    const rail = page.locator(".gallery-rail .rail-track");
    await rail.scrollIntoViewIfNeeded();
    const bounds = (await rail.boundingBox())!;
    const startX = bounds.x + bounds.width * (locale === "ar" ? .2 : .8);
    const endX = bounds.x + bounds.width * (locale === "ar" ? .8 : .2);
    const y = Math.max(180, Math.min(page.viewportSize()!.height - 40, bounds.y + bounds.height / 2));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
    for (let step = 1; step <= 8; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: startX + (endX - startX) * step / 8, y }] });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => rail.evaluate(element => Math.abs(element.scrollLeft))).toBeGreaterThan(30);
    const beforeScroll = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy({ top: 200, behavior: "instant" }));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeScroll + 100);
    await testInfo.attach("touch evidence", { body: "Chromium Input.dispatchTouchEvent touchStart/eight touchMoves/touchEnd exercised the browser's native scroll recognizer. This is synthesized Android-profile touch, not hardware.", contentType: "text/plain" });
    await cdp.detach();
  });

  test(`${locale} media filters survive rapid changes, empty results, rotation, locale and back navigation`, async ({ page }) => {
    const errors = watchPage(page);
    await page.goto(`/${locale}/media`);
    const edition = page.locator("#media-edition");
    const kind = page.locator("#media-kind");
    await expect(edition).toBeEnabled();
    await edition.selectOption("2026");
    await kind.selectOption("photograph");
    await expect(page.locator(".conference-media-edition")).toHaveCount(1);
    await expect(page.locator(".conference-media-edition")).toHaveAttribute("data-edition", "2026");
    expect(await page.locator(".conference-media-card:not([data-media-kind='photograph'])").count()).toBe(0);
    await page.locator("#media-search").fill("no-results-synthetic-qa-query");
    await expect(page.getByTestId("media-empty")).toBeVisible();
    await page.getByTestId("media-clear").click();
    await expect(page.locator("#media-search")).toBeFocused();
    await expect(edition).toHaveValue("all");
    await expect(kind).toHaveValue("all");
    await expect(page.locator(".conference-media-card").first()).toBeVisible();
    await edition.selectOption("2027");
    await expect(page.getByTestId("media-empty")).toBeVisible();
    const portrait = page.viewportSize()!;
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await expect(edition).toHaveValue("2027");
    await page.setViewportSize(portrait);
    const targetLocale = locale === "en" ? "ar" : "en";
    await (await languageLink(page, targetLocale === "ar" ? "View this page in Arabic" : "View this page in English")).click();
    await expect(page).toHaveURL(new RegExp(`/${targetLocale}/media\\?edition=2027$`));
    await expect(edition).toHaveValue("2027");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}/media\\?edition=2027$`));
    await expect(edition).toHaveValue("2027");
    expect(errors).toEqual([]);
  });

  test(`${locale} film preserves explicit pause through rotation, offline recovery and visibility changes`, async ({ page, context }, testInfo) => {
    const errors = watchPage(page);
    await page.addInitScript(() => {
      let visibility: DocumentVisibilityState = "visible";
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
      (window as Window & { qaVisibility?: (state: DocumentVisibilityState) => void }).qaVisibility = state => {
        visibility = state;
        document.dispatchEvent(new Event("visibilitychange"));
      };
    });
    // Windows WebKit's native media pipeline rejects the local TLS proxy's
    // self-signed certificate despite context.ignoreHTTPSErrors. An explicit
    // local media origin tests the real decoder without weakening assertions.
    const mediaOrigin = process.env.REAL_USER_MEDIA_BASE_URL;
    await page.goto(mediaOrigin ? new URL(`/${locale}`, mediaOrigin).href : `/${locale}`);
    const video = page.locator(".conference-hero video");
    const toggle = page.locator(".conference-hero .hero-media-toggle");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState >= 2 && !element.paused)).toBe(true);
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await page.setViewportSize(viewport);
    await context.setOffline(true);
    await page.evaluate(() => (window as Window & { qaVisibility?: (state: DocumentVisibilityState) => void }).qaVisibility?.("hidden"));
    await context.setOffline(false);
    await page.evaluate(() => (window as Window & { qaVisibility?: (state: DocumentVisibilityState) => void }).qaVisibility?.("visible"));
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState >= 2 && !element.paused)).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(video).toHaveCount(0);
    await expect(page.locator(".hero-media-poster").first()).toBeVisible();
    await testInfo.attach("video scope limits", { body: "visibility events and offline mode are synthesized. Physical app switching, Low Power Mode and OS eviction remain manual checks.", contentType: "text/plain" });
    expect(errors).toEqual([]);
  });
}
