import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: schedule filters persist in URL and parallel slots`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/program`);
    if (testInfo.project.metadata.state !== "published") {
      await expect(page.getByTestId("program-empty")).toBeVisible();
      await expect(page.getByTestId("program-time-slot")).toHaveCount(0);
      return;
    }
    await expect(page.getByTestId("program-time-slot").first().locator(".conference-session-row")).toHaveCount(2);
    await page.getByTestId("program-category").selectOption("panel");
    await expect(page).toHaveURL(/category=panel/);
    await page.getByTestId("program-room").selectOption(locale === "ar" ? "قاعة تجريبية ب" : "Synthetic room B");
    await expect(page.locator(".conference-session-row")).toHaveCount(1);
    await page.reload();
    await expect(page.locator(".conference-session-row")).toHaveCount(1);
    await expect(page.getByTestId("program-category")).toHaveValue("panel");
    await page.getByTestId("program-clear").click();
    await expect(page.locator(".conference-session-row")).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-schedule-grid.png`), fullPage: true });
  });

  test(`${locale}: native schedule links and GET filters work without JavaScript`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: testInfo.project.use.viewport });
    const page = await context.newPage();
    try {
      await page.goto(`/${locale}/program`);
      if (testInfo.project.metadata.state !== "published") {
        await expect(page.getByTestId("program-empty")).toBeVisible();
        return;
      }
      await page.getByTestId("program-day-day1").click();
      await expect(page).toHaveURL(/day=day1/);
      await expect(page.locator(".conference-session-row")).toHaveCount(2);
      await page.getByTestId("program-category").selectOption("talk");
      await page.getByTestId("program-room").selectOption(locale === "ar" ? "قاعة تجريبية" : "Synthetic room");
      await page.getByRole("button", { name: locale === "ar" ? "تطبيق المرشحات" : "Apply filters", exact: true }).click();
      await expect(page).toHaveURL(/category=talk/);
      await expect(page.locator(".conference-session-row")).toHaveCount(1);
      await expect(page.getByTestId("program-category")).toHaveValue("talk");
      await page.getByTestId("program-day-2027-01-29").click();
      await expect(page.getByTestId("program-empty")).toBeVisible();
      await expect(page).toHaveURL(/category=talk/);
    } finally { await context.close(); }
  });
}
