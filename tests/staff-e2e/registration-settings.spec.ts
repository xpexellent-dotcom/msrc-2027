import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { registrationSettingsCopy } from "../../src/features/staff-portal/registration-settings-copy";
import type { Role } from "../../src/lib/permissions/contract";
import type { StaffPayload, StaffRegistrationSettings, StaffRegistrationSettingsAudit, StaffRegistrationSettingsView, StaffResponse, StaffState } from "../../src/features/staff-portal/ui-contract";

const actorId = "53000000-0000-4000-8000-000000000001";
const stored: StaffRegistrationSettings = {
  enabled: false, terms_version: "synthetic-v1", payment_required: false, general_capacity: 42, default_workshop_capacity: null,
  conference_days: null,
  early_access_start_at: "2028-03-01T17:00:00Z", early_access_end_at: "2028-03-03T17:00:00Z",
  priority_start_at: "2028-03-01T17:00:00Z", priority_end_at: "2028-03-03T17:00:00Z",
  general_opening_at: "2028-03-03T17:00:00Z", closing_at: "2028-03-10T17:00:00Z",
  offer_window_hours: 12, places_remaining_threshold: 5, minimum_age: 18,
  waitlist_offer_hours: 12, confirm_seat_lead_days: 3, confirm_seat_response_hours: 12, payment_window_hours: null,
};

