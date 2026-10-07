import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { ROLES } from "../../src/lib/permissions/contract";
import { passwordFixture } from "./fixture";

async function axe(page: Page) {
  await expect(page).toHaveTitle("MSRC 2027 | Staff portal");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}
async function fillPassword(page: Page, password: string, confirmation = password) {
  await page.locator("#staff-new-password").fill(password);
  await page.locator("#staff-password-confirmation").fill(confirmation);
}
async function boundedControl(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded(); await expect(control).toBeInViewport();
  const box = (await control.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} owner password change requires fresh normal password/TOTP and returns to sign-in`, async ({ page }) => {
    const copy = staffCopy[locale], mock = await passwordFixture(page);
    await page.goto(`/${locale}/staff`);
    await page.getByRole("link", { name: copy.security, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.security, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".site-header, .site-footer")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await axe(page);
    await fillPassword(page, "Synthetic New Password");
    await page.getByRole("button", { name: copy.changePassword, exact: true }).click();
    await expect(page.locator('.staff-feedback[role="alert"]')).toHaveText(copy.states["reauthentication-required"]);
    await expect(page.getByTestId("staff-name")).toHaveCount(0);
    await expect(page.locator("input")).toHaveCount(0);
    await page.getByRole("link", { name: copy.signInAgain, exact: true }).click();
    await expect(page.getByTestId("staff-portal")).toHaveAttribute("data-screen", "sign-in");
    await expect(page.locator("#staff-password")).toHaveValue("");
    await page.getByLabel(copy.email).fill("super@example.invalid");
    await page.getByLabel(copy.password).fill("Synthetic Current Password");
    await page.getByRole("button", { name: copy.next, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.totpStep, exact: true })).toBeVisible();
    await page.getByLabel(copy.totpCode).fill(locale === "ar" ? "٦٥٤٣٢١" : "654321");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("staff-portal")).toHaveAttribute("data-screen", "home");
    await page.getByRole("link", { name: copy.security, exact: true }).click();
    await fillPassword(page, "Synthetic New Password");
    await page.getByRole("button", { name: copy.changePassword, exact: true }).click();
    await expect(page.locator('.staff-feedback[role="status"]')).toHaveText(copy.states["password-changed"]);
    await expect(page.getByTestId("staff-name")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: copy.menu })).toHaveCount(0);
    await expect(page.locator("form, input, img, code")).toHaveCount(0);
    const changes = mock.actions.filter((action) => action.action === "password-change");
    expect(changes).toHaveLength(2);
    for (const change of changes) {
      expect(Object.keys(change).sort()).toEqual(["action", "formToken", "password", "passwordConfirmation"]);
      expect(change.password).toBe(change.passwordConfirmation);
    }
    expect(mock.actions.map((action) => action.action)).toEqual(["password-change", "signin", "verify-totp", "password-change"]);
    expect(new Set(mock.actions.map((action) => action.formToken)).size).toBe(mock.actions.length);
    await page.getByRole("link", { name: copy.signInAgain, exact: true }).click();
    await expect(page.getByTestId("staff-portal")).toHaveAttribute("data-screen", "sign-in");
    await expect(page.getByRole("heading", { name: copy.signIn, exact: true })).toBeVisible();
    await expect(page.locator("#staff-password")).toHaveValue("");
    await axe(page);
  });

  test(`${locale} password validation is accessible and secrets clear before provider completion`, async ({ page }) => {
    const copy = staffCopy[locale], mock = await passwordFixture(page, { fresh: true, hold: true });
    const logs: string[] = []; page.on("console", (message) => logs.push(message.text()));
    await page.goto(`/${locale}/staff/security`);
    const submit = page.getByRole("button", { name: copy.changePassword, exact: true });
    await expect(submit).toBeEnabled();
    for (const [password, confirmation, error] of [["", "", "required"], ["123456789", "123456789", "password"], ["é".repeat(37), "é".repeat(37), "password"], ["Synthetic Password", "Synthetic Different", "passwordConfirmation"]] as const) {
      await fillPassword(page, password, confirmation); await submit.click();
      const alert = page.locator('.field-message[role="alert"]');
      await expect(alert).toHaveText(copy.errors[error]); await expect(alert).toBeFocused();
      await expect(page.locator("#staff-new-password")).toHaveValue("");
      await expect(page.locator("#staff-password-confirmation")).toHaveValue("");
      expect(mock.actions).toHaveLength(0);
    }
    await axe(page);
    const password = "🔐".repeat(10);
    await fillPassword(page, password); await submit.click();
    await expect.poll(() => mock.actions.length).toBe(1);
    await expect(page.locator("#staff-new-password")).toHaveValue("");
    await expect(page.locator("#staff-password-confirmation")).toHaveValue("");
    await expect(submit).toBeDisabled();
    mock.release();
    await expect(page.locator('.staff-feedback[role="status"]')).toHaveText(copy.states["password-changed"]);
    expect(mock.actions[0]).toMatchObject({ action: "password-change", password, passwordConfirmation: password });
    expect(logs.join("\n")).not.toContain(password);
    expect(await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)))).toEqual([]);
    expect(page.url()).not.toContain(password);
    await expect(page.locator("body")).not.toContainText(password);
  });

  test(`${locale} uncertain provider outcome clears private UI and background reads cannot restore it`, async ({ page }) => {
    const copy = staffCopy[locale]; await page.clock.install();
    const mock = await passwordFixture(page, { fresh: true, failure: "unavailable", staleReads: true });
    await page.goto(`/${locale}/staff/security`);
    await expect(page.getByRole("button", { name: copy.changePassword, exact: true })).toBeEnabled();
    await fillPassword(page, "Synthetic New Password");
    await page.getByRole("button", { name: copy.changePassword, exact: true }).click();
    await expect(page.locator('.staff-feedback[role="alert"]')).toHaveText(copy.passwordChangeUnknown);
    await expect(page.getByTestId("staff-name")).toHaveCount(0);
    await expect(page.locator("form, input")).toHaveCount(0);
    const before = mock.reads.length; await page.clock.fastForward(61_000);
    await expect.poll(() => mock.reads.length).toBeGreaterThan(before);
    await expect(page.getByTestId("staff-name")).toHaveCount(0);
    await expect(page.locator("form, input")).toHaveCount(0);
    await expect(page.getByRole("link", { name: copy.signInAgain, exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(copy.states["password-changed"]);
    await axe(page);
  });

  test(`${locale} password inputs do not carry across locale changes or page hiding`, async ({ page }) => {
    const copy = staffCopy[locale]; await passwordFixture(page, { fresh: true });
    await page.goto(`/${locale}/staff/security`);
    await expect(page.getByRole("button", { name: copy.changePassword, exact: true })).toBeEnabled();
    await fillPassword(page, "Synthetic New Password");
    await page.getByRole("link", { name: copy.language, exact: true }).click();
    const other = locale === "en" ? "ar" : "en";
    await expect(page.getByRole("heading", { name: staffCopy[other].security, exact: true })).toBeVisible();
    await expect(page.locator("#staff-new-password")).toHaveValue("");
    await expect(page.locator("#staff-password-confirmation")).toHaveValue("");
    await fillPassword(page, "Synthetic Hidden Password");
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(page.locator("#staff-new-password")).toHaveValue("");
    await expect(page.locator("#staff-password-confirmation")).toHaveValue("");
    await page.evaluate(() => { Reflect.deleteProperty(document, "visibilityState"); });
    await fillPassword(page, "Synthetic Another Password");
    await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent("pagehide")); });
    await expect(page.locator("#staff-new-password")).toHaveCount(0);
    await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });
    await expect(page.locator("#staff-new-password")).toHaveValue("");
    await expect(page.locator("#staff-password-confirmation")).toHaveValue("");
  });

  test(`${locale} unavailable initial access does not imply that a password change was attempted`, async ({ page }) => {
    const copy = staffCopy[locale], mock = await passwordFixture(page, { readFailure: true });
    await page.goto(`/${locale}/staff/security`);
    await expect(page.locator('.staff-feedback[role="alert"]')).toHaveText(copy.states.unavailable);
    await expect(page.locator("body")).not.toContainText(copy.passwordChangeUnknown);
    await expect(page.locator("body")).not.toContainText(copy.states["password-changed"]);
    await expect(page.locator("#staff-new-password")).toHaveCount(0);
    expect(mock.actions).toHaveLength(0);
    await axe(page);
  });

  test(`${locale} own password controls support 320px, 200% text, keyboard and native scrolling`, async ({ page, isMobile }, testInfo) => {
    test.skip(!isMobile, "Narrow mobile interaction coverage.");
    const copy = staffCopy[locale], mock = await passwordFixture(page, { fresh: true });
    await page.setViewportSize({ width: 320, height: 640 }); await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/staff/security`);
    await expect(page.getByRole("button", { name: copy.changePassword, exact: true })).toBeEnabled();
    await page.evaluate(async () => { await document.fonts.ready; document.documentElement.style.fontSize = "200%"; });
    await page.getByRole("heading", { name: copy.security, exact: true }).focus();
    const beforeDown = await page.evaluate(() => window.scrollY); await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeDown);
    const password = page.locator("#staff-new-password"), confirmation = page.locator("#staff-password-confirmation");
    await boundedControl(page, password); await password.focus(); await page.keyboard.type("Synthetic New Password");
    await page.keyboard.press("Tab"); await expect(confirmation).toBeFocused(); await page.keyboard.type("Synthetic New Password");
    await boundedControl(page, confirmation); await page.keyboard.press("Tab");
    const submit = page.getByRole("button", { name: copy.changePassword, exact: true });
    await expect(submit).toBeFocused(); await boundedControl(page, submit);
    const lower = await page.evaluate(() => window.scrollY); expect(lower).toBeGreaterThan(0);
    await page.screenshot({ path: `.tools/staff-password-evidence/${testInfo.project.name}-${locale}-200-password-form.png`, fullPage: true });
    await page.screenshot({ path: `.tools/staff-password-evidence/${testInfo.project.name}-${locale}-200-password-controls.png` });
    await axe(page); await page.keyboard.press("Enter");
    await expect(page.locator('.staff-feedback[role="status"]')).toHaveText(copy.states["password-changed"]);
    expect(mock.actions.at(-1)?.action).toBe("password-change");
    const signIn = page.getByRole("link", { name: copy.signInAgain, exact: true }); await boundedControl(page, signIn);
    await page.getByRole("heading", { name: copy.security, exact: true }).focus(); await page.keyboard.press("PageUp");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(lower);
    await expect(page.getByRole("heading", { name: copy.security, exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.screenshot({ path: `.tools/staff-password-evidence/${testInfo.project.name}-${locale}-200-password-complete.png`, fullPage: true });
    await page.screenshot({ path: `.tools/staff-password-evidence/${testInfo.project.name}-${locale}-200-password-confirmation.png` });
    await axe(page);
  });
}

