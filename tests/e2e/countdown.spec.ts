import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} homepage countdown follows Riyadh day boundaries and remains read-only`, async ({ page }) => {
    // Allow framework hydration to finish before pausing browser timers.
    await page.clock.install({ time: new Date("2027-01-26T20:00:00Z") });
    await page.goto(`/${locale}`);
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveAttribute("data-countdown", "before");
    await page.clock.pauseAt(new Date("2027-01-26T20:59:50Z"));
    await expect(countdown.locator(".countdown-number")).toHaveText(locale === "ar" ? "١" : "1");
    await expect(countdown.locator(".countdown-unit")).toHaveText(locale === "ar" ? "يوم" : "day");
    await expect(countdown).toContainText("Asia/Riyadh");
    await expect(countdown.locator("button, input, a, [aria-live]")).toHaveCount(0);
    expect(await countdown.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");

    await page.clock.runFor(10_000);
    await expect(countdown).toHaveAttribute("data-countdown", "day1");
    await expect(countdown).toContainText(locale === "ar" ? "اليوم الأول اليوم" : "Day 1 is today");
    await expect(countdown.locator(".countdown-number")).toHaveCount(0);

    await page.clock.fastForward(86_400_000);
    await expect(countdown).toHaveAttribute("data-countdown", "day2");
    await expect(countdown).toContainText(locale === "ar" ? "اليوم الثاني اليوم" : "Day 2 is today");

    await page.clock.fastForward(86_400_000);
    await expect(countdown).toHaveAttribute("data-countdown", "after");
    await expect(countdown).toContainText(locale === "ar" ? "مواعيد المؤتمر المؤكدة" : "Confirmed conference dates");
    await expect(countdown.locator(".countdown-number")).toHaveCount(0);
    await expect(page.locator("#event-details")).toContainText(locale === "ar" ? /٢٧.*٢٨ يناير ٢٠٢٧/ : /27.*28 January 2027/);
  });

  test(`${locale} confirmed dates remain readable without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto(`/${locale}`);
    const countdown = page.locator('[data-countdown="dates"]');
    await expect(countdown).toBeVisible();
    await expect(countdown).toContainText(locale === "ar" ? /٢٧.*٢٨ يناير ٢٠٢٧/ : /27.*28 January 2027/);
    await expect(countdown.locator(".countdown-number")).toHaveCount(0);
    for (const path of ["about", "dates-venue"]) {
      expect((await page.goto(`/${locale}/${path}`))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("main")).toContainText(locale === "ar" ? /٢٧.*يناير ٢٠٢٧/ : /27.*January 2027/);
    }
    await context.close();
  });
}
