import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} countdown updates after time passes and a suspended tab returns`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2027-01-25T19:58:28Z") });
    await page.goto(`/${locale}`);
    const clock = page.locator("[data-countdown]");
    await expect(clock).toHaveAttribute("data-countdown", "before");
    await page.clock.pauseAt(new Date("2027-01-25T19:58:58Z"));
    await expect(clock.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "٠٢" : "02");
    await page.clock.runFor(1_000);
    await expect(clock.locator('[data-countdown-unit="seconds"]')).toHaveText(locale === "ar" ? "٠١" : "01");
    await page.clock.setSystemTime(new Date("2027-01-27T21:00:00Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(clock).toHaveAttribute("data-countdown", "day2");
    expect(errors).toEqual([]);
  });

  test(`${locale} slow connection keeps navigation usable and offline recovery leaves a readable page`, async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Throughput and latency are synthesized through Chromium CDP; phone networking remains manual.");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("crash", () => errors.push("Page crashed"));
    const session = await context.newCDPSession(page);
    try {
      // A 400ms RTT and 50KB/s down approximates a constrained 3G connection.
      await session.send("Network.enable");
      await session.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 25 * 1024 });
      await page.goto(`/${locale}/program`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.getByTestId("program-day-day2")).toBeEnabled();
      await page.getByTestId("program-day-day2").click();
      await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
      await session.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await context.setOffline(true);
      await page.getByTestId("program-day-day1").click();
      await expect(page.getByTestId("program-day-day1")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main h1")).toBeVisible();
      await context.setOffline(false);
      await page.reload();
      await expect(page.getByTestId("program-day-day1")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main h1")).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await context.setOffline(false);
      await session.detach();
    }
  });
}
