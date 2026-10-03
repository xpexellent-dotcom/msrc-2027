import AxeBuilder from "@axe-core/playwright";
import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { staffSecurityCopy } from "../../src/features/auth/staff-security-copy";

// AUTH-02/04/05, ROL-12, SEC-01/06, LOC-01, ERR-01. Synthetic password sessions;
// no provider messages or managed factors. App codes are derived only in Node memory.
function labelsFor(locale: "en" | "ar") {
  const text = staffSecurityCopy[locale];
  return {
    start: text.startSuperAdmin, staffStart: text.start, participant: text.participant,
    enroll: text.enroll, verify: text.verify, challenge: text.challenge,
    emailChallenge: text.emailChallenge, emailVerify: text.emailVerify,
    access: text.checkAccess, participantAccess: text.checkParticipant,
    reauthenticate: text.reauthenticate, logout: text.logout, refresh: text.refresh,
    reset: text.recovery, suspend: text.suspend, factorReset: text.factorReset,
    assurance: text.assured, participantAssurance: text.participantAssurance,
    staffEmailAssurance: text.staffEmailAssured, staffEmailCode: text.staffEmailCodeLabel,
    staffEmailRequired: text.messages.staff_email_check_required,
    verified: text.verifiedStatus, missing: text.missing, complete: text.verificationComplete,
    emailBothComplete: text.messages.email_verified,
    participantReauthenticated: text.participantReauthenticated,
    expired: text.expired, revoked: text.revoked, error: text.messages.invalid_code,
    noMfa: text.messages.mfa_required, recovery: text.messages.recovery_unconfigured,
    unavailable: text.messages.unavailable, closed: text.accessClosed,
    accountRequired: text.messages.account_verification_required, manualSetup: text.manualSetup,
    codeLabel: text.codeLabel,
  };
}
const labels = { en: labelsFor("en"), ar: labelsFor("ar") };

async function api(page: Page, action: string, extra: Record<string, string> = {}) {
  const response = await page.request.post("/api/auth-preview", {
    headers: { Origin: new URL(page.url()).origin }, data: { action, ...extra },
  });
  return response.json();
}
async function inboxCode(page: Page, channel: "email") {
  const output = page.getByTestId(`synthetic-${channel}-code`);
  await expect(output).toBeVisible();
  const code = (await output.textContent())?.trim() ?? "";
  expect(/^\d{6}$/.test(code)).toBe(true);
  return code;
}
function wrongCode(code: string) { return code === "000000" ? "000001" : "000000"; }

// Independent RFC 6238 SHA-1 test oracle. Nothing containing a key/code is logged.
function appCode(secret: string, counter = Math.floor(Date.now() / 30_000)) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret].map((character) => alphabet.indexOf(character).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(Array.from({ length: Math.floor(bits.length / 8) }, (_, index) => Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2)));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", key).update(message).digest();
  const offset = hash[hash.length - 1] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}
