import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// AUTH-02/04/05, ROL-12, SEC-01/06, LOC-01, ERR-01. Password sign-in is simulated;
// codes come only from the transient synthetic inbox. No provider message is sent.
const labels = {
  en: {
    start: "Simulate staff password sign-in", participant: "Simulate participant password sign-in",
    enroll: "Create synthetic staff SMS challenge", verify: "Verify SMS code",
    challenge: "Request a new synthetic SMS code", emailChallenge: "Request a synthetic email code",
    emailVerify: "Verify email code", access: "Check synthetic staff access",
    participantAccess: "Check synthetic participant verification",
    reauthenticate: "Simulate password reauthentication", logout: "Log out synthetic session",
    refresh: "Refresh synthetic token", reset: "Check recovery availability",
    suspend: "Simulate suspension", factorReset: "Simulate factor-reset revocation",
    assurance: "SMS second factor verified", participantAssurance: "MFA not required for participants",
    verified: "Verified", missing: "Not verified",
    phoneTitle: "Verify the participant phone", phoneCodeLabel: "Six-digit phone verification code",
    phoneVerify: "Verify participant phone", phonePending: "Phone verification required",
    emailPending: "Email verification required", complete: "Email and phone verified",
    emailNeedsPhone: "Synthetic participant email verified. Phone verification is still required.",
    emailBothComplete: "Synthetic participant email verified. Both account verification checks are complete.",
    participantReauthenticated: "A new simulated password session started. Participant verification status is retained; MFA is not required.",
    expired: "Session expired", revoked: "Session revoked",
    error: "The code could not be verified.", noMfa: "Staff access requires password sign-in and a verified SMS second factor.",
    recovery: "Factor recovery is closed.", unavailable: "The session check is unavailable.",
    closed: "Live privileged access and operational workflows remain closed.",
    accountRequired: "The participant account requires both email and phone verification.",
  },
  ar: {
    start: "محاكاة دخول الفريق بكلمة المرور", participant: "محاكاة دخول المشارك بكلمة المرور",
    enroll: "إنشاء تحقق SMS مصطنع للفريق", verify: "التحقق من رمز SMS",
    challenge: "طلب رمز SMS مصطنع جديد", emailChallenge: "طلب رمز بريد مصطنع",
    emailVerify: "التحقق من رمز البريد", access: "التحقق من وصول الفريق المصطنع",
    participantAccess: "التحقق من حساب المشارك المصطنع",
    reauthenticate: "محاكاة إعادة المصادقة بكلمة المرور", logout: "تسجيل الخروج من الجلسة المصطنعة",
    refresh: "تحديث رمز الجلسة المصطنعة", reset: "التحقق من إتاحة الاستعادة",
    suspend: "محاكاة التعليق", factorReset: "محاكاة الإلغاء بعد إعادة ضبط العامل",
    assurance: "تم التحقق من عامل SMS الثاني", participantAssurance: "المصادقة الثنائية غير مطلوبة للمشاركين",
    verified: "تم التحقق", missing: "لم يُتحقق منه",
    phoneTitle: "التحقق من هاتف المشارك", phoneCodeLabel: "رمز التحقق من الهاتف المكوّن من ستة أرقام",
    phoneVerify: "التحقق من هاتف المشارك", phonePending: "يلزم التحقق من الهاتف",
    emailPending: "يلزم التحقق من البريد", complete: "تم التحقق من البريد والهاتف",
    emailNeedsPhone: "تم التحقق من بريد المشارك المصطنع. لا يزال التحقق من الهاتف مطلوبًا.",
    emailBothComplete: "تم التحقق من بريد المشارك المصطنع. اكتمل كلا التحققين المطلوبين للحساب.",
    participantReauthenticated: "بدأت جلسة جديدة بمحاكاة كلمة المرور. تبقى حالة التحقق للمشارك محفوظة؛ ولا تُطلب مصادقة ثنائية.",
    expired: "انتهت الجلسة", revoked: "أُلغيت الجلسة",
    error: "تعذر التحقق من الرمز.", noMfa: "يتطلب وصول الفريق الدخول بكلمة المرور والتحقق من عامل SMS الثاني.",
    recovery: "استعادة عامل المصادقة مغلقة.", unavailable: "التحقق من الجلسة غير متاح.",
    closed: "يظل الوصول الفعلي بصلاحيات مميزة ومسارات العمل التشغيلية مغلقًا.",
    accountRequired: "يتطلب حساب المشارك التحقق من البريد والهاتف معًا.",
  },
} as const;

