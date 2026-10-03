import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// BL-PUB-06 / BL-PUB-08 / SUP-01 / PRV-01 / PAY-08: closed draft scaffolds. They say they are not
// in effect, collect nothing, print no routing address and state no unapproved controller or price.
const pages = {
  en: {
    contact: { title: "Contact | MSRC 2027", heading: "Contact us.", status: "Form not open yet", footer: "Contact" },
    privacy: { title: "Privacy | MSRC 2027", heading: "Your data at MSRC 2027.", status: "Draft, not in effect", footer: "Privacy" },
    terms: { title: "Terms | MSRC 2027", heading: "Terms for MSRC 2027.", status: "Draft, not in effect", footer: "Terms" },
  },
  ar: {
    contact: { title: "التواصل | MSRC 2027", heading: "تواصل معنا.", status: "النموذج غير متاح بعد", footer: "التواصل" },
    privacy: { title: "الخصوصية | MSRC 2027", heading: "بياناتك في المؤتمر.", status: "مسودة غير سارية", footer: "الخصوصية" },
    terms: { title: "الشروط | MSRC 2027", heading: "شروط المؤتمر.", status: "مسودة غير سارية", footer: "الشروط" },
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const name of ["contact", "privacy", "terms"] as const) {
    const copy = pages[locale][name];
    test(`${locale} ${name} is an accessible closed draft reachable from the footer`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      const writes: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });

      await page.goto(`/${locale}`);
      const footerLink = page.getByRole("contentinfo").getByRole("link", { name: copy.footer, exact: true });
      await expect(footerLink).toHaveAttribute("href", `/${locale}/${name}`);
      await footerLink.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/${name}$`));

      await expect(page).toHaveTitle(copy.title);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.heading);
      await expect(page.getByRole("note")).toContainText(copy.status);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.locator("main").locator("form, input, textarea, select, iframe")).toHaveCount(0);
      await expect(page.getByRole("main")).not.toContainText(/@|MSRC27kau|SAR|ريال|\d+\s?%/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.msrc2027.com/${locale}/${name}`);

      await page.evaluate(() => document.fonts.ready);
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
      const assertReadable = async () => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth))
          .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
      };
      await assertReadable();
      await testInfo.attach(`${locale}-${name}-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      if (testInfo.project.name === "chromium-mobile") {
        await page.setViewportSize({ width: 320, height: 850 });
        await assertReadable();
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await assertReadable();
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });

      if (name !== "contact") {
        const contents = page.getByRole("navigation", { name: locale === "en" ? "On this page" : "في هذه الصفحة" });
        const first = contents.getByRole("link").first();
        const target = (await first.getAttribute("href"))!;
        await first.click();
        await expect(page.locator(target)).toBeInViewport();
      } else {
        await page.getByRole("main").getByRole("link", { name: locale === "en" ? "Read the draft privacy notice" : "اطّلع على مسودة إشعار الخصوصية" }).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/privacy$`));
      }
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
    });
  }
}
