import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { workshopParticipantCopy } from "../../src/features/workshops/participant-copy";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";
import type { Workshop, WorkshopBooking } from "../../src/features/workshops/participant-contracts";

const id = (n: number) => `eb000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const workshop: Workshop = { id: id(1), version: 1, titleEn: "Synthetic workshop", titleAr: "ورشة تجريبية", descriptionEn: "Synthetic practical workshop.", descriptionAr: "ورشة عملية تجريبية.", instructor: "Synthetic instructor", room: "Synthetic room", startAt: "2030-01-27T07:00:00Z", endAt: "2030-01-27T08:00:00Z", capacity: 2, remaining: 1, eligibilityEn: "Confirmed conference registration", eligibilityAr: "تسجيل مؤكد في المؤتمر", eligibilityRule: "confirmed_registration", priceMinor: 1200, currency: "SAR", bookingDeadline: "2030-01-26T07:00:00Z", transferBufferMinutes: 0, removed: false, published: true, ready: true };
const booking = (status: WorkshopBooking["status"]): WorkshopBooking => ({ id: id(2), workshopId: id(1), status, requestedAt: "2026-10-24T06:00:00Z", expiresAt: "2030-01-26T07:00:00Z", approvedAt: status === "approved" || status === "confirmed" ? "2026-10-24T07:00:00Z" : null, checkedInAt: null, completedAt: null, conflict: false, fullDiscount: false });

async function fixture(page: Page, options: { state?: string; status?: WorkshopBooking["status"]; full?: boolean; conflict?: boolean; retryFailure?: boolean } = {}) {
  let profile: unknown = { name: "Synthetic Participant", accountState: "verified" }, rows = options.status ? [booking(options.status)] : [], calls = 0;
  const actions: Record<string, unknown>[] = [];
  await page.route("**/api/participant-accounts", (route) => {
    const logout = route.request().method() === "POST";
    if (logout) profile = null;
    return route.fulfill({ json: { state: logout ? "signed_out" : "ready", profile, formToken: "synthetic-account-token" } });
  });
  await page.route("**/api/announcements?locale=*", (route) => route.fulfill({ json: { state: "ready", announcements: [], formToken: "synthetic-inbox-token" } }));
  await page.route("**/api/workshops?locale=*", async (route) => {
    if (options.state) return route.fulfill({ status: 503, json: { state: options.state } });
    let outcome: string | undefined;
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON(); actions.push(input); calls++;
      expect(input.formToken).toBe("synthetic-workshop-token");
      if (options.retryFailure && calls === 1) return route.fulfill({ status: 503, json: { state: "unavailable" } });
      outcome = options.conflict ? "conflict" : "updated";
      if (!options.conflict) {
        if (input.action === "request") rows = [booking("held")];
        if (input.action === "waitlist") rows = [booking("waitlisted")];
        if (input.action === "accept_offer") rows = [booking("held")];
        if (input.action === "cancel" || input.action === "decline_offer") rows = [booking("cancelled")];
        if (input.action === "mock_pay" || input.action === "redeem_discount") rows = [booking("confirmed")];
      }
    }
    return route.fulfill({ status: outcome === "conflict" ? 409 : 200, json: { state: "ready", workshops: [{ ...workshop, remaining: options.full ? 0 : 1 }], bookings: rows, mockPaymentEnabled: true, serverNow: "2026-10-24T07:00:00Z", formToken: "synthetic-workshop-token", ...(outcome ? { outcome } : {}) } });
  });
  return { actions };
}
for (const locale of ["en", "ar"] as const) {
  const copy = workshopParticipantCopy[locale];
  test(`${locale} published workshop seats remain anonymous and browseable without login`, async ({ page }, testInfo) => {
    await page.route("**/api/workshops/public", (route) => route.fulfill({ json: { state: "ready", workshops: [{ ...workshop, ready: false }] } }));
    await page.goto(`/${locale}/workshops`);
    const catalogue = page.locator("#workshop-catalogue");
    await expect(catalogue.getByRole("heading", { name: locale === "ar" ? workshop.titleAr! : workshop.titleEn!, exact: true })).toBeVisible();
    await expect(catalogue.getByTestId("workshop-public-remaining")).toContainText(locale === "ar" ? "١" : "1");
    await expect(catalogue).toContainText(workshop.instructor!); await expect(catalogue).toContainText(workshop.room!);
    await expect(catalogue.getByRole("button", { name: copy.request, exact: true })).toHaveCount(0);
    expect(await catalogue.innerText()).not.toContain("Synthetic Participant");
    await mkdir(".tools/workshops", { recursive: true }); await catalogue.screenshot({ path: `.tools/workshops/public-${locale}-${testInfo.project.name}.png` });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  test(`${locale} My Bookings requests a hold, preserves uncertain retry identity and cancels with accessible RTL`, async ({ page }, testInfo) => {
    const { actions } = await fixture(page, { retryFailure: true }); await page.goto(`/${locale}/my-msrc`);
    const area = page.getByTestId("workshop-bookings");
    await expect(area.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    await expect(area).toContainText(copy.empty);
    await area.getByRole("button", { name: copy.request, exact: true }).click();
    await expect(area.getByRole("status")).toHaveText(copy.unavailable);
    await area.getByRole("button", { name: copy.request, exact: true }).click();
    await expect(area.getByTestId("workshop-booking")).toContainText(copy.statuses.held);
    expect(actions[1].operationId).toBe(actions[0].operationId);
    expect(actions[0]).toMatchObject({ action: "request", workshopId: workshop.id });
    await expect(area.getByRole("button", { name: copy.mock_pay, exact: true })).toHaveCount(0);
    await expect(area.getByRole("button", { name: copy.redeem_discount, exact: true })).toHaveCount(0);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await mkdir(".tools/workshops", { recursive: true }); await area.screenshot({ path: `.tools/workshops/participant-${locale}-${testInfo.project.name}.png` });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await area.getByRole("button", { name: copy.cancel, exact: true }).click(); await expect(area.getByTestId("workshop-booking")).toContainText(copy.statuses.cancelled);
    await page.getByRole("button", { name: participantCopy[locale].signOut, exact: true }).click(); await expect(area).toHaveCount(0);
  });
  test(`${locale} waitlist, offer and approved mock payment remain distinct states`, async ({ page }) => {
    const { actions } = await fixture(page, { full: true }); await page.goto(`/${locale}/my-msrc`);
    const area = page.getByTestId("workshop-bookings");
    await area.getByRole("button", { name: copy.waitlist, exact: true }).click(); await expect(area).toContainText(copy.statuses.waitlisted);
    expect(actions[0]).toMatchObject({ action: "waitlist", workshopId: workshop.id });
    await page.unroute("**/api/workshops?locale=*"); await fixture(page, { status: "offered" }); await page.reload();
    await area.getByRole("button", { name: copy.accept_offer, exact: true }).click(); await expect(area).toContainText(copy.statuses.held);
    await page.unroute("**/api/workshops?locale=*"); await fixture(page, { status: "approved" }); await page.reload();
    await expect(area).toContainText(copy.mockNotice); await area.getByRole("button", { name: copy.mock_pay, exact: true }).click(); await expect(area).toContainText(copy.statuses.confirmed);
    await expect(area.getByRole("button", { name: copy.mock_pay, exact: true })).toHaveCount(0);
  });
  test(`${locale} overlap refusal and missing migration keep the participant signed in`, async ({ page }) => {
    await fixture(page, { status: "offered", conflict: true }); await page.goto(`/${locale}/my-msrc`);
    const area = page.getByTestId("workshop-bookings"); await area.getByRole("button", { name: copy.accept_offer, exact: true }).click();
    await expect(area.getByRole("status")).toHaveText(copy.conflictOutcome); await expect(area).toContainText(copy.statuses.offered);
    await page.unroute("**/api/workshops?locale=*"); await fixture(page, { state: "area-not-ready" }); await page.reload();
    await expect(area).toContainText(copy.notReady); await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
