import { expect, test } from "@playwright/test";
import { publicRoutes } from "../../src/lib/metadata";

test("sitemap destinations, internal links, previews, icons and calendar have usable responses", async ({ page, request, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chrome-chromium", "HTTP inventory is engine-independent.");
  test.setTimeout(180_000);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const listed = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  expect(listed.sort()).toEqual(publicRoutes.flatMap((path) => ["en", "ar"].map((locale) => `/${locale}${path}`)).sort());
  const destinations = new Set<string>();
  const external = new Set<string>();
  for (const path of listed) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    const links = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
    for (const link of links) {
      const url = new URL(link);
      if ([new URL(baseURL!).origin, "https://www.msrc2027.com"].includes(url.origin)) destinations.add(`${url.pathname}${url.search}${url.hash}`);
      else external.add(link);
    }
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      const url = new URL(await page.locator(selector).getAttribute("content") ?? "", baseURL);
      const image = await request.get(url.pathname);
      expect(image.status(), `${path} preview`).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/");
      const bytes = await image.body();
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
    }
  }
  for (const destination of destinations) {
    const response = await request.get(destination);
    expect(response.status(), destination).toBe(200);
    const fragment = new URL(destination, baseURL).hash.slice(1);
    if (fragment && response.headers()["content-type"]?.includes("text/html")) {
      const markup = await response.text();
      expect(markup, `anchor ${destination}`).toContain(`id="${decodeURIComponent(fragment)}"`);
    }
  }
  for (const path of ["/icon.svg", "/apple-icon", "/manifest.webmanifest"]) expect((await request.get(path)).status(), path).toBe(200);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("MSRC 2027");
  expect(manifest.theme_color).toBe("#F8F6F0");
  for (const [path, language, destination] of [
    ["/", "en-US", "/en"], ["/", "ar-SA", "/ar"],
    ["/privacy", "en-US", "/en/privacy"], ["/terms/v1.0", "ar-SA", "/ar/terms/v1.0"],
    ["/en/programme?day=day2", "en-US", "/en/program?day=day2"],
    ["/ar/participation", "ar-SA", "/ar/participate"], ["/en/program/", "en-US", "/en/program"],
  ]) {
    const redirect = await request.get(path, { headers: { "Accept-Language": language }, maxRedirects: 0 });
    expect([307, 308], path).toContain(redirect.status());
    const address = new URL(redirect.headers().location, baseURL);
    expect(`${address.pathname}${address.search}`, path).toBe(destination);
    expect((await request.get(destination, { maxRedirects: 0 })).status(), `single-hop ${path}`).toBe(200);
  }
  for (const locale of ["en", "ar"]) {
    const response = await request.get(`/${locale}/msrc-2027.ics`);
    expect(response.headers()["content-type"]).toContain("text/calendar");
    expect(response.headers()["content-disposition"]).toContain("attachment");
    const calendar = (await response.text()).replace(/\r\n /g, "");
    // Confirmed calendar days, deliberately all-day: no approved session times
    // exist to convert to UTC or a floating device timezone.
    expect(calendar).toContain("DTSTART;VALUE=DATE:20270127\r\n");
    expect(calendar).toContain("DTEND;VALUE=DATE:20270129\r\n");
    expect(calendar).toContain(locale === "en" ? "King Faisal Conference Center" : "مركز الملك فيصل للمؤتمرات");
    expect(calendar).toContain("UID:msrc-2027-conference@msrc2027.com");
    expect(calendar).not.toMatch(/DTSTART(?:;TZID=[^:]*)?:\d{8}T/);
  }
  await testInfo.attach("link-inventory", { body: JSON.stringify({ listed, internal: [...destinations], external: [...external] }, null, 2), contentType: "application/json" });
});

for (const locale of ["en", "ar"] as const) {
  test(`${locale} map buttons dispatch their destination on the first activation`, async ({ page, context, isMobile }) => {
    await page.goto(`/${locale}/dates-venue?view=travel#venue`);
    const links = page.locator('.venue-map-links a');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      const destination = await link.getAttribute("href");
      expect(destination).toMatch(/^https:\/\/(www.google.com\/maps\/dir\/\?api=1&destination=|maps.apple.com\/directions\?destination=)/);
      expect(decodeURIComponent(destination!)).toContain("King Faisal Conference Center");
      // Intercept the provider page after a real native click/tap. This verifies
      // dispatch without pretending a desktop runner can open a phone's Maps app.
      await context.route(destination!, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Map destination probe</title>" }));
      const popupPromise = context.waitForEvent("page");
      if (isMobile) await link.tap(); else await link.click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      expect(popup.url()).toBe(destination);
      await popup.close();
      await context.unroute(destination!);
    }
  });

  test(`${locale} 404 is usable without JavaScript including trailing-slash routes`, async ({ browser, baseURL, viewport, isMobile, hasTouch, ignoreHTTPSErrors }) => {
    const context = await browser.newContext({ baseURL, ignoreHTTPSErrors, javaScriptEnabled: false, viewport, isMobile, hasTouch, locale: locale === "ar" ? "ar-SA" : "en-US" });
    const page = await context.newPage();
    try {
      for (const path of ["/random", "/team", "/program", `/${locale}/random`, `/${locale}/random/`]) {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
        const expectedLocale = path.startsWith(`/${locale}/`) ? locale : "en";
        await expect(page.locator("html")).toHaveAttribute("lang", expectedLocale);
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.locator(".message-actions a")).toHaveAttribute("href", `/${expectedLocale}`);
        await expect(page.locator(".message-page > p:not(.eyebrow)")).toHaveCSS("opacity", "1");
        await expect(page.locator(".message-actions")).toHaveCSS("opacity", "1");
        const robots = await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content") ?? ""));
        expect(robots.length).toBeGreaterThan(0);
        expect(robots.every((value) => value.includes("noindex"))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
      }
      await page.locator(".message-actions a").click();
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(page.locator("main h1")).toBeVisible();
    } finally { await context.close(); }
  });
}
