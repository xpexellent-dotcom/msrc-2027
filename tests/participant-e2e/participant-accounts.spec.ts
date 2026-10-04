import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { ParticipantPayload, ParticipantProfile, ParticipantResponse } from "../../src/features/participant-accounts/contracts";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";

const syntheticPassword = "Synthetic Password 2027!";
const syntheticCode = "654321";

/** Presentation fixtures only: no account, database or provider message is created. */
async function mockAccounts(page: Page, options: { initialStatusGate?: Promise<void>; statusRequested?: () => void } = {}) {
  let profile: ParticipantProfile | null = null;
  let denySignIn = true;
  let transportFailure = false;
  let calls = 0;
  let lastRequestId: string | null = null;
  await page.route("**/api/participant-accounts", async (route) => {
    const response: ParticipantResponse = { state: "ready", profile, formToken: `synthetic-form-${randomUUID()}` };
    if (route.request().method() === "GET") {
      options.statusRequested?.();
      await options.initialStatusGate;
    } else {
      calls += 1;
      const payload = route.request().postDataJSON() as ParticipantPayload;
      expect(payload.formToken?.startsWith("synthetic-form-")).toBe(true);
      expect(payload.website).toBe("");
      if (transportFailure) { response.state = "unavailable"; }
      else if (payload.action === "signup" || payload.action === "forgot" || payload.action === "resend") {
        response.state = "accepted";
        response.requestId = lastRequestId = randomUUID();
        response.expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
        response.resendAvailableAt = new Date(Date.now() + 60_000).toISOString();
      } else if (payload.action === "verify" || payload.action === "reset") {
        if (payload.code !== syntheticCode || payload.requestId !== lastRequestId) { response.state = "invalid_code"; response.fieldErrors = { code: "invalid" }; }
        else { response.state = payload.action === "verify" ? "verified" : "password_reset"; lastRequestId = null; }
      } else if (payload.action === "signin") {
        response.state = denySignIn ? "invalid_credentials" : "authenticated";
        if (!denySignIn) response.profile = profile = { name: "Synthetic Participant", accountState: "verified" };
      } else if (payload.action === "logout") { response.state = "signed_out"; response.profile = profile = null; }
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return { allowSignIn: () => { denySignIn = false; }, failTransport: (value: boolean) => { transportFailure = value; }, expireSession: () => { profile = null; }, calls: () => calls };
}

async function fillSignup(page: Page, name = "Synthetic Participant") {
  await expect(page.locator("#participant-name")).toBeEnabled();
  await page.locator("#participant-name").fill(name);
  await page.locator("#participant-email").fill("synthetic@example.invalid");
  await page.locator("#participant-password").fill(syntheticPassword);
}

for (const locale of ["en", "ar"] as const) {
  const copy = participantCopy[locale];
  test(`${locale} hydration and status restoration protect the first keyboard submission`, async ({ page }) => {
    let releaseScripts!: () => void;
    let releaseStatus!: () => void;
    let statusRequested!: () => void;
    const scripts = new Promise<void>((resolve) => { releaseScripts = resolve; });
    const status = new Promise<void>((resolve) => { releaseStatus = resolve; });
    const requested = new Promise<void>((resolve) => { statusRequested = resolve; });
    const mock = await mockAccounts(page, { initialStatusGate: status, statusRequested });
    await page.route("**/_next/static/**/*.js", async (route) => { await scripts; await route.continue(); });
    try {
      await page.goto(`/${locale}/sign-up`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#participant-name")).toBeDisabled();
      releaseScripts();
      await requested;
      await expect(page.locator("#participant-name")).toBeDisabled();
      releaseStatus();
      await fillSignup(page);
      const create = page.getByRole("button", { name: copy.create, exact: true });
      await expect(create).toBeEnabled();
      await create.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
      await expect(page.getByTestId("participant-account-status")).toBeFocused();
      expect(mock.calls()).toBe(1);
    } finally { releaseScripts(); releaseStatus(); }
  });

  test(`${locale} sign-up has only three fields, a versioned notice, RTL and accessible responsive layout`, async ({ page }, testInfo) => {
    await mockAccounts(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/sign-up`);
    await fillSignup(page, "مشارك مصطنع");
    await expect(page.locator('form input:not([name="website"])')).toHaveCount(3);
    await expect(page.locator('input[type="tel"], input[type="checkbox"]')).toHaveCount(0);
    await expect(page.locator("#participant-name")).toHaveAttribute("autocomplete", "name");
    await expect(page.locator("#participant-email")).toHaveAttribute("autocomplete", "email");
    await expect(page.locator("#participant-password")).toHaveAttribute("autocomplete", "new-password");
    await expect(page.getByTestId("participant-privacy-version")).toHaveText("synthetic-privacy-ci-v1");
    await expect(page.getByRole("link", { name: copy.privacyLink, exact: true })).toHaveAttribute("href", new RegExp(`^/${locale}/privacy`));
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
    await mkdir(resolve("deliverables/participant-accounts"), { recursive: true });
    await page.screenshot({ path: resolve(`deliverables/participant-accounts/${locale}-${testInfo.project.name}.png`), fullPage: true, mask: [page.locator("#participant-password")] });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test(`${locale} verification keeps recovery input, accepts Arabic digits and focuses invalid code errors`, async ({ page }) => {
    await mockAccounts(page);
    await page.goto(`/${locale}/sign-up`);
    await fillSignup(page);
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await page.getByRole("link", { name: copy.verify, exact: true }).click();
    const code = page.locator("#participant-code");
    await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(code).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#participant-password")).toHaveValue(syntheticPassword);
    await code.fill("000000");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await expect(code).toHaveValue("000000");
    await code.fill(locale === "ar" ? "٦٥٤٣٢١" : syntheticCode);
    await expect(code).toHaveValue(syntheticCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.verified);
    await expect(page.locator("#participant-password, #participant-code")).toHaveCount(0);
  });

  test(`${locale} generic recovery completes a code reset and removes the password`, async ({ page }) => {
    await mockAccounts(page);
    await page.goto(`/${locale}/forgot-password`);
    await expect(page.locator("#participant-email")).toBeEnabled();
    await page.locator("#participant-email").fill("unknown@example.invalid");
    await page.getByRole("button", { name: copy.requestReset, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
    await page.getByRole("link", { name: copy.links["reset-password"], exact: true }).first().click();
    await expect(page.locator("#participant-email")).toHaveValue("unknown@example.invalid");
    await page.locator("#participant-code").fill(syntheticCode);
    await page.locator("#participant-password").fill(syntheticPassword);
    await expect(page.locator("#participant-password")).toHaveAttribute("autocomplete", "new-password");
    await page.getByRole("button", { name: copy.reset, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.password_reset);
    await expect(page.getByTestId("participant-account-status")).toBeFocused();
    await expect(page.locator("#participant-password, #participant-code")).toHaveCount(0);
  });

  test(`${locale} My MSRC denies an unverified session and shows only the verified owner shell`, async ({ page }) => {
    const mock = await mockAccounts(page);
    await page.goto(`/${locale}/my-msrc`);
    await expect(page.getByTestId("participant-signin-required")).toHaveText(copy.needSignIn);
    await expect(page.getByTestId("participant-profile-name")).toHaveCount(0);
    await page.getByRole("link", { name: copy.signIn, exact: true }).click();
    await expect(page.locator("#participant-email")).toBeEnabled();
    await page.locator("#participant-email").fill("unverified@example.invalid");
    await page.locator("#participant-password").fill(syntheticPassword);
    await page.getByRole("button", { name: copy.signIn, exact: true }).click();
    await expect(page.getByTestId("participant-account-error")).toHaveText(new RegExp(copy.states.invalid_credentials.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    mock.allowSignIn();
    await page.getByRole("button", { name: copy.signIn, exact: true }).click();
    await page.getByRole("link", { name: copy.links["my-msrc"], exact: true }).click();
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await expect(page.getByTestId("participant-account-state")).toHaveText(copy.verifiedState);
    await expect(page.getByTestId("participant-registration-closed")).toHaveText(copy.registrationClosed);
    await expect(page.locator("form")).toHaveCount(0);
    await page.getByRole("button", { name: copy.signOut, exact: true }).click();
    await expect(page.getByTestId("participant-profile-name")).toHaveCount(0);
    await expect(page.getByTestId("participant-signin-required")).toBeVisible();
  });
}

test("locale changes retain name, email, password and code in memory, while reload clears credentials", async ({ page }) => {
  const mock = await mockAccounts(page);
  await page.goto("/en/sign-up");
  await fillSignup(page, "مشارك مصطنع");
  await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/sign-up$/);
  await expect(page.locator("#participant-name")).toHaveValue("مشارك مصطنع");
  await expect(page.locator("#participant-email")).toHaveValue("synthetic@example.invalid");
  await expect(page.locator("#participant-password")).toHaveValue(syntheticPassword);
  mock.failTransport(true);
  await page.getByRole("button", { name: participantCopy.ar.create, exact: true }).click();
  await expect(page.getByTestId("participant-account-error")).toBeFocused();
  await expect(page.locator("#participant-password")).toHaveValue(syntheticPassword);
  mock.failTransport(false);
  await page.getByRole("button", { name: participantCopy.ar.create, exact: true }).click();
  await page.getByRole("link", { name: participantCopy.ar.verify, exact: true }).click();
  await page.locator("#participant-code").fill(syntheticCode);
  await page.getByRole("link", { name: "View this page in English", exact: true }).click();
  await expect(page.locator("#participant-code")).toHaveValue(syntheticCode);
  await expect(page.locator("#participant-password")).toHaveValue(syntheticPassword);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(new URL(page.url()).search).toBe("");
  await page.reload();
  await expect(page.locator("#participant-code")).toHaveValue("");
  await expect(page.locator("#participant-password")).toHaveValue("");
  await expect(page.getByRole("button", { name: participantCopy.en.verify, exact: true })).toBeDisabled();
});
