import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { staffMenu } from "../../src/features/staff-portal/menu";
import { ROLES, type Role } from "../../src/lib/permissions/contract";
import type { StaffPayload, StaffProfile, StaffResponse, StaffState } from "../../src/features/staff-portal/ui-contract";

const actorId = "11000000-0000-4000-8000-000000000001", otherId = "11000000-0000-4000-8000-000000000002";
const participantId = "11000000-0000-4000-8000-000000000003", factorId = "11000000-0000-4000-8000-000000000004", challengeId = "11000000-0000-4000-8000-000000000005";
const invitationId = "11000000-0000-4000-8000-000000000006";

/** Presentation fixtures only. Native API and database permission evidence runs independently. */
async function fixture(page: Page, initialRoles: Role[] = ["registrationWorkshopAdministrator"], authenticated = false) {
  let state: StaffState = authenticated ? "authenticated" : "ready", roles = initialRoles, sequence = 0;
  const actions: StaffPayload[] = [], searches: string[] = [];
  const profile = (): StaffProfile => ({ actorId, name: "Synthetic Staff", roles });
  let hasChallenge = false;
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    let response: StaffResponse = { state, profile: state === "authenticated" ? profile() : null };
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload; actions.push(payload);
      if (payload.action === "signin") { roles = payload.email?.startsWith("super") ? ["superAdmin"] : initialRoles; state = roles.includes("superAdmin") ? "pending-totp" : "pending-email"; }
      else if (payload.action === "challenge-email") { state = "pending-email"; hasChallenge = true; }
      else if (payload.action === "invite-accept") { roles = ["superAdmin"]; state = "enroll-totp"; }
      else if (payload.action === "enroll-totp") { state = "pending-totp"; hasChallenge = true; }
      else if (payload.action === "verify-email" || payload.action === "verify-totp") state = payload.code === "654321" ? "authenticated" : state;
      else if (payload.action === "logout") state = "ready";
      response = { state, profile: state === "authenticated" ? profile() : null };
      if ((payload.action === "verify-email" || payload.action === "verify-totp") && payload.code !== "654321") response.state = "invalid-code";
      if (payload.action === "invite" || payload.action === "invite-resend") response.state = "invited";
      if (["roles", "suspend", "reactivate", "revoke-sessions", "reset-authenticator", "reset-account", "invite-revoke"].includes(payload.action)) response.state = "updated";
      if (payload.action === "logout") response.state = "signed-out";
      if (payload.action === "reveal-identity") response = { state: "updated", identity: "SYNTHETIC1234" };
      if (payload.action === "enroll-totp") response.enrollment = { factorId, secret: "SYNTHETICSETUPONLY", qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2lAAAAABJRU5ErkJggg==" };
    } else if (url.searchParams.has("area") && state === "authenticated") {
      const area = url.searchParams.get("area"), search = url.searchParams.get("q") ?? "";
      searches.push(search);
      if (!staffMenu(roles).some((entry) => entry.key === area)) response = { state: "denied" };
      else if (area === "people") response = { state, profile: profile(), people: [
        { actorId, name: "Synthetic Staff", email: "super@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: "2026-10-07T10:00:00Z" },
        { actorId: otherId, name: "Synthetic Other Admin", email: "other@example.invalid", roles: ["superAdmin"], status: "active", lastSignIn: null },
      ], invitations: [{ id: invitationId, email: "invited@example.invalid", roles: ["finance"], status: "pending", expiresAt: "2026-10-10T10:00:00Z" }] };
      else if (area === "participants") response = { state, profile: profile(), participants: search === "missing" ? [] : [{ actorId: participantId, name: "Synthetic Participant", email: "participant@example.invalid", status: "verified", createdAt: "2026-10-07T10:00:00Z", identityMasked: "••••••1234" }] };
      else if (area === "audit") response = { state, profile: profile(), audit: [{ id: "audit-synthetic", actorId, targetId: otherId, actorName: "Synthetic Staff", targetName: "Synthetic Other Admin", action: "staff.invite", result: "completed", occurredAt: "2026-10-07T10:00:00Z" }] };
    }
    if (state === "pending-totp") { response.factorId = factorId; response.challengeId = challengeId; }
    if (state === "pending-email" && hasChallenge) response.challengeId = challengeId;
    response.formToken = `synthetic-form-token-${++sequence}`;
    await route.fulfill({ status: response.state === "denied" ? 403 : 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return { actions, searches };
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}
async function screenshot(page: Page, name: string, project: string) { await page.screenshot({ path: `test-results/staff-evidence/${project}-${name}.png`, fullPage: true }); }

for (const locale of ["en", "ar"] as const) {
  test(`${locale} staff email sign-in, invalid-code recovery, participant search and masking`, async ({ page }, testInfo) => {
    const copy = staffCopy[locale], mock = await fixture(page);
    await page.goto(`/${locale}/staff/sign-in`);
    await expect(page.getByRole("button", { name: copy.next, exact: true })).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".site-header, .site-footer")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await axe(page); await screenshot(page, `${locale}-sign-in`, testInfo.project.name);
    await page.getByLabel(copy.email).fill("staff@example.invalid");
    await page.getByLabel(copy.password).fill("Synthetic password only");
    await page.getByRole("button", { name: copy.next, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.emailStep, exact: true })).toBeVisible();
    await page.getByRole("button", { name: copy.requestCode }).click();
    await page.getByLabel(copy.emailCode).fill("111111");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(copy.states["invalid-code"]);
    await expect(page.getByLabel(copy.emailCode)).toHaveValue("111111");
    await page.getByLabel(copy.emailCode).fill(locale === "ar" ? "٦٥٤٣٢١" : "654321");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/staff$`));
    await expect(page.getByRole("navigation", { name: copy.menu })).toContainText(copy.areas.registration);
    await expect(page.getByRole("navigation", { name: copy.menu })).not.toContainText(copy.areas.finance);
    await page.getByRole("link", { name: copy.participants, exact: true }).click();
    await expect(page.getByRole("cell", { name: "••••••1234" })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.reveal, exact: true })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("SYNTHETIC1234");
    await axe(page); await screenshot(page, `${locale}-participants`, testInfo.project.name);
    const searchesBefore = mock.searches.length;
    await page.getByLabel(copy.searchParticipants).fill("missing");
    expect(mock.searches.length).toBe(searchesBefore);
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    await expect(page.getByText(copy.noRecords, { exact: true })).toBeVisible();
    expect(mock.searches).toContain("missing");
    expect(mock.actions.filter((action) => action.action === "verify-email").at(-1)?.code).toBe("654321");
    expect(new Set(mock.actions.map((action) => action.formToken)).size).toBe(mock.actions.length);
    expect(await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)))).toEqual([]);
  });

  test(`${locale} Super Admin people actions, audited explicit reveal and audit filters`, async ({ page }, testInfo) => {
    const copy = staffCopy[locale], mock = await fixture(page, ["superAdmin"], true);
    await page.goto(`/${locale}/staff/people`);
    await expect(page.getByRole("rowheader", { name: "Synthetic Other Admin other@example.invalid" })).toBeVisible();
    await axe(page); await screenshot(page, `${locale}-people`, testInfo.project.name);
    const own = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Synthetic Staff super@example.invalid" }) });
    await own.getByText(copy.editRoles, { exact: true }).click();
    await expect(own.getByRole("checkbox", { name: copy.roleLabels.superAdmin, exact: true })).toBeDisabled();
    await expect(own.getByRole("button", { name: copy.suspend, exact: true })).toHaveCount(0);
    await expect(own.getByRole("button", { name: copy.resetAuthenticator, exact: true })).toHaveCount(0);
    await expect(own.getByRole("button", { name: copy.resetAccount, exact: true })).toHaveCount(0);
    await page.getByLabel(copy.email).fill("new@example.invalid");
    await page.locator("#invite-roles").getByRole("checkbox", { name: copy.roleLabels.finance, exact: true }).check();
    await page.getByRole("button", { name: copy.inviteSend, exact: true }).click();
    await expect(page.getByRole("status")).toContainText(copy.states.invited);
    expect(mock.actions.some((action) => action.action === "invite" && action.roles?.includes("finance"))).toBe(true);
    await page.getByRole("link", { name: copy.home, exact: true }).click();
    await page.getByRole("link", { name: copy.participants, exact: true }).click();
    await expect(page.getByTestId("identity-value")).toHaveText("••••••1234");
    await screenshot(page, `${locale}-super-admin-participants`, testInfo.project.name);
    await page.getByRole("button", { name: copy.reveal, exact: true }).click();
    await expect(page.getByTestId("identity-value")).toHaveText("SYNTHETIC1234");
    expect(mock.actions.at(-1)).toMatchObject({ action: "reveal-identity", targetId: participantId });
    await page.getByRole("button", { name: copy.hide, exact: true }).click();
    await expect(page.getByTestId("identity-value")).toHaveText("••••••1234");
    await page.getByRole("link", { name: copy.home, exact: true }).click();
    await page.getByRole("link", { name: copy.audit, exact: true }).click();
    await expect(page.getByRole("cell", { name: "staff.invite", exact: true })).toBeVisible();
    await page.getByLabel(copy.searchAudit).fill("staff.invite");
    await page.getByRole("button", { name: copy.search, exact: true }).click();
    expect(mock.searches).toContain("staff.invite"); await axe(page);
  });

  test(`${locale} invitation fragment remains private and authenticator enrollment works`, async ({ page }) => {
    const copy = staffCopy[locale], mock = await fixture(page);
    await page.goto(`/${locale}/staff/accept-invitation#invitation=${invitationId}&token=${"a".repeat(43)}`);
    await expect(page.getByRole("button", { name: copy.next, exact: true })).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`/${locale}/staff/accept-invitation$`));
    await page.getByLabel(copy.name).fill("Synthetic New Staff");
    await page.getByLabel(copy.password).fill("Synthetic password only");
    await page.getByRole("button", { name: copy.next, exact: true }).click();
    await page.getByRole("button", { name: copy.startEnroll, exact: true }).click();
    await expect(page.getByRole("img", { name: copy.qrAlt })).toBeVisible();
    await page.getByText(copy.manual, { exact: true }).click();
    await expect(page.locator("code")).toHaveText("SYNTHETICSETUPONLY");
    await page.getByLabel(copy.totpCode).fill("654321");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/staff$`));
    await expect(page.getByRole("img")).toHaveCount(0);
    expect(mock.actions.find((action) => action.action === "invite-accept")).toMatchObject({ invitationId, token: "a".repeat(43) });
    await axe(page);
  });
}

test("every staff role receives only its permitted navigation entries", async ({ page }) => {
  for (const role of ROLES.filter((entry) => entry !== "participant")) {
    await page.unroute("**/api/staff-portal**");
    await fixture(page, [role], true);
    await page.goto("/ar/staff");
    const menu = page.getByRole("navigation", { name: staffCopy.ar.menu });
    await expect(menu).toBeVisible();
    for (const entry of staffMenu([role])) await expect(menu).toContainText(entry.englishOnly ? staffCopy.en.areas[entry.key] : staffCopy.ar.areas[entry.key]);
    await expect(menu.locator("li")).toHaveCount(staffMenu([role]).length);
    if (["abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer", "facultyJudge"].includes(role)) await expect(menu.locator('[lang="en"]')).toHaveAttribute("dir", "ltr");
  }
});
