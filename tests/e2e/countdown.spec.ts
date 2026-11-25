import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  const dateRange = locale === "ar" ? "٧–٨ أبريل ٢٠٢٧" : "7–8 April 2027";
  test(`${locale} homepage clock counts to the Riyadh date boundary and remains read-only`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    // Allow framework hydration to finish before pausing browser timers.
    await page.clock.install({ time: new Date("2027-04-06T20:00:00Z") });
    await page.goto(`/${locale}`);
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveAttribute("data-countdown", "before");
    await page.clock.pauseAt(new Date("2027-04-06T20:59:50Z"));
    await expect(countdown.locator('[data-countdown-unit="days"]')).toHaveText(locale === "ar" ? "٠" : "0");
    await expect(countdown.locator('[data-countdown-unit="hours"]')).toHaveText(locale === "ar" ? "٠٠" : "00");
    await expect(countdown.locator('[data-countdown-unit="minutes"]')).toHaveText(locale === "ar" ? "٠٠" : "00");
    await expect(countdown.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "١٠" : "10");
    await expect(countdown).toContainText(dateRange);
    await expect(countdown.locator(".countdown-zone, .countdown-note")).toHaveCount(0);
    await expect(countdown.locator("button, input, a, [aria-live]:not([aria-live=off])")).toHaveCount(0);
    await expect(countdown.getByRole("timer")).toHaveAttribute("aria-live", "off");
    await expect(countdown.getByRole("timer")).toHaveAccessibleName(locale === "ar"
      ? "العدّ التنازلي حتى ٧ أبريل ٢٠٢٧ بتوقيت الرياض (Asia/Riyadh)"
      : "Countdown to 7 April 2027 in Riyadh (Asia/Riyadh)");
    expect(await countdown.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");

    await page.clock.runFor(9_000);
    await expect(countdown.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await page.clock.runFor(1_000);
    await expect(countdown).toHaveAttribute("data-countdown", "after");
    await expect(countdown).toContainText(dateRange);
    await expect(countdown.locator(".countdown-number")).toHaveCount(0);
    await page.clock.fastForward(2 * 86_400_000);
    await expect(countdown).toHaveAttribute("data-countdown", "after");
    await expect(page.locator(".hero-location")).toContainText(dateRange);
    expect(pageErrors).toEqual([]);
  });

  test(`${locale} clock refreshes after tab suspension and keeps complete values`, async ({ page }) => {
    // Start well before the pause: load and hydration run in real time, and a one-second
    // margin made pauseAt land "in the past" on a busy machine.
    await page.clock.install({ time: new Date("2027-04-05T19:58:28Z") });
    await page.goto(`/${locale}`);
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveAttribute("data-countdown", "before");
    await page.clock.pauseAt(new Date("2027-04-05T19:58:58Z"));
    await expect(countdown.locator('[data-countdown-unit="days"]')).toHaveText(locale === "ar" ? "١" : "1");
    await expect(countdown.locator('[data-countdown-unit="hours"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await expect(countdown.locator('[data-countdown-unit="minutes"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await expect(countdown.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "٠٢" : "02");
    await page.clock.setSystemTime(new Date("2027-04-07T21:00:00Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(countdown).toHaveAttribute("data-countdown", "after");
    await expect(countdown.locator("[data-countdown-unit]")).toHaveCount(0);
  });

  test(`${locale} confirmed conference dates remain readable without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    // The server-rendered date fallback does not depend on offscreen gallery image loading.
    await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
    const countdown = page.locator('[data-countdown="dates"]');
    await expect(countdown).toBeVisible();
    await expect(countdown).toContainText(dateRange);
    await expect(countdown.locator(".countdown-number")).toHaveCount(0);
    for (const path of ["participate", "program", "dates-venue"]) {
      expect((await page.goto(`/${locale}/${path}`))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "dates-venue") {
        // Venue focuses on four views and arrival information; the
        // confirmed calendar remains server-rendered on Program instead.
        await expect(page.getByRole("main").locator(".dates-calendar, time")).toHaveCount(0);
        await expect(page.locator(".dates-lead")).toContainText(dateRange);
        await expect(page.locator(".venue-photo-gallery img")).toHaveCount(4);
        await expect(page.locator(".venue-photo-gallery img").first()).toBeVisible();
      } else if (path === "program") {
        await expect(page.locator(".program-date-panel time")).toHaveText(locale === "ar"
          ? ["٧ أبريل ٢٠٢٧", "٨ أبريل ٢٠٢٧"] : ["7 April 2027", "8 April 2027"]);
      } else {
        await expect(page.getByRole("main")).toContainText(dateRange);
      }
    }
    await context.close();
  });
}