async function setupKey(page: Page) {
  const setup = page.getByTestId("synthetic-totp-setup");
  await expect(setup).toBeVisible();
  const summary = setup.locator("summary");
  if ((await setup.locator("details").getAttribute("open")) === null) {
    await summary.focus();
    await page.keyboard.press("Enter");
  }
  const output = page.getByTestId("synthetic-totp-secret");
  await expect(output).toBeVisible();
  const secret = (await output.inputValue()).trim();
  expect(/^[A-Z2-7]{32}$/.test(secret)).toBe(true);
  return secret;
}
for (const locale of ["en", "ar"] as const) {
  const copy = labels[locale];
  test(`${locale} isolated staff delivery shows accessible inbox and expiry states without exposing the code`, async ({ page }) => {
    // Presentation-only external-delivery receipt. No challenge is reserved in
    // the shared lab, and no provider or real email is used by this test.
    await page.clock.install();
    const deliveredCode = "654321"; // Inert presentation oracle; never an issued code.
    let presentationView: Record<string, unknown> | null = null;
    await page.route("**/api/auth-preview", async (route) => {
      const action = route.request().postDataJSON()?.action;
      if (action === "challenge-email" && presentationView) {
        const timestamp = Date.now();
        presentationView = { ...presentationView, emailChallengePending: true,
          emailResendAvailableAt: timestamp + 60_000,
          staffEmailDelivery: { mode: "isolated", expiresAt: timestamp + 300_000 } };
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ state: "ok", code: "email_challenge_created", view: presentationView }) });
        return;
      }
      if (action === "status" && presentationView) {
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ state: "ok", code: "status", view: presentationView }) });
        return;
      }
      const upstream = await route.fetch(); const result = await upstream.json();
      if (result.view?.kind === "staff") {
        result.view.staffEmailDelivery = { mode: "isolated", expiresAt: result.view.staffEmailDelivery?.expiresAt ?? null };
        delete result.view.testMessage;
        presentationView = result.view;
      }
      await route.fulfill({ response: upstream, contentType: "application/json", body: JSON.stringify(result) });
    });
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.staffStart, exact: true }).click();
    await expect(page.getByTestId("preview-simulation")).toHaveText(staffSecurityCopy[locale].isolatedSimulation);
    const requestCode = page.getByRole("button", { name: staffSecurityCopy[locale].isolatedEmailChallenge, exact: true });
    await requestCode.focus(); await page.keyboard.press("Enter");
    const field = page.locator("#staff-email-code"); await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("autocomplete", "one-time-code"); await expect(field).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    await expect(page.getByTestId("synthetic-email-code")).toHaveCount(0);
    await expect(page.getByTestId("isolated-email-delivery")).toContainText(staffSecurityCopy[locale].isolatedEmailSent);
    expect(deliveredCode.length === 6 && !(await page.locator("body").innerText()).includes(deliveredCode)).toBe(true);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations.length).toBe(0);
    await expect(requestCode).toBeDisabled();
    await page.clock.fastForward(60_001); await expect(requestCode).toBeEnabled();
    await page.clock.fastForward(240_000);
    await expect(page.getByTestId("staff-email-expired")).toHaveText(staffSecurityCopy[locale].staffEmailExpired);
    await expect(page.getByRole("button", { name: copy.emailVerify, exact: true })).toBeDisabled();
    await page.unroute("**/api/auth-preview");
  });

  test(`${locale} regular staff password and session email check remain AAL1 and require a new check only on new login`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.staffStart, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-session-heading")).toBeFocused();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.missing);
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(copy.staffEmailRequired);
    expect((await api(page, "enroll")).state).toBe("denied");
    expect((await api(page, "challenge")).state).toBe("denied");
    await expect(page.locator("#staff-auth-code")).toHaveCount(0);
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    const code = await inboxCode(page, "email");
    const field = page.getByRole("textbox", { name: copy.staffEmailCode, exact: true });
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("autocomplete", "one-time-code");
    await expect(field).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("synthetic-email-body")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("synthetic-email-body")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("button", { name: copy.emailChallenge, exact: true })).toBeDisabled();
    await expect(page.getByTestId("email-resend-wait")).toBeVisible();
    const sent = (await api(page, "status")).view;
    expect(sent.kind).toBe("staff");
    expect(sent.assurance).toBe("aal1");
    expect(sent.factor).toBe("none");
    expect(sent.staffEmailVerified).toBe(false);
    expect(sent.absoluteExpiresAt - sent.startedAt).toBe(8 * 60 * 60 * 1_000);
    expect(sent.idleExpiresAt - sent.lastActivityAt).toBe(30 * 60 * 1_000);
    await field.fill(wrongCode(code));
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toBeFocused();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations.length).toBe(0);
    await testInfo.attach(`${locale}-staff-email-challenge-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true, mask: [page.getByTestId("synthetic-inbox"), field] }), contentType: "image/png",
    });
    await field.fill(locale === "ar" ? code.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) : code);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.staffEmailAssurance);
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    await expect(field).toHaveCount(0);
    expect((await api(page, "verify-email", { code })).state).toBe("denied");
    const checked = (await api(page, "status")).view;
    expect(checked.staffEmailVerified).toBe(true);
    expect(checked.assurance).toBe("aal1");
    expect(checked.factor).toBe("none");
    expect(checked.operationalAccessReady).toBe(false);
    expect(checked.privilegedAccessReady).toBe(false);
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    const refreshed = (await api(page, "status")).view;
    expect(refreshed.staffEmailVerified).toBe(true);
    expect(refreshed.startedAt).toBe(checked.startedAt);
    expect(refreshed.absoluteExpiresAt).toBe(checked.absoluteExpiresAt);
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "synthetic staff check passed" : "اجتاز اختبار وصول الفريق المصطنع");
    await page.getByRole("button", { name: copy.reauthenticate, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.missing);
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "fresh email check" : "تحقق بريد جديد");
    expect((await api(page, "protected")).state).toBe("denied");
    expect((await api(page, "verify-email", { code })).state).toBe("denied");
  });

  test(`${locale} regular staff expiry and delivery failure offer a clear retry after the resend cooldown`, async ({ page }) => {
    // These controlled transport responses verify presentation only. Server expiry,
    // replacement and abuse limits have independent unit/database coverage.
    await page.clock.install();
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.staffStart, exact: true }).click();
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    const code = await inboxCode(page, "email");
    const field = page.locator("#staff-email-code");
    await field.fill(code);
    const { view } = await api(page, "status");
    const resendAt = await page.evaluate(() => Date.now() + 60_000);
    const expiredView = { ...view, emailChallengePending: false, emailResendAvailableAt: resendAt };
    await page.route("**/api/auth-preview", async (route) => {
      const action = route.request().postDataJSON()?.action;
      if (action === "verify-email") await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ state: "denied", code: "challenge_expired", view: expiredView }) });
      else if (action === "status") await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "ok", code: "status", view: expiredView }) });
      else if (action === "challenge-email") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ state: "unavailable", code: "unavailable" }) });
      else await route.continue();
    });
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(locale === "en" ? "The code expired" : "انتهت صلاحية الرمز");
    await expect(page.getByRole("button", { name: copy.emailVerify, exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: copy.emailChallenge, exact: true })).toBeDisabled();
    await page.clock.fastForward(60_001);
    await expect(page.getByRole("button", { name: copy.emailChallenge, exact: true })).toBeEnabled();
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(locale === "en" ? "The email code could not be requested" : "تعذر طلب رمز البريد");
    await expect.poll(async () => await field.inputValue() === code).toBe(true);
    await expect(page.getByRole("button", { name: locale === "en" ? "Retry session check" : "إعادة محاولة التحقق من الجلسة", exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    await page.clock.fastForward(5 * 60_000 + 1);
    await expect(page.getByTestId("staff-email-expired")).toHaveText(locale === "en" ? "This email code has expired. Request a new code to continue." : "انتهت صلاحية رمز البريد هذا. اطلب رمزًا جديدًا للمتابعة.");
    await expect(page.getByRole("button", { name: copy.emailVerify, exact: true })).toBeDisabled();
    await page.unroute("**/api/auth-preview");
  });

  test(`${locale} regular staff email change and role revocation close access and recovery remains unavailable`, async ({ page }) => {
    await page.goto(`/${locale}/staff-security-preview`);
    for (const scenario of [locale === "en" ? "Simulate verified-email change" : "محاكاة تغيير البريد الموثّق", locale === "en" ? "Simulate staff-role revocation" : "محاكاة إلغاء دور الفريق"]) {
      await api(page, "start", { kind: "staff" });
      await page.reload();
      await page.getByRole("button", { name: copy.reset, exact: true }).click();
      await expect(page.getByTestId("auth-error")).toContainText(copy.recovery);
      await page.getByRole("button", { name: scenario, exact: true }).click();
      await expect(page.getByTestId("session-state")).toHaveText(copy.revoked);
      await expect(page.locator("#staff-email-code")).toHaveCount(0);
      await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
      expect((await api(page, "protected")).state).toBe("denied");
    }
  });

  test(`${locale} Super Admin password then authenticator has QR/manual alternatives and prevents replay`, async ({ page }, testInfo) => {
    const response = await page.goto(`/${locale}/staff-security-preview`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByTestId("preview-simulation")).toHaveText(staffSecurityCopy[locale].simulation);
    await expect(page.locator('input[type="password"], input[type="tel"], img.staff-security-qr')).toHaveCount(0);
    await page.getByRole("button", { name: copy.start, exact: true }).click();
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(copy.noMfa);
    await page.getByRole("button", { name: copy.enroll, exact: true }).click();
    const field = page.locator("#staff-auth-code");
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("autocomplete", "one-time-code");
    await expect(field).toHaveAttribute("dir", "ltr");
    await expect(page.locator("img.staff-security-qr")).toHaveAttribute("alt", staffSecurityCopy[locale].qrAlt);
    expect((await page.locator("img.staff-security-qr").getAttribute("src"))?.startsWith("data:image/png;base64,")).toBe(true);
    const secret = await setupKey(page);
    await expect(page.getByTestId("synthetic-totp-secret")).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    await field.fill("abcdef");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toBeFocused();
    const firstCounter = Math.floor(Date.now() / 30_000);
    const firstCode = appCode(secret, firstCounter);
    await field.fill(wrongCode(firstCode));
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("auth-error")).toHaveText(copy.error);
    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    const currentCode = appCode(secret, firstCounter);
    await field.fill(locale === "ar" ? currentCode.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) : currentCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
    await expect(page.getByTestId("synthetic-totp-setup")).toHaveCount(0);
    await expect(field).toHaveCount(0);
    expect((await api(page, "verify", { code: currentCode })).state).toBe("denied");
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await page.getByRole("button", { name: copy.reauthenticate, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeDisabled();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.missing);
    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    await field.fill(currentCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(copy.error);
    const nextCode = appCode(secret, firstCounter + 1);
    await field.fill(nextCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
    const state = await api(page, "status");
    expect(state.view.passwordVerified).toBe(true);
    expect(state.view.assurance).toBe("aal2");
    expect(state.view.previewAccessAllowed).toBe(true);
    expect(state.view.operationalAccessReady).toBe(false);
    expect(state.view.privilegedAccessReady).toBe(false);
    expect(state.view.testMessage).toBeUndefined();
    expect(state.view.enrollment).toBeUndefined();
    expect(state.view.phoneVerified).toBeUndefined();
    await testInfo.attach(`${locale}-totp-assured-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });

  test(`${locale} participant email-only verification never enrolls MFA or phone`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    await expect(page.getByTestId("email-verification")).toHaveText(copy.missing);
    await expect(page.getByTestId("phone-verification")).toHaveCount(0);
    await expect(page.locator("#staff-auth-code")).toHaveCount(0);
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.participantAssurance);
    await page.getByRole("button", { name: copy.participantAccess, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(copy.accountRequired);
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    const oldCode = await inboxCode(page, "email");
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    await expect.poll(async () => await inboxCode(page, "email") !== oldCode).toBe(true);
    const currentCode = await inboxCode(page, "email");
    const field = page.locator("#participant-email-code");
    await field.fill(oldCode);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(copy.error);
    await field.fill(currentCode);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("email-verification")).toHaveText(copy.verified);
    await expect(page.getByTestId("participant-verification-state")).toHaveText(copy.complete);
    await expect(page.getByTestId("auth-status")).toHaveText(copy.emailBothComplete);
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    const state = await api(page, "status");
    expect(state.view.verificationComplete).toBe(true);
    expect(state.view.assurance).toBe("aal1");
    expect(state.view.factor).toBe("none");
    expect(state.view.operationalAccessReady).toBe(false);
    expect(state.view.privilegedAccessReady).toBe(false);
    for (const action of ["enroll", "challenge", "verify"]) expect((await api(page, action, action === "verify" ? { code: currentCode } : {})).state).toBe("denied");
    expect((await api(page, "verify-email", { code: currentCode })).state).toBe("denied");
    await page.getByRole("button", { name: copy.participantAccess, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "participant verification check passed" : "اجتاز اختبار التحقق من المشارك المصطنع");
    await testInfo.attach(`${locale}-participant-verified-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });

  test(`${locale} participant reauthentication retains email verification without a phone or second factor`, async ({ page }) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    const code = await inboxCode(page, "email");
    await page.locator("#participant-email-code").fill(code);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await page.getByRole("button", { name: copy.reauthenticate, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toHaveText(copy.participantReauthenticated);
    await expect(page.getByTestId("participant-verification-state")).toHaveText(copy.complete);
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.participantAssurance);
    await expect(page.locator("#staff-auth-code, #participant-email-code, input[type=tel]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.factorReset, exact: true })).toHaveCount(0);
  });

  test(`${locale} periodic status announces terminal session state and clears transient setup`, async ({ page }) => {
    // Mocked transport exercises announcements; server expiry has unit/SQL coverage.
    await page.clock.install();
    await page.goto(`/${locale}/staff-security-preview`);
    for (const status of ["expired", "revoked"] as const) {
      await page.getByRole("button", { name: copy.start, exact: true }).click();
      await page.getByRole("button", { name: copy.enroll, exact: true }).click();
      const secret = await setupKey(page);
      await page.locator("#staff-auth-code").fill(appCode(secret));
      const { view } = await api(page, "status");
      await page.route("**/api/auth-preview", async (route) => {
        if (route.request().postDataJSON()?.action === "status") await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ state: "ok", code: "status", view: { ...view, status, challengePending: false, previewAccessAllowed: false } }),
        });
        else await route.continue();
      });
      await page.clock.fastForward(60_001);
      const announcement = page.getByTestId("auth-status");
      await expect(announcement).toHaveAttribute("role", "status");
      await expect(announcement).toHaveAttribute("aria-live", "polite");
      await expect(announcement).toHaveText(copy[status]);
      await expect(page.getByTestId("session-state")).toHaveText(copy[status]);
      await expect(page.getByTestId("synthetic-totp-setup")).toHaveCount(0);
      await expect(page.locator("#staff-auth-code")).toHaveCount(0);
      await page.unroute("**/api/auth-preview");
    }
  });

  test(`${locale} recovery stays closed, refresh preserves the participant 72-hour cap, and logout revokes access`, async ({ page }) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    // A click starts asynchronous login; wait for its server acknowledgement and
    // cookie before observing the session through a separate API request.
    await expect(page.getByTestId("session-state")).toHaveText(staffSecurityCopy[locale].active);
    await expect(page.locator("#staff-session-heading")).toBeFocused();
    const before = (await api(page, "status")).view;
    expect(before.absoluteExpiresAt - before.startedAt).toBe(72 * 60 * 60 * 1_000);
    await page.getByRole("button", { name: copy.reset, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(copy.recovery);
    await expect(page.getByTestId("auth-error")).toBeFocused();
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    const refreshed = (await api(page, "status")).view;
    expect(refreshed.startedAt).toBe(before.startedAt);
    expect(refreshed.absoluteExpiresAt).toBe(before.absoluteExpiresAt);
    await page.getByRole("button", { name: copy.logout, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.start, exact: true })).toBeVisible();
    expect((await api(page, "protected")).state).toBe("denied");
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
  });

  test(`${locale} revoked synthetic session cannot retain Super Admin access`, async ({ page }) => {
    for (const scenario of [copy.suspend, copy.factorReset]) {
      await page.goto(`/${locale}/staff-security-preview`);
      await page.getByRole("button", { name: copy.start, exact: true }).click();
      await page.getByRole("button", { name: copy.enroll, exact: true }).click();
      const secret = await setupKey(page);
      await page.locator("#staff-auth-code").fill(appCode(secret));
      await page.getByRole("button", { name: copy.verify, exact: true }).click();
      await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
      await page.getByRole("button", { name: scenario, exact: true }).click();
      await expect(page.getByTestId("session-state")).toHaveText(copy.revoked);
      expect((await api(page, "protected")).state).toBe("denied");
      await expect(page.locator("#staff-auth-code")).toHaveCount(0);
      await expect(page.getByTestId("synthetic-totp-setup")).toHaveCount(0);
    }
  });

  test(`${locale} keyboard and automated accessibility cover QR/manual setup and verification errors`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.start, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-session-heading")).toBeFocused();
    await page.getByRole("button", { name: copy.enroll, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-auth-code")).toBeFocused();
    await setupKey(page);
    await page.locator("#staff-auth-code").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("auth-error")).toBeFocused();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    // Attach rule IDs/impact only. AXE HTML could contain the synthetic setup key.
    await testInfo.attach(`${locale}-totp-accessibility`, { body: JSON.stringify(result.violations.map(({ id, impact }) => ({ id, impact }))), contentType: "application/json" });
    expect(result.violations.length).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await testInfo.attach(`${locale}-totp-setup-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true, mask: [page.getByTestId("synthetic-totp-setup"), page.locator("#staff-auth-code")] }), contentType: "image/png",
    });
    await page.getByRole("button", { name: copy.logout, exact: true }).click();
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    await expect(page.locator("#participant-email-code")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: copy.emailVerify, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("auth-error")).toBeFocused();
    const participantResult = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(participantResult.violations.length).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await testInfo.attach(`${locale}-participant-challenge-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true, mask: [page.getByTestId("synthetic-inbox"), page.locator("#participant-email-code")] }), contentType: "image/png",
    });
  });
}

test("locale changes and transport retry preserve a private authenticator draft without browser storage", async ({ page }) => {
  await page.goto("/en/staff-security-preview");
  await page.getByRole("button", { name: labels.en.start, exact: true }).click();
  await page.getByRole("button", { name: labels.en.enroll, exact: true }).click();
  const secret = await setupKey(page);
  const code = appCode(secret);
  await page.locator("#staff-auth-code").fill(code);
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff-security-preview$/);
  await expect.poll(async () => (await page.locator("#staff-auth-code").inputValue()) === code).toBe(true);
  await expect.poll(async () => (await page.getByTestId("synthetic-totp-secret").inputValue()) === secret).toBe(true);
  await page.route("**/api/auth-preview", async (route) => {
    if (route.request().postDataJSON()?.action === "verify") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ state: "unavailable", code: "unavailable" }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: labels.ar.verify, exact: true }).click();
  await expect(page.getByTestId("auth-error")).toHaveText(labels.ar.unavailable);
  await expect.poll(async () => (await page.locator("#staff-auth-code").inputValue()) === code).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.unroute("**/api/auth-preview");
  await page.locator("#staff-auth-code").fill(appCode(secret));
  await page.getByRole("button", { name: labels.ar.verify, exact: true }).click();
  await expect(page.getByTestId("session-assurance")).toHaveText(labels.ar.assurance);
  await expect(page.getByTestId("synthetic-totp-setup")).toHaveCount(0);
});

test("regular staff email draft survives locale change and transport retry without granting AAL2", async ({ page }) => {
  await page.goto("/en/staff-security-preview");
  await page.getByRole("button", { name: labels.en.staffStart, exact: true }).click();
  await page.getByRole("button", { name: labels.en.emailChallenge, exact: true }).click();
  const code = await inboxCode(page, "email");
  await page.locator("#staff-email-code").fill(code);
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff-security-preview$/);
  await expect.poll(async () => await page.locator("#staff-email-code").inputValue() === code).toBe(true);
  await expect(page.getByTestId("synthetic-email-body")).toHaveAttribute("lang", "en");
  await page.route("**/api/auth-preview", async (route) => {
    if (route.request().postDataJSON()?.action === "verify-email") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ state: "unavailable", code: "unavailable" }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: labels.ar.emailVerify, exact: true }).click();
  await expect(page.getByTestId("auth-error")).toContainText(labels.ar.unavailable);
  await expect.poll(async () => await page.locator("#staff-email-code").inputValue() === code).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.unroute("**/api/auth-preview");
  await page.getByRole("button", { name: labels.ar.emailVerify, exact: true }).click();
  await expect(page.getByTestId("session-assurance")).toHaveText(labels.ar.staffEmailAssurance);
  const { view } = await api(page, "status");
  expect(view.assurance).toBe("aal1");
  expect(view.factor).toBe("none");
  expect(view.staffEmailVerified).toBe(true);
  await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
});

test("participant email draft survives a locale change and disappears on reload without phone fields", async ({ page }) => {
  await page.goto("/en/staff-security-preview");
  await page.getByRole("button", { name: labels.en.participant, exact: true }).click();
  await page.getByRole("button", { name: labels.en.emailChallenge, exact: true }).click();
  const code = await inboxCode(page, "email");
  await page.locator("#participant-email-code").fill(code);
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff-security-preview$/);
  await expect.poll(async () => (await page.locator("#participant-email-code").inputValue()) === code).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
  await expect(page.locator("#participant-email-code")).toHaveValue("");
  await expect(page.locator("#staff-auth-code, input[type=tel]")).toHaveCount(0);
});
