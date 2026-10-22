import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test } from "../helpers/csp";

// ENG-059 / ACC-01, LOC-01/03, REG-02: public entry remains usable and truthful
// before the separately authorized account/registration runtime is opened.
for (const locale of ["en", "ar"] as const) for (const width of [360, 390, 1440]) {
  for (const route of ["", "/participate", "/registration"]) {
    test(`${locale} ${width}px ${route || "home"} participant entry at normal and 200% text`, async ({ page, isMobile }) => {
      test.skip(isMobile !== (width < 700), "Use phone emulation for the two phone widths.");
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}${route}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      const directory = ".tools/journey-review/public/after";
      await mkdir(directory, { recursive: true });
      for (const size of [100, 200]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, size);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if (width < 700) {
          const columns = await page.locator(".footer-directory").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
          expect(columns, "Footer keeps two compact columns, then one readable enlarged-text column").toBe(size === 100 ? 2 : 1);
          if (!route) await page.screenshot({ path: `${directory}/${locale}-${width}-footer-${size}.png`, fullPage: true,
            clip: (await page.locator(".footer-directory").boundingBox())!, scale: "css" });
        }
        for (const link of await page.locator(".footer-directory a").all()) {
          const bounds = (await link.boundingBox())!;
          expect(bounds.width, await link.innerText()).toBeGreaterThanOrEqual(44);
          expect(bounds.height, await link.innerText()).toBeGreaterThanOrEqual(44);
        }
        if (!route) {
          await expect(page.locator('[data-pathway="/registration"] .status-badge')).toHaveCount(0);
          await expect(page.locator(".hero-actions a").first()).toHaveAttribute("href", `/${locale}/participate`);
          if (await page.locator(".menu-toggle").isVisible()) {
            const toggle = page.locator(".menu-toggle");
            await expect(toggle).toBeEnabled();
            await toggle.focus();
            await page.keyboard.press("Enter");
            const menu = page.locator(".mobile-menu");
            await expect(menu.locator(".mobile-menu-status")).toHaveText(locale === "en" ? "Conference registration" : "التسجيل في المؤتمر");
            if (width < 700) expect(await menu.locator(".mobile-nav-children").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(size === 100 ? 2 : 1);
            await page.keyboard.press("Tab");
            const first = menu.locator("a").first();
            await expect(first).toBeFocused();
            expect(await first.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
            for (const link of await menu.locator("a").all()) {
              await link.scrollIntoViewIfNeeded();
              await expect(link).toBeInViewport();
              const bounds = (await link.boundingBox())!;
              expect(bounds.height).toBeGreaterThanOrEqual(44);
              expect(bounds.width).toBeGreaterThanOrEqual(44);
            }
            await first.scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${directory}/${locale}-${width}-menu-${size}.png`, scale: "css" });
            expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
            await page.keyboard.press("Escape");
            await expect(toggle).toBeFocused();
          }
          const registrationFaq = page.locator("#faq details").nth(1);
          await registrationFaq.locator("summary").click();
          await expect(registrationFaq).toContainText(locale === "en" ? "Check each participation page for its current availability." : "راجع صفحة كل مسار لمعرفة إتاحته الحالية.");
          await registrationFaq.screenshot({ path: `${directory}/${locale}-${width}-faq-${size}.png`, scale: "css" });
          expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
          await registrationFaq.locator("summary").click();
        } else if (route === "/participate") {
          const attend = page.locator(`.participation-path-link[href="/${locale}/registration"]`);
          await expect(attend).toBeVisible();
          await attend.focus();
          expect(await attend.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
        } else {
          await expect(page.locator(".participation-steps ol")).toContainText(locale === "en" ? "Request a seat" : "اطلب مقعدًا");
          await expect(page.locator(".participation-steps ol")).toContainText(locale === "en" ? "confirmation email and ticket" : "رسالة التأكيد وتذكرتك");
          await expect(page.getByTestId("participation-sign-up")).toHaveAttribute("href", `/${locale}/sign-up`);
          await expect(page.getByTestId("journey-closed")).toBeVisible();
        }
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: "instant" });
          return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        });
        await page.screenshot({ path: `${directory}/${locale}-${width}-${route.slice(1) || "home"}-${size}.png`, fullPage: true, scale: "css" });
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      }
      if (route === "/participate") {
        await page.locator(`.participation-path-link[href="/${locale}/registration"]`).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/registration$`));
      } else if (route === "/registration") {
        await page.getByTestId("participation-sign-up").click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/sign-up$`));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(locale === "en" ? "Accounts are coming soon" : "حسابات المشاركين قريبًا");
      }
    });
  }
}
