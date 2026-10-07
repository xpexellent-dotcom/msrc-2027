import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { staffCopy } from "../../src/features/staff-portal/copy";
import type { Role } from "../../src/lib/permissions/contract";
import type { StaffAction, StaffInvitation, StaffPayload, StaffPerson, StaffResponse } from "../../src/features/staff-portal/ui-contract";

const actorId = "12000000-0000-4000-8000-000000000001", otherId = "12000000-0000-4000-8000-000000000002";
const staffId = "12000000-0000-4000-8000-000000000003", invitationId = "12000000-0000-4000-8000-000000000004";
const replacementInvitationId = "12000000-0000-4000-8000-000000000005";

/** Stateful presentation fixtures. Native server/database checks remain independent evidence. */
async function actionFixture(page: Page) {
  const actions: StaffPayload[] = [], failures = new Set<StaffAction>();
  const failOnce = new Set<StaffAction>(["roles", "invite-resend", "reset-authenticator", "reset-account"]);
  let sequence = 0, people: StaffPerson[], invitations: StaffInvitation[];
  let heldAction: StaffAction | null = null;
  function reset() {
    people = [
      { actorId, name: "Synthetic Current Admin", email: "current@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: "2026-10-07T10:00:00Z" },
      { actorId: otherId, name: "Synthetic Other Admin", email: "other@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: null },
      { actorId: staffId, name: "Synthetic Finance Staff", email: "finance@example.invalid", roles: ["finance"], status: "active", lastSignIn: null },
    ];
    invitations = [{ id: invitationId, email: "invited@example.invalid", roles: ["finance"], status: "pending", expiresAt: "2026-10-10T10:00:00Z" }];
    failures.clear();
    heldAction = null;
  }
  reset();
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    let response: StaffResponse = { state: "authenticated", profile: { actorId, name: "Synthetic Current Admin", roles: ["superAdmin"] } };
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload;
      actions.push(payload);
      if (failOnce.has(payload.action) && !failures.has(payload.action)) {
        failures.add(payload.action); response = { state: "unavailable" };
        if (payload.action === "reset-authenticator" || payload.action === "reset-account") {
          people.find((person) => person.actorId === payload.targetId)!.recoveryState = "failed";
          heldAction = payload.action;
        }
      } else if (payload.action === "roles") {
        const person = people.find((entry) => entry.actorId === payload.targetId)!;
        person.roles = payload.roles as Role[]; response = { state: "updated" };
      } else if (payload.action === "suspend" || payload.action === "reactivate") {
        const person = people.find((entry) => entry.actorId === payload.targetId)!;
        if (person.roles.includes("superAdmin") && payload.action === "suspend") response = { state: "denied" };
        else { person.status = payload.action === "suspend" ? "suspended" : "active"; response = { state: "updated" }; }
      } else if (payload.action === "invite-resend") {
        invitations.forEach((invitation) => { if (invitation.status === "pending") invitation.status = "revoked"; });
        invitations.push({ id: replacementInvitationId, email: payload.email!, roles: payload.roles!, status: "pending", expiresAt: "2026-10-10T10:00:00Z" });
        response = { state: "invited" };
      } else if (payload.action === "invite-revoke") {
        invitations.find((invitation) => invitation.id === payload.invitationId)!.status = "revoked";
        response = { state: "updated" };
      } else if (payload.action === "reset-authenticator" || payload.action === "reset-account") {
        if (heldAction === "reset-account" && payload.action === "reset-authenticator") response = { state: "denied" };
        else {
          people.find((person) => person.actorId === payload.targetId)!.recoveryState = payload.action === "reset-account" ? "awaiting_invitation" : "none";
          heldAction = null; response = { state: "updated" };
        }
      } else response = { state: "updated" };
    } else if (url.searchParams.get("area") === "people") response = { ...response, people, invitations };
    response.formToken = `synthetic-mobile-form-${++sequence}`;
    await route.fulfill({ status: response.state === "unavailable" ? 503 : response.state === "denied" ? 403 : 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return { actions, reset };
}

async function boundedControl(page: Page, control: Locator, region?: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  const box = (await control.boundingBox())!;
  const boundary = region ? (await region.boundingBox())! : { x: 0, width: 320 };
  expect(box.width, "The complete control fits in its visible scrolling region.").toBeLessThanOrEqual(boundary.width + 1);
  expect(box.x).toBeGreaterThanOrEqual(boundary.x - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(boundary.x + boundary.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
}

async function keyboardAction(page: Page, control: Locator, region?: Locator) {
  await boundedControl(page, control, region);
  await expect(control).toBeEnabled();
  await control.focus(); await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

for (const locale of ["en", "ar"] as const) test(`${locale} mobile People table actions remain reachable at 320px and 200% text`, async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, "Mobile table actions and horizontal regions.");
  const copy = staffCopy[locale], mock = await actionFixture(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const size of ["100%", "200%"]) {
    mock.reset();
    await page.goto(`/${locale}/staff/people`);
    await expect(page.getByRole("rowheader", { name: "Synthetic Finance Staff finance@example.invalid" })).toBeVisible();
    await page.evaluate(async (size) => { await document.fonts.ready; document.documentElement.style.fontSize = size; }, size);
    const region = page.getByRole("region", { name: copy.staff, exact: true });
    await region.scrollIntoViewIfNeeded(); await region.focus();
    await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
    await expect.poll(() => region.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
    const row = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Synthetic Finance Staff finance@example.invalid" }) });
    await keyboardAction(page, row.getByText(copy.editRoles, { exact: true }), region);
    const finance = row.getByRole("checkbox", { name: copy.roleLabels.finance, exact: true });
    const registration = row.getByRole("checkbox", { name: copy.roleLabels.registrationWorkshopAdministrator, exact: true });
    await boundedControl(page, registration.locator(".."), region);
    await finance.focus(); await page.keyboard.press("Space");
    await registration.focus(); await page.keyboard.press("Space");
    await expect(finance).not.toBeChecked(); await expect(registration).toBeChecked();
    await registration.locator("..").screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-role-choice-${size.replace("%", "")}.png` });
    const save = row.getByRole("button", { name: copy.saveRoles, exact: true });
    await keyboardAction(page, save, region);
    await expect(page.locator('.staff-feedback[role="alert"]')).toContainText(copy.states.unavailable);
    await expect(registration).toBeChecked();
    await keyboardAction(page, save, region);
    await expect(page.getByRole("status")).toContainText(copy.states.updated);
    await expect(row.getByRole("cell", { name: copy.roleLabels.registrationWorkshopAdministrator, exact: true })).toBeVisible();
    await expect.poll(() => mock.actions.filter((action) => action.action === "roles").at(-1)).toMatchObject({ targetId: staffId, roles: ["registrationWorkshopAdministrator"] });

    await keyboardAction(page, row.getByRole("button", { name: copy.suspend, exact: true }), region);
    await expect(row.getByRole("cell", { name: copy.statuses.suspended, exact: true })).toBeVisible();
    await keyboardAction(page, row.getByRole("button", { name: copy.reactivate, exact: true }), region);
    await expect(row.getByRole("cell", { name: copy.statuses.active, exact: true })).toBeVisible();
    await keyboardAction(page, row.getByRole("button", { name: copy.revokeSessions, exact: true }), region);
    await expect(page.getByRole("status")).toContainText(copy.states.updated);

    const other = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Synthetic Other Admin other@example.invalid" }) });
    await keyboardAction(page, other.getByText(copy.editRoles, { exact: true }), region);
    await keyboardAction(page, other.getByRole("button", { name: copy.suspend, exact: true }), region);
    await expect(page.locator('.staff-feedback[role="alert"]')).toContainText(copy.states.denied);
    await expect(other.getByRole("cell", { name: copy.statuses.active, exact: true })).toBeVisible();
    for (const [action, label] of [["reset-authenticator", copy.resetAuthenticator], ["reset-account", copy.resetAccount]] as const) {
      const reset = other.getByRole("button", { name: label, exact: true });
      await keyboardAction(page, reset, region);
      await expect(page.locator('.staff-feedback[role="alert"]')).toContainText(copy.states.unavailable);
      await expect(other.locator(".staff-recovery-state")).toHaveText(copy.recoveryStates.failed);
      if (action === "reset-account") {
        await keyboardAction(page, other.getByRole("button", { name: copy.resetAuthenticator, exact: true }), region);
        await expect(page.locator('.staff-feedback[role="alert"]')).toContainText(copy.states.denied);
        await expect(other.locator(".staff-recovery-state")).toHaveText(copy.recoveryStates.failed);
      }
      await keyboardAction(page, reset, region);
      await expect(page.getByRole("status")).toContainText(copy.states.updated);
      await expect.poll(() => mock.actions.filter((entry) => entry.action === action).at(-1)?.targetId).toBe(otherId);
      if (action === "reset-account") await expect(other.locator(".staff-recovery-state")).toHaveText(copy.recoveryStates.awaiting_invitation);
      else await expect(other.locator(".staff-recovery-state")).toHaveCount(0);
    }
    await other.locator(".staff-actions").screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-row-actions-${size.replace("%", "")}.png` });
    const current = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Synthetic Current Admin current@example.invalid" }) });
    await keyboardAction(page, current.getByText(copy.editRoles, { exact: true }), region);
    await expect(current.getByRole("button", { name: copy.resetAuthenticator, exact: true })).toHaveCount(0);
    await expect(current.getByRole("button", { name: copy.resetAccount, exact: true })).toHaveCount(0);

    const pending = page.locator(".staff-invitations li").filter({ hasText: copy.statuses.pending });
    await keyboardAction(page, pending.getByRole("button", { name: copy.resend, exact: true }));
    await expect(page.locator('.staff-feedback[role="alert"]')).toContainText(copy.states.unavailable);
    await keyboardAction(page, pending.getByRole("button", { name: copy.resend, exact: true }));
    await expect(page.getByRole("status")).toContainText(copy.states.invited);
    await expect.poll(() => mock.actions.filter((action) => action.action === "invite-resend").at(-1)).toMatchObject({ email: "invited@example.invalid", roles: ["finance"] });
    await pending.screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-invitation-actions-${size.replace("%", "")}.png` });
    await keyboardAction(page, pending.getByRole("button", { name: copy.revokeInvite, exact: true }));
    await expect(page.getByRole("status")).toContainText(copy.states.updated);
    await expect(page.locator(".staff-invitations").getByRole("button")).toHaveCount(0);
    await expect.poll(() => mock.actions.filter((action) => action.action === "invite-revoke").at(-1)?.invitationId).toBe(replacementInvitationId);
    const beforeUp = await page.evaluate(() => window.scrollY);
    const heading = page.getByRole("heading", { level: 1 });
    await heading.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
    await expect(heading).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(beforeUp);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  }
});
