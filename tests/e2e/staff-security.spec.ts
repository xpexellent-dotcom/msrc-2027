import { createHmac } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// AUTH-04/05, ROL-12, SEC-01/06, LOC-01, ERR-01. All identities and factors are
// ephemeral synthetic fixtures. Never print keys/codes or attach setup screenshots.
function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let accumulated = 0;
  const bytes: number[] = [];
  for (const letter of value.replace(/=+$/, "").toUpperCase()) {
    accumulated = (accumulated << 5) | alphabet.indexOf(letter);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulated >>> bits) & 255);
    }
  }
  return Buffer.from(bytes);
}

function authenticatorCode(secret: string, at = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

function invalidAuthenticatorCode(secret: string) {
  const valid = new Set([-30_000, 0, 30_000].map((offset) => authenticatorCode(secret, Date.now() + offset)));
  for (let candidate = 0; candidate < 4; candidate += 1) {
    const code = String(candidate).padStart(6, "0");
    if (!valid.has(code)) return code;
  }
  throw new Error("Could not generate an invalid synthetic test code.");
}

const labels = {
  en: {
    start: "Start synthetic staff session", participant: "Start synthetic participant session",
    enroll: "Set up authenticator", verify: "Verify code", challenge: "Request a new challenge",
    access: "Check synthetic staff access", reauthenticate: "Reauthenticate synthetic session",
    logout: "Log out synthetic session", refresh: "Refresh synthetic token",
    reset: "Check recovery availability", suspend: "Simulate suspension",
    factorReset: "Simulate factor-reset revocation", assurance: "Authenticator verified",
    error: "The code could not be verified.", noMfa: "Staff access requires a verified authenticator.",
    recovery: "Factor recovery is closed.", unavailable: "The session check is unavailable.",
    closed: "Live privileged access remains closed.",
  },
  ar: {
    start: "بدء جلسة فريق مصطنعة", participant: "بدء جلسة مشارك مصطنعة",
    enroll: "إعداد تطبيق المصادقة", verify: "التحقق من الرمز", challenge: "طلب تحقق جديد",
    access: "التحقق من وصول الفريق المصطنع", reauthenticate: "إعادة المصادقة للجلسة المصطنعة",
    logout: "تسجيل الخروج من الجلسة المصطنعة", refresh: "تحديث رمز الجلسة المصطنعة",
    reset: "التحقق من إتاحة الاستعادة", suspend: "محاكاة التعليق",
    factorReset: "محاكاة الإلغاء بعد إعادة ضبط العامل", assurance: "تم التحقق من تطبيق المصادقة",
    error: "تعذر التحقق من الرمز.", noMfa: "يتطلب وصول الفريق تطبيق مصادقة تم التحقق منه.",
    recovery: "استعادة عامل المصادقة مغلقة.", unavailable: "التحقق من الجلسة غير متاح.",
    closed: "يظل الوصول الفعلي بصلاحيات مميزة مغلقًا.",
  },
} as const;

async function api(page: Page, action: string) {
  const response = await page.request.post("/api/auth-preview", {
    headers: { Origin: new URL(page.url()).origin }, data: { action },
  });
  return response.json();
}

for (const locale of ["en", "ar"] as const) {
  const copy = labels[locale];
  test(`${locale} setup and a fresh challenge enforce staff assurance with QR/manual alternatives`, async ({ page }, testInfo) => {
    test.setTimeout(75_000);
    const response = await page.goto(`/${locale}/staff-security-preview`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.getByRole("button", { name: copy.start, exact: true }).click();
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.noMfa);
    await expect(page.getByTestId("auth-error")).toBeFocused();
    await page.getByRole("button", { name: copy.enroll, exact: true }).click();
    await expect(page.getByTestId("setup-qr")).toBeVisible();
    await expect(page.getByTestId("setup-qr")).toHaveAttribute("alt", /.+/);
    const key = page.getByTestId("setup-key");
    await expect(key).toHaveAttribute("readonly", "");
    await expect(key).toHaveAttribute("dir", "ltr");
    const secret = await key.inputValue();
    expect(Boolean(secret.match(/^[A-Z2-7]+$/))).toBe(true);
    const code = page.locator("#staff-auth-code");
    await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(code).toHaveAttribute("dir", "ltr");
    await code.fill(invalidAuthenticatorCode(secret));
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("auth-error")).toContainText(copy.error);
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("auth-error")).toBeFocused();
    const firstCode = authenticatorCode(secret);
    const localizedCode = locale === "ar" ? firstCode.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) : firstCode;
    await code.fill(localizedCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
    await expect(page.getByTestId("setup-key")).toHaveCount(0);
    await expect(page.getByTestId("setup-qr")).toHaveCount(0);
    await expect(page.getByTestId("live-access-closed")).toHaveText(copy.closed);
    await page.getByRole("button", { name: copy.access, exact: true }).click();
    await expect(page.getByTestId("auth-status")).toContainText(locale === "en" ? "synthetic staff check passed" : "اجتاز اختبار وصول الفريق المصطنع");

    await page.getByRole("button", { name: copy.reauthenticate, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeDisabled();
    await page.getByRole("button", { name: copy.challenge, exact: true }).click();
    await expect(code).toBeFocused();
    await expect.poll(() => authenticatorCode(secret) !== firstCode, { timeout: 35_000, intervals: [250, 500, 1_000] }).toBe(true);
    await code.fill(authenticatorCode(secret));
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("session-assurance")).toHaveText(copy.assurance);
    const state = await api(page, "status");
    expect(state.view.previewAccessAllowed).toBe(true);
    expect(state.view.operationalAccessReady).toBe(false);
    expect(state.view.privilegedAccessReady).toBe(false);
    await testInfo.attach(`${locale}-assured-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });

  test(`${locale} recovery is closed, token refresh preserves the participant 72-hour cap, and logout revokes access`, async ({ page }) => {
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
  });

  test(`${locale} revoked synthetic session cannot retain staff access`, async ({ page }) => {
    for (const scenario of [copy.suspend, copy.factorReset]) {
      await page.goto(`/${locale}/staff-security-preview`);
      await page.getByRole("button", { name: /^(Start synthetic staff session|Start a new synthetic session|بدء جلسة فريق مصطنعة|بدء جلسة مصطنعة جديدة)$/ }).click();
      await page.getByRole("button", { name: scenario, exact: true }).click();
      await expect(page.getByTestId("session-state")).toHaveText(locale === "en" ? "Session revoked" : "أُلغيت الجلسة");
      expect((await api(page, "protected")).state).toBe("denied");
      await expect(page.locator("#staff-auth-code")).toHaveCount(0);
    }
  });

  test(`${locale} preview keyboard and automated accessibility checks cover setup and error states`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/staff-security-preview`);
    await page.getByRole("button", { name: copy.start, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-session-heading")).toBeFocused();
    await page.getByRole("button", { name: copy.enroll, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#staff-setup-heading")).toBeFocused();
    await page.locator("#staff-auth-code").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("auth-error")).toBeFocused();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    // Only rule IDs/impact are attached; axe HTML evidence could contain the setup key.
    await testInfo.attach(`${locale}-auth-accessibility`, { body: JSON.stringify(result.violations.map(({ id, impact }) => ({ id, impact }))), contentType: "application/json" });
    expect(result.violations.length).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await testInfo.attach(`${locale}-setup-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true, mask: [page.getByTestId("setup-key"), page.getByTestId("setup-qr"), page.locator("#staff-auth-code")] }),
      contentType: "image/png",
    });
  });
}

test("locale changes and a recoverable request failure preserve entered data without browser storage", async ({ page }) => {
  await page.goto("/en/staff-security-preview");
  await page.getByRole("button", { name: labels.en.start, exact: true }).click();
  await page.getByRole("button", { name: labels.en.enroll, exact: true }).click();
  const key = await page.getByTestId("setup-key").inputValue();
  await page.locator("#staff-auth-code").fill("123456");
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff-security-preview$/);
  await expect.poll(async () => (await page.getByTestId("setup-key").inputValue()) === key).toBe(true);
  await expect(page.locator("#staff-auth-code")).toHaveValue("123456");
  await page.route("**/api/auth-preview", async (route) => {
    if (route.request().postDataJSON()?.action === "verify") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ state: "unavailable", code: "unavailable" }) });
    } else await route.continue();
  });
  await page.getByRole("button", { name: labels.ar.verify, exact: true }).click();
  await expect(page.getByTestId("auth-error")).toContainText(labels.ar.unavailable);
  await expect(page.locator("#staff-auth-code")).toHaveValue("123456");
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.unroute("**/api/auth-preview");
  await page.locator("#staff-auth-code").fill(authenticatorCode(key));
  await page.getByRole("button", { name: labels.ar.verify, exact: true }).click();
  await expect(page.getByTestId("session-assurance")).toHaveText(labels.ar.assurance);
});
