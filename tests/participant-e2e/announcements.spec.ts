import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { participantAnnouncementsCopy } from "../../src/features/announcements/participant-copy";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";

const rows = [
  { id: "ac000000-0000-4000-8000-000000000001", subjectEn: "Synthetic conference announcement", subjectAr: "إعلان تجريبي للمؤتمر",
    bodyEn: "A synthetic first paragraph.\n\nA synthetic second paragraph. <script>plain text</script>", bodyAr: "فقرة أولى تجريبية.\n\nفقرة ثانية تجريبية.", publishedAt: "2026-10-23T12:00:00Z", readAt: null as string | null },
  { id: "ac000000-0000-4000-8000-000000000002", subjectEn: "Earlier synthetic message", subjectAr: "رسالة تجريبية سابقة",
    bodyEn: "An earlier synthetic message.", bodyAr: "رسالة تجريبية سابقة.", publishedAt: "2026-10-22T12:00:00Z", readAt: "2026-10-22T14:00:00Z" as string | null },
];
async function fixture(page: Page, options: { state?: string; empty?: boolean } = {}) {
  let profile: unknown = { name: "Synthetic Participant", accountState: "verified" }, fail = false, readCalls = 0;
  const announcements = structuredClone(options.empty ? [] : rows);
  await page.route("**/api/participant-accounts", (route) => {
    const logout = route.request().method() === "POST";
    if (logout) profile = null;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: logout ? "signed_out" : "ready", profile, formToken: "synthetic-account-token" }) });
  });
  await page.route("**/api/announcements?locale=*", async (route) => {
    let state = options.state ?? "ready";
    if (route.request().method() === "POST") {
      readCalls += 1;
      const body = route.request().postDataJSON(); expect(Object.keys(body).sort()).toEqual(["announcementId", "formToken"]);
      expect(body.formToken).toBe("synthetic-inbox-token");
      if (fail) state = "unavailable";
      else { const row = announcements.find((item) => item.id === body.announcementId); if (row) row.readAt = "2026-10-23T14:00:00Z"; }
    }
    await route.fulfill({ status: state === "ready" ? 200 : 503, contentType: "application/json", body: JSON.stringify(state === "ready" ? { state, announcements, formToken: "synthetic-inbox-token" } : { state }) });
  });
  return { fail: (value: boolean) => { fail = value; }, readCalls: () => readCalls };
}
for (const locale of ["en", "ar"] as const) {
  const copy = participantAnnouncementsCopy[locale];
  test(`${locale} own announcement inbox supports bilingual reading, safe text, read state and axe`, async ({ page }, testInfo) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/my-msrc`);
    const inbox = page.getByTestId("participant-announcements");
    await expect(inbox.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    const messages = inbox.locator("article"); await expect(messages).toHaveCount(2);
    await expect(messages.first().getByRole("heading", { level: 3 })).toHaveText(locale === "ar" ? rows[0].subjectAr : rows[0].subjectEn);
    await expect(messages.first().locator("time")).toHaveAttribute("datetime", rows[0].publishedAt);
    await expect(messages.first().locator(".participant-announcement-read")).toHaveText(copy.unread);
    await expect(inbox.locator("script, img")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const summary = messages.first().locator("summary"); await summary.focus(); await page.keyboard.press("Enter");
    await expect(messages.first().locator("details")).toHaveAttribute("open", "");
    await mkdir(".tools/announcements", { recursive: true });
    await inbox.screenshot({ path: `.tools/announcements/participant-${locale}-${testInfo.project.name}.png` });
    await expect(messages.first().getByRole("heading", { level: 4 })).toHaveText(locale === "ar" ? rows[0].subjectEn : rows[0].subjectAr);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    mock.fail(true); await messages.first().getByRole("button", { name: copy.markRead, exact: true }).click();
    await expect(inbox.getByRole("status")).toHaveText(copy.readFailure);
    await expect(messages.first().locator(".participant-announcement-read")).toHaveText(copy.unread);
    mock.fail(false); await messages.first().getByRole("button", { name: copy.markRead, exact: true }).click();
    await expect(messages.first().locator(".participant-announcement-read")).toHaveText(copy.read);
    await expect(inbox.getByRole("status")).toHaveText(copy.readSaved);
    expect(mock.readCalls()).toBe(2);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: participantCopy[locale].signOut, exact: true }).click();
    await expect(inbox).toHaveCount(0); await expect(page.getByTestId("participant-signin-required")).toBeVisible();
  });
  test(`${locale} empty inbox and pending migration keep account available with axe`, async ({ page }) => {
    await fixture(page, { state: "area-not-ready" });
    await page.goto(`/${locale}/my-msrc`);
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await expect(page.getByTestId("participant-announcements").getByRole("status")).toHaveText(copy.notReady);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.unroute("**/api/announcements?locale=*"); await fixture(page, { empty: true });
    await page.getByRole("button", { name: copy.retry, exact: true }).click();
    await expect(page.getByTestId("participant-announcements")).toContainText(copy.empty);
    await expect(page.getByTestId("participant-profile-name")).toBeVisible();
  });
}
