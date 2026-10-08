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
async function mockAccounts(page: Page, options: { initialStatusGate?: Promise<void>; statusRequested?: () => void;
  signInGate?: Promise<void>; signInRequested?: () => void; logoutGate?: Promise<void>; logoutRequested?: () => void } = {}) {
  let profile: ParticipantProfile | null = null;
  let denySignIn = true;
  let transportFailure = false;
  let rejectAge = false;
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
      if (payload.action !== "signup") expect(payload.ageConfirmed).toBeUndefined();
      const password = payload.password ?? "";
      const passwordError = ["signup", "verify", "reset"].includes(payload.action)
        ? Buffer.byteLength(password, "utf8") > 72 ? "too_long" : Array.from(password).length < 10 ? "invalid" : null : null;
      if (payload.action === "signup" && (payload.ageConfirmed !== true || rejectAge)) { response.state = "invalid_input"; response.fieldErrors = { ageConfirmed: "required" }; }
      else if (passwordError) { response.state = "invalid_input"; response.fieldErrors = { password: passwordError }; }
      else if (transportFailure) { response.state = "unavailable"; }
      else if (payload.action === "signup" || payload.action === "forgot" || payload.action === "resend") {
        response.state = "accepted";
        response.requestId = lastRequestId = randomUUID();
        response.expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
        response.resendAvailableAt = new Date(Date.now() + 60_000).toISOString();
      } else if (payload.action === "verify" || payload.action === "reset") {
        if (payload.code !== syntheticCode || payload.requestId !== lastRequestId) { response.state = "invalid_code"; response.fieldErrors = { code: "invalid" }; }
        else { response.state = payload.action === "verify" ? "verified" : "password_reset"; lastRequestId = null; }
      } else if (payload.action === "signin") {
        options.signInRequested?.();
        await options.signInGate;
        response.state = denySignIn ? "invalid_credentials" : "authenticated";
        if (!denySignIn) response.profile = profile = { name: "Synthetic Participant", accountState: "verified" };
      } else if (payload.action === "logout") {
        options.logoutRequested?.();
        await options.logoutGate;
        response.state = "signed_out"; response.profile = profile = null;
      }
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return { allowSignIn: () => { denySignIn = false; }, failTransport: (value: boolean) => { transportFailure = value; }, rejectAge: (value: boolean) => { rejectAge = value; }, expireSession: () => { profile = null; }, calls: () => calls };
}

