import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const version = "2026-10-04-draft";
const titles = { en: { privacy: "Privacy", terms: "Terms" }, ar: { privacy: "الخصوصية", terms: "الشروط" } } as const;

for (const locale of ["en", "ar"] as const) for (const kind of ["privacy", "terms"] as const) {
  test(`${locale} ${kind} latest and dated versions are accessible read-only drafts`, async ({ page, context }, testInfo) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    let initialContent: string | undefined;

    for (const suffix of ["", `/${version}`]) {
      const response = await page.goto(`/${locale}/${kind}${suffix}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${titles[locale][kind]} — ${locale === "en" ? "Draft" : "مسودة"} | MSRC 2027`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(titles[locale][kind]);
      await expect(page.locator(".policy-draft-notice")).toContainText(locale === "en" ? "Draft — final wording pending" : "مسودة — بانتظار الصياغة النهائية");
      await expect(page.locator(".policy-draft-notice")).toContainText(locale === "en" ? "no effective date" : "ليس لهذه المسودة تاريخ سريان");
      await expect(page.locator(".policy-version-details")).toContainText(version);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.msrc2027.com/${locale}/${kind}${suffix}`);
      await expect(page.locator("form, input, textarea, select, iframe, video")).toHaveCount(0);
      expect(await context.cookies()).toEqual([]);
      expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

      const sections = await page.locator(".policy-sections").innerText();
      if (initialContent === undefined) initialContent = sections;
      else expect(sections).toBe(initialContent);
      if (kind === "privacy") {
        await expect(page.locator('#responsibility a[href^="https://kau.edu.sa/"]')).toHaveAttribute("href", `https://kau.edu.sa/${locale}/page/privacy-policy`);
        await expect(page.locator('#data-requests a[href="mailto:contact@msrc2027.com"]')).toHaveAttribute("dir", "ltr");
        await expect(page.locator("#photography-publication")).toHaveAttribute("data-policy-section-status", "placeholder");
        await expect(page.locator("#providers-locations, #retention-details, #request-process")).toHaveCount(3);
      } else {
        await expect(page.locator(".policy-section")).toHaveCount(1);
        await expect(page.locator("#terms-wording")).toHaveAttribute("data-policy-section-status", "placeholder");
      }
      const missingAnchors = await page.locator(".policy-contents a").evaluateAll((links) => links
        .map((link) => decodeURIComponent(new URL((link as HTMLAnchorElement).href).hash.slice(1)))
        .filter((id) => !document.getElementById(id)));
      expect(missingAnchors).toEqual([]);
      await page.evaluate(() => document.fonts.ready);
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      await testInfo.attach(`${locale}-${kind}-${suffix ? "dated" : "current"}-accessibility`, {
        body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2), contentType: "application/json",
      });
      expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    }

    await testInfo.attach(`${locale}-${kind}-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });
}

test("policy versions survive keyboard language and section navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/en/privacy/${version}?view=review`);
  await page.keyboard.press("Tab");
  await expect(page.locator('a[href="#main-content"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const requestSection = page.locator('.policy-contents a[href="#data-requests"]');
  await requestSection.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#data-requests")).toBeFocused();
  await expect(page.locator("#data-requests")).toBeInViewport();
  await page.getByRole("link", { name: "View this page in Arabic" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/ar/privacy/${version}\\?view=review#data-requests$`));
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#data-requests")).toBeInViewport();
  await page.getByRole("link", { name: "View this page in English" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/en/privacy/${version}\\?view=review#data-requests$`));
  await expect(page.locator("#data-requests")).toBeInViewport();
  await page.locator(".policy-version-link").click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await page.locator(".policy-version-link").click();
  await expect(page).toHaveURL(new RegExp(`/en/privacy/${version}$`));
});

test("footer policy links resolve and unrecorded versions or locales return 404", async ({ page, request }) => {
  for (const locale of ["en", "ar"] as const) {
    for (const kind of ["privacy", "terms"] as const) {
      await page.goto(`/${locale}`);
      await page.getByRole("contentinfo").getByRole("link", { name: titles[locale][kind], exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/${kind}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(titles[locale][kind]);
      expect((await request.get(`/${locale}/${kind}/2027-approved`)).status()).toBe(404);
      expect((await request.get(`/fr/${kind}`)).status()).toBe(404);
      expect((await request.get(`/fr/${kind}/${version}`)).status()).toBe(404);
    }
  }
});
