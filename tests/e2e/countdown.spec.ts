import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} homepage clock counts to the Riyadh date boundary and remains read-only`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    // Allow framework hydration to finish before pausing browser timers.
    await page.clock.install({ time: new Date("2027-01-26T20:00:00Z") });
    await page.goto(`/${locale}`);
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveAttribute("data-countdown", "before");
    await page.clock.pauseAt(new Date("2027-01-26T20:59:50Z"));
    await expect(countdown.locator('[data-countdown-unit="days"]')).toHaveText(locale === "ar" ? "٠" : "0");
    await expect(countdown.locator('[data-countdown-unit="hours"]')).toHaveText(locale === "ar" ? "٠٠" : "00");
    await expect(countdown.locator('[data-countdown-unit="minutes"]')).toHaveText(locale === "ar" ? "٠٠" : "00");
    await expect(countdown.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "١٠" : "10");
    await expect(countdown).toContainText(locale === "ar" ? /٢٧.*٢٨ يناير ٢٠٢٧/ : /27.*28 January 2027/);
    await expect(countdown.locator(".countdown-zone, .countdown-note")).toHaveCount(0);
    await expect(countdown.locator("button, input, a, [aria-live]:not([aria-live=off])")).toHaveCount(0);
    await expect(countdown.getByRole("timer")).toHaveAttribute("aria-live", "off");
    await expect(countdown.getByRole("timer")).toHaveAccessibleName(locale === "ar"
      ? "الوقت المتبقي حتى بداية التاريخ المؤكد 2027-01-27 عند ٠٠:٠٠ بتوقيت الرياض (Asia/Riyadh)، وليس موعد افتتاح المؤتمر"
      : "Time until the confirmed date 2027-01-27 begins at 00:00 in Riyadh (Asia/Riyadh), not the conference opening time");
    expect(await countdown.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");

    await page.clock.runFor(9_000);
    await expect(countdown.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await page.clock.runFor(1_000);
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
    expect(pageErrors).toEqual([]);
  });

  test(`${locale} clock refreshes after tab suspension and keeps complete values`, async ({ page }) => {
    await page.clock.install({ time: new Date("2027-01-25T19:58:57Z") });
    await page.goto(`/${locale}`);
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveAttribute("data-countdown", "before");
    await page.clock.pauseAt(new Date("2027-01-25T19:58:58Z"));
    await expect(countdown.locator('[data-countdown-unit="days"]')).toHaveText(locale === "ar" ? "١" : "1");
    await expect(countdown.locator('[data-countdown-unit="hours"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await expect(countdown.locator('[data-countdown-unit="minutes"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await expect(countdown.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "٠٢" : "02");
    await page.clock.setSystemTime(new Date("2027-01-27T21:00:00Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(countdown).toHaveAttribute("data-countdown", "day2");
    await expect(countdown.locator("[data-countdown-unit]")).toHaveCount(0);
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
