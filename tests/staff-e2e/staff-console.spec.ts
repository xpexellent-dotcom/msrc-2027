import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { consoleCopy } from "../../src/features/staff-portal/console-copy";
import { staffMenu } from "../../src/features/staff-portal/menu";
import type { Role } from "../../src/lib/permissions/contract";
import type { StaffEarlyAccessEntry, StaffPayload, StaffRegistrationHistoryRow, StaffRegistrationRequest, StaffResponse } from "../../src/features/staff-portal/ui-contract";

const actorId = "21000000-0000-4000-8000-000000000001";
const ids = ["21000000-0000-4000-8000-0000000000a1", "21000000-0000-4000-8000-0000000000a2", "21000000-0000-4000-8000-0000000000a3"];
const participantId = "21000000-0000-4000-8000-0000000000b1";
const earlyIds = ["21000000-0000-4000-8000-0000000000e1", "21000000-0000-4000-8000-0000000000e2"];
const historyEvents: Pick<StaffRegistrationHistoryRow, "event" | "actorKind" | "from" | "to">[] = [
  { event: "request.seat_released", actorKind: "participant", from: "confirmed", to: "cancelled" },
  { event: "request.seat_confirmed", actorKind: "participant", from: "approved", to: "confirmed" },
  { event: "request.confirmation_kept", actorKind: "automatic", from: "approved", to: "approved" },
  { event: "request.confirmation_opened", actorKind: "staff", from: "approved", to: "approved" },
  { event: "ticket.revoked", actorKind: "automatic", from: null, to: null },
  { event: "request.cancelled", actorKind: "participant", from: "approved", to: "cancelled" },
  { event: "ticket.issued", actorKind: "automatic", from: null, to: null },
  { event: "request.offer_accepted", actorKind: "participant", from: "offered", to: "approved" },
  { event: "request.offered", actorKind: "automatic", from: "waitlisted", to: "offered" },
  { event: "request.offer_expired", actorKind: "automatic", from: "offered", to: "expired" },
  { event: "request.offer_declined", actorKind: "participant", from: "offered", to: "cancelled" },
  { event: "request.offered", actorKind: "staff", from: "waitlisted", to: "offered" },
  { event: "request.waitlisted", actorKind: "staff", from: "pending_approval", to: "waitlisted" },
  { event: "request.approved", actorKind: "staff", from: "pending_approval", to: "approved" },
  { event: "request.submitted", actorKind: "participant", from: null, to: null },
];