async function api(page: Page, action: string, extra: Record<string, string> = {}) {
  const response = await page.request.post("/api/auth-preview", {
    headers: { Origin: new URL(page.url()).origin }, data: { action, ...extra },
  });
  return response.json();
}

async function inboxCode(page: Page, channel: "sms" | "email") {
  const output = page.getByTestId(`synthetic-${channel}-code`);
  await expect(output).toBeVisible();
  const code = (await output.textContent())?.trim() ?? "";
  expect(/^\d{6}$/.test(code)).toBe(true);
  return code;
}

function wrongCode(code: string) {
  return code === "000000" ? "000001" : "000000";
}

for (const locale of ["en", "ar"] as const) {
  const copy = labels[locale];
  test(`${locale} password then SMS enforces staff assurance, resend invalidation and single use`, async ({ page }, testInfo) => {
    const response = await page.goto(`/${locale}/staff-security-preview`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByTestId("preview-simulation")).toContainText(locale === "en" ? "no real SMS or email is sent" : "ولا تُرسل رسائل SMS");
    await expect(page.locator('input[type="password"], input[type="tel"], img.staff-security-qr')).toHaveCount(0);
    await page.getByRole("button", { name: copy.start, exact: true }).click();
    await expect(page.getByTestId("password-verification")).toHaveText(locale === "en" ? "Simulated and complete" : "مُحاكى ومكتمل");
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.noMfa);
    await expect(page.getByTestId("auth-error")).toBeFocused();

    await page.getByRole("button", { name: copy.enroll, exact: true }).click();
    const firstCode = await inboxCode(page, "sms");
    const field = page.locator("#staff-auth-code");
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("autocomplete", "one-time-code");
    await expect(field).toHaveAttribute("dir", "ltr");
    await field.fill(wrongCode(firstCode));
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.error);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("auth-error")).toBeFocused();

    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    await expect.poll(async () => await inboxCode(page, "sms") !== firstCode).toBe(true);
    const replacement = await inboxCode(page, "sms");
    await field.fill(firstCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.error);
    const localizedCode = locale === "ar" ? replacement.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) : replacement;
    await field.fill(localizedCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    await expect(field).toHaveCount(0);
    expect((await api(page, "verify", { code: replacement })).state).toBe("denied");
    await expect(page.getByTestId("live-access-closed")).toHaveText(copy.closed);

    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "synthetic staff check passed" : "اجتاز اختبار وصول الفريق المصطنع");
    await page.getByRole("button", { name: copy.reauthenticate, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeDisabled();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.missing);
    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    const freshCode = await inboxCode(page, "sms");
    await field.fill(freshCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
    const state = await api(page, "status");
    expect(state.view.passwordVerified).toBe(true);
    expect(state.view.phoneVerified).toBe(true);
    expect(state.view.previewAccessAllowed).toBe(true);
    expect(state.view.operationalAccessReady).toBe(false);
    expect(state.view.privilegedAccessReady).toBe(false);
    expect(state.view.testMessage).toBeUndefined();
    await testInfo.attach(`${locale}-sms-assured-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });

  test(`${locale} participant email and phone checks are independent and never enroll MFA`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    await expect(page.getByTestId("email-verification")).toHaveText(copy.missing);
    await expect(page.getByTestId("phone-verification")).toHaveText(copy.missing);
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.participantAssurance);
    const phoneForm = page.getByRole("form", { name: copy.phoneTitle, exact: true });
    await expect(phoneForm).toBeVisible();
    await expect(phoneForm).toHaveAttribute("aria-describedby", "participant-phone-instructions");
    await expect(phoneForm.getByRole("textbox", { name: copy.phoneCodeLabel, exact: true })).toBeVisible();
    await page.getByRole("button", { name: copy.participantAccess, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.accountRequired);
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    const firstEmailCode = await inboxCode(page, "email");
    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    const phoneCode = await inboxCode(page, "sms");

    // Both channels can be pending. Reissuing email invalidates only its old credential.
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    await expect.poll(async () => await inboxCode(page, "email") !== firstEmailCode).toBe(true);
    const emailCode = await inboxCode(page, "email");
    const emailField = page.locator("#participant-email-code");
    await emailField.fill(firstEmailCode);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.error);
    await emailField.fill(emailCode);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("email-verification")).toHaveText(copy.verified);
    await expect(page.getByTestId("phone-verification")).toHaveText(copy.missing);
    await expect(page.getByTestId("auth-status")).toHaveText(copy.emailNeedsPhone);
    await expect(page.getByTestId("participant-verification-state")).toHaveText(copy.phonePending);
    expect((await api(page, "protected")).state).toBe("denied");
    expect((await api(page, "verify-email", { code: emailCode })).state).toBe("denied");

    await page.locator("#staff-auth-code").fill(phoneCode);
    await page.getByRole("button", { name: copy.phoneVerify, exact: true }).click();
    await expect(page.getByTestId("phone-verification")).toHaveText(copy.verified);
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.participantAssurance);
    const state = await api(page, "status");
    expect(state.view.verificationComplete).toBe(true);
    expect(state.view.assurance).toBe("aal1");
    expect(state.view.factor).toBe("none");
    expect(state.view.operationalAccessReady).toBe(false);
    expect(state.view.privilegedAccessReady).toBe(false);
    expect((await api(page, "enroll")).state).toBe("denied");
    await page.getByRole("button", { name: copy.participantAccess, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "participant verification check passed" : "اجتاز اختبار التحقق من المشارك المصطنع");
    await testInfo.attach(`${locale}-participant-verified-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });

  test(`${locale} participant phone-first verification and reauthentication have participant-specific messages`, async ({ page }) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    const phoneCode = await inboxCode(page, "sms");
    await page.getByRole("textbox", { name: copy.phoneCodeLabel, exact: true }).fill(phoneCode);
    await page.getByRole("button", { name: copy.phoneVerify, exact: true }).click();
    await expect(page.getByTestId("participant-verification-state")).toHaveText(copy.emailPending);
    await page.getByRole("button", { name: copy.emailChallenge, exact: true }).click();
    const emailCode = await inboxCode(page, "email");
    await page.locator("#participant-email-code").fill(emailCode);
    await page.getByRole("button", { name: copy.emailVerify, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toHaveText(copy.emailBothComplete);
    await expect(page.getByTestId("participant-verification-state")).toHaveText(copy.complete);
    await page.getByRole("button", { name: copy.reauthenticate, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toHaveText(copy.participantReauthenticated);
    await expect(page.getByTestId("participant-verification-state")).toHaveText(copy.complete);
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.participantAssurance);
    await expect(page.getByRole("button", { name: copy.phoneVerify, exact: true })).toHaveCount(0);
  });

  test(`${locale} periodic status announces terminal session state and clears transient challenges`, async ({ page }) => {
    // The mocked transport exercises UI announcements; server expiry is independently
    // covered by unit/SQL policy checks. No wall-clock wait or live provider is needed.
    await page.clock.install();
    for (const status of ["expired", "revoked"] as const) {
      await page.goto(`/${locale}/staff-security-preview`);
      await page.getByRole("button", { name: /^(Simulate staff password sign-in|Start a new synthetic session|محاكاة دخول الفريق بكلمة المرور|بدء جلسة مصطنعة جديدة)$/ }).click();
      await page.getByRole("button", { name: copy.enroll, exact: true }).click();
      const code = await inboxCode(page, "sms");
      await page.locator("#staff-auth-code").fill(code);
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
      await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
      await expect(page.locator("#staff-auth-code")).toHaveCount(0);
      await page.unroute("**/api/auth-preview");
    }
  });

  test(`${locale} recovery stays closed, refresh preserves the participant 72-hour cap, and logout revokes access`, async ({ page }) => {
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.participant, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.refresh, exact: true })).toBeVisible();
    const before = (await api(page, "status")).view;
    expect(before.absoluteExpiresAt - before.startedAt).toBe(72 * 60 * 60 * 1_000);
    await page.getByRole("button", { name: copy.reset, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.recovery);
    await expect(page.getByTestId("auth-error")).toBeFocused();
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "Synthetic token refreshed" : "تم تحديث رمز الجلسة المصطنعة");
    const refreshed = (await api(page, "status")).view;
    expect(refreshed.startedAt).toBe(before.startedAt);
    expect(refreshed.absoluteExpiresAt).toBe(before.absoluteExpiresAt);
    await page.getByRole("button", { name: copy.logout, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.start, exact: true })).toBeVisible();
    expect((await api(page, "protected")).state).toBe("denied");
    await expect(page.locator("#staff-auth-code")).toHaveCount(0);
    await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
  });

  test(`${locale} revoked synthetic session cannot retain staff access`, async ({ page }) => {
    for (const scenario of [copy.suspend, copy.factorReset]) {
      await page.goto(`/${locale}/staff-security-preview`);
      await page.getByRole("button", { name: /^(Simulate staff password sign-in|Start a new synthetic session|محاكاة دخول الفريق بكلمة المرور|بدء جلسة مصطنعة جديدة)$/ }).click();
      await page.getByRole("button", { name: scenario, exact: true }).click();
      await expect(page.getByTestId("session-state")).toHaveText(locale === "en" ? "Session revoked" : "أُلغيت الجلسة");
      expect((await api(page, "protected")).state).toBe("denied");
      await expect(page.locator("#staff-auth-code")).toHaveCount(0);
      await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
    }
  });

  test(`${locale} preview keyboard and automated accessibility checks cover SMS and participant errors`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.start, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-session-heading")).toBeFocused();
    await page.getByRole("button", { name: copy.enroll, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-auth-code")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("auth-error")).toBeFocused();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    // Only rule IDs/impact are attached; axe HTML could contain a test message code.
    await testInfo.attach(`${locale}-sms-accessibility`, { body: JSON.stringify(result.violations.map(({ id, impact }) => ({ id, impact }))), contentType: "application/json" });
    expect(result.violations.length).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await testInfo.attach(`${locale}-sms-challenge-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true, mask: [page.getByTestId("synthetic-inbox"), page.locator("#staff-auth-code")] }), contentType: "image/png",
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
      body: await page.screenshot({ fullPage: true, mask: [page.getByTestId("synthetic-inbox"), page.locator("#staff-auth-code"), page.locator("#participant-email-code")] }), contentType: "image/png",
    });
  });
}

test("locale changes and request recovery preserve the SMS draft without browser storage", async ({ page }) => {
  await page.goto("/en/staff-security-preview");
  await page.getByRole("button", { name: labels.en.start, exact: true }).click();
  await page.getByRole("button", { name: labels.en.enroll, exact: true }).click();
  const code = await inboxCode(page, "sms");
  await page.locator("#staff-auth-code").fill(code);
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff-security-preview$/);
  await expect.poll(async () => await inboxCode(page, "sms") === code).toBe(true);
  await expect.poll(async () => (await page.locator("#staff-auth-code").inputValue()) === code).toBe(true);
  await page.route("**/api/auth-preview", async (route) => {
    if (route.request().postDataJSON()?.action === "verify") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ state: "unavailable", code: "unavailable" }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: labels.ar.verify, exact: true }).click();
  await expect(page.getByTestId("auth-error")).toContainText(labels.ar.unavailable);
  await expect.poll(async () => (await page.locator("#staff-auth-code").inputValue()) === code).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.unroute("**/api/auth-preview");
  await page.getByRole("button", { name: labels.ar.verify, exact: true }).click();
  await expect(page.getByTestId("session-assurance")).toHaveText(labels.ar.assurance);
  await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
});

test("participant email and phone drafts survive a locale change and disappear on reload", async ({ page }) => {
  await page.goto("/en/staff-security-preview");
  await page.getByRole("button", { name: labels.en.participant, exact: true }).click();
  await page.getByRole("button", { name: labels.en.emailChallenge, exact: true }).click();
  const emailCode = await inboxCode(page, "email");
  await page.locator("#participant-email-code").fill(emailCode);
  await page.getByRole("button", { name: labels.en.challenge, exact: true }).click();
  const smsCode = await inboxCode(page, "sms");
  await page.locator("#staff-auth-code").fill(smsCode);
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff-security-preview$/);
  await expect.poll(async () => (await page.locator("#participant-email-code").inputValue()) === emailCode).toBe(true);
  await expect.poll(async () => (await page.locator("#staff-auth-code").inputValue()) === smsCode).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByTestId("synthetic-inbox")).toHaveCount(0);
  await expect(page.locator("#participant-email-code")).toHaveValue("");
  await expect(page.locator("#staff-auth-code")).toHaveValue("");
});
