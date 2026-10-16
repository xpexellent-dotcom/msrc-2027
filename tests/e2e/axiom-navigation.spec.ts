import { expect, test, type Page } from "@playwright/test";

// DSN-01/02, ACC-01, LOC-01/03: the expressive header keeps native access.
async function settle(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page.locator(".axiom-header")).toBeVisible();
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} seamless desktop header returns on upward scroll and keyboard focus, never pointer approach`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Fine-pointer desktop behavior.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await settle(page);
    const header = page.locator(".axiom-header");
    const middle = header.locator(".header-middle");
    const logo = header.locator(".wordmark");
    const action = header.locator(".header-primary-action");
    const initialLogo = (await logo.boundingBox())!;
    const initialAction = (await action.boundingBox())!;
    const direction = locale === "en" ? 1 : -1;
    expect((await header.locator(".site-header-inner").boundingBox())!.height).toBeLessThanOrEqual(68);
    const glass = header.locator(".header-glass");
    await expect(glass).toHaveCount(1);
    // A continuous material must not be assembled from clipped paint layers
    // whose independently rasterized center edges can leave a visible seam.
    expect(await glass.evaluate((element) => [element, ...element.querySelectorAll("*")]
      .map((layer) => getComputedStyle(layer).clipPath).filter((clip) => clip !== "none"))).toEqual([]);
    const capsule = (await glass.boundingBox())!;
    const navigation = (await header.locator(".site-header-inner").boundingBox())!;
    expect(Math.abs(capsule.width - navigation.width)).toBeLessThanOrEqual(1);
    await page.mouse.move(600, 600);
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-compact", "true");
    await expect(middle).toHaveCSS("opacity", "0");
    await expect(middle).toHaveCSS("filter", "blur(7px)");
    expect(await middle.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    // The wider capsule needs less travel, but both controls must still move outward
    // and settle inside the viewport's corner margin without shrinking their targets.
    await expect.poll(() => logo.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(false);
    const compactLogo = (await logo.boundingBox())!;
    const compactAction = (await action.boundingBox())!;
    expect((initialLogo.x - compactLogo.x) * direction).toBeGreaterThan(0);
    expect((compactAction.x - initialAction.x) * direction).toBeGreaterThan(0);
    const viewportWidth = page.viewportSize()!.width;
    const logoEdge = locale === "en" ? compactLogo.x : viewportWidth - compactLogo.x - compactLogo.width;
    const actionEdge = locale === "en" ? viewportWidth - compactAction.x - compactAction.width : compactAction.x;
    for (const edge of [logoEdge, actionEdge]) {
      expect(edge).toBeGreaterThanOrEqual(12);
      expect(edge).toBeLessThanOrEqual(24);
    }
    await expect(logo).toBeInViewport();
    await expect(action).toBeInViewport();
    expect((await logo.boundingBox())!.width).toBeGreaterThan(initialLogo.width);
    expect(await page.evaluate(() => !!document.elementFromPoint(720, 50)?.closest(".axiom-header")), "the empty center does not trap page input").toBe(false);

    await page.mouse.move(600, 8);
    await expect(header).toHaveAttribute("data-compact", "true");
    await logo.hover();
    await expect(header).toHaveAttribute("data-compact", "true");
    await expect(middle).toHaveCSS("opacity", "0");

    await page.mouse.move(600, 600);
    await page.mouse.wheel(0, -150);
    await expect(header).toHaveAttribute("data-compact", "false");
    await expect(middle).toHaveCSS("filter", "blur(0px)");
    await expect.poll(async () => Math.abs((await logo.boundingBox())!.x - initialLogo.x)).toBeLessThan(1);

    // Reversing a fresh outward movement must settle back to the same capsule,
    // without waiting for the previous transition to finish or queuing it.
    await page.mouse.wheel(0, 180);
    await expect(header).toHaveAttribute("data-compact", "true");
    await page.mouse.wheel(0, -120);
    await expect(header).toHaveAttribute("data-compact", "false");
    await expect(middle).toHaveCSS("opacity", "1");
    await expect.poll(async () => Math.abs((await logo.boundingBox())!.x - initialLogo.x)).toBeLessThan(1);
    await page.mouse.wheel(0, 180);
    await expect(header).toHaveAttribute("data-compact", "true");
    await header.locator(".wordmark").focus();
    await page.keyboard.press("Tab");
    await expect(header.locator(`.desktop-nav a[href="/${locale}/participate"]`)).toBeFocused();
    await expect(middle).toHaveCSS("opacity", "1");
    await expect(middle).toHaveCSS("transition-duration", "0s");
  });

  test(`${locale} keyboard-expanded navigation keeps its target when switching to a pointer click`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Fine-pointer desktop modality handoff.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await settle(page);
    const header = page.locator(".axiom-header");
    const program = header.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/program"]`);
    const speakers = header.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/speakers"]`);
    await page.mouse.move(700, 650);
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-compact", "true");
    await header.locator(".wordmark").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expect(program).toBeFocused();
    await expect(header).toHaveAttribute("data-compact", "false");
    await expect(header.locator(".header-middle")).toHaveCSS("opacity", "1");

    const box = (await speakers.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await expect(speakers).toBeFocused();
    // Switching input methods must not compact the bar between press and release.
    await expect(header).toHaveAttribute("data-compact", "false");
    expect(await speakers.evaluate((element, position) =>
      element.contains(document.elementFromPoint(position.x, position.y)), point),
    "the pressed link remains the pointer target until release").toBe(true);
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp(`/${locale}/speakers$`));
    await expect(page.getByRole("main")).toBeFocused();
  });

  test(`${locale} Participate navigation revealed by upward scroll stays open through the gap and every option`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Fine-pointer dropdown travel.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await settle(page);
    const header = page.locator(".axiom-header");
    const participation = header.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/participate"]`);
    const toggle = header.locator(`[data-dropdown-toggle="/${locale}/participate"]`);
    const dropdown = header.locator(".header-dropdown");
    const options = dropdown.locator("a");
    await page.mouse.move(700, 650);
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-compact", "true");
    await page.mouse.wheel(0, -150);
    await expect(header).toHaveAttribute("data-compact", "false");
    await expect(header.locator(".header-middle")).toHaveCSS("opacity", "1");

    for (let visit = 0; visit < 2; visit++) {
      if (visit) {
        await page.mouse.wheel(0, -150);
        await expect(header).toHaveAttribute("data-compact", "false");
        await expect(header.locator(".header-middle")).toHaveCSS("opacity", "1");
      }
      await participation.hover();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(dropdown).toHaveCSS("opacity", "1");
      const triggerBox = (await participation.boundingBox())!;
      const panelBox = (await dropdown.boundingBox())!;
      const travelX = triggerBox.x + triggerBox.width / 2;
      // Rest in the actual 12px visual gap, rather than teleporting to a link.
      await page.mouse.move(travelX, (triggerBox.y + triggerBox.height + panelBox.y) / 2, { steps: 6 });
      await expect.poll(() => dropdown.evaluate((element) => element.matches(":hover"))).toBe(true);
      await expect(header).toHaveAttribute("data-compact", "false");
      for (let index = 0; index < await options.count(); index++) {
        const option = options.nth(index);
        const box = (await option.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(header).toHaveAttribute("data-compact", "false");
        expect(await option.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }), "every option remains a real pointer target").toBe(true);
      }
      if (visit === 0) {
        await page.mouse.move(700, 650, { steps: 8 });
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(header).toHaveAttribute("data-compact", "false");
        await page.mouse.wheel(0, 150);
        await expect(header).toHaveAttribute("data-compact", "true");
      }
    }
    await options.last().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/3mt$`));
    await expect(page.getByRole("main")).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test(`${locale} Participate dropdown supports hover, keyboard and Escape while Program is a direct page link`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop dropdown behavior.");
    await page.goto(`/${locale}/speakers`);
    await settle(page);
    const participation = page.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/participate"]`);
    const toggle = page.locator(`[data-dropdown-toggle="/${locale}/participate"]`);
    const attend = page.locator(`.header-dropdown a[href="/${locale}/registration"]`);
    const research = page.locator(`.header-dropdown a[href="/${locale}/submissions"]`);
    await participation.hover();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(research).toBeVisible();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await participation.hover();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.mouse.move(600, 600);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Hovering opens the menu; the click that follows keeps it open, a second click closes it.
    await toggle.hover();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(research).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.mouse.move(600, 600);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await participation.focus();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await expect(attend).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(attend).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`[data-dropdown-toggle="/${locale}/program"]`)).toHaveCount(0);
    await page.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/program"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program$`));
    await expect(page.getByRole("main")).toBeFocused();
  });

  test(`${locale} navigation lists all five paths and the closed registration destination`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}`);
    await settle(page);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator(".header-primary-action")).toHaveText(locale === "en" ? "Reserve your seat" : "احجز مقعدك");
    const order = ["participate", "program", "speakers", "sponsors", "dates-venue", "team", "contact"];
    const topLinks = page.locator(".desktop-nav > .header-nav-item > a");
    expect(await topLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(order.map((route) => `/${locale}/${route}`));
    const expected = ["/registration", "/submissions", "/workshops", "/hackathon", "/3mt"];
    if (isMobile) {
      await page.locator(".menu-toggle").click();
      for (const href of expected) await expect(page.locator(`.mobile-nav-children a[href="/${locale}${href}"]`)).toBeVisible();
      await expect(page.locator(`.mobile-menu a[href="/${locale}/team"]`)).toBeVisible();
      await expect(page.locator(".header-mobile-language .language-switch")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".menu-toggle")).toBeFocused();
    } else {
      await page.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/participate"]`).hover();
      for (const href of expected) await expect(page.locator(`.header-dropdown a[href="/${locale}${href}"]`)).toBeVisible();
      await expect(page.locator(`.desktop-nav a[href="/${locale}/team"]`)).toBeVisible();
    }
  });

  test(`${locale} home wordmark performs a document navigation including on home itself`, async ({ page }) => {
    await page.goto(`/${locale}/participate`);
    await settle(page);
    for (let attempt = 0; attempt < 2; attempt++) {
      const previousOrigin = await page.evaluate(() => performance.timeOrigin);
      await Promise.all([
        page.waitForResponse((response) => response.request().isNavigationRequest() && response.request().frame() === page.mainFrame() && new URL(response.url()).pathname === `/${locale}`),
        page.locator(".axiom-header .wordmark").click(),
      ]);
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect.poll(() => page.evaluate(() => performance.timeOrigin)).toBeGreaterThan(previousOrigin);
    }
  });

  test(`${locale} phone globe changes language directly while preserving the current query and fragment`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Direct touch language control.");
    await page.goto(`/${locale}/program?day=day2&view=phone#main-content`);
    await settle(page);
    const nextLocale = locale === "en" ? "ar" : "en";
    const language = page.getByRole("link", { name: nextLocale === "ar" ? "View this page in Arabic" : "View this page in English", exact: true });
    await expect(language).toHaveCount(1);
    await expect(language).toBeInViewport();
    await expect(language.locator("svg")).toBeVisible();
    const target = await language.boundingBox();
    expect(target!.width).toBeGreaterThanOrEqual(48);
    expect(target!.height).toBeGreaterThanOrEqual(48);
    await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "false");
    await language.tap();
    await expect(page).toHaveURL(new RegExp(`/${nextLocale}/program\\?day=day2&view=phone#main-content$`));
    await expect(page.locator("html")).toHaveAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await expect(page.locator("meta[name='viewport']")).toHaveAttribute("content", /viewport-fit=cover/);

    // Switching while the disclosure is open must not leave its overlay on the translated page.
    await page.locator(".menu-toggle").tap();
    await expect(page.locator(".mobile-menu")).toBeVisible();
    const backLanguage = page.getByRole("link", { name: locale === "ar" ? "View this page in Arabic" : "View this page in English", exact: true });
    await expect(backLanguage).toHaveCount(1);
    await backLanguage.tap();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program\\?day=day2&view=phone#main-content$`));
    await expect(page.locator(".mobile-menu")).toHaveCount(0);
    await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  test(`${locale} touch scrolling keeps the bypass hidden while keyboard navigation reveals and activates it`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Touch and keyboard bypass regression.");
    await page.goto(`/${locale}`);
    await settle(page);
    await page.touchscreen.tap(180, 220);
    const skip = page.locator(".skip-link");
    // Simulate the lingering non-keyboard focus some touch browsers retain.
    await skip.evaluate((element: HTMLAnchorElement) => element.focus({ preventScroll: true }));
    await expect(skip).toBeFocused();
    expect(await skip.evaluate((element) => element.matches(":focus-visible"))).toBe(false);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const concealed = await skip.boundingBox();
    expect(concealed!.width).toBeLessThanOrEqual(1);
    expect(concealed!.height).toBeLessThanOrEqual(1);
    await expect(skip).not.toBeInViewport();

    await page.goto(`/${locale}/participate?input=keyboard`);
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    const visible = await skip.boundingBox();
    expect(visible!.width).toBeGreaterThan(80);
    expect(visible!.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await expect(skip).not.toBeInViewport();
  });

  test(`${locale} reduced motion settles the navigation and enlarged phone menu fits`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await settle(page);
    if (!isMobile) {
      await expect(page.locator(".header-middle")).toHaveCSS("transition-duration", "0s");
      await page.locator(`.desktop-nav > .header-nav-item > a[href="/${locale}/participate"]`).hover();
      await expect(page.locator(".header-dropdown").first()).toHaveCSS("transition-duration", "0s");
    } else {
      await page.setViewportSize({ width: 280, height: 640 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await expect(page.locator(".menu-toggle")).toBeInViewport();
      await page.locator(".menu-toggle").click();
      const menu = page.locator(".mobile-menu");
      await expect(menu).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(280);
      const menuWidth = await menu.evaluate((element) => ({ content: element.scrollWidth, visible: element.clientWidth }));
      expect(menuWidth.content, "enlarged menu does not scroll horizontally").toBeLessThanOrEqual(menuWidth.visible);
      const box = await menu.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(640);
      const last = menu.locator("nav a").last();
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
    }
  });
}
