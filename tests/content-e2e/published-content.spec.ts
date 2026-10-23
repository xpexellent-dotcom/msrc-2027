import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: public collection fallback or published programme and speakers`, async ({ page }, testInfo) => {
    const populated = testInfo.project.metadata.state === "published";
    const speaker = locale === "ar" ? "متحدث تجريبي أول" : "Synthetic Speaker One";
    const session = locale === "ar" ? "جلسة برنامج تجريبية" : "Synthetic Programme Session";
    await page.goto(`/${locale}/speakers`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    if (populated) {
      await expect(page.getByRole("heading", { name: speaker, exact: true })).toBeVisible();
      await expect(page.getByTestId("speakers-empty")).toHaveCount(0);
      await expect(page.locator(".conference-speaker-copy")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.locator(".conference-speaker-portrait img")).toHaveJSProperty("naturalWidth", 320);
      await page.getByRole("link", { name: speaker, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: speaker })).toBeVisible();
      await expect(page.getByRole("link", { name: session, exact: true })).toBeVisible();
    } else {
      await expect(page.getByTestId("speakers-empty")).toBeVisible();
      await expect(page.getByTestId("speaker-pending-preview")).toBeVisible();
      await expect(page.locator(".conference-speaker-card")).toHaveCount(0);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto(`/${locale}/program`);
    if (populated) {
      await expect(page.getByRole("link", { name: session, exact: true })).toBeVisible();
      await expect(page.locator("time[datetime='2027-01-27T09:15:00+03:00']")).toContainText(locale === "ar" ? "٠٩:١٥" : "09:15");
      await page.getByTestId("program-day-2027-01-29").click();
      await expect(page.getByRole("link", { name: locale === "ar" ? "يوم إضافي تجريبي" : "Synthetic Additional Day", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: session, exact: true })).toHaveCount(0);
      await page.getByTestId("program-day-day1").click();
      await page.getByRole("link", { name: session, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: session })).toBeVisible();
      await expect(page.getByRole("heading", { name: speaker, exact: true })).toBeVisible();
    } else await expect(page.getByTestId("program-empty")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-programme.png`), fullPage: true });
    await page.goto(`/${locale}`);
    if (populated) {
      await expect(page.getByTestId("home-published-speakers")).toContainText(speaker);
      await expect(page.getByTestId("home-published-programme")).toContainText(session);
      await expect(page.locator("#speakers .speaker-preview-card")).toHaveCount(0);
    } else {
      await expect(page.locator("#speakers .speaker-preview-card")).toHaveCount(4);
      await expect(page.getByTestId("home-published-speakers")).toHaveCount(0);
    }
  });

  test(`${locale}: public partners and team replace static collection only after publication`, async ({ page, request }, testInfo) => {
    const populated = testInfo.project.metadata.state === "published";
    const read = await request.get("/api/staff-portal/content?collection=speakers");
    const write = await request.post("/api/staff-portal/content", { data: { action: "publish" } });
    for (const response of [read, write]) {
      expect(response.status()).toBe(503);
      expect(await response.json()).toEqual({ state: "closed" });
      expect(response.headers()["set-cookie"]).toBeUndefined();
    }
    await page.goto(`/${locale}/sponsors`);
    if (populated) {
      await expect(page.getByTestId("published-partners")).toContainText(locale === "ar" ? "شريك تجريبي" : "Synthetic Partner");
      await expect(page.getByTestId("sponsor-tiers")).toHaveCount(0);
      await expect(page.locator(".public-content-partner")).toHaveAttribute("href", "https://example.org/partner");
      await expect(page.locator(".public-content-partner img")).toHaveJSProperty("naturalWidth", 320);
    } else {
      await expect(page.getByTestId("sponsor-tiers")).toBeVisible();
      await expect(page.getByTestId("published-partners")).toHaveCount(0);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-partners.png`), fullPage: true });
    await page.goto(`/${locale}/team`);
    if (populated) {
      await expect(page.getByTestId("published-team")).toContainText(locale === "ar" ? "عضو فريق تجريبي" : "Synthetic Team Member");
      await expect(page.locator(".team-leaders")).toHaveCount(0);
      await expect(page.locator(".team-founders")).toHaveCount(0);
    } else {
      await expect(page.locator(".team-leaders")).toBeVisible();
      await expect(page.getByTestId("published-team")).toHaveCount(0);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-team.png`), fullPage: true });
  });
}