/** Presentation fixture only. The SQL/handler suites verify permission and persistence. */
async function fixture(page: Page, options: { settings?: StaffRegistrationSettings | null; history?: boolean; roles?: Role[]; missingRead?: boolean; saveFailure?: StaffState } = {}) {
  const actions: StaffPayload[] = [];
  let settings = options.settings === undefined ? { ...stored } : options.settings;
  let history: StaffRegistrationSettingsAudit[] = options.history ? Array.from({ length: 20 }, (_, index) => ({
    id: `53000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
    operationId: `53000000-0000-4000-8000-${String(index + 200).padStart(12, "0")}`,
    performerId: actorId, performerName: "Synthetic Owner", at: new Date(Date.UTC(2028, 1, 20 - index, 10)).toISOString(),
    changes: { general_capacity: { before: 40, after: 42 } },
  })) : [];
  const roles = options.roles ?? ["superAdmin"];
  const projection = (): StaffRegistrationSettingsView => ({ settings, settingsComplete: settings !== null, participantAccountsReady: false, history });
  let failure = options.saveFailure;
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request();
    const base: StaffResponse = { state: "authenticated", profile: { actorId, name: "Synthetic Owner", roles }, formToken: "synthetic-settings-token" };
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload;
      if (payload.action !== "registration-settings-save") return route.fulfill({ json: base });
      actions.push(payload);
      if (failure) return route.fulfill({ status: failure === "area-not-ready" ? 503 : 409, json: { ...base, state: failure } });
      const changes: StaffRegistrationSettingsAudit["changes"] = {};
      for (const [key, after] of Object.entries(payload.changes ?? {})) {
        const field = key as keyof typeof changes;
        const before = settings?.[field] ?? null;
        if (before !== after) changes[field] = { before, after };
      }
      settings = { ...(settings ?? stored), ...payload.changes };
      history = [{ id: "53000000-0000-4000-8000-000000000099", operationId: payload.operationId!, performerId: actorId, performerName: "Synthetic Owner", at: "2028-02-21T10:00:00Z", changes }, ...history].slice(0, 20);
      return route.fulfill({ json: { ...base, state: "updated", operationId: payload.operationId, registrationSettings: projection() } });
    }
    if (new URL(request.url()).searchParams.get("area") === "registration-settings") {
      if (!roles.includes("superAdmin")) return route.fulfill({ status: 403, json: { state: "denied" } });
      if (options.missingRead) return route.fulfill({ status: 503, json: { state: "area-not-ready" } });
      return route.fulfill({ json: { ...base, registrationSettings: projection() } });
    }
    return route.fulfill({ json: base });
  });
  return { actions, recover: () => { failure = undefined; } };
}

async function axe(page: Page, locale: "en" | "ar") {
  await expect(page).toHaveTitle(`MSRC 2027 | ${staffCopy[locale].portal}`);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}
async function fillNew(page: Page) {
  for (const [field, value] of Object.entries({
    terms_version: "synthetic-v1", general_capacity: "42", priority_start_at: "2028-03-01T20:00", priority_end_at: "2028-03-03T20:00",
    general_opening_at: "2028-03-03T20:00", closing_at: "2028-03-10T20:00", offer_window_hours: "12",
    places_remaining_threshold: "5", confirm_seat_lead_days: "3", confirm_seat_response_hours: "12",
  })) await page.locator(`#registration-settings-${field}`).fill(value);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} owner configures conference dates without defaults and sees date validation`, async ({ page }) => {
    const mock = await fixture(page), copy = registrationSettingsCopy[locale];
    await page.goto(`/${locale}/staff/registration-settings`);
    const editor = page.getByRole("region", { name: copy.title, exact: true });
    const input = page.getByLabel(copy.fields.conference_days, { exact: true });
    await expect(input).toHaveValue(""); await expect(input).toHaveAttribute("dir", "ltr");
    for (const value of ["2027-02-29", "2027-01-27,2027-01-27"]) {
      await input.fill(value); await page.getByTestId("registration-settings-review").click();
      await expect(editor.getByRole("alert")).toHaveText(copy.invalidConferenceDays);
      await expect(editor.getByRole("alert")).toBeFocused();
      expect(mock.actions).toHaveLength(0);
    }
    await input.fill("2027-01-28, 2027-01-27"); await page.getByTestId("registration-settings-review").click();
    const confirmation = page.getByTestId("registration-settings-confirmation");
    await expect(confirmation).toContainText(copy.fields.conference_days);
    await axe(page, locale);
    await page.getByTestId("registration-settings-confirm").click();
    expect(mock.actions).toHaveLength(1);
    expect(mock.actions[0].changes?.conference_days).toEqual(["2027-01-27", "2027-01-28"]);
    await expect(input).toHaveValue("2027-01-27, 2027-01-28");
    await expect(page.getByTestId("registration-settings-history-entry")).toContainText(copy.fields.conference_days);
    await input.fill(""); await page.getByTestId("registration-settings-review").click();
    await page.getByTestId("registration-settings-confirm").click();
    expect(mock.actions[1].changes?.conference_days).toBeNull();
    await expect(input).toHaveValue("");
    await axe(page, locale);
  });
  test(`${locale} new settings remain unsaved until keyboard confirmation, with Riyadh conversion and audit`, async ({ page }, testInfo) => {
    const mock = await fixture(page, { settings: null });
    await page.goto(`/${locale}/staff/registration-settings`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy[locale].areas["registration-settings"]);
    const nav = page.getByRole("navigation", { name: staffCopy[locale].menu });
    await expect(nav.getByRole("link", { name: staffCopy[locale].areas["registration-settings"], exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("#registration-settings-free")).toBeChecked();
    for (const field of ["general_capacity", "priority_start_at", "priority_end_at", "general_opening_at", "closing_at", "offer_window_hours", "confirm_seat_lead_days", "confirm_seat_response_hours"]) await expect(page.locator(`#registration-settings-${field}`)).toHaveValue("");
    await expect(page.locator("#registration-settings-minimum_age")).toHaveValue("18");
    await expect(page.locator("#registration-settings-minimum_age")).toHaveAttribute("readonly", "");
    await page.getByTestId("registration-settings-review").click();
    await expect(page.getByTestId("registration-settings-confirmation")).toHaveCount(0);
    expect(mock.actions).toEqual([]);
    await fillNew(page);
    await page.getByTestId("registration-settings-review").focus();
    await page.keyboard.press("Enter");
    const confirmation = page.getByTestId("registration-settings-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByRole("heading")).toBeFocused();
    await expect(confirmation).toContainText("synthetic-v1");
    expect(mock.actions).toEqual([]);
    await axe(page, locale);
    await mkdir(".tools/registration-settings", { recursive: true });
    await page.screenshot({ path: `.tools/registration-settings/${locale}-${testInfo.project.name}-confirm.png`, fullPage: true });
    await page.getByTestId("registration-settings-cancel").focus();
    await page.keyboard.press("Enter");
    await expect(confirmation).toHaveCount(0);
    await expect(page.getByTestId("registration-settings-review")).toBeFocused();
    expect(mock.actions).toEqual([]);
    await page.keyboard.press("Enter");
    await page.getByTestId("registration-settings-confirm").focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => mock.actions.length).toBe(1);
    expect(mock.actions[0].changes).toMatchObject({ payment_required: false, general_capacity: 42, minimum_age: 18 });
    expect(mock.actions[0].changes).not.toHaveProperty("enabled");
    expect(mock.actions[0].operationId).toMatch(/^[0-9a-f-]{36}$/i);
    for (const field of ["priority_start_at", "early_access_start_at"] as const) expect(Date.parse(mock.actions[0].changes![field]!)).toBe(Date.parse("2028-03-01T17:00:00Z"));
    for (const field of ["priority_end_at", "early_access_end_at", "general_opening_at"] as const) expect(Date.parse(mock.actions[0].changes![field]!)).toBe(Date.parse("2028-03-03T17:00:00Z"));
    await expect(page.getByTestId("registration-settings-history-entry")).toHaveCount(1);
    await expect(page.getByTestId("registration-settings-history")).toContainText("Synthetic Owner");
    await expect(page.locator("#registration-settings-priority_start_at")).toHaveValue("2028-03-01T20:00");
    await axe(page, locale);
  });

  test(`${locale} reads the saved window, readonly switch, and latest 20 history entries`, async ({ page }, testInfo) => {
    const mock = await fixture(page, { settings: { ...stored, enabled: true }, history: true });
    await page.goto(`/${locale}/staff/registration-settings`);
    await expect(page.locator("#registration-settings-priority_start_at")).toHaveValue("2028-03-01T20:00");
    await expect(page.getByTestId("registration-settings-history-entry")).toHaveCount(20);
    await expect(page.getByTestId("registration-settings-readiness")).toContainText(registrationSettingsCopy[locale].open);
    await expect(page.locator('input[name="enabled"], #registration-settings-enabled')).toHaveCount(0);
    await expect(page.locator("#registration-settings-free")).toBeChecked();
    await page.locator("#registration-settings-paid").check();
    await expect(page.locator("#registration-settings-payment_window_hours")).toBeVisible();
    await page.getByTestId("registration-settings-review").click();
    await expect(page.getByTestId("registration-settings-confirmation")).toHaveCount(0);
    expect(mock.actions).toEqual([]);
    await page.locator("#registration-settings-free").check();
    await axe(page, locale);
    await mkdir(".tools/registration-settings", { recursive: true });
    await page.locator(".staff-settings-editor").screenshot({ path: `.tools/registration-settings/${locale}-${testInfo.project.name}-form.png` });
    await page.screenshot({ path: `.tools/registration-settings/${locale}-${testInfo.project.name}-history.png`, fullPage: true });
  });

  for (const state of ["capacity-below-held", "area-not-ready", "operation-conflict"] as const) test(`${locale} ${state} save refusal preserves the owner draft and staff shell`, async ({ page }) => {
    const mock = await fixture(page, { saveFailure: state });
    await page.goto(`/${locale}/staff/registration-settings`);
    await page.locator("#registration-settings-general_capacity").fill("2");
    await page.getByTestId("registration-settings-review").click();
    await page.getByTestId("registration-settings-confirm").click();
    await expect(page.locator(".staff-feedback")).toHaveText(staffCopy[locale].states[state]);
    await expect(page.getByTestId("staff-name")).toBeVisible();
    await expect(page.getByRole("navigation", { name: staffCopy[locale].menu })).toBeVisible();
    await expect(page.getByLabel(staffCopy[locale].password, { exact: true })).toHaveCount(0);
    expect(mock.actions).toHaveLength(1);
    if (state === "area-not-ready") {
      await expect(page.getByTestId("registration-settings-readiness")).toContainText(registrationSettingsCopy[locale].missing);
      await expect(page.getByTestId("registration-settings-confirm")).toBeDisabled();
    }
    if (state === "capacity-below-held") {
      mock.recover();
      await page.getByTestId("registration-settings-confirm").click();
      await expect(page.getByTestId("registration-settings-history-entry")).toHaveCount(1);
      expect(mock.actions).toHaveLength(2);
      expect(mock.actions[1].operationId).toBe(mock.actions[0].operationId);
      expect(mock.actions[1].changes).toEqual(mock.actions[0].changes);
    } else await page.getByTestId("registration-settings-cancel").click();
    await expect(page.locator("#registration-settings-general_capacity")).toHaveValue("2");
    await axe(page, locale);
  });

  test(`${locale} unapplied database changes show readiness without signing the owner out`, async ({ page }) => {
    await fixture(page, { missingRead: true });
    await page.goto(`/${locale}/staff/registration-settings`);
    await expect(page.locator(".staff-feedback")).toHaveText(staffCopy[locale].states["area-not-ready"]);
    await expect(page.getByTestId("registration-settings-readiness")).toContainText(registrationSettingsCopy[locale].database);
    await expect(page.getByTestId("staff-name")).toBeVisible();
    await expect(page.getByTestId("registration-settings-review")).toBeDisabled();
    await axe(page, locale);
  });

  test(`${locale} a registration administrator cannot use the settings screen or menu`, async ({ page }) => {
    const mock = await fixture(page, { roles: ["registrationWorkshopAdministrator"] });
    await page.goto(`/${locale}/staff/registration-settings`);
    await expect(page.getByTestId("staff-name")).toBeVisible();
    await expect(page.getByRole("navigation", { name: staffCopy[locale].menu }).getByRole("link", { name: staffCopy[locale].areas["registration-settings"], exact: true })).toHaveCount(0);
    await expect(page.getByTestId("registration-settings-review")).toHaveCount(0);
    await expect(page.locator("#registration-settings-terms_version")).toHaveCount(0);
    expect(mock.actions).toEqual([]);
    await axe(page, locale);
  });

  test(`${locale} settings at 320px and enlarged text retain bounded fields and keyboard review`, async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "The mobile project covers the narrow layout.");
    await fixture(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/${locale}/staff/registration-settings`);
    await expect(page.locator("#registration-settings-terms_version")).toHaveValue("synthetic-v1");
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.locator("#registration-settings-general_capacity").fill("43");
    await page.getByTestId("registration-settings-review").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("registration-settings-confirmation").getByRole("heading")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await axe(page, locale);
    await mkdir(".tools/registration-settings", { recursive: true });
    await page.screenshot({ path: `.tools/registration-settings/${locale}-320-200-confirm.png`, fullPage: true });
  });
}
