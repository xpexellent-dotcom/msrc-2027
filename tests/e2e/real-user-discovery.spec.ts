import { expect, test } from "@playwright/test";
import { publicRoutes } from "../../src/lib/metadata";

for (const locale of ["en", "ar"] as const) {
  for (const route of publicRoutes) {
    test(`${locale}${route || "/"}: read, scroll, rotate, enlarge and revisit`, async ({ page, isMobile }, testInfo) => {
      const failures: string[] = [];
      const warnings: string[] = [];
      const path = `/${locale}${route}`;
      let loaded = false;
      page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") failures.push(`console: ${message.text()}`);
        if (message.type() === "warning") warnings.push(message.text());
      });
      page.on("crash", () => failures.push("page crashed"));
      page.on("close", () => failures.push("page unexpectedly closed"));
      // WebKit also emits framenavigated for same-document replaceState during
      // hydration. Observe real document requests to catch reloads accurately.
      page.on("request", (request) => { if (loaded && request.isNavigationRequest() && request.frame() === page.mainFrame()) failures.push(`unexpected document navigation: ${request.url()}`); });
      page.on("response", (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
      page.on("requestfailed", (request) => {
        // Navigation can legitimately cancel prefetches and offscreen video.
        if (!/abort|cancel|ERR_ABORTED/i.test(request.failure()?.errorText ?? "")) failures.push(`network: ${request.failure()?.errorText}: ${request.url()}`);
      });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      loaded = true;

      for (const fraction of [0.25, 0.5, 0.75, 1, 0]) {
        await page.evaluate((value) => window.scrollTo({ top: value * (document.documentElement.scrollHeight - innerHeight), behavior: "instant" }), fraction);
        await page.waitForTimeout(100);
      }
      const original = page.viewportSize()!;
      if (isMobile) {
        await page.setViewportSize({ width: original.height, height: original.width });
        await page.waitForTimeout(100);
        await page.setViewportSize(original);
      }
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await expect(page.locator("main h1")).toBeVisible();
      const enlargedOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (enlargedOverflow > 2) failures.push(`200% text horizontal overflow: ${enlargedOverflow}px`);
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; document.documentElement.style.zoom = "2"; });
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }); document.documentElement.style.zoom = ""; window.scrollTo({ top: 0, behavior: "instant" }); });
      const inventory = await page.evaluate(() => ({
        title: document.title,
        language: document.documentElement.lang,
        direction: document.documentElement.dir,
        canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
        description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
        og: Object.fromEntries([...document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]')].map((meta) => [meta.getAttribute("property"), meta.content])),
        twitter: Object.fromEntries([...document.querySelectorAll<HTMLMetaElement>('meta[name^="twitter:"]')].map((meta) => [meta.name, meta.content])),
        viewport: document.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.content,
        themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
        icons: [...document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')].map((link) => link.href),
        fonts: document.fonts.status,
        brokenImages: [...document.images].filter((image) => image.complete && image.currentSrc && !image.naturalWidth).map((image) => image.currentSrc),
        mixedContent: [...document.querySelectorAll<HTMLImageElement | HTMLScriptElement | HTMLLinkElement>('img[src],script[src],link[href]')].map((element) => "src" in element ? element.src : element.href).filter((url) => url.startsWith("http://") && !url.includes("127.0.0.1")),
        links: [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((link) => ({ href: link.getAttribute("href"), name: link.textContent?.trim() || link.getAttribute("aria-label") })),
        buttons: [...document.querySelectorAll<HTMLButtonElement>('button')].map((button) => ({ name: button.getAttribute("aria-label") || button.textContent?.trim(), disabled: button.disabled })),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      expect(inventory.language).toBe(locale);
      expect(inventory.direction).toBe(locale === "ar" ? "rtl" : "ltr");
      expect(inventory.title).toContain("MSRC 2027");
      expect(inventory.description).toBeTruthy();
      expect(inventory.canonical).toBe(`https://www.msrc2027.com${path}`);
      for (const key of ["og:title", "og:description", "og:image", "og:url"]) expect(inventory.og[key], key).toBeTruthy();
      expect(inventory.twitter["twitter:card"]).toBe("summary_large_image");
      expect(inventory.viewport).not.toMatch(/user-scalable=no|maximum-scale=1(?:,|$)/);
      expect(inventory.themeColor).toBeTruthy();
      expect(inventory.icons.length).toBeGreaterThan(0);
      if (inventory.overflow > 2) failures.push(`horizontal overflow: ${inventory.overflow}px`);
      failures.push(...inventory.brokenImages.map((url) => `broken image: ${url}`));
      failures.push(...inventory.mixedContent.map((url) => `mixed content: ${url}`));
      failures.push(...inventory.links.filter((link) => !link.href || link.href === "#" || link.href.startsWith("javascript:")).map((link) => `dead link: ${link.name} -> ${link.href}`));
      // Exercise the shared shell on every page and in every social UA profile.
      const disclosure = page.locator(isMobile ? ".menu-toggle" : ".header-dropdown-toggle");
      await expect(disclosure).toBeEnabled();
      if (isMobile) await disclosure.tap();
      else { await disclosure.focus(); await page.keyboard.press("Enter"); }
      await expect(disclosure).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(disclosure).toHaveAttribute("aria-expanded", "false");
      await testInfo.attach("visitor-inventory", { body: JSON.stringify({ path, engine: testInfo.project.name, inventory, failures, warnings }, null, 2), contentType: "application/json" });
      expect(failures).toEqual([]);
      expect(warnings, "browser warnings").toEqual([]);
      // A repeat visit exercises cached assets and a fresh hydrated document.
      loaded = false;
      await page.reload();
      await expect(page.locator("main h1")).toBeVisible();
      await page.waitForTimeout(200);
      expect(failures).toEqual([]);
      const otherLocale = locale === "en" ? "ar" : "en";
      await page.locator(".site-header .language-switch:visible").click();
      await expect(page).toHaveURL(new RegExp(`/${otherLocale}${route}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", otherLocale);
      await expect(page.locator("main h1")).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main h1")).toBeVisible();
      expect(failures).toEqual([]);
      expect(warnings).toEqual([]);
    });
  }
}
