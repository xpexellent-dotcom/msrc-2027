import { expect, test, type Page } from "@playwright/test";
import { languageLink } from "./helpers/header-navigation";

const runtimeIssues = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const issues: string[] = [];
  runtimeIssues.set(page, issues);
  page.on("pageerror", (error) => issues.push(error.message));
  page.on("crash", () => issues.push("Page crashed"));
  page.on("close", () => issues.push("Page closed during interaction"));
  page.on("console", (message) => { if (message.type() === "error") issues.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(runtimeIssues.get(page)).toEqual([]); });

// ACC-01, LOC-01/03, PRG-01: exercise visitor state changes, rather than just load URLs.
async function ready(page: Page) {
  await expect(page.getByTestId("program-day-all")).toBeEnabled();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} programme and media filters reflow at 200% text on tablet widths`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 810, height: 1080 });
    for (const route of ["program", "media"] as const) {
      await page.goto(`/${locale}/${route}`);
      await expect(page.getByTestId(`${route}-search`)).toBeEnabled();
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.documentElement.style.fontSize = "200%";
      });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(810);
      for (const select of await page.locator(".experience-filters select").all()) {
        const size = await select.evaluate((element) => ({ width: element.clientWidth, content: element.scrollWidth }));
        expect(size.content, "native select text stays inside its available width").toBeLessThanOrEqual(size.width + 1);
      }
      if (testInfo.project.name === "ipad-webkit") {
        await page.locator(".experience-filters").scrollIntoViewIfNeeded();
        await testInfo.attach(`${locale}-${route}-tablet-200-text`, { body: await page.screenshot(), contentType: "image/png" });
      }
    }
  });

  test(`${locale} the first keyboard Tab reaches the skip link in every browser`, async ({ page }) => {
    await page.goto(`/${locale}/program`);
    await ready(page);
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await expect(page.locator(".skip-link")).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  for (const routes of [
    ["participate", "registration", "submissions", "workshops"],
    ["hackathon", "3mt", "program", "speakers"],
    ["sponsors", "dates-venue", "team", "contact"],
  ]) test(`${locale} header destinations ${routes[0]} through ${routes.at(-1)} follow their first activation`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/program`);
    await ready(page);
    for (const route of routes) {
      let link;
      if (isMobile) {
        await page.locator(".menu-toggle").tap();
        link = page.locator(`.mobile-menu nav a[href="/${locale}/${route}"]`);
        await link.scrollIntoViewIfNeeded();
        await link.tap();
        await expect(page.locator(".mobile-menu")).toHaveCount(0);
      } else {
        if (["registration", "submissions", "workshops", "hackathon", "3mt"].includes(route)) {
          await page.locator(".header-dropdown-toggle").click();
        }
        link = page.locator(`.desktop-nav a[href="/${locale}/${route}"]`);
        await link.click();
      }
      await expect(page).toHaveURL(new RegExp(`/${locale}/${route}$`));
      await expect(page.locator("main h1")).toBeVisible();
    }
  });

  test(`${locale} navigation controls wait for JavaScript, then the first activation works`, async ({ page, isMobile }) => {
    let release!: () => void;
    const scripts = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/_next/static/**/*.js", async (route) => { await scripts; await route.continue(); });
    try {
      await page.goto(`/${locale}/program`, { waitUntil: "domcontentloaded" });
      const toggle = page.locator(isMobile ? ".menu-toggle" : ".header-dropdown-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toBeDisabled();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      release();
      await expect(toggle).toBeEnabled();
      if (isMobile) {
        await toggle.tap();
        await expect(page.locator(".mobile-menu")).toBeVisible();
      } else {
        await toggle.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator(".header-dropdown")).toBeVisible();
      }
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
    } finally { release(); }
  });

  test(`${locale} language change preserves filters and anchor through browser back and forward`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/program?day=day1&source=shared#programme`);
    await ready(page);
    await page.getByTestId("program-day-day2").click();
    const other = locale === "en" ? "ar" : "en";
    const language = await languageLink(page, other === "ar" ? "View this page in Arabic" : "View this page in English");
    const translatedAddress = new RegExp(`/${other}/program\\?day=day2&source=shared#programme$`);
    // The first activation starts a router navigation; await its actual commit
    // before inspecting the translated state. Touch profiles use a real tap.
    await Promise.all([
      page.waitForURL(translatedAddress, { waitUntil: "load" }),
      isMobile ? language.tap() : language.click(),
    ]);
    await expect(page).toHaveURL(translatedAddress);
    await expect(page.locator("html")).toHaveAttribute("lang", other);
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}/program\\?day=day2&source=shared#programme$`));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/${other}/program\\?day=day2&source=shared#programme$`));
    await expect(page.locator("html")).toHaveAttribute("lang", other);
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.locator(".programme-toolbar").evaluate((element) =>
      element.getBoundingClientRect().top >= document.querySelector(".site-header-inner")!.getBoundingClientRect().bottom,
    ), { message: "Restored programme controls remain clear of the sticky header" }).toBe(true);
  });

  test(`${locale} rapid programme changes survive rotation, search and clear`, async ({ page, isMobile }) => {
    await page.goto(`/${locale}/program?source=shared#programme`);
    await ready(page);
    // Several events in one browser turn expose stale URL/filter writes.
    await page.evaluate(() => {
      for (const day of ["day1", "day2", "all", "day1", "day2"]) {
        (document.querySelector(`[data-testid="program-day-${day}"]`) as HTMLButtonElement).click();
      }
    });
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("program-search").fill("synthetic unmatched query");
    await expect(page.getByTestId("program-empty")).toBeVisible();
    if (isMobile) {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.setViewportSize({ width: 390, height: 844 });
    } else {
      await page.setViewportSize({ width: 900, height: 700 });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await expect(page.getByTestId("program-search")).toHaveValue("synthetic unmatched query");
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("program-clear").click();
    await expect(page.getByTestId("program-search")).toHaveValue("");
    await expect(page.getByTestId("program-search")).toBeFocused();
    await expect(page.getByTestId("program-day-all")).toHaveAttribute("aria-pressed", "true");
    expect(new URL(page.url()).search).toBe("?source=shared");
    expect(new URL(page.url()).hash).toBe("#programme");
  });

  test(`${locale} phone menu closes outside and with Escape, then native page scrolling still works`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile disclosure interaction.");
    await page.goto(`/${locale}/program`);
    await ready(page);
    const toggle = page.locator(".menu-toggle");
    await toggle.tap();
    const menu = page.locator(".mobile-menu");
    await expect(menu).toBeVisible();
    // Visible gutter belongs to the page, outside the non-modal panel and header.
    const panel = (await menu.boundingBox())!;
    await page.touchscreen.tap(4, panel.y + Math.min(panel.height / 2, 150));
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveCount(0);
    await toggle.tap();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
    // Mobile WebKit does not expose wheel input; keyboard scrolling still exercises
    // the browser's native default scrolling, rather than mutating window.scrollY.
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    await page.keyboard.press("Home");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await toggle.tap();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(menu).toBeVisible();
    const contact = menu.locator(`a[href="/${locale}/contact"]`);
    await contact.scrollIntoViewIfNeeded();
    await contact.tap();
    await expect(page).toHaveURL(new RegExp(`/${locale}/contact$`));
    await expect(menu).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible();
  });
}
