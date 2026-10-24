import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { workshopStaffCopy } from "../../src/features/workshops/staff-copy";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { emptyWorkshopFields, type StaffWorkshop, type WorkshopBooking, type WorkshopStaffPayload, type WorkshopStaffView } from "../../src/features/workshops/staff-contract";
import type { Role } from "../../src/lib/permissions/contract";

const id = (n: number) => `eb200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const at = "2026-10-24T07:00:00Z";
const workshop: StaffWorkshop = { ...emptyWorkshopFields(), id: id(1), version: 1, titleEn: "Synthetic workshop", titleAr: "ورشة تجريبية", descriptionEn: "Synthetic workshop description", descriptionAr: "وصف ورشة تجريبي", instructor: "Synthetic instructor", room: "Synthetic room", startAt: "2030-01-27T07:00:00Z", endAt: "2030-01-27T08:00:00Z", bookingDeadline: "2030-01-26T07:00:00Z", capacity: 3, priceMinor: 0, currency: "SAR", transferBufferMinutes: 0, eligibilityEn: "Confirmed registration", eligibilityAr: "تسجيل مؤكد", eligibilityRule: "confirmed_registration", published: true, remaining: 1, removed: false, ready: true, canManage: true, canCheckin: true, canComplete: true };
const booking: WorkshopBooking = { id: id(2), workshopId: id(1), actorId: id(3), status: "held", requestedAt: at, expiresAt: "2030-01-25T07:00:00Z", approvedAt: null, checkedInAt: null, completedAt: null, fullDiscount: false, conflict: false };
async function fixture(page: Page, options: { role?: Role; missing?: boolean; confirmed?: boolean; conflict?: boolean; failure?: boolean; closed?: boolean } = {}) {
  const role = options.role ?? "superAdmin", actions: WorkshopStaffPayload[] = [];
  const manager = role === "superAdmin" || role === "registrationWorkshopAdministrator";
  let failed = false;
  const view: WorkshopStaffView = { policy: { enabled: !options.closed, holdHours: null, offerHours: null, mockPaymentEnabled: false }, workshops: [{ ...workshop, canManage: manager, canComplete: manager }], bookings: [{ ...booking, ...(options.confirmed ? { status: "confirmed", approvedAt: at } : {}), conflict: options.conflict ?? false }], reservations: [], conflicts: options.conflict ? [{ id: id(5), bookingId: id(2), otherBookingId: id(4), createdAt: at, resolvedAt: null }] : [] };
  await page.route("**/api/staff-portal**", async (route) => {
    if (new URL(route.request().url()).pathname !== "/api/staff-portal/workshops") return route.fulfill({ json: { state: "authenticated", profile: { actorId: id(9), name: "Synthetic Staff", roles: [role] }, formToken: "synthetic-staff-token" } });
    if (options.missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken: "synthetic-workshop-token" } });
    if (route.request().method() === "GET") return route.fulfill({ json: { state: "ready", ...view, formToken: "synthetic-workshop-token" } });
    const input = route.request().postDataJSON() as WorkshopStaffPayload; actions.push(input);
    expect(input.formToken).toBe("synthetic-workshop-token");
    if (options.failure && !failed) { failed = true; return route.fulfill({ status: 503, json: { state: "unavailable", formToken: "synthetic-workshop-token" } }); }
    const row = view.bookings[0];
    if (input.action === "approve") { row.status = "approved"; row.approvedAt = at; }
    if (input.action === "decline") row.status = "declined";
    if (input.action === "extend") row.expiresAt = input.expiresAt!;
    if (input.action === "validate_discount") row.fullDiscount = true;
    if (input.action === "checkin") row.checkedInAt = at;
    if (input.action === "complete") row.completedAt = at;
    if (input.action === "reserve") view.reservations = [{ id: id(7), workshopId: workshop.id, seats: input.seats!, reason: input.reason!, releaseAt: input.releaseAt!, releasedAt: null }];
    if (input.action === "resolve_conflict") { row.status = "cancelled"; row.conflict = false; view.conflicts = []; }
    return route.fulfill({ json: { state: "updated", formToken: "synthetic-workshop-token" } });
  });
  return { actions };
}
for (const locale of ["en", "ar"] as const) {
  const copy = workshopStaffCopy[locale], staff = staffCopy[locale];
  test(`${locale} workshop draft editor preserves unset operational values and EN/AR fields`, async ({ page }, testInfo) => {
    const { actions } = await fixture(page, { closed: true }); await page.goto(`/${locale}/staff/workshops`);
    const area = page.getByTestId("workshop-staff"); await expect(area.getByRole("heading", { name: copy.counts })).toBeVisible();
    await area.getByRole("button", { name: copy.newWorkshop, exact: true }).click();
    await expect(page.locator("#workshop-capacity")).toHaveValue(""); await expect(page.locator("#workshop-priceMinor")).toHaveValue("");
    await expect(page.locator("#workshop-startAt")).toHaveValue(""); await expect(page.locator("#workshop-transferBufferMinutes")).toHaveValue("");
    await expect(page.locator("#workshop-descriptionAr")).toHaveAttribute("dir", "rtl"); await expect(page.locator("#workshop-descriptionEn")).toHaveAttribute("dir", "ltr");
    await page.locator("#workshop-titleEn").fill("Synthetic draft"); await page.locator("#workshop-titleAr").fill("مسودة تجريبية");
    await page.locator("#workshop-editor-reason").fill("Synthetic preparation");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await mkdir(".tools/workshops", { recursive: true }); await page.screenshot({ path: `.tools/workshops/staff-${locale}-${testInfo.project.name}-editor.png`, fullPage: true });
    await area.getByRole("button", { name: copy.save, exact: true }).click(); await expect(area.getByRole("status")).toHaveText(copy.saved);
    const saved = actions.find((input) => input.action === "save_workshop"); expect(saved?.workshop).toMatchObject({ titleEn: "Synthetic draft", titleAr: "مسودة تجريبية", capacity: null, priceMinor: null, startAt: null, endAt: null, transferBufferMinutes: null, published: false });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
  test(`${locale} staff decisions retain retry identity and reservations require reason and release time`, async ({ page }) => {
    const { actions } = await fixture(page, { role: "registrationWorkshopAdministrator", failure: true }); await page.goto(`/${locale}/staff/workshops`);
    const area = page.getByTestId("workshop-staff"), request = area.locator("#workshop-requests-title").locator("..").locator("li").first();
    const controls = request.locator("summary").filter({ hasText: copy.edit }).locator("..");
    await controls.locator("summary").click(); await controls.getByLabel(copy.reason, { exact: true }).fill("Synthetic approval");
    await controls.getByRole("button", { name: copy.approve, exact: true }).click(); await expect(area.getByRole("alert")).toHaveText(copy.errors.unavailable);
    await controls.getByRole("button", { name: copy.approve, exact: true }).click(); await expect(area.getByRole("status")).toHaveText(copy.saved);
    expect(actions[1].operationId).toBe(actions[0].operationId); expect(actions[0]).toMatchObject({ action: "approve", bookingId: booking.id });
    await controls.getByRole("button", { name: copy.discount, exact: true }).click(); await expect(request).toContainText(copy.discountValidated);
    await controls.locator(`#workshop-deadline-${booking.id}`).fill("2030-01-26T09:00");
    await controls.getByRole("button", { name: copy.extend, exact: true }).click(); await expect(area.getByRole("status")).toHaveText(copy.saved);
    expect(actions.find((input) => input.action === "extend")?.expiresAt).toBe("2030-01-26T06:00:00.000Z");
    const card = area.locator(".workshop-card").first(); await card.locator("summary").filter({ hasText: copy.reserve }).click();
    const reservation = card.locator("summary").filter({ hasText: copy.reserve }).locator("..");
    await reservation.getByLabel(copy.seats, { exact: true }).fill("1"); await reservation.getByLabel(copy.releaseAt, { exact: true }).fill("2030-01-25T12:00"); await reservation.getByLabel(copy.reason, { exact: true }).fill("Synthetic reserved equipment place");
    await reservation.getByRole("button", { name: copy.reserve, exact: true }).click(); await expect(area).toContainText("Synthetic reserved equipment place");
    expect(actions.find((input) => input.action === "reserve")).toMatchObject({ seats: 1, releaseAt: "2030-01-25T09:00:00.000Z", reason: "Synthetic reserved equipment place" });
  });
  test(`${locale} check-in and authorized completion are separate, and check-in staff cannot approve`, async ({ page }) => {
    await fixture(page, { role: "checkInStaff", confirmed: true }); await page.goto(`/${locale}/staff/workshops`);
    const area = page.getByTestId("workshop-staff"); await area.getByRole("button", { name: copy.checkin, exact: true }).click(); await expect(area.getByRole("status")).toHaveText(copy.saved);
    await expect(area.getByRole("button", { name: copy.complete, exact: true })).toHaveCount(0); await expect(area.getByRole("button", { name: copy.approve, exact: true })).toHaveCount(0);
    await page.unroute("**/api/staff-portal**"); await fixture(page, { confirmed: true }); await page.reload();
    await area.getByRole("button", { name: copy.checkin, exact: true }).click(); await expect(area.getByRole("status")).toHaveText(copy.saved);
    await area.getByRole("button", { name: copy.complete, exact: true }).click(); await expect(area.getByRole("status")).toHaveText(copy.saved); await expect(area.getByRole("button", { name: copy.complete, exact: true })).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  test(`${locale} conflict resolution is explicit and pending migration keeps staff signed in`, async ({ page }) => {
    const { actions } = await fixture(page, { confirmed: true, conflict: true }); await page.goto(`/${locale}/staff/workshops`);
    const area = page.getByTestId("workshop-staff"), conflicts = area.locator("#workshop-conflicts-title").locator("..");
    await expect(area.getByRole("button", { name: copy.checkin, exact: true })).toBeDisabled();
    await conflicts.locator("summary").click(); await conflicts.getByLabel(copy.reason, { exact: true }).fill("Synthetic participant resolution");
    await conflicts.getByRole("button", { name: copy.resolve, exact: true }).click(); await expect(conflicts).toContainText(copy.noConflicts);
    expect(actions[0]).toMatchObject({ action: "resolve_conflict", bookingId: booking.id, reason: "Synthetic participant resolution" });
    await page.unroute("**/api/staff-portal**"); await fixture(page, { missing: true }); await page.reload();
    await expect(area.getByRole("alert")).toHaveText(copy.errors["area-not-ready"]); await expect(page.getByRole("button", { name: staff.signOut })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
