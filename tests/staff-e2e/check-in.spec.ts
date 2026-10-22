import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { checkInCopy } from "../../src/features/staff-portal/check-in-copy";
import type { StaffCheckInResult, StaffPayload, StaffResponse } from "../../src/features/staff-portal/ui-contract";

const days = ["2027-01-27", "2027-01-28"], attendanceId = "57000000-0000-4000-8000-000000000010";
const outcomes: StaffCheckInResult["status"][] = ["checked_in", "already_checked_in", "revoked", "not_found", "wrong_day", "not_approved"];

async function fixture(page: Page, options: { superAdmin?: boolean; missing?: boolean; noDays?: boolean; denied?: boolean; reducedMotion?: boolean } = {}) {
  const mutations: StaffPayload[] = [], reads: string[] = [];
  let count = 7, failure = false;
  await page.clock.setFixedTime(new Date("2027-01-27T06:00:00Z"));
  if (options.reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const browser = window as unknown as { vibrations: number[]; cameraRequests: number };
    browser.vibrations = []; browser.cameraRequests = 0;
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: (value: number) => { browser.vibrations.push(value); return true; } });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => { browser.cameraRequests += 1; throw new DOMException("synthetic refusal", "NotAllowedError"); } } });
  });
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url()), area = url.searchParams.get("area") ?? "status";
    const base: StaffResponse = { state: "authenticated", formToken: "synthetic-checkin-form", profile: { actorId: "57000000-0000-4000-8000-000000000001", name: "Synthetic Check-in Staff", roles: options.denied ? ["finance"] : options.superAdmin ? ["superAdmin"] : ["checkInStaff"] } };
    const view = (day: string | null) => ({ conferenceDays: options.noDays ? null : days, summary: day ? { day, checkedIn: count, scan: 2, manualCode: count - 2 } : null });
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload;
      if (payload.action === "activity") return route.fulfill({ json: base });
      mutations.push(payload);
      if (failure) return route.fulfill({ status: 503, json: { state: "unavailable", formToken: base.formToken } });
      if (payload.action === "check-in-undo") { count -= 1; return route.fulfill({ json: { ...base, state: "updated" } }); }
      const status = outcomes.find((value) => payload.ticketTokenOrReference === `SYNTHETIC-${value}`) ?? "not_found";
      if (status === "checked_in") count += 1;
      const checkInResult: StaffCheckInResult = { status, ...(["checked_in", "already_checked_in"].includes(status) ? { attendanceId, checkedInAt: "2027-01-27T05:42:00Z", performedBy: "Synthetic Door Staff" } : {}) };
      return route.fulfill({ json: { ...base, state: "updated", checkIn: view(payload.conferenceDay ?? null), checkInResult } });
    }
    reads.push(area);
    if (area === "check-in") {
      if (options.missing || options.denied) return route.fulfill({ status: 503, json: { state: options.denied ? "denied" : "area-not-ready" } });
      return route.fulfill({ json: { ...base, checkIn: view(url.searchParams.get("day")) } });
    }
    return route.fulfill({ json: base });
  });
  return { mutations, reads, fail: () => { failure = true; } };
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = checkInCopy[locale];
  test(`${locale} scanner navigation changes the document camera policy and restores it on exit`, async ({ page }) => {
    await fixture(page);
    const initial = await page.goto(`/${locale}/staff`);
    expect(initial?.headers()["permissions-policy"]).toContain("camera=()");
    const cameraAllowed = () => page.evaluate(() => (document as Document & { featurePolicy?: { allowsFeature: (feature: string) => boolean } }).featurePolicy?.allowsFeature("camera"));
    const initiallyAllowed = await cameraAllowed(); if (typeof initiallyAllowed === "boolean") expect(initiallyAllowed).toBe(false);
    const scannerLink = page.getByRole("navigation", { name: staffCopy[locale].menu }).getByRole("link", { name: staffCopy[locale].areas["check-in"], exact: true });
    const [entered] = await Promise.all([
      page.waitForResponse((response) => response.request().resourceType() === "document" && new URL(response.url()).pathname === `/${locale}/staff/check-in`),
      scannerLink.click(),
    ]);
    expect(entered.headers()["permissions-policy"]).toContain("camera=(self)");
    await expect(page.getByRole("combobox", { name: copy.day, exact: true })).toHaveValue(days[0]);
    const scannerAllowed = await cameraAllowed(); if (typeof scannerAllowed === "boolean") expect(scannerAllowed).toBe(true);
    const [left] = await Promise.all([
      page.waitForResponse((response) => response.request().resourceType() === "document" && new URL(response.url()).pathname === `/${locale}/staff`),
      page.getByRole("link", { name: staffCopy[locale].home, exact: true }).click(),
    ]);
    expect(left.headers()["permissions-policy"]).toContain("camera=()");
    const allowedAfterExit = await cameraAllowed(); if (typeof allowedAfterExit === "boolean") expect(allowedAfterExit).toBe(false);
  });

  test(`${locale} manual scanner shows every outcome with day counts, no camera and accessible mobile cards`, async ({ page }, testInfo) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/staff/check-in`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy[locale].areas["check-in"]);
    await expect(page.getByRole("combobox", { name: copy.day, exact: true })).toHaveValue(days[0]);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("navigation", { name: staffCopy[locale].menu }).getByRole("link", { name: staffCopy[locale].areas["check-in"], exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("textbox", { name: copy.entryPoint, exact: true }).fill("Synthetic north door");
    await page.getByLabel(copy.feedback, { exact: false }).check();
    for (const outcome of outcomes) {
      await page.getByRole("textbox", { name: copy.manual, exact: true }).fill(`SYNTHETIC-${outcome}`);
      await page.getByRole("button", { name: copy.submit, exact: true }).click();
      const card = page.getByTestId("checkin-result");
      await expect(card).toHaveAttribute("data-result", outcome);
      await expect(card.getByRole("heading")).toHaveText(copy.outcomes[outcome].title);
      await expect(card).toContainText(copy.outcomes[outcome].detail);
      await expect(page.getByText(staffCopy[locale].states.updated, { exact: true })).toHaveCount(0);
      await expect(card.locator(".staff-checkin-icon")).toBeVisible();
      if (["checked_in", "already_checked_in"].includes(outcome)) await expect(card).toContainText("Synthetic Door Staff");
      await expect(card).toBeFocused();
      await expect(page.getByRole("button", { name: copy.undo, exact: true })).toHaveCount(0);
      await axe(page);
      if (testInfo.project.name.includes("mobile")) { await mkdir(".tools/night2-b", { recursive: true }); await page.screenshot({ path: `.tools/night2-b/checkin-${locale}-${outcome}.png`, fullPage: true }); }
    }
    expect(mock.mutations).toHaveLength(6);
    expect(mock.mutations.every((value) => value.conferenceDay === days[0] && value.entryPoint === "Synthetic north door")).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { cameraRequests: number }).cameraRequests)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { vibrations: number[] }).vibrations)).toEqual([100]);
    await expect(page.getByTestId("checkin-counts")).toContainText(locale === "ar" ? "٨" : "8");
    await page.getByRole("combobox", { name: copy.day, exact: true }).selectOption(days[1]);
    await expect(page.getByTestId("checkin-result")).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.start, exact: true })).toBeEnabled();
  });

  test(`${locale} Super Admin correction requires a reason and keeps reduced-motion feedback silent`, async ({ page }) => {
    const mock = await fixture(page, { superAdmin: true, reducedMotion: true });
    await page.goto(`/${locale}/staff/check-in`);
    await page.getByLabel(copy.feedback, { exact: false }).check();
    await page.getByRole("textbox", { name: copy.manual, exact: true }).fill("SYNTHETIC-checked_in");
    await page.getByRole("button", { name: copy.submit, exact: true }).click();
    await expect(page.getByTestId("checkin-result")).toHaveAttribute("data-result", "checked_in");
    await expect(page.getByRole("button", { name: copy.undo, exact: true })).toBeDisabled();
    await page.getByRole("textbox", { name: copy.undoReason, exact: true }).fill("Synthetic wrong ticket correction");
    await page.getByRole("button", { name: copy.undo, exact: true }).click();
    await expect(page.getByText(copy.undone, { exact: true })).toBeVisible();
    expect(mock.mutations[1]).toMatchObject({ action: "check-in-undo", attendanceId, reason: "Synthetic wrong ticket correction" });
    expect(await page.evaluate(() => (window as unknown as { vibrations: number[] }).vibrations)).toEqual([]);
    await axe(page);
  });

  test(`${locale} HTTP camera warning preserves manual check-in and request failure removes previous success`, async ({ page }) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/staff/check-in`);
    await page.getByRole("button", { name: copy.start, exact: true }).click();
    await expect(page.getByText(copy.https, { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: copy.manual, exact: true }).fill("SYNTHETIC-checked_in");
    await page.getByRole("button", { name: copy.submit, exact: true }).click();
    await expect(page.getByTestId("checkin-result")).toHaveAttribute("data-result", "checked_in");
    mock.fail(); await page.getByRole("textbox", { name: copy.manual, exact: true }).fill("SYNTHETIC-checked_in");
    await page.getByRole("button", { name: copy.submit, exact: true }).click();
    await expect(page.getByText(staffCopy[locale].states.unavailable, { exact: true })).toBeVisible();
    await expect(page.getByTestId("checkin-result")).toHaveCount(0);
    await expect(page.getByTestId("staff-name")).toBeVisible(); await axe(page);
  });

  test(`${locale} missing migration keeps the staff session and no days disables check-in`, async ({ page }) => {
    await fixture(page, { missing: true }); await page.goto(`/${locale}/staff/check-in`);
    await expect(page.getByText(staffCopy[locale].states["area-not-ready"], { exact: true })).toBeVisible();
    await expect(page.getByTestId("staff-name")).toBeVisible(); await axe(page);
    await page.unroute("**/api/staff-portal**"); await fixture(page, { noDays: true }); await page.reload();
    await expect(page.getByText(copy.noDays, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.submit, exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: copy.start, exact: true })).toBeDisabled(); await axe(page);
  });

  test(`${locale} scanner stays bounded at narrow enlarged text and refuses offline mutations`, async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Narrow phone layout is covered in the mobile project.");
    const mock = await fixture(page); await page.setViewportSize({ width: 320, height: 740 }); await page.goto(`/${locale}/staff/check-in`);
    await expect(page.getByRole("combobox", { name: copy.day, exact: true })).toHaveValue(days[0]);
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await page.getByRole("textbox", { name: copy.manual, exact: true }).fill("SYNTHETIC-already_checked_in");
    await page.getByRole("button", { name: copy.submit, exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(page.getByTestId("checkin-result")).toHaveAttribute("data-result", "already_checked_in");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.context().setOffline(true); await expect(page.getByText(copy.offline, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.submit, exact: true })).toBeDisabled();
    expect(mock.mutations).toHaveLength(1); await page.context().setOffline(false); await axe(page);
  });
}
