import { expect, test, type Locator, type Page } from "@playwright/test";

// DSN-01/02, ACC-01, LOC-01/03: compact disclosure, immediate registration access,
// reversible pointer motion, and native keyboard/scroll access in both languages.
async function hydrated(page: Page) {
  await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function settled(menu: Locator) {
  await expect.poll(() => menu.evaluate((element) => element.getAnimations({ subtree: true })
    .some((animation) => animation.playState === "running"))).toBe(false);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} compact phone panel shows registration first and every destination without scrolling`, async ({ page, isMobile }, testInfo) => {
    test.skip(!isMobile, "Phone disclosure layout.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // ORG-052: every destination fits one panel even on a short phone (568px tall).
    for (const [width, height] of [[390, 844], [412, 915], [320, 568], [375, 640]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(`/${locale}`);
      await hydrated(page);
      await page.locator(".menu-toggle").tap();
      const menu = page.locator(".mobile-menu");
      await expect(menu).toBeVisible();
      await settled(menu);
      const action = menu.locator(".mobile-reserve-action");
      const firstDestination = menu.locator("nav a").first();
      const status = menu.locator(".mobile-menu-status");
      await expect(menu.getByRole("link").first()).toHaveClass(/\bmobile-reserve-action\b/);
      await expect(action).toHaveAttribute("href", `/${locale}/registration`);
      await expect(action).toBeInViewport();
      await expect(status).toHaveText(locale === "en" ? "Registration not open yet" : "لم يُفتح التسجيل بعد");
      await expect(status).toBeInViewport();
      const menuBox = (await menu.boundingBox())!;
      const headerBox = (await page.locator(".site-header-inner").boundingBox())!;
      const actionBox = (await action.boundingBox())!;
      const statusBox = (await status.boundingBox())!;
      const firstBox = (await firstDestination.boundingBox())!;
      expect(menuBox.x, "the compact panel leaves a visible left gutter in EN and AR").toBeGreaterThanOrEqual(width < 360 ? 24 : 32);
      expect(menuBox.width).toBeLessThanOrEqual(336);
      expect(Math.abs(menuBox.x + menuBox.width - headerBox.x - headerBox.width), "the panel shares the physical right header edge").toBeLessThanOrEqual(1);
      expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(firstBox.y);
      expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(firstBox.y);
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(height);
      const overflow = await menu.evaluate((element) => ({ top: element.scrollTop, content: element.scrollHeight, height: element.clientHeight }));
      expect(overflow.top).toBe(0);
      expect(overflow.content, "a normal portrait phone reaches all destinations at once").toBeLessThanOrEqual(overflow.height + 1);
      for (const link of await menu.locator("nav a").all()) {
        await expect(link).toBeInViewport();
        const box = (await link.boundingBox())!;
        // ORG-052 slightly smaller rows (36px; sub-pages 34px), above the WCAG 2.2 AA 24px minimum.
        expect(box.height, await link.innerText()).toBeGreaterThanOrEqual(34);
        expect(box.width, await link.innerText()).toBeGreaterThanOrEqual(34);
        expect(box.y).toBeGreaterThanOrEqual(menuBox.y);
        expect(box.y + box.height).toBeLessThanOrEqual(menuBox.y + menuBox.height);
      }
      await testInfo.attach(`${locale}-compact-menu-${width}x${height}`, { body: await page.screenshot(), contentType: "image/png" });
    }
  });

  test(`${locale} top registration action navigates to the closed registration information`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone registration action.");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}`);
    await hydrated(page);
    await page.locator(".menu-toggle").tap();
    const action = page.locator(".mobile-menu .mobile-reserve-action");
    await expect(action).toBeInViewport();
    await action.tap();
    await expect(page).toHaveURL(new RegExp(`/${locale}/registration$`));
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await expect(page.getByRole("main")).toContainText(locale === "en" ? "Registration is not open yet" : "لم يُفتح التسجيل بعد");
    await expect(page.getByRole("main").locator("form")).toHaveCount(0);
  });

  test(`${locale} pointer exit immediately removes access and rapid reopening survives its old cleanup`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Pointer disclosure interruption.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}`);
    await hydrated(page);
    const toggle = page.locator(".menu-toggle");
    const menu = page.locator(".mobile-menu");
    await toggle.tap();
    await expect(menu).toBeVisible();
    await settled(menu);
    const box = (await toggle.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // Record the first closed React commit before the 160ms visual exit ends.
    // Testing the mutation itself avoids a delayed Playwright poll missing it.
    await page.evaluate(() => {
      type CloseReceipt = { retained: boolean; inert: boolean; hidden: boolean; acceptedFocus: boolean };
      const state = window as typeof window & { mobileMenuCloseReceipt?: CloseReceipt };
      const header = document.querySelector(".site-header")!;
      const observer = new MutationObserver(() => {
        if (header.querySelector(".menu-toggle")?.getAttribute("aria-expanded") !== "false") return;
        const panel = header.querySelector<HTMLElement>(".mobile-menu");
        const link = panel?.querySelector<HTMLAnchorElement>("a");
        link?.focus({ preventScroll: true });
        state.mobileMenuCloseReceipt = {
          retained: Boolean(panel), inert: panel?.inert ?? false,
          hidden: panel?.getAttribute("aria-hidden") === "true", acceptedFocus: Boolean(link && document.activeElement === link),
        };
        observer.disconnect();
      });
      observer.observe(header, { subtree: true, attributes: true, childList: true });
    });
    await page.mouse.click(point.x, point.y);
    const receipt = await page.evaluate(() => (window as typeof window & {
      mobileMenuCloseReceipt?: { retained: boolean; inert: boolean; hidden: boolean; acceptedFocus: boolean };
    }).mobileMenuCloseReceipt);
    expect(receipt).toEqual({ retained: true, inert: true, hidden: true, acceptedFocus: false });
    await page.mouse.click(point.x, point.y);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toHaveCount(1);
    await expect(menu).not.toHaveAttribute("aria-hidden", "true");
    expect(await menu.evaluate((element: HTMLElement) => element.inert)).toBe(false);
    await settled(menu);
    // Let the superseded exit cleanup deadline pass on rendered frames.
    await page.evaluate(() => new Promise<void>((resolve) => {
      const started = performance.now();
      const frame = () => performance.now() - started >= 200 ? resolve() : requestAnimationFrame(frame);
      requestAnimationFrame(frame);
    }));
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();
    const action = menu.locator(".mobile-reserve-action");
    await action.focus();
    await expect(action).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test(`${locale} keyboard and reduced motion reveal registration immediately and close with Escape`, async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile, "Phone disclosure keyboard and motion preference.");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await hydrated(page);
    const toggle = page.locator(".menu-toggle");
    const menu = page.locator(".mobile-menu");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    const action = menu.locator(".mobile-reserve-action");
    if (browserName === "webkit") await action.focus();
    else await page.keyboard.press("Tab");
    await expect(action).toBeFocused();
    await expect(action).toHaveCSS("opacity", "1");
    expect(await menu.evaluate((element) => element.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"))).toBe(false);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await toggle.tap();
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((element) => [element, ...element.querySelectorAll("*")].some((node) => {
      const style = getComputedStyle(node);
      return style.animationName !== "none" || style.transitionDuration.split(",").some((duration) => parseFloat(duration) > 0);
    }))).toBe(false);
    await toggle.tap();
    await expect(menu).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test(`${locale} short and enlarged panels scroll natively to the last destination without horizontal overflow`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Constrained phone disclosure.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const viewport of [{ width: 844, height: 340, enlarged: false }, { width: 320, height: 640, enlarged: true }, { width: 280, height: 640, enlarged: true }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/${locale}`);
      await hydrated(page);
      if (viewport.enlarged) await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const toggle = page.locator(".menu-toggle");
      await expect(toggle).toBeInViewport();
      await toggle.tap();
      const menu = page.locator(".mobile-menu");
      await expect(menu).toBeVisible();
      await expect(menu.locator(".mobile-reserve-action")).toBeInViewport();
      const box = (await menu.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const sizes = await menu.evaluate((element) => ({ width: element.clientWidth, contentWidth: element.scrollWidth, height: element.clientHeight, contentHeight: element.scrollHeight }));
      expect(sizes.contentWidth).toBeLessThanOrEqual(sizes.width);
      expect(sizes.contentHeight, "constrained reading uses the panel's native vertical scroll").toBeGreaterThan(sizes.height);
      const last = menu.locator("nav a").last();
      const destination = await last.getAttribute("href");
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      const lastBox = (await last.boundingBox())!;
      expect(lastBox.y).toBeGreaterThanOrEqual(box.y);
      expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(box.y + box.height);
      expect(await menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await last.tap();
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      await expect(menu).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
}