/** ORG-055/056 presentation fixture. Seat allocation and authority are proven by the database suites. */
async function consoleFixture(page: Page, roles: Role[], options: { capacity?: number | null; missingArea?: string; missingAction?: StaffPayload["action"]; offerWindow?: boolean; exportRefused?: boolean; revokedTicket?: boolean } = {}) {
  const actions: StaffPayload[] = [], reads: string[] = [];
  const capacity = options.capacity === undefined ? 2000 : options.capacity;
  let requests: StaffRegistrationRequest[] = [
    { id: ids[0], actorId: ids[0], name: "Synthetic Priority Member", email: "priority@example.invalid", status: "pending_approval", priority: true, createdAt: "2026-11-15T17:00:00Z", decidedAt: null, identityMasked: "••••••1234", offerExpiresAt: null, ticketStatus: null },
    { id: ids[1], actorId: ids[1], name: "Synthetic Attendee", email: "attendee@example.invalid", status: "pending_approval", priority: false, createdAt: "2026-11-18T17:01:00Z", decidedAt: null, identityMasked: "••••••5678", offerExpiresAt: null, ticketStatus: null },
    { id: ids[2], actorId: ids[2], name: "Synthetic Approved", email: "approved@example.invalid", status: options.revokedTicket ? "cancelled" : "approved", priority: false, createdAt: "2026-11-18T17:02:00Z", decidedAt: "2026-11-19T09:00:00Z", identityMasked: "••••••9012", offerExpiresAt: null, ticketStatus: options.revokedTicket ? "revoked" : "issued" },
  ];
  let designations = [{ actorId: participantId, name: "Synthetic Volunteer", email: "volunteer@example.invalid", active: true, reason: "Logistics committee", designatedAt: "2026-10-17T10:00:00Z", designatedByName: "Synthetic Staff", removedAt: null as string | null }];
  let earlyEntries: StaffEarlyAccessEntry[] = [
    { id: earlyIds[0], email: "registered@example.invalid", addedAt: "2026-10-20T10:00:00Z", addedByName: "Synthetic Staff", hasAccount: true, hasRequest: true },
    { id: earlyIds[1], email: "future@example.invalid", addedAt: "2026-10-20T10:01:00Z", addedByName: "Synthetic Staff", hasAccount: false, hasRequest: false },
  ];
  const counts = () => ({ pending: requests.filter((r) => r.status === "pending_approval").length, approved: requests.filter((r) => r.status === "approved").length, waitlisted: requests.filter((r) => r.status === "waitlisted").length, offered: requests.filter((r) => r.status === "offered").length, expired: requests.filter((r) => r.status === "expired").length, capacity, remaining: capacity === null ? null : capacity - requests.filter((r) => r.status === "approved").length });
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const base: StaffResponse = { state: "authenticated", profile: { actorId, name: "Synthetic Staff", roles }, formToken: "synthetic-console-token" };
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload; actions.push(payload);
      if (payload.action === "activity") return route.fulfill({ contentType: "application/json", body: JSON.stringify(base) });
      if (payload.action === options.missingAction) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ...base, state: "area-not-ready" }) });
      if (payload.action === "early-access-add") {
        const invalid: string[] = (payload.emails ?? []).filter((email) => email === "not-an-email");
        const added = (payload.emails ?? []).filter((email) => !invalid.includes(email) && !earlyEntries.some((entry) => entry.email === email));
        earlyEntries = [...earlyEntries, ...added.map((email, index) => ({ id: `21000000-0000-4000-8000-${String(earlyEntries.length + index + 1).padStart(12, "0")}`, email, addedAt: "2026-10-20T11:00:00Z", addedByName: "Synthetic Staff", hasAccount: false, hasRequest: false }))];
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...base, state: "updated", added: added.length, invalid }) });
      }
      if (payload.action === "early-access-remove") {
        const removed = earlyEntries.filter((entry) => payload.entryIds?.includes(entry.id)).length;
        earlyEntries = earlyEntries.filter((entry) => !payload.entryIds?.includes(entry.id));
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...base, state: "updated", removed }) });
      }
      if (payload.action === "registration-approve") {
        if (capacity === null) return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ ...base, state: "capacity-not-set" }) });
        let approved = 0, skipped = 0;
        requests = requests.map((r) => payload.requestIds?.includes(r.id) ? (["pending_approval", "waitlisted"].includes(r.status) ? (approved++, { ...r, status: "approved" as const, ticketStatus: "issued" as const }) : (skipped++, r)) : r);
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...base, state: "updated", decided: { approved, waitlisted: 0, skipped } }) });
      }
      if (payload.action === "registration-offer") {
        if (options.offerWindow === false) return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ ...base, state: "offer-window-not-set" }) });
        let offered = 0;
        requests = requests.map((r) => payload.requestIds?.includes(r.id) && r.status === "waitlisted" ? (offered++, { ...r, status: "offered" as const, offerExpiresAt: "2026-11-20T09:00:00Z" }) : r);
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...base, state: "updated", decided: { approved: 0, waitlisted: 0, skipped: 0, offered } }) });
      }
      if (payload.action === "registration-waitlist") {
        let waitlisted = 0;
        requests = requests.map((r) => payload.requestIds?.includes(r.id) && r.status === "pending_approval" ? (waitlisted++, { ...r, status: "waitlisted" as const }) : r);
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...base, state: "updated", decided: { approved: 0, waitlisted, skipped: 0 } }) });
      }
      if (payload.action === "priority-remove") designations = designations.map((d) => d.actorId === payload.targetId ? { ...d, active: false, removedAt: "2026-10-17T11:00:00Z" } : d);
      if (payload.action === "priority-set") designations = [...designations, { actorId: payload.targetId!, name: "Synthetic Candidate", email: "candidate@example.invalid", active: true, reason: payload.reason!, designatedAt: "2026-10-17T12:00:00Z", designatedByName: "Synthetic Staff", removedAt: null }];
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ...base, state: "updated" }) });
    }
    const area = url.searchParams.get("area");
    if (area && area === options.missingArea) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ state: "area-not-ready" }) });
    if (area) reads.push(`${area}:${url.searchParams.get("status") ?? "all"}:${url.searchParams.get("q") ?? ""}`);
    let response: StaffResponse = base;
    if (area === "summary") response = { ...base, summary: { registration: counts(), participants: 128, staff: 9, auditLast24h: 41, priority: designations.filter((d) => d.active).length } };
    if (area === "registration") { const status = url.searchParams.get("status"); response = { ...base, registration: { requests: status ? requests.filter((r) => r.status === status) : requests, counts: counts() } }; }
    if (area === "registration-export") return options.exportRefused
      ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ state: "denied" }) })
      : route.fulfill({ contentType: "text/csv; charset=utf-8", headers: { "content-disposition": 'attachment; filename="registration-synthetic.csv"' }, body: "\uFEFFname,email\r\nSynthetic,a@example.invalid\r\n" });
    if (area === "registration-detail") {
      const request = requests.find((r) => r.id === url.searchParams.get("requestId"))!;
      // Combined synthetic display fixture exercises every event label; database
      // tests assert each real request's distinct, valid lifecycle.
      response = { ...base, registrationDetail: { request, history: historyEvents.map((event, index) => ({ ...event,
        id: `21000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
        at: new Date(Date.parse("2026-11-19T08:00:00Z") - index * 60000).toISOString(),
        performerName: event.actorKind === "staff" ? "Synthetic Staff" : null })) } };
    }
    if (area === "priority") response = { ...base, priority: { designations, candidates: url.searchParams.get("q") ? [{ actorId: "21000000-0000-4000-8000-0000000000c1", name: "Synthetic Candidate", email: "candidate@example.invalid", status: "verified", createdAt: "2026-10-10T10:00:00Z" }] : undefined } };
    if (area === "early-access") { const query = url.searchParams.get("q")?.toLowerCase() ?? ""; response = { ...base, earlyAccess: { entries: earlyEntries.filter((entry) => entry.email.includes(query)) } }; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(response) });
  });
  return { actions, reads };
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}
async function shot(page: Page, name: string, project: string) {
  await mkdir(".tools/staff-console", { recursive: true });
  await page.screenshot({ path: `.tools/staff-console/${name}-${project}.png`, fullPage: true });
}

for (const locale of ["en", "ar"] as const) {
  const copy = staffCopy[locale], text = consoleCopy[locale];

  test(`${locale} Super Admin sees every area tab and live dashboard counts`, async ({ page }, testInfo) => {
    await consoleFixture(page, ["superAdmin"]);
    await page.goto(`/${locale}/staff`);
    const menu = page.getByRole("navigation", { name: copy.menu });
    await expect(menu).toBeVisible();
    await expect(menu.locator("li")).toHaveCount(staffMenu(["superAdmin"]).length);
    for (const key of ["registration", "priority", "early-access", "finance", "check-in", "science", "content", "sponsorship"] as const) await expect(menu).toContainText(copy.areas[key]);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const overview = page.locator(".staff-dashboard");
    await expect(overview).toContainText(text.cards.pending);
    await expect(overview).toContainText(locale === "en" ? "1,999" : "١٬٩٩٩");
    await expect(overview).toContainText(locale === "en" ? "128" : "١٢٨");
    await shot(page, `${locale}-dashboard`, testInfo.project.name);
    await axe(page);
  });

  test(`${locale} registration queue bulk-approves selected requests and keeps seat counts`, async ({ page }, testInfo) => {
    const mock = await consoleFixture(page, ["registrationWorkshopAdministrator"]);
    await page.goto(`/${locale}/staff/registration`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.areas.registration);
    await expect(page.getByTestId("queue-row")).toHaveCount(3);
    await expect(page.getByTestId("queue-ticket").nth(0)).toHaveText(text.registration.ticketStatuses.none);
    await expect(page.getByTestId("queue-ticket").nth(2)).toHaveText(text.registration.ticketStatuses.issued);
    await expect(page.locator(".staff-tag").first()).toHaveText(text.registration.priority);
    await shot(page, `${locale}-queue`, testInfo.project.name);
    await axe(page);
    for (const row of await page.getByTestId("queue-row").all()) { const box = row.getByRole("checkbox"); if (await box.count()) await box.check(); }
    await expect(page.locator(".staff-bulk-bar")).toContainText(text.registration.selected(2));
    await page.getByTestId("queue-approve-selected").click();
    await expect.poll(() => mock.actions.find((action) => action.action === "registration-approve")?.requestIds?.sort()).toEqual([ids[0], ids[1]].sort());
    await expect(page.locator(".staff-feedback")).toContainText(text.registration.decided(2, 0, 0));
    await expect(page.getByTestId("queue-ticket")).toHaveText(Array(3).fill(text.registration.ticketStatuses.issued));
    await page.locator(".staff-queue-filters select").selectOption("approved");
    await expect.poll(() => mock.reads.some((read) => read.startsWith("registration:approved"))).toBe(true);
  });

  test(`${locale} approvals stay disabled while capacity is not set`, async ({ page }) => {
    await consoleFixture(page, ["superAdmin"], { capacity: null });
    await page.goto(`/${locale}/staff/registration`);
    await expect(page.locator(".staff-note")).toHaveText(text.registration.capacityUnset);
    for (const button of await page.getByRole("button", { name: text.registration.approve, exact: true }).all()) await expect(button).toBeDisabled();
  });

  test(`${locale} organizing-team priority needs a reason and is Super Admin only`, async ({ page }, testInfo) => {
    const mock = await consoleFixture(page, ["superAdmin"]);
    await page.goto(`/${locale}/staff/priority`);
    await expect(page.locator(".staff-candidates").first()).toContainText("Synthetic Volunteer");
    await page.getByLabel(copy.searchParticipants).fill("candidate");
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    const add = page.getByRole("button", { name: text.priority.mark, exact: true });
    await add.click();
    await expect(page.getByText(text.priority.reasonRequired)).toBeVisible();
    expect(mock.actions.some((action) => action.action === "priority-set")).toBe(false);
    await page.locator("#priority-add-21000000-0000-4000-8000-0000000000c1").fill("Registration desk volunteer");
    await add.click();
    await expect.poll(() => mock.actions.find((action) => action.action === "priority-set")?.reason).toBe("Registration desk volunteer");
    await shot(page, `${locale}-priority`, testInfo.project.name);
    await axe(page);
  });

  test(`${locale} early access normalizes pasted emails, reports invalid entries and supports removal and search`, async ({ page }, testInfo) => {
    const early = text.earlyAccess;
    const mock = await consoleFixture(page, ["superAdmin"]);
    await page.goto(`/${locale}/staff/early-access`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.areas["early-access"]);
    await expect(page.getByRole("navigation", { name: copy.menu }).getByRole("link", { name: copy.areas["early-access"], exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByTestId("early-row")).toHaveCount(2);
    await expect(page.getByRole("columnheader", { name: early.account, exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: early.request, exact: true })).toBeVisible();
    const registered = page.getByTestId("early-row").filter({ hasText: "registered@example.invalid" });
    await expect(registered).toContainText(early.hasAccount);
    await expect(registered).toContainText(early.requested);
    await expect(registered.locator("bdi").first()).toHaveAttribute("dir", "ltr");
    const future = page.getByTestId("early-row").filter({ hasText: "future@example.invalid" });
    await expect(future).toContainText(early.noAccount);
    await expect(future.locator("td").nth(2)).toHaveText("—");
    const paste = page.getByLabel(early.paste);
    await expect(paste).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("early-add")).toBeDisabled();
    await paste.fill("  FIRST@Example.Invalid, not-an-email;\n SECOND@EXAMPLE.INVALID  ");
    await page.getByTestId("early-add").click();
    await expect.poll(() => mock.actions.find((action) => action.action === "early-access-add")?.emails).toEqual(["first@example.invalid", "not-an-email", "second@example.invalid"]);
    await expect(paste).toHaveValue("not-an-email");
    await expect(paste).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("note")).toHaveText(early.invalid(1));
    await expect(page.locator(".staff-feedback")).toHaveText(early.added(2, 1));
    await expect(page.getByTestId("early-row")).toHaveCount(4);
    await shot(page, `${locale}-early-access`, testInfo.project.name);
    await axe(page);
    // Duplicate input must use the server's actual added count, rather than attempted entries.
    await paste.fill("FIRST@example.invalid; first@example.invalid");
    await expect(paste).not.toHaveAttribute("aria-invalid", "true");
    await page.getByTestId("early-add").click();
    await expect.poll(() => mock.actions.filter((action) => action.action === "early-access-add").at(-1)?.emails).toEqual(["first@example.invalid"]);
    await expect(page.locator(".staff-feedback")).toHaveText(early.added(0, 0));
    await expect(paste).toHaveValue("");
    await expect(page.getByTestId("early-row")).toHaveCount(4);
    await future.getByRole("button", { name: `${early.remove}: future@example.invalid`, exact: true }).click();
    await expect.poll(() => mock.actions.find((action) => action.action === "early-access-remove")?.entryIds).toEqual([earlyIds[1]]);
    await expect(page.locator(".staff-feedback")).toHaveText(early.removed(1));
    await expect(future).toHaveCount(0);
    await expect(page.getByTestId("early-row")).toHaveCount(3);
    await registered.getByRole("checkbox").check();
    await expect(page.getByTestId("early-remove-selected")).toBeVisible();
    await page.getByLabel(early.search, { exact: true }).fill("second");
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    await expect.poll(() => mock.reads.includes("early-access:all:second")).toBe(true);
    await expect(page.getByTestId("early-row")).toHaveCount(1);
    await expect(page.getByTestId("early-row")).toContainText("second@example.invalid");
    await expect(page.getByTestId("early-remove-selected")).toHaveCount(0);
    await expect(page.getByTestId("early-row").getByRole("checkbox")).not.toBeChecked();
    await page.getByTestId("early-row").getByRole("checkbox").check();
    await page.getByTestId("early-remove-selected").click();
    await expect.poll(() => mock.actions.filter((action) => action.action === "early-access-remove").at(-1)?.entryIds).toEqual(["21000000-0000-4000-8000-000000000004"]);
    await expect(page.locator(".staff-feedback")).toHaveText(early.removed(1));
    await expect(page.getByTestId("early-row")).toHaveCount(0);
    await page.getByLabel(early.search, { exact: true }).fill("registered");
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    await expect(registered).toHaveCount(1);
  });

  test(`${locale} a registration administrator cannot see or open early-access controls`, async ({ page }) => {
    const mock = await consoleFixture(page, ["registrationWorkshopAdministrator"]);
    await page.goto(`/${locale}/staff`);
    const menu = page.getByRole("navigation", { name: copy.menu });
    await expect(menu).toContainText(copy.areas.registration);
    await expect(menu.getByRole("link", { name: copy.areas["early-access"], exact: true })).toHaveCount(0);
    await page.goto(`/${locale}/staff/early-access`);
    await expect(page.locator(".staff-workspace").getByRole("alert")).toHaveText(copy.states.denied);
    await expect(page.getByTestId("early-add")).toHaveCount(0);
    await expect(page.getByTestId("early-row")).toHaveCount(0);
    expect(mock.actions.some((action) => action.action.startsWith("early-access-"))).toBe(false);
    await axe(page);
  });

  test(`${locale} early-access read failures replace old success text and recover on search`, async ({ page }) => {
    const early = text.earlyAccess, options: { missingArea?: string } = {};
    const mock = await consoleFixture(page, ["superAdmin"], options);
    await page.goto(`/${locale}/staff/early-access`);
    await page.getByLabel(early.paste).fill("success@example.invalid");
    await page.getByTestId("early-add").click();
    await expect(page.locator(".staff-feedback")).toHaveText(early.added(1, 0));
    await expect(page.getByTestId("early-row")).toHaveCount(3);
    options.missingArea = "early-access";
    await page.getByLabel(early.search, { exact: true }).fill("success");
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    await expect(page.locator(".staff-feedback")).toHaveText(copy.states["area-not-ready"]);
    await expect(page.getByRole("navigation", { name: copy.menu })).toBeVisible();
    await expect(page.getByTestId("staff-name")).toBeVisible();
    options.missingArea = undefined;
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    await expect(page.getByTestId("early-row")).toHaveCount(1);
    await expect(page.getByTestId("early-row")).toContainText("success@example.invalid");
    await expect(page.locator(".staff-feedback")).toBeEmpty();
    // A successful write followed by a failed refresh must still explain the read failure.
    options.missingArea = "early-access";
    await page.getByLabel(early.paste).fill("refresh@example.invalid");
    await page.getByTestId("early-add").click();
    await expect.poll(() => mock.actions.filter((action) => action.action === "early-access-add").at(-1)?.emails).toEqual(["refresh@example.invalid"]);
    await expect(page.locator(".staff-feedback")).toHaveText(copy.states["area-not-ready"]);
    await expect(page.getByRole("navigation", { name: copy.menu })).toBeVisible();
    await expect(page.getByTestId("staff-name")).toBeVisible();
    await expect(page.getByLabel(copy.password)).toHaveCount(0);
    await axe(page);
  });

  test(`${locale} planned areas explain themselves and review is oversight-only for Super Admin`, async ({ page }) => {
    await consoleFixture(page, ["superAdmin"]);
    await page.goto(`/${locale}/staff/review`);
    await expect(page.locator(".staff-landing")).toHaveAttribute("lang", "en");
    await expect(page.locator(".staff-oversight")).toHaveText(consoleCopy.en.landing.oversight);
    await page.goto(`/${locale}/staff/finance`);
    await expect(page.locator(".staff-landing h2")).toHaveText(text.landing.areas.finance.title);
    await expect(page.locator(".staff-oversight")).toHaveCount(0);
    await axe(page);
  });
}

for (const locale of ["en", "ar"] as const) for (const area of ["priority", "early-access"] as const) test(`${locale} ${area} whose database update is pending keeps the console signed in`, async ({ page }) => {
  await consoleFixture(page, ["superAdmin"], { missingArea: area });
  await page.goto(`/${locale}/staff/${area}`);
  await expect(page.locator(".staff-feedback")).toHaveText(staffCopy[locale].states["area-not-ready"]);
  await expect(page.getByRole("navigation", { name: staffCopy[locale].menu })).toBeVisible();
  await expect(page.getByTestId("staff-name")).toBeVisible();
  await expect(page.getByLabel(staffCopy[locale].password)).toHaveCount(0);
});

for (const locale of ["en", "ar"] as const) for (const action of ["early-access-add", "early-access-remove"] as const) test(`${locale} a missing ${action} RPC preserves the list and signed-in session`, async ({ page }) => {
  const copy = staffCopy[locale], early = consoleCopy[locale].earlyAccess;
  await consoleFixture(page, ["superAdmin"], { missingAction: action });
  await page.goto(`/${locale}/staff/early-access`);
  await expect(page.getByTestId("early-row")).toHaveCount(2);
  if (action === "early-access-add") {
    await page.getByLabel(early.paste).fill("new@example.invalid");
    await page.getByTestId("early-add").click();
  } else await page.getByRole("button", { name: `${early.remove}: future@example.invalid`, exact: true }).click();
  await expect(page.locator(".staff-feedback")).toHaveText(copy.states["area-not-ready"]);
  await expect(page.getByRole("navigation", { name: copy.menu })).toBeVisible();
  await expect(page.getByTestId("staff-name")).toBeVisible();
  await expect(page.getByTestId("early-row")).toHaveCount(2);
  await expect(page.getByLabel(copy.password)).toHaveCount(0);
  if (action === "early-access-add") await expect(page.getByLabel(early.paste)).toHaveValue("new@example.invalid");
});

for (const locale of ["en", "ar"] as const) test(`${locale} waitlisted requests can be offered a seat, and details show complete request history`, async ({ page }, testInfo) => {
  const text = consoleCopy[locale].registration;
  const mock = await consoleFixture(page, ["superAdmin"]);
  await page.goto(`/${locale}/staff/registration`);
  await page.getByTestId("queue-row").nth(1).getByRole("button", { name: text.waitlist, exact: true }).click();
  await expect(page.getByTestId("queue-row").nth(1)).toContainText(text.statuses.waitlisted);
  await page.getByTestId("queue-row").nth(1).getByRole("button", { name: text.offer, exact: true }).click();
  await expect.poll(() => mock.actions.find((action) => action.action === "registration-offer")?.requestIds).toEqual([ids[1]]);
  await expect(page.locator(".staff-feedback")).toContainText(text.decided(0, 0, 0, 1));
  await expect(page.getByTestId("queue-row").nth(1)).toContainText(text.offerEnds);
  await page.getByTestId("queue-row").nth(1).getByRole("button", { name: new RegExp(text.details) }).click();
  const detail = page.getByTestId("queue-detail");
  await expect(detail.getByRole("heading", { level: 3 })).toBeFocused();
  const entries = detail.locator(".staff-decisions li");
  await expect(entries).toHaveCount(historyEvents.length);
  for (const [index, event] of historyEvents.entries()) {
    await expect(entries.nth(index)).toContainText(event.event === "request.offered" && event.actorKind === "automatic" ? text.automaticOffer : text.events[event.event]);
    await expect(entries.nth(index)).toContainText(`${text.by}: ${event.actorKind === "participant" ? text.participant : event.actorKind === "automatic" ? text.automatic : "Synthetic Staff"}`);
    if (event.from && event.to) await expect(entries.nth(index)).toContainText(`${text.statuses[event.from]} ${locale === "ar" ? "←" : "→"} ${text.statuses[event.to]}`);
  }
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, `${locale}-detail`, testInfo.project.name);
  await axe(page);
  await detail.getByRole("button", { name: text.closeDetails }).click();
  await expect(detail).toHaveCount(0);
});

for (const locale of ["en", "ar"] as const) for (const revokedTicket of [false, true]) test(`${locale} ${revokedTicket ? "revoked" : "issued"} ticket indicator appears in queue and request details`, async ({ page }, testInfo) => {
  const text = consoleCopy[locale].registration;
  await consoleFixture(page, ["registrationWorkshopAdministrator"], { revokedTicket });
  await page.goto(`/${locale}/staff/registration`);
  const row = page.getByTestId("queue-row").filter({ hasText: "Synthetic Approved" });
  const label = revokedTicket ? text.ticketStatuses.revoked : text.ticketStatuses.issued;
  await expect(row.getByTestId("queue-ticket")).toHaveText(label);
  await row.getByRole("button", { name: `${text.details}: Synthetic Approved`, exact: true }).click();
  await expect(page.getByTestId("detail-ticket")).toHaveText(label);
  await expect(page.getByTestId("queue-detail").getByRole("heading", { level: 3 })).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await axe(page);
  await shot(page, `${locale}-ticket-${revokedTicket ? "revoked" : "issued"}`, testInfo.project.name);
});

for (const locale of ["en", "ar"] as const) test(`${locale} offering without an offer window explains why`, async ({ page }) => {
  const text = consoleCopy[locale].registration;
  await consoleFixture(page, ["superAdmin"], { offerWindow: false });
  await page.goto(`/${locale}/staff/registration`);
  await page.getByTestId("queue-row").nth(1).getByRole("button", { name: text.waitlist, exact: true }).click();
  await page.getByTestId("queue-row").nth(1).getByRole("button", { name: text.offer, exact: true }).click();
  await expect(page.locator(".staff-feedback")).toHaveText(staffCopy[locale].states["offer-window-not-set"]);
});

test("only a Super Admin sees the registration export", async ({ page }) => {
  await consoleFixture(page, ["superAdmin"]);
  await page.goto("/en/staff/registration");
  const download = page.waitForEvent("download");
  await page.getByTestId("queue-export").click();
  expect((await download).suggestedFilename()).toBe("registration-synthetic.csv");
  await consoleFixture(page, ["registrationWorkshopAdministrator"]);
  await page.goto("/en/staff/registration");
  await expect(page.getByTestId("queue-row").first()).toBeVisible();
  await expect(page.getByTestId("queue-export")).toHaveCount(0);
});

test("a refused export explains itself instead of saving an error file", async ({ page }) => {
  await consoleFixture(page, ["superAdmin"], { exportRefused: true });
  await page.goto("/en/staff/registration");
  let downloaded = false; page.on("download", () => { downloaded = true; });
  await page.getByTestId("queue-export").click();
  await expect(page.locator(".staff-feedback")).toHaveText(staffCopy.en.states.denied);
  expect(downloaded).toBe(false);
});

test("a role without priority access never sees the priority tab", async ({ page }) => {
  await consoleFixture(page, ["registrationWorkshopAdministrator"]);
  await page.goto("/en/staff");
  const menu = page.getByRole("navigation", { name: staffCopy.en.menu });
  await expect(menu).toContainText(staffCopy.en.areas.registration);
  await expect(menu).not.toContainText(staffCopy.en.areas.priority);
  await expect(menu).not.toContainText(staffCopy.en.areas.people);
});
