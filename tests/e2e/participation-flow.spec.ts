import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const routes = ["participate", "registration", "submissions", "workshops", "hackathon", "3mt"] as const;
const screenshots = ".tools/participation-flow/screenshots";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} reserve actions lead to the hub and abstract naming is consistent`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator(".hero-actions a").first()).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator(".closing-grid a")).toHaveAttribute("href", `/${locale}/participate`);
    const label = locale === "en" ? "Abstract submission" : "تقديم الملخصات";
    await expect(page.locator(`.pathway-card`).filter({ has: page.locator(`a[href='/${locale}/submissions']`) })).toContainText(label);
    if (isMobile) {
      await page.locator(".menu-toggle").click();
      await expect(page.locator(".mobile-reserve-action")).toHaveAttribute("href", `/${locale}/participate`);
      await expect(page.locator(`.mobile-nav-children a[href='/${locale}/submissions']`)).toHaveText(label);
      await page.locator(".mobile-reserve-action").click();
    } else {
      await page.locator(`.desktop-nav > .header-nav-item > a[href='/${locale}/participate']`).hover();
      await expect(page.locator(`.header-dropdown a[href='/${locale}/submissions']`)).toContainText(label);
      await page.locator(".header-primary-action").click();
    }
    await expect(page).toHaveURL(new RegExp(`/${locale}/participate$`));
    await expect(page.locator(`.participation-path-link[href='/${locale}/submissions'] h2`)).toHaveText(label);
    await expect(page.locator(".participation-hub")).not.toContainText(locale === "en" ? /\bResearch\b/ : "البحث العلمي");
    await page.goto(`/${locale}/submissions`);
    await expect(page).toHaveTitle(new RegExp(label));
    await expect(page.locator(".experience-breadcrumb [aria-current=page]")).toHaveText(label);
    await expect(page.getByTestId("journey-closed")).toContainText(locale === "en" ? "Abstract submissions are not open yet" : "لم يُفتح تقديم الملخصات بعد");
  });

  test(`${locale} hub rows stay horizontal, mirror in RTL and support enlarged text`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Explicit width and text matrix runs once per locale.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}/participate`);
      const photo = page.locator(".experience-intro--participate .premium-hero-image");
      await expect(photo).toHaveAttribute("aria-hidden", "true");
      await expect(photo.locator("img")).toHaveAttribute("alt", "");
      await expect(photo.locator("img")).toHaveAttribute("src", /participate-header-v1.jpg/);
      const cards = page.locator(".participation-path-link");
      await expect(cards).toHaveCount(5);
      for (const size of ["100%", "200%"]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width} / ${size}`).toBeLessThanOrEqual(width);
        const clipped = await page.locator(".participation-path-copy h2, .participation-path-copy p").evaluateAll((nodes) => nodes.some((node) => {
          const range = document.createRange(); range.selectNodeContents(node);
          return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
        }));
        expect(clipped, `${width} / ${size} text is visible`).toBe(false);
        for (const card of await cards.all()) {
          const box = (await card.boundingBox())!;
          expect(box.height).toBeGreaterThanOrEqual(44);
          if (size === "100%" && width >= 390) expect(box.width).toBeGreaterThan(box.height);
          const icon = (await card.locator(".participation-path-icon").boundingBox())!;
          const arrow = (await card.locator(":scope > .directional-arrow").boundingBox())!;
          expect(locale === "ar" ? icon.x > arrow.x : icon.x < arrow.x).toBe(true);
        }
      }
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
    const first = page.locator(".participation-path-link").first();
    await first.focus();
    await expect(first).toBeFocused();
    expect(await first.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/registration$`));
  });

  test(`${locale} each option has benefits, steps, next move and closed actions without dense rules`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of routes.slice(1)) {
      await page.goto(`/${locale}/${route}`);
      await expect(page.locator(".participation-benefits")).toBeVisible();
      expect(await page.locator(".participation-benefit").count()).toBeGreaterThanOrEqual(2);
      const steps = await page.locator(".participation-steps li").count();
      expect(steps).toBeGreaterThanOrEqual(3); expect(steps).toBeLessThanOrEqual(4);
      await expect(page.locator(".fluid-journey-resources")).toBeVisible();
      await expect(page.getByTestId("ticket-unavailable")).toBeDisabled();
      await expect(page.getByTestId("brochure-unavailable")).toBeDisabled();
      await expect(page.locator(".experience-intro .participation-program")).toHaveCount(1);
      await expect(page.locator(".journey-guidelines, .fluid-requirement-card")).toHaveCount(0);
      await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
      await expect(page.getByTestId("journey-closed")).toBeVisible();
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      expect(axe.violations, JSON.stringify(axe.violations)).toEqual([]);
    }
    await page.goto(`/${locale}/registration`);
    // ENG-084: the hero jumps to Simple steps, where step 1 is the sign-up link.
    const jump = page.getByTestId("registration-steps-jump");
    await expect(jump).toHaveText(locale === "en" ? "Sign up for MSRC" : "سجّل في MSRC");
    await expect(jump).toHaveAttribute("href", "#journey-steps");
    await expect(page.locator("main a, main button").filter({ hasText: locale === "en" ? "Reserve your seat" : "احجز مقعدك" })).toHaveCount(0);
    await jump.click();
    await expect(page).toHaveURL(/#journey-steps$/);
    await expect(page.locator("#journey-steps")).toBeInViewport();
    const tracker = page.getByTestId("registration-step-tracker");
    await expect(tracker).toHaveAttribute("data-current-step", "1");
    await expect(tracker.locator("[aria-current=step]")).toHaveCount(1);
    const signup = page.getByTestId("participation-sign-up");
    await expect(signup).toContainText(locale === "en" ? "Create your account" : "أنشئ حسابك");
    await expect(signup).toHaveAttribute("href", `/${locale}/sign-up`);
    await signup.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-up$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(locale === "en" ? "Accounts are coming soon" : "حسابات المشاركين قريبًا");
    await page.goto(`/${locale}/submissions`);
    await expect(page.locator(".experience-intro .button--gold")).toHaveText(locale === "en" ? "Submit your abstract" : "قدّم ملخصك البحثي");
    await expect(page.getByRole("main")).not.toContainText(locale === "en" ? /Evidence, handled privately|Research and attendance|Supervisor requirements/ : /الوثائق بسرية|البحث والحضور|متطلبات المشرف/);
    await page.goto(`/${locale}/workshops`);
    await expect(page.getByRole("main")).not.toContainText(locale === "en" ? /Make space for practical learning|Browse before you book/ : /مساحة للتعلّم العملي|استكشف قبل الحجز/);
    expect(await page.locator(".participation-benefits").evaluate((element) => Boolean(element.compareDocumentPosition(document.getElementById("workshop-catalogue")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await page.locator(".experience-intro .button--gold").click();
    await expect(page).toHaveURL(/#workshop-catalogue$/);
    await expect(page.locator("#workshop-catalogue")).toBeFocused();
    await expect(page.locator("#workshop-catalogue-title")).toBeInViewport();
  });

  test(`${locale} participation visual matrix and overflow at 320, 390 and 1440`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Capture explicit sizes once per locale.");
    mkdirSync(screenshots, { recursive: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      for (const route of routes) {
        await page.goto(`/${locale}/${route}`);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} ${width}`).toBeLessThanOrEqual(width);
        if (width !== 320) await page.screenshot({ path: `${screenshots}/${locale}-${route}-${width}.png`, fullPage: true });
        if (route === "participate" && width === 390) {
          const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
          expect(axe.violations, JSON.stringify(axe.violations)).toEqual([]);
        }
      }
    }
  });
}
