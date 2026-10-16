import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { dictionaries } from "../../src/lib/i18n";

for (const locale of ["en", "ar"] as const) {
  for (const javaScriptEnabled of [true, false]) {
    test(`${locale} unmatched URLs render localized 404 HTML with JS ${javaScriptEnabled ? "on" : "off"}`, async ({ browser, baseURL, viewport, isMobile, hasTouch, deviceScaleFactor }) => {
      const context = await browser.newContext({ javaScriptEnabled, baseURL, viewport, isMobile, hasTouch, deviceScaleFactor });
      const page = await context.newPage();
      try {
        for (const path of ["zz-missing", "zz-missing/deeper"]) {
          const response = await page.goto(`/${locale}/${path}`);
          expect(response?.status()).toBe(404);
          const html = await response!.text();
          expect(html).toContain(`<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
          expect(html).toContain(`<h1>${dictionaries[locale].notFoundTitle}</h1>`);
          expect(html).toContain(dictionaries[locale].notFoundDescription);
          expect(html).not.toContain('__next_error__');
          expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
          await expect(page.getByRole("heading", { name: dictionaries[locale].notFoundTitle, exact: true })).toBeVisible();
          const home = page.getByRole("link", { name: dictionaries[locale].home, exact: true });
          await expect(home).toHaveAttribute("href", `/${locale}`);
          await expect(home).toBeVisible();
          await expect(page.locator(".message-page > p:not(.eyebrow)")).toHaveCSS("opacity", "1");
          await expect(page.locator(".message-actions")).toHaveCSS("opacity", "1");
          const robots = await page.locator('meta[name="robots"]').evaluateAll((elements) => elements.map((element) => element.getAttribute("content")));
          expect(robots.length).toBeGreaterThan(0);
          expect(robots.every((content) => content?.includes("noindex"))).toBe(true);
          // Axe requires timers that Chromium suppresses when JS is disabled.
          // Audit the no-JS DOM in a diagnostic page with application scripts
          // removed and noscript children preserved. The original page remains
          // JS-disabled for every response, assertion and home-link navigation.
          const diagnosticContext = !javaScriptEnabled ? await browser.newContext({ viewport, isMobile, hasTouch, deviceScaleFactor }) : null;
          let auditPage = page;
          if (diagnosticContext) {
            expect(await page.evaluate(() => "__next_f" in window)).toBe(false);
            const snapshot = await page.evaluate(() => {
              const root = document.documentElement.cloneNode(true) as HTMLElement;
              root.querySelectorAll("script").forEach((script) => script.remove());
              root.querySelectorAll("noscript").forEach((element) => element.replaceWith(...element.childNodes));
              return `<!DOCTYPE html>${root.outerHTML}`;
            });
            auditPage = await diagnosticContext.newPage();
            await auditPage.route(page.url(), (route) => route.fulfill({ status: 404, contentType: "text/html", body: snapshot }));
            await auditPage.goto(page.url());
          }
          try {
            const axe = await new AxeBuilder({ page: auditPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
            expect(axe.violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
          } finally { await diagnosticContext?.close(); }
          await home.click();
          await expect(page).toHaveURL(`${baseURL}/${locale}`);
        }
      } finally { await context.close(); }
    });
  }
}

test("an incoming header cannot choose the 404 locale", async ({ request }) => {
  const response = await request.get("/ar/zz-missing", { headers: { "x-msrc-locale": "en" } });
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('<html lang="ar" dir="rtl"');
  const encoded = await request.get("/%61r/zz-missing", { headers: { "x-msrc-locale": "en" } });
  expect(encoded.status()).toBe(404);
  expect(await encoded.text()).toContain('<html lang="ar" dir="rtl"');
});
