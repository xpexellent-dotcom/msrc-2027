import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { ROLES, type Role } from "../../src/lib/permissions/contract";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { launchReadinessCopy } from "../../src/features/staff-portal/launch-readiness-copy";
import type { StaffLaunchReadiness, StaffLaunchCheckKey, StaffPayload, StaffResponse } from "../../src/features/staff-portal/ui-contract";

/** Synthetic presentation only. Handler and SQL suites prove authorization and server evaluation. */
function snapshot(): StaffLaunchReadiness {
  const keys: StaffLaunchCheckKey[] = ["migrations", "settings", "confirmationSettings", "participantAccounts", "participantPolicy", "retention", "outboxDelivery", "outboxSweeps", "outboxCap", "conferenceDays", "approvers", "checkInStaff", "earlyAccess", "secondSuperAdmin", "health", "latestDrain"];
  return { checks: keys.map((key) => ({ key, status: key === "latestDrain" || key === "approvers" ? "amber" : key === "retention" ? "red" : "green" })),
    environment: [
      { name: "PARTICIPANT_ACCOUNTS_ENABLED", present: true, valid: true, enabled: false, status: "amber" },
      { name: "REGISTRATION_IDENTITY_ENCRYPTION_KEYS", present: true, valid: true, status: "green" },
      { name: "REGISTRATION_TICKET_SECRET", present: false, valid: false, status: "red" },
      { name: "OUTBOX_BATCH_SIZE", present: false, valid: true, status: "green" },
    ],
    requiredRpcs: { confirmation: true, participantAccounts: true, registration: true, registrationSettings: true, earlyAccess: true, tickets: true, checkIn: true, outbox: true, health: true },
    staffCounts: Object.fromEntries(ROLES.filter((role) => role !== "participant").map((role) => [role, role === "superAdmin" ? 2 : role === "registrationWorkshopAdministrator" || role === "checkInStaff" ? 1 : 0])) as StaffLaunchReadiness["staffCounts"],
    earlyAccessCount: 7, outboxDailyCap: 400, participantEmailDailyLimit: 80, superAdminsWithAuthenticatorCount: 2, registrationEnabled: false,
    settings: { confirm_seat_lead_days: 7, confirm_seat_response_hours: 48, general_capacity: 42, priority_start_at: "2028-03-01T17:00:00Z", priority_end_at: "2028-03-03T17:00:00Z", general_opening_at: "2028-03-03T17:00:00Z", closing_at: "2028-03-10T17:00:00Z", conference_days: ["2028-03-11", "2028-03-12"] },
  };
}
async function fixture(page: Page, options: { roles?: Role[]; missing?: boolean } = {}) {
  const roles = options.roles ?? ["superAdmin"], data = snapshot(), actions: StaffPayload[] = [];
  let missing = options.missing;
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), area = new URL(request.url()).searchParams.get("area");
    const base: StaffResponse = { state: "authenticated", profile: { actorId: "54000000-0000-4000-8000-000000000001", name: "Synthetic Owner", roles }, formToken: "synthetic-launch-token" };
    if (request.method() === "POST") { actions.push(request.postDataJSON()); return route.fulfill({ json: base }); }
    if (area === "launch-readiness") {
      if (!roles.includes("superAdmin")) return route.fulfill({ status: 403, json: { state: "denied" } });
      if (missing) return route.fulfill({ status: 503, json: { state: "area-not-ready" } });
      return route.fulfill({ json: { ...base, launchReadiness: data } });
    }
    return route.fulfill({ json: base });
  });
  return { actions, open: () => { data.registrationEnabled = true; }, recover: () => { missing = false; } };
}
async function axe(page: Page, locale: "en" | "ar") {
  await expect(page).toHaveTitle(`MSRC 2027 | ${staffCopy[locale].portal}`);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = launchReadinessCopy[locale], staff = staffCopy[locale];
  test(`${locale} launch checklist is read-only, localized and server-projected`, async ({ page }, testInfo) => {
    const state = await fixture(page);
    await page.goto(`/${locale}/staff/launch-readiness`);
    await expect(page.getByRole("heading", { name: staff.areas["launch-readiness"], exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const panel = page.locator(".staff-launch-readiness");
    await expect(page.getByTestId("launch-registration-switch")).toHaveText(copy.closed);
    await expect(panel.locator("input, button, select, textarea")).toHaveCount(0);
    await expect(page.getByTestId("launch-check-retention")).toContainText(copy.status.red);
    await expect(page.getByTestId("launch-check-latestDrain")).toContainText(copy.status.amber);
    await expect(page.getByTestId("launch-check-settings")).toContainText(copy.status.green);
    await expect(page.getByTestId("launch-check-confirmationSettings")).toContainText(copy.status.green);
    await expect(panel).toContainText(copy.confirmationLead);
    await expect(panel).toContainText(copy.confirmationHours);
    await expect(panel.getByRole("link", { name: copy.guide })).toHaveAttribute("href", /\/docs\/runbooks\/ACTIVATION\.md$/);
    await expect(panel).toContainText("REGISTRATION_IDENTITY_ENCRYPTION_KEYS");
    await expect(panel).toContainText(locale === "ar" ? "٤٢" : "42");
    const riyadh = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(new Date("2028-03-01T17:00:00Z"));
    await expect(panel).toContainText(riyadh);
    await expect(page.getByRole("navigation", { name: staff.menu }).getByRole("link", { name: staff.areas["launch-readiness"] })).toHaveAttribute("aria-current", "page");
    await axe(page, locale);
    await mkdir(".tools/launch-readiness", { recursive: true });
    await page.screenshot({ path: `.tools/launch-readiness/${locale}-${testInfo.project.name}.png`, fullPage: true });
    state.open(); await page.reload(); await expect(page.getByTestId("launch-registration-switch")).toHaveText(copy.open);
    expect(state.actions.filter((action) => action.action !== "activity")).toEqual([]);
    if (testInfo.project.name.includes("mobile")) {
      await page.setViewportSize({ width: 320, height: 740 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByTestId("launch-registration-switch").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("launch-registration-switch")).toBeInViewport();
      await axe(page, locale);
    }
  });
  test(`${locale} missing readiness migration keeps the signed-in shell and can recover`, async ({ page }) => {
    const state = await fixture(page, { missing: true });
    await page.goto(`/${locale}/staff/launch-readiness`);
    await expect(page.getByText(staff.states["area-not-ready"], { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: staff.signOut })).toBeVisible();
    await expect(page.getByTestId("launch-registration-switch")).toHaveCount(0);
    await axe(page, locale);
    state.recover(); await page.reload(); await expect(page.getByTestId("launch-registration-switch")).toHaveText(copy.closed);
  });
  test(`${locale} registration approver cannot see the readiness area`, async ({ page }) => {
    await fixture(page, { roles: ["registrationWorkshopAdministrator"] });
    await page.goto(`/${locale}/staff/launch-readiness`);
    await expect(page.getByRole("navigation", { name: staff.menu }).getByRole("link", { name: staff.areas["launch-readiness"] })).toHaveCount(0);
    await expect(page.getByText(staff.states.denied, { exact: true }).first()).toBeVisible();
    await expect(page.locator(".staff-launch-readiness")).toHaveCount(0);
    await axe(page, locale);
  });
}