async function fillSignup(page: Page, name = "Synthetic Participant", ageConfirmed = true) {
  await expect(page.locator("#participant-name")).toBeEnabled();
  await page.locator("#participant-name").fill(name);
  await page.locator("#participant-email").fill("synthetic@example.invalid");
  await page.locator("#participant-password").fill(syntheticPassword);
  await page.locator("#participant-ageConfirmed").setChecked(ageConfirmed);
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

  test(`${locale} sign-up has three identity fields and one age declaration, a versioned notice, RTL and accessible responsive layout`, async ({ page }, testInfo) => {
    await mockAccounts(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/sign-up`);
    await fillSignup(page, "مشارك مصطنع");
    await expect(page.locator('form input:not([name="website"]):not([type="checkbox"])')).toHaveCount(3);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(1);
    await expect(page.locator('input[type="tel"], input[type="date"], input[name="dob"], input[name="dateOfBirth"]')).toHaveCount(0);
    await expect(page.locator("#participant-name")).toHaveAttribute("autocomplete", "name");
    await expect(page.locator("#participant-email")).toHaveAttribute("autocomplete", "email");
    await expect(page.locator("#participant-password")).toHaveAttribute("autocomplete", "new-password");
    await expect(page.getByTestId("participant-privacy-version")).toHaveText("synthetic-privacy-ci-v1");
    await expect(page.getByRole("link", { name: copy.privacyLink, exact: true })).toHaveAttribute("href", new RegExp(`^/${locale}/privacy`));
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("button", { name: copy.create, exact: true })).toBeEnabled();
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await mkdir(resolve("deliverables/participant-accounts"), { recursive: true });
    await page.screenshot({ path: resolve(`deliverables/participant-accounts/${locale}-${testInfo.project.name}.png`), fullPage: true, mask: [page.locator("#participant-password")] });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      window.scrollTo(0, 0);
      return document.querySelector(".participant-account-intro .eyebrow")!.getBoundingClientRect().top >= document.querySelector(".site-header")!.getBoundingClientRect().bottom;
    })).toBe(true);
  });

  test(`${locale} sign-up requires an explicit age declaration and presents server rejection accessibly`, async ({ page }) => {
    const mock = await mockAccounts(page);
    await page.goto(`/${locale}/sign-up`);
    await fillSignup(page, "Synthetic Participant", false);
    const confirmation = page.getByRole("checkbox", { name: copy.ageConfirmed, exact: true });
    const create = page.getByRole("button", { name: copy.create, exact: true });
    await expect(confirmation).not.toBeChecked();
    await expect(confirmation).toHaveAttribute("required", "");
    await create.click();
    const summary = page.getByTestId("participant-account-error");
    await expect(summary).toBeFocused();
    await expect(page.locator("#participant-ageConfirmed-error")).toHaveText(`!${copy.ageRequired}`);
    await expect(confirmation).toHaveAttribute("aria-invalid", "true");
    await expect(confirmation).toHaveAttribute("aria-describedby", "participant-ageConfirmed-error");
    expect(mock.calls()).toBe(0);
    await summary.locator('a[href="#participant-ageConfirmed"]').focus(); await page.keyboard.press("Enter");
    await expect(confirmation).toBeFocused(); await page.keyboard.press("Space");
    await expect(confirmation).toBeChecked();
    await expect(page.locator("#participant-ageConfirmed-error")).toHaveCount(0);
    mock.rejectAge(true); await create.click();
    await expect(summary).toBeFocused();
    await expect(confirmation).toBeChecked();
    await expect(page.locator("#participant-ageConfirmed-error")).toContainText(copy.ageRequired);
    await expect(page).toHaveTitle(`MSRC 2027 | ${copy.titles["sign-up"]}`);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
    mock.rejectAge(false); await create.click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
    expect(mock.calls()).toBe(2);
  });

  test(`${locale} mobile age declaration keeps enlarged layout, keyboard and native scrolling`, async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "320px enlarged layout is covered by the mobile project.");
    await mockAccounts(page); await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(`/${locale}/sign-up`);
    await fillSignup(page, "Synthetic Participant", false);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.evaluate(async () => { await document.fonts.ready; });
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--site-header-height").trim() === `${(document.querySelector(".site-header-inner") as HTMLElement).offsetHeight}px`)).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const heading = page.getByRole("heading", { name: copy.titles["sign-up"], exact: true });
    const headingPosition = await heading.evaluate((element) => Math.round(element.getBoundingClientRect().top + window.scrollY));
    const headerBottom = await page.locator(".site-header").evaluate((element) => Math.ceil(element.getBoundingClientRect().bottom));
    const position = Math.max(0, headingPosition - headerBottom - 16);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), position);
    await expect(heading).toBeInViewport();
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), position + 1200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(position + 1000);
    await expect(heading).not.toBeInViewport();
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), position);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(position);
    await expect(heading).toBeInViewport();
    await expect.poll(() => page.evaluate(() => Math.floor(document.querySelector(".participant-account-intro h1")!.getBoundingClientRect().top - document.querySelector(".site-header")!.getBoundingClientRect().bottom))).toBeGreaterThanOrEqual(0);
    const confirmation = page.getByRole("checkbox", { name: copy.ageConfirmed, exact: true });
    const create = page.getByRole("button", { name: copy.create, exact: true });
    await expect(create).toBeEnabled();
    await confirmation.focus(); await page.keyboard.press("Space"); await expect(confirmation).toBeChecked();
    const instruction = page.locator('label[for="participant-ageConfirmed"] > span');
    await expect.poll(() => instruction.evaluate((element) => Math.floor(element.getBoundingClientRect().top - document.querySelector(".site-header")!.getBoundingClientRect().bottom))).toBeGreaterThanOrEqual(0);
    await expect.poll(() => instruction.evaluate((element) => Math.floor(window.innerHeight - element.getBoundingClientRect().bottom))).toBeGreaterThanOrEqual(0);
    await page.keyboard.press("Tab"); await expect(create).toBeFocused();
    await expect(page).toHaveTitle(`MSRC 2027 | ${copy.titles["sign-up"]}`);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
    await confirmation.focus();
    await expect.poll(() => instruction.evaluate((element) => Math.floor(element.getBoundingClientRect().top - document.querySelector(".site-header")!.getBoundingClientRect().bottom))).toBeGreaterThanOrEqual(0);
    await mkdir(resolve(".tools/participant-age-evidence"), { recursive: true });
    await page.screenshot({ path: resolve(`.tools/participant-age-evidence/${locale}-320-200-age.png`), mask: [page.locator("#participant-password")] });
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
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
    await code.fill(locale === "ar" ? "٦٥٤٣٢١" : syntheticCode);
    await expect(code).toHaveValue(syntheticCode);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.verified);
    await expect(page.locator("#participant-password, #participant-code")).toHaveCount(0);
    await page.getByRole("link", { name: copy.signIn, exact: true }).first().click();
    await page.locator(".participant-account-navigation").getByRole("link", { name: copy.links["sign-up"], exact: true }).click();
    await expect(page.locator("#participant-ageConfirmed")).not.toBeChecked();
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
    await page.locator("#participant-password").fill("legacy123");
    await expect(page.locator("#participant-password-hint")).toHaveCount(0);
    await expect(page.locator("#participant-password")).toHaveAttribute("autocomplete", "current-password");
    await page.getByRole("button", { name: copy.signIn, exact: true }).click();
    expect(mock.calls()).toBe(1);
    await expect(page.locator("#participant-password-error")).toHaveCount(0);
    await expect(page.locator("#participant-password")).toHaveValue("legacy123");
    await expect(page.getByTestId("participant-account-error")).toHaveText(new RegExp(copy.states.invalid_credentials.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    mock.allowSignIn();
    await page.getByRole("button", { name: copy.signIn, exact: true }).click();
    await page.getByRole("link", { name: copy.links["my-msrc"], exact: true }).click();
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await expect(page.getByTestId("participant-account-state")).toHaveText(copy.verifiedState);
    await expect(page.getByTestId("participant-registration-closed")).toHaveText(copy.registrationClosed);
    await expect(page.locator("form")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
    await page.getByRole("button", { name: copy.signOut, exact: true }).click();
    await expect(page.getByTestId("participant-profile-name")).toHaveCount(0);
    await expect(page.getByTestId("participant-signin-required")).toBeVisible();
  });

  for (const screen of ["sign-up", "verify-email", "reset-password"] as const) {
    test(`${locale} ${screen} explains and displays Unicode password boundary responses`, async ({ page }) => {
      await mockAccounts(page);
      if (screen === "reset-password") {
        await page.goto(`/${locale}/forgot-password`);
        await expect(page.locator("#participant-email")).toBeEnabled();
        await page.locator("#participant-email").fill("synthetic@example.invalid");
        await page.getByRole("button", { name: copy.requestReset, exact: true }).click();
        await page.getByRole("link", { name: copy.links["reset-password"], exact: true }).first().click();
      } else {
        await page.goto(`/${locale}/sign-up`);
        await fillSignup(page);
        if (screen === "verify-email") {
          await page.getByRole("button", { name: copy.create, exact: true }).click();
          await page.getByRole("link", { name: copy.verify, exact: true }).click();
        }
      }
      const password = page.locator("#participant-password");
      const button = page.getByRole("button", { name: screen === "sign-up" ? copy.create : screen === "verify-email" ? copy.verify : copy.reset, exact: true });
      await expect(page.locator("#participant-password-hint")).toHaveText(copy.passwordHint);
      await expect(password).toHaveAttribute("autocomplete", screen === "verify-email" ? "current-password" : "new-password");
      if (screen !== "sign-up") await page.locator("#participant-code").fill("000000");

      // Nine supplementary characters occupy 18 UTF-16 units but remain below
      // the ten-character minimum; the error comes from the API response.
      await password.fill("😀".repeat(9));
      await button.click();
      const summary = page.getByTestId("participant-account-error");
      await expect(summary).toBeFocused();
      await expect(page.locator("#participant-password-error")).toContainText(copy.invalidPassword);
      await expect(password).toHaveAttribute("aria-invalid", "true");
      await expect(password).toHaveAttribute("aria-describedby", "participant-password-hint participant-password-error");
      await expect(password).toHaveValue("😀".repeat(9));
      await summary.locator('a[href="#participant-password"]').focus();
      await page.keyboard.press("Enter");
      await expect(password).toBeFocused();

      await password.fill("😀".repeat(19)); // 76 UTF-8 bytes.
      await button.click();
      await expect(summary).toBeFocused();
      await expect(page.locator("#participant-password-error")).toContainText(copy.passwordTooLong);
      await expect(password).toHaveValue("😀".repeat(19));

      await password.fill("😀".repeat(10));
      await button.click();
      await expect(page.locator("#participant-password-error")).toHaveCount(0);
      await expect(password).toHaveValue("😀".repeat(10));
      if (screen === "sign-up") await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
      else {
        await expect(page.locator("#participant-code-error")).toContainText(copy.invalidCode);
        await page.locator("#participant-code").fill(syntheticCode);
      }
      await password.fill("😀".repeat(18)); // Exactly 72 UTF-8 bytes.
      await button.click();
      await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states[screen === "sign-up" ? "accepted" : screen === "verify-email" ? "verified" : "password_reset"]);
    });
  }
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
  await expect(page.locator("#participant-ageConfirmed")).toBeChecked();
  mock.failTransport(true);
  await page.getByRole("button", { name: participantCopy.ar.create, exact: true }).click();
  await expect(page.getByTestId("participant-account-error")).toBeFocused();
  await expect(page.locator("#participant-password")).toHaveValue(syntheticPassword);
  mock.failTransport(false);
  await page.getByRole("button", { name: participantCopy.ar.create, exact: true }).click();
  await page.getByRole("link", { name: participantCopy.ar.verify, exact: true }).click();
  await page.locator("#participant-code").fill(syntheticCode);
  await page.getByRole("link", { name: "View this page in English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  await expect(page.locator("#participant-code")).toHaveValue(syntheticCode);
  await expect(page.locator("#participant-password")).toHaveValue(syntheticPassword);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(new URL(page.url()).search).toBe("");
  await page.reload();
  await expect(page.locator("#participant-code")).toHaveValue("");
  await expect(page.locator("#participant-password")).toHaveValue("");
  await expect(page.getByRole("button", { name: participantCopy.en.verify, exact: true })).toBeDisabled();
  await expect(page.locator("#participant-password")).toBeEnabled();
  await page.locator("#participant-password").fill(syntheticPassword);
  await page.locator("#participant-code").fill(syntheticCode);
  await page.locator(".site-header .wordmark").click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  await expect(page.locator("#participant-password")).toHaveValue("");
  await expect(page.locator("#participant-code")).toHaveValue("");
});

test("authentication completed after a locale change restores current owner state", async ({ page }) => {
  let releaseSignIn!: () => void;
  let signInRequested!: () => void;
  let releaseLogout!: () => void;
  let logoutRequested!: () => void;
  const signInGate = new Promise<void>((resolve) => { releaseSignIn = resolve; });
  const signingIn = new Promise<void>((resolve) => { signInRequested = resolve; });
  const logoutGate = new Promise<void>((resolve) => { releaseLogout = resolve; });
  const signingOut = new Promise<void>((resolve) => { logoutRequested = resolve; });
  const mock = await mockAccounts(page, { signInGate, signInRequested, logoutGate, logoutRequested });
  mock.allowSignIn();
  try {
    await page.goto("/en/sign-in");
    await expect(page.locator("#participant-email")).toBeEnabled();
    await page.locator("#participant-email").fill("synthetic@example.invalid");
    await page.locator("#participant-password").fill(syntheticPassword);
    await page.getByRole("button", { name: participantCopy.en.signIn, exact: true }).click();
    await signingIn;
    const anonymousStatus = page.waitForResponse((response) => response.url().endsWith("/api/participant-accounts") && response.request().method() === "GET");
    await page.getByRole("link", { name: "View this page in Arabic", exact: true }).click();
    await expect(page).toHaveURL(/\/ar\/sign-in$/);
    await anonymousStatus;
    releaseSignIn();
    await expect(page.getByTestId("participant-account-status")).toHaveText(participantCopy.ar.states.authenticated);
    const dashboard = page.getByRole("link", { name: participantCopy.ar.links["my-msrc"], exact: true });
    await expect(dashboard).toBeVisible();
    await dashboard.click();
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await page.getByRole("button", { name: participantCopy.ar.signOut, exact: true }).click();
    await signingOut;
    const staleOwnerStatus = page.waitForResponse((response) => response.url().endsWith("/api/participant-accounts") && response.request().method() === "GET");
    await page.getByRole("link", { name: "View this page in English", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/my-msrc$/);
    await staleOwnerStatus;
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    releaseLogout();
    await expect(page.getByTestId("participant-account-status")).toHaveText(participantCopy.en.states.signed_out);
    await expect(page.getByTestId("participant-profile-name")).toHaveCount(0);
    await expect(page.getByTestId("participant-signin-required")).toBeVisible();
  } finally { releaseSignIn(); releaseLogout(); }
});
