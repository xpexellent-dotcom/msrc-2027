import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { announcementCopy } from "../../src/features/announcements/staff-copy";
import { staffCopy } from "../../src/features/staff-portal/copy";
import type { Announcement, AnnouncementPayload } from "../../src/features/announcements/contracts";
import type { Role } from "../../src/lib/permissions/contract";

const id = "39000000-0000-4000-8000-000000000003", at = "2026-10-23T06:00:00Z";
const base: Announcement = { id, editionKey: "synthetic-staff-2027", subjectEn: "Synthetic conference announcement", subjectAr: "إعلان مؤتمر تجريبي", bodyEn: "First English paragraph.\n\nSecond English paragraph.", bodyAr: "الفقرة العربية الأولى.\n\nالفقرة العربية الثانية.",
  segments: ["verified_participants", "registration_pending"], state: "draft", version: 1, createdAt: at, updatedAt: at, scheduledAt: null, sentAt: null, recipientCount: 0, sentCount: 0, failedCount: 0, lastError: null };
async function fixture(page: Page, options: { role?: Role; missing?: boolean; conflict?: boolean; failFirstSend?: boolean; scheduled?: boolean; staleAuthor?: boolean } = {}) {
  const roles: Role[] = [options.role ?? "superAdmin"], actions: AnnouncementPayload[] = [];
  let row = { ...base, ...(options.scheduled ? { state: "scheduled" as const, scheduledAt: "2099-01-27T07:00:00Z" } : {}), ...(options.staleAuthor ? { lastError: "author_no_longer_authorized" } : {}) }, sends = 0;
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname !== "/api/staff-portal/announcements") return route.fulfill({ json: { state: "authenticated", profile: { actorId: id, name: "Synthetic Super Admin", roles }, formToken: "synthetic-staff-token" } });
    if (options.missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken: "synthetic-announcement-token" } });
    const extra = { formToken: "synthetic-announcement-token" };
    if (request.method() === "GET") return route.fulfill({ json: { state: "ready", announcements: [row], segments: ["verified_participants", "registration_pending", "abstract_submitters"], ...extra } });
    const payload = request.postDataJSON() as AnnouncementPayload; actions.push(payload);
    if (payload.action === "render") return route.fulfill({ json: { state: "ready", rendered: { subject: payload.fields.subjectEn + " | " + payload.fields.subjectAr, text: payload.fields.bodyEn + "\n\n---\n\n" + payload.fields.bodyAr, html: '<html lang="en"><body>synthetic preview</body></html>' }, ...extra } });
    if (payload.action === "preview") return route.fulfill({ json: { state: "ready", preview: { previewToken: "synthetic-preview-token", total: 3, segments: [{ segment: "verified_participants", count: 3 }, { segment: "registration_pending", count: 2 }], samples: ["a***@e***", "a***@e***"] }, ...extra } });
    if (payload.action === "save") row = { ...row, ...payload.input, version: row.version + 1, state: "draft", scheduledAt: null, lastError: null };
    if (payload.action === "send") {
      sends++;
      if (options.conflict) return route.fulfill({ status: 409, json: { state: "conflict", ...extra } });
      if (options.failFirstSend && sends === 1) return route.fulfill({ status: 503, json: { state: "unavailable", ...extra } });
      row = { ...row, state: payload.scheduledAt ? "scheduled" : "sending", scheduledAt: payload.scheduledAt, sentAt: payload.scheduledAt ? null : at, recipientCount: payload.scheduledAt ? 0 : 3, version: row.version + 1 };
    }
    if (payload.action === "cancel") row = { ...row, state: "cancelled", version: row.version + 1 };
    return route.fulfill({ json: { state: "updated", announcement: row, ...extra } });
  });
  return { actions };
}
async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}
for (const locale of ["en", "ar"] as const) {
  const text = announcementCopy[locale], copy = staffCopy[locale];
  test(`${locale} Super Admin composes, previews exact deduplicated count and queues an announcement with axe`, async ({ page }, testInfo) => {
    const { actions } = await fixture(page); await page.goto(`/${locale}/staff/announcements`);
    await expect(page.getByRole("heading", { level: 1, name: copy.areas.announcements })).toBeVisible();
    await expect(page.getByText(text.audienceHint, { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: text.segments.verified_participants, exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: text.segments.active_staff, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: new RegExp(`^${text.edit}`) }).click();
    await expect(page.locator("#announcement-body-ar")).toHaveAttribute("dir", "rtl");
    await page.locator("#announcement-body-en").fill("Updated English paragraph.\n\nAn English translation pair.");
    await expect(page.getByRole("button", { name: text.preview, exact: true })).toBeDisabled();
    await expect(page.getByTestId("announcement-email-preview")).toContainText("Updated English paragraph.");
    await page.getByRole("button", { name: text.save, exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: text.saved })).toBeVisible();
    await axe(page); await mkdir(".tools/announcements", { recursive: true }); await page.screenshot({ path: `.tools/announcements/staff-${locale}-${testInfo.project.name}-compose.png`, fullPage: true });
    await page.getByRole("button", { name: text.preview, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: text.confirmTitle }); await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("announcement-recipient-total")).toHaveText(locale === "ar" ? "٣" : "3");
    await axe(page); await page.screenshot({ path: `.tools/announcements/staff-${locale}-${testInfo.project.name}-confirm.png`, fullPage: true }); await dialog.getByRole("button", { name: text.send, exact: true }).click();
    await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: text.queued })).toBeVisible();
    const sent = actions.filter((action) => action.action === "send"); expect(sent).toHaveLength(1); expect(sent[0]).toMatchObject({ previewToken: "synthetic-preview-token", version: 2, confirmed: true, scheduledAt: null });
    expect((sent[0] as { operationId: string }).operationId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
  test(`${locale} schedules in Riyadh, reopens a scheduled draft and cancels with explicit confirmation`, async ({ page }) => {
    const { actions } = await fixture(page); await page.goto(`/${locale}/staff/announcements`);
    await page.getByRole("button", { name: new RegExp(`^${text.edit}`) }).click();
    await page.locator("#announcement-schedule").fill("2099-01-27T10:00"); await page.getByRole("button", { name: text.preview, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: text.scheduleSend, exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: text.scheduled })).toBeVisible();
    expect(actions.find((action) => action.action === "send")).toMatchObject({ scheduledAt: "2099-01-27T07:00:00.000Z" });
    await expect(page.getByRole("button", { name: text.preview, exact: true })).toBeDisabled();
    await page.getByRole("button", { name: text.save, exact: true }).click(); await expect(page.getByRole("button", { name: text.preview, exact: true })).toBeEnabled();
    await expect(page.locator("#announcement-schedule")).toHaveValue("");
    await page.getByRole("button", { name: text.cancel, exact: true }).click();
    await expect(page.getByRole("dialog", { name: text.confirmCancel })).toBeVisible(); await axe(page);
    await page.getByRole("dialog").getByRole("button", { name: text.cancel, exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: text.cancelled })).toBeVisible();
  });
  test(`${locale} an uncertain send retry preserves operation id and preview token`, async ({ page }) => {
    const { actions } = await fixture(page, { failFirstSend: true }); await page.goto(`/${locale}/staff/announcements`);
    await page.getByRole("button", { name: new RegExp(`^${text.edit}`) }).click(); await page.getByRole("button", { name: text.preview, exact: true }).click();
    const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: text.send, exact: true }).click(); await expect(dialog.getByRole("alert")).toHaveText(text.errors.unavailable);
    await dialog.getByRole("button", { name: text.send, exact: true }).click(); await expect(dialog).toHaveCount(0);
    const sends = actions.filter((action) => action.action === "send"); expect(sends).toHaveLength(2); expect(sends[1]).toEqual(sends[0]);
  });
  test(`${locale} stale recipient preview requires a new review without leaving the staff console`, async ({ page }) => {
    await fixture(page, { conflict: true }); await page.goto(`/${locale}/staff/announcements`);
    await page.getByRole("button", { name: new RegExp(`^${text.edit}`) }).click(); await page.getByRole("button", { name: text.preview, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: text.send, exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".staff-announcements").getByRole("alert")).toHaveText(text.errors.conflict); await expect(page.getByRole("button", { name: copy.signOut })).toBeVisible();
  });
  test(`${locale} missing announcement migration shows an area message and keeps sign-in`, async ({ page }) => {
    await fixture(page, { missing: true }); await page.goto(`/${locale}/staff/announcements`);
    await expect(page.locator(".staff-announcements").getByRole("alert")).toHaveText(text.errors["area-not-ready"]); await expect(page.getByRole("button", { name: copy.signOut })).toBeVisible(); await axe(page);
  });
  test(`${locale} other staff cannot see the tab or compose area`, async ({ page }) => {
    const { actions } = await fixture(page, { role: "contentMediaEditor" }); await page.goto(`/${locale}/staff/announcements`);
    await expect(page.getByRole("navigation", { name: copy.menu })).toBeVisible(); await expect(page.getByRole("navigation").getByRole("link", { name: copy.areas.announcements, exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: text.compose })).toHaveCount(0); expect(actions).toHaveLength(0);
  });
}
