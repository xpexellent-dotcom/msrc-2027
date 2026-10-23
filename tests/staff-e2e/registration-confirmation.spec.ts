import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { confirmationCopy } from "../../src/features/staff-portal/confirmation-copy";
import { consoleCopy } from "../../src/features/staff-portal/console-copy";
import { staffCopy } from "../../src/features/staff-portal/copy";
import type { StaffPayload, StaffRegistrationRequest, StaffResponse } from "../../src/features/staff-portal/ui-contract";

const id = "59000000-0000-4000-8000-000000000001", token = "a".repeat(64);
async function fixture(page: Page, options: { staff?: boolean; missing?: boolean; conflict?: boolean; notDue?: boolean } = {}) {
  const actions: StaffPayload[] = [], filters: string[] = [];
  let opened = false;
  const requests: StaffRegistrationRequest[] = [
    { id, actorId: id, name: "Synthetic approved attendee", email: "approved@example.invalid", status: "approved", priority: false, createdAt: "2028-03-01T00:00:00Z", decidedAt: "2028-03-02T00:00:00Z", offerExpiresAt: null, identityMasked: null, ticketStatus: "issued", confirmation: null },
    { id: id.replace(/1$/, "2"), actorId: id.replace(/1$/, "2"), name: "Synthetic confirmed attendee", email: "confirmed@example.invalid", status: "confirmed", priority: false, createdAt: "2028-03-01T00:00:00Z", decidedAt: "2028-03-02T00:00:00Z", offerExpiresAt: null, identityMasked: null, ticketStatus: "issued", confirmation: { state: "confirmed", deadline: "2028-03-10T12:00:00Z" } },
    { id: id.replace(/1$/, "3"), actorId: id.replace(/1$/, "3"), name: "Synthetic released attendee", email: "released@example.invalid", status: "cancelled", priority: false, createdAt: "2028-03-01T00:00:00Z", decidedAt: "2028-03-02T00:00:00Z", offerExpiresAt: null, identityMasked: null, ticketStatus: "revoked", confirmation: { state: "released", deadline: "2028-03-10T12:00:00Z" } },
  ];
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), area = new URL(request.url()).searchParams.get("area");
    const base: StaffResponse = { state: "authenticated", formToken: "synthetic-confirmation-token", profile: { actorId: id, name: "Synthetic Staff", roles: [options.staff ? "registrationWorkshopAdministrator" : "superAdmin"] } };
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload; actions.push(payload);
      if (payload.action === "registration-confirmation-start") {
        if (options.conflict) return route.fulfill({ status: 409, json: { ...base, state: "operation-conflict" } });
        opened = true; requests[0].confirmation = { state: "awaiting", deadline: "2028-03-10T12:00:00Z" };
        return route.fulfill({ json: { ...base, state: "updated", confirmationOpened: 1 } });
      }
      return route.fulfill({ json: base });
    }
    if (area === "registration-confirmation-preview") return options.missing ? route.fulfill({ status: 503, json: { state: "area-not-ready" } })
      : route.fulfill({ json: { ...base, confirmationPreview: { eligibleCount: opened ? 0 : 1, opensAt: "2028-03-08T12:00:00Z", responseHours: 48, settingsReady: true, canStart: !opened && !options.notDue, previewToken: token } } });
    if (area === "registration") {
      const filter = new URL(request.url()).searchParams.get("status") ?? "all"; filters.push(filter);
      const shown = filter.startsWith("confirmation_") ? requests.filter((row) => row.confirmation?.state === filter.slice("confirmation_".length)) : requests;
      return route.fulfill({ json: { ...base, registration: { requests: shown, counts: { pending: 0, approved: 2, waitlisted: 0, offered: 0, expired: 0, capacity: 3, remaining: 1, confirmationAwaiting: opened ? 1 : 0, confirmationConfirmed: 1, confirmationReleased: 1 } } } });
    }
    return route.fulfill({ json: base });
  });
  return { actions, filters };
}
async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = confirmationCopy[locale], staff = staffCopy[locale];
  test(`${locale} owner reviews recipient count, explicitly selects policy and opens confirmation windows`, async ({ page }, testInfo) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/staff/registration`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(staff.areas.registration);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.getByTestId("confirmation-start").click();
    const dialog = page.getByRole("dialog", { name: copy.review });
    await expect(dialog).toBeVisible(); await expect(dialog).toContainText(copy.recipients(1)); await expect(dialog).toContainText(copy.duration(48));
    await expect(dialog.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: copy.confirm })).toBeDisabled();
    await mkdir(".tools/night3-confirm-seat", { recursive: true });
    await page.screenshot({ path: `.tools/night3-confirm-seat/staff-${locale}-dialog-${testInfo.project.name}.png`, fullPage: true });
    await axe(page);
    await dialog.getByRole("button", { name: copy.cancel }).click();
    await expect(page.getByTestId("confirmation-start")).toBeFocused();
    expect(mock.actions.filter((row) => row.action === "registration-confirmation-start")).toHaveLength(0);
    await page.getByTestId("confirmation-start").click();
    await dialog.getByRole("radio", { name: locale === "en" ? copy.release : copy.keep, exact: true }).check();
    await dialog.getByRole("button", { name: copy.confirm }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".staff-feedback")).toContainText(copy.done(1));
    expect(mock.actions.find((row) => row.action === "registration-confirmation-start")).toMatchObject({ nonresponsePolicy: locale === "en" ? "release_unconfirmed" : "keep_unconfirmed", previewToken: token, operationId: expect.any(String) });
    for (const [filter, label] of Object.entries(copy.filters)) {
      await page.getByRole("combobox", { name: consoleCopy[locale].registration.filter, exact: true }).selectOption(filter);
      await expect(page.getByTestId("queue-row")).toHaveCount(1);
      await expect.poll(() => mock.filters.at(-1)).toBe(filter);
      await expect(page.locator(".staff-queue-filters select")).toHaveValue(filter);
      expect(label).toBeTruthy();
    }
    await expect(page.getByTestId("queue-ticket")).toHaveText(consoleCopy[locale].registration.ticketStatuses.revoked);
    await page.screenshot({ path: `.tools/night3-confirm-seat/staff-${locale}-queue-${testInfo.project.name}.png`, fullPage: true });
    await axe(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
  test(`${locale} stale confirmation preview requires review and never silently repeats`, async ({ page }) => {
    const mock = await fixture(page, { conflict: true }); await page.goto(`/${locale}/staff/registration`);
    await page.getByTestId("confirmation-start").click(); await page.getByRole("radio", { name: copy.release, exact: true }).check();
    await page.getByRole("button", { name: copy.confirm, exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(page.getByText(copy.conflict, { exact: true })).toBeVisible();
    expect(mock.actions.filter((row) => row.action === "registration-confirmation-start")).toHaveLength(1);
    await page.getByTestId("confirmation-start").click(); await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await axe(page);
  });
  test(`${locale} missing confirmation RPC preserves login and regular staff cannot start a round`, async ({ page }) => {
    await fixture(page, { missing: true }); await page.goto(`/${locale}/staff/registration`);
    await page.getByTestId("confirmation-start").click(); await expect(page.getByText(staff.states["area-not-ready"], { exact: true })).toBeVisible();
    await expect(page.getByTestId("staff-name")).toBeVisible(); await expect(page.getByRole("dialog")).toHaveCount(0); await axe(page);
    await page.unroute("**/api/staff-portal**"); await fixture(page, { staff: true }); await page.reload();
    await expect(page.getByTestId("queue-row")).toHaveCount(3); await expect(page.getByTestId("confirmation-start")).toHaveCount(0); await axe(page);
  });
  test(`${locale} confirmation cannot start before its configured opening`, async ({ page }) => {
    const mock = await fixture(page, { notDue: true }); await page.goto(`/${locale}/staff/registration`);
    await page.getByTestId("confirmation-start").click(); const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(copy.notDue); await expect(dialog.getByRole("button", { name: copy.confirm })).toBeDisabled();
    await expect(dialog.getByRole("radio").first()).toBeDisabled(); await axe(page);
    expect(mock.actions.filter((row) => row.action === "registration-confirmation-start")).toHaveLength(0);
  });
}
