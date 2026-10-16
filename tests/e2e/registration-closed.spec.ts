import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} registration preserves closed page and private API without the server flag`, async ({ page, request }) => {
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("journey-closed")).toBeVisible();
    await expect(page.getByTestId("registration-request")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    const response = await request.post("/api/workflows/registration", { data: { documentNumber: "FAKE0001", termsAccepted: true } });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "WORKFLOW_CLOSED", workflow: "registration" } });
  });
}
