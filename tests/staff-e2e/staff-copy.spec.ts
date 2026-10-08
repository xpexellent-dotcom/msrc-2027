import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { staffActionSummary, staffCopy } from "../../src/features/staff-portal/copy";
import type { Role } from "../../src/lib/permissions/contract";
import type { StaffPayload, StaffResponse, StaffState } from "../../src/features/staff-portal/ui-contract";

/** UI fixtures only: no real identity, Auth, native database, email or provider. */
async function fixture(page: Page, roles: Role[], available = false) {
  let state: StaffState = "authenticated", sequence = 0;
  const profile = { actorId: "14000000-0000-4000-8000-000000000001", name: "Synthetic Staff", roles };
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const action = (request.postDataJSON() as StaffPayload).action;
      if (action === "logout") state = "ready";
    }
    const response: StaffResponse = { state, profile: state === "authenticated" ? profile : null, passwordChangeAvailable: available, formToken: `synthetic-copy-token-${++sequence}` };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return { changeState: (next: StaffState) => { state = next; } };
}

async function axe(page: Page) {
  await expect(page).toHaveTitle("MSRC 2027 | Staff portal");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} current roles and built actions stay scoped and disappear before verification`, async ({ page }) => {
    const copy = staffCopy[locale];
    for (const [roles, available] of [[["superAdmin"], false], [["superAdmin"], true], [["registrationWorkshopAdministrator", "finance"], true], [["finance"], true]] as [Role[], boolean][]) {
      await page.unroute("**/api/staff-portal**"); await fixture(page, roles, available);
      await page.goto(`/${locale}/staff`);
      await expect(page.getByTestId("staff-current-roles")).toHaveText(`${copy.yourRoles}: ${roles.map((role) => copy.roleLabels[role]).join(locale === "ar" ? "، " : ", ")}`);
      await expect(page.getByTestId("staff-action-summary")).toHaveText(staffActionSummary(locale, roles, { passwordChangeAvailable: available })!);
      await expect(page.getByRole("link", { name: copy.security, exact: true })).toHaveCount(roles.includes("superAdmin") && available ? 1 : 0);
      await expect(page.locator(".staff-policy")).toHaveCount(0);
    }
    await page.unroute("**/api/staff-portal**"); const mock = await fixture(page, ["superAdmin"]);
    for (const state of ["ready", "pending-email", "pending-totp", "enroll-totp"] as const) {
      mock.changeState(state); await page.goto(`/${locale}/staff/sign-in`);
      await expect(page.getByTestId("staff-current-roles")).toHaveCount(0);
      await expect(page.getByTestId("staff-action-summary")).toHaveCount(0);
    }
    mock.changeState("authenticated"); await page.goto(`/${locale}/staff`);
    await expect(page.getByTestId("staff-current-roles")).toBeVisible();
    await page.getByRole("button", { name: copy.signOut, exact: true }).click();
    await expect(page.getByTestId("staff-current-roles")).toHaveCount(0);
    await expect(page.getByTestId("staff-action-summary")).toHaveCount(0);
    await page.unroute("**/api/staff-portal**"); await fixture(page, []); await page.goto(`/${locale}/staff`);
    await expect(page.getByTestId("staff-current-roles")).toHaveCount(0); await expect(page.getByTestId("staff-action-summary")).toHaveCount(0);
  });

  test(`${locale} mobile enlarged role guidance and invitation copy keep native scroll and keyboard access`, async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Narrow layout is covered by the mobile project.");
    const copy = staffCopy[locale]; await fixture(page, ["superAdmin"]);
    await page.setViewportSize({ width: 320, height: 720 }); await page.goto(`/${locale}/staff/people`);
    await expect(page.getByTestId("staff-action-summary")).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await expect(page.locator("html")).toHaveAttribute("lang", locale); await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByText(copy.inviteHint, { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(locale === "en" ? "The English invitation link" : "رابط الدعوة باللغة الإنجليزية");
    await expect(page.locator("body")).not.toContainText(locale === "en" ? "At least two Super Admins must stay active" : "يجب أن يظل مشرفان أعلى");
    await expect(page.locator(".staff-policy")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const heading = page.getByRole("heading", { name: copy.people, exact: true });
    await page.evaluate(async () => { await document.fonts.ready; });
    const headingPosition = await heading.evaluate((element) => Math.round(element.getBoundingClientRect().top + window.scrollY));
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), headingPosition);
    await expect(heading).toBeInViewport();
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), headingPosition + 1200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(headingPosition + 1000);
    await expect(heading).not.toBeInViewport();
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), headingPosition);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(headingPosition);
    await expect(heading).toBeInViewport();
    await page.getByRole("link", { name: copy.home, exact: true }).focus(); await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: copy.signOut, exact: true })).toBeFocused();
    await axe(page);
    await heading.focus();
    await page.getByTestId("staff-current-roles").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.screenshot({ path: `.tools/staff-copy-evidence/${locale}-320-200-role-guidance.png` });
    await page.getByRole("heading", { name: copy.invite, exact: true }).evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.screenshot({ path: `.tools/staff-copy-evidence/${locale}-320-200-invitation.png` });
    await page.screenshot({ path: `.tools/staff-copy-evidence/${locale}-320-200-people.png`, fullPage: true });
  });
}