test("security navigation and the password form remain Super Admin only", async ({ page }) => {
  for (const role of ROLES.filter((role) => role !== "participant")) {
    await page.unroute("**/api/staff-portal**"); await passwordFixture(page, { roles: [role], fresh: true });
    await page.goto("/ar/staff");
    await expect(page.getByRole("navigation", { name: staffCopy.ar.menu })).toBeVisible();
    await expect(page.getByRole("link", { name: staffCopy.ar.security, exact: true })).toHaveCount(role === "superAdmin" ? 1 : 0);
    await page.goto("/ar/staff/security");
    if (role === "superAdmin") await expect(page.getByRole("button", { name: staffCopy.ar.changePassword, exact: true })).toBeEnabled();
    else { await expect(page.locator("#staff-new-password")).toHaveCount(0); await expect(page.getByText(staffCopy.ar.states.denied, { exact: true })).toBeVisible(); }
  }
});

test("security navigation closes immediately when observed availability becomes false", async ({ page }) => {
  await passwordFixture(page, { fresh: true, available: false });
  await page.goto("/en/staff");
  await expect(page.getByRole("navigation", { name: staffCopy.en.menu })).toBeVisible();
  await expect(page.getByRole("link", { name: staffCopy.en.security, exact: true })).toHaveCount(0);
  await page.goto("/en/staff/security");
  await expect(page.getByText(staffCopy.en.states.denied, { exact: true })).toBeVisible();
  await expect(page.locator("#staff-new-password")).toHaveCount(0);
});
