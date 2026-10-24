import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { teamCommittees } from "../../src/content/team";

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
      await expect(page).toHaveTitle(`${speaker} | MSRC 2027`);
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
      await expect(page.locator(".conference-session-row").filter({ has: page.getByRole("link", { name: session, exact: true }) }).locator("time[datetime='2027-01-27T09:15:00+03:00']")).toContainText(locale === "ar" ? "٠٩:١٥" : "09:15");
      await page.getByTestId("program-day-2027-01-29").click();
      await expect(page.getByRole("link", { name: locale === "ar" ? "يوم إضافي تجريبي" : "Synthetic Additional Day", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: session, exact: true })).toHaveCount(0);
      await page.getByTestId("program-day-day1").click();
      await page.getByRole("link", { name: session, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: session })).toBeVisible();
      await expect(page).toHaveTitle(`${session} | MSRC 2027`);
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
    // The import retains the current roster hierarchy, ordering, shared rows and member boxes.
    const orderedPeople = [...teamCommittees.map((committee) => committee.lead), ...teamCommittees.flatMap((committee) =>
      [...committee.leads].sort((a, b) => Number(!a.photo) - Number(!b.photo) || a.name[locale].localeCompare(b.name[locale], locale))
        .flatMap((person) => [person, ...[...person.coLeads ?? []].sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale))]))];
    await expect(page.getByTestId("published-team")).toHaveCount(0);
    await expect(page.locator(".team-name")).toHaveText(orderedPeople.map((person) => person.name[locale]));
    await expect(page.locator(".team-role")).toHaveText(orderedPeople.map((person) => person.role[locale]));
    await expect(page.locator(".team-description")).toHaveText(orderedPeople.filter((person) => person.description).map((person) => person.description![locale]));
    await expect(page.locator(".team-leader")).toHaveCount(teamCommittees.length);
    await expect(page.locator(".team-founders")).toBeVisible();
    await expect(page.locator(".team-row")).toHaveCount(teamCommittees.reduce((count, committee) => count + committee.leads.length, 0));
    await expect(page.locator(".team-members li")).toHaveText(teamCommittees.flatMap((committee) => committee.leads.flatMap((person) => (person.members ?? []).map((member) => member[locale]))));
    const portraits = page.locator(".team-photo img");
    await expect(portraits).toHaveCount(orderedPeople.filter((person) => person.photo).length);
    if (populated) for (const portrait of await portraits.all()) {
      await expect(portrait).toHaveAttribute("src", /\/storage\/v1\/object\/public\/msrc-published-media\//);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-team.png`), fullPage: true });
  });
}
