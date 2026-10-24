import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} hackathon working overview keeps pending logistics and entry closed`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/hackathon`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".participation-track h3")).toHaveText(locale === "en" ? ["Evidence to Impact", "Research Reimagined"] : ["من الدليل إلى الأثر", "البحث برؤية جديدة"]);
    for (const title of await page.locator(".participation-track h3").all()) {
      await expect(title).toHaveAttribute("lang", locale); await expect(title).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    }
    await expect(page.getByTestId("journey-closed")).toContainText(locale === "en" ? "to be confirmed" : "بانتظار التأكيد");
    await expect(page.locator(".participation-good-to-know")).toContainText(locale === "en" ? "Hackathon entry is free" : "المشاركة في الهاكاثون مجانية");
    await expect(page.locator(".participation-good-to-know")).toContainText(locale === "en" ? "does not grant conference admission" : "لا يمنح دخول المؤتمر");
    await expect(page.locator(".participation-benefits")).toContainText(locale === "en" ? "two independent blinded reviews" : "مراجعتان مستقلتان دون كشف الهوية");
    await expect(page.locator("main form, main input, main textarea")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
