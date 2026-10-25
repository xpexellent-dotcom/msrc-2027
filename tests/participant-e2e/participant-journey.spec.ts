import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "../helpers/csp";
import { expectStylesheetsReady } from "../helpers/stylesheets";
import type { ParticipantPayload, ParticipantProfile, ParticipantResponse } from "../../src/features/participant-accounts/contracts";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";

const password = "Synthetic Journey 2027!";
const code = "654321";

/** Only browser-boundary presentation fixtures; no provider, account or email. */
async function accountJourney(page: Page) {
  let profile: ParticipantProfile | null = null;
  let nextState: ParticipantResponse["state"] | null = null;
  let hold: Promise<void> | undefined;
  let release = () => {};
  let calls = 0;
  let expired = false;
  let statusUnavailable = false;
  await page.route("**/api/participant-accounts", async (route) => {
    const response: ParticipantResponse = { state: "ready", profile, formToken: "synthetic-journey-form" };
    if (route.request().method() === "GET" && statusUnavailable) {
      response.state = "unavailable";
      delete response.formToken;
    }
    if (route.request().method() === "POST") {
      calls += 1;
      const payload = route.request().postDataJSON() as ParticipantPayload;
      await hold;
      if (nextState) { response.state = nextState; nextState = null; }
      else if (["signup", "resend", "forgot"].includes(payload.action)) {
        response.state = "accepted";
        response.requestId = "synthetic-journey-request";
        response.expiresAt = new Date(Date.now() + (expired ? -1 : 600_000)).toISOString();
        response.resendAvailableAt = new Date(Date.now() + (expired ? -1 : 60_000)).toISOString();
      } else if (payload.action === "verify" || payload.action === "reset") {
        response.state = payload.code === code ? payload.action === "verify" ? "verified" : "password_reset" : "invalid_code";
        if (response.state === "invalid_code") response.fieldErrors = { code: "invalid" };
      } else if (payload.action === "signin") {
        response.state = "authenticated";
        response.profile = profile = { name: "Synthetic Participant", accountState: "verified" };
      } else if (payload.action === "logout") { response.state = "signed_out"; response.profile = profile = null; }
      if (response.state === "limited") response.retryAfterSeconds = 60;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return {
    fail: (state: ParticipantResponse["state"]) => { nextState = state; },
    expire: () => { expired = true; },
    hold: () => { hold = new Promise<void>((resolve) => { release = resolve; }); },
    release: () => { release(); hold = undefined; },
    calls: () => calls,
    failStatus: (value: boolean) => { statusUnavailable = value; },
  };
}

async function capture(page: Page, locale: string, project: string, state: string) {
  await expectStylesheetsReady(page);
  const directory = resolve(".tools/journey-review/account", process.env.JOURNEY_REVIEW_PHASE ?? "after");
  await mkdir(directory, { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo({ top: 0, behavior: "instant" }); });
  await expect.poll(() => page.evaluate(() => document.querySelector(".participant-account-intro h1")!.getBoundingClientRect().top >= document.querySelector(".site-header")!.getBoundingClientRect().bottom)).toBe(true);
  // CSS pixels keep enlarged-text pages below the mobile GPU's image-height limit.
  await page.screenshot({ path: resolve(directory, `${locale}-${project}-${state}.png`), fullPage: true, scale: "css", mask: [page.locator('input[type="password"], #participant-code')] });
  const metrics = await page.locator(".participant-account-card").evaluate((panel) => ({
    width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollY: window.scrollY,
    headingTop: document.querySelector(".participant-account-intro h1")!.getBoundingClientRect().top,
    headerBottom: document.querySelector(".site-header")!.getBoundingClientRect().bottom,
    controls: Array.from(panel.querySelectorAll<HTMLElement>('button, a, input:not([type="checkbox"]):not([name="website"]), .choice-label')).filter((element) => element.getBoundingClientRect().width > 0).map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { tag: element.tagName, name: element.id || element.textContent?.trim(), width, height };
    }),
  }));
  await writeFile(resolve(directory, `${locale}-${project}-${state}.json`), JSON.stringify(metrics, null, 2));
}

async function accessible(page: Page) {
  await expectStylesheetsReady(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const smallTargets = await page.locator(".participant-account-card").evaluate((panel) => Array.from(panel.querySelectorAll<HTMLElement>('button, a, input:not([type="checkbox"]):not([name="website"]), .choice-label')).filter((element) => {
    const { width, height } = element.getBoundingClientRect();
    return width > 0 && (width < 44 || height < 44);
  }).map((element) => element.id || element.textContent?.trim()));
  expect(smallTargets).toEqual([]);
}

async function credentials(page: Page) {
  await expect(page.locator("#participant-email")).toBeEnabled();
  await page.locator("#participant-email").fill("synthetic@example.invalid");
  await page.locator("#participant-password").fill(password);
  // ENG-083: sign-up also asks to confirm the password.
  if (await page.locator("#participant-confirmPassword").count()) await page.locator("#participant-confirmPassword").fill(password);
}

for (const locale of ["en", "ar"] as const) {
  const copy = participantCopy[locale];
  test(`${locale} first visitor account journey and every completion state`, async ({ page }, testInfo) => {
    test.setTimeout(60_000); // One complete multi-page journey, including each server-token waiting boundary.
    const mock = await accountJourney(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/sign-up`);
    await expect(page.locator("#participant-firstName")).toBeEnabled();
    await expect(page.getByTestId("participant-privacy-version")).toHaveAttribute("dir", "ltr");
    await capture(page, locale, testInfo.project.name, "01-signup");
    const create = page.getByRole("button", { name: copy.create, exact: true });
    await create.click();
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    await capture(page, locale, testInfo.project.name, "02-signup-errors");
    await accessible(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await capture(page, locale, testInfo.project.name, "24-signup-errors-200");
    await accessible(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    const emailError = page.getByTestId("participant-account-error").locator('a[href="#participant-email"]');
    await emailError.focus(); await page.keyboard.press("Enter");
    await expect(page.locator("#participant-email")).toBeFocused();
    expect(await page.locator("#participant-email").evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.locator("#participant-firstName").fill("Synthetic"); await page.locator("#participant-lastName").fill("Participant");
    await credentials(page);
    await page.locator("#participant-ageConfirmed").check();
    mock.hold();
    try {
      await create.click();
      await expect(create).toBeDisabled();
      await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
      await page.locator("form").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      await capture(page, locale, testInfo.project.name, "03-signup-pending");
      expect(mock.calls()).toBe(1);
    } finally { mock.release(); }
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
    // ENG-083: creating the account continues straight to verification with live countdowns.
    await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email$`));
    await capture(page, locale, testInfo.project.name, "04-signup-accepted");
    await expect(page.locator("#participant-code")).toBeEnabled();
    await expect(page.getByTestId("participant-code-sent")).toContainText("synthetic@example.invalid");
    await expect(page.getByTestId("participant-code-expiry")).toContainText(copy.expiresIn);
    await expect(page.getByTestId("participant-resend-wait")).toContainText(copy.resendIn);
    await expect(page.locator(".participant-account-time time > bdi[dir=ltr]")).toHaveCount(2);
    await capture(page, locale, testInfo.project.name, "05-verification-code");
    await page.locator("#participant-code").fill("000000");
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    await expect(page.locator("#participant-code-error")).toContainText(copy.codeNotVerified);
    await capture(page, locale, testInfo.project.name, "06-verification-error");
    await accessible(page);
    await page.locator("#participant-code").fill(locale === "ar" ? "٦٥٤٣٢١" : code);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.verified);
    await capture(page, locale, testInfo.project.name, "07-verified");
    await accessible(page);
    await page.getByRole("link", { name: copy.signIn, exact: true }).first().click();
    await credentials(page);
    await capture(page, locale, testInfo.project.name, "08-signin");
    mock.fail("invalid_credentials");
    const signIn = page.getByRole("button", { name: copy.signIn, exact: true });
    await signIn.click();
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    await capture(page, locale, testInfo.project.name, "09-signin-error");
    await expect(page.locator(".participant-account-navigation").getByRole("link", { name: copy.verify, exact: true })).toHaveAttribute("href", `/${locale}/verify-email`);
    await accessible(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await capture(page, locale, testInfo.project.name, "25-signin-error-200");
    await accessible(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    mock.hold();
    try {
      await signIn.click();
      await expect(signIn).toBeDisabled();
      await capture(page, locale, testInfo.project.name, "10-signin-pending");
    } finally { mock.release(); }
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.authenticated);
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator(".participant-account-primary-next")).toHaveAttribute("href", `/${locale}/my-msrc`);
    await capture(page, locale, testInfo.project.name, "11-signed-in");
    await accessible(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await capture(page, locale, testInfo.project.name, "26-signed-in-200");
    await accessible(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.getByRole("link", { name: copy.links["my-msrc"], exact: true }).click();
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await capture(page, locale, testInfo.project.name, "12-my-msrc");
    await accessible(page);
    await page.getByRole("button", { name: copy.signOut, exact: true }).click();
    await expect(page.getByTestId("participant-signin-required")).toBeVisible();
    await capture(page, locale, testInfo.project.name, "13-signed-out");
  });

  test(`${locale} direct verification recovery and expired code have a usable next action`, async ({ page }, testInfo) => {
    const mock = await accountJourney(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/verify-email`);
    await expect(page.locator("#participant-email")).toBeEnabled();
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeDisabled();
    await expect(page.getByTestId("participant-code-restart")).toHaveText(copy.verificationRestart);
    await capture(page, locale, testInfo.project.name, "14-verification-direct");
    await credentials(page);
    mock.expire();
    await page.getByRole("button", { name: copy.resend, exact: true }).click();
    await expect(page.getByText(copy.expired, { exact: true })).toBeVisible();
    await capture(page, locale, testInfo.project.name, "15-verification-expired");
    await accessible(page);
    await page.reload();
    await expect(page.locator("#participant-email")).toBeEnabled();
    await expect(page.getByTestId("participant-code-restart")).toHaveText(copy.verificationRestart);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await capture(page, locale, testInfo.project.name, "16-verification-reloaded-200");
    await accessible(page);
  });

  test(`${locale} recovery failure and success remain readable at enlarged text`, async ({ page }, testInfo) => {
    const mock = await accountJourney(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/forgot-password`);
    await expect(page.locator("#participant-email")).toBeEnabled();
    await capture(page, locale, testInfo.project.name, "17-forgot-password");
    await page.locator("#participant-email").fill("synthetic@example.invalid");
    mock.fail("unavailable");
    await page.getByRole("button", { name: copy.requestReset, exact: true }).click();
    await expect(page.getByTestId("participant-account-error")).toBeFocused();
    await capture(page, locale, testInfo.project.name, "18-recovery-unavailable");
    await page.getByRole("button", { name: copy.requestReset, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
    await capture(page, locale, testInfo.project.name, "19-recovery-accepted");
    await page.getByRole("link", { name: copy.links["reset-password"], exact: true }).first().click();
    await credentials(page);
    await page.locator("#participant-code").fill(code);
    await capture(page, locale, testInfo.project.name, "20-reset-password");
    await page.getByRole("button", { name: copy.reset, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.password_reset);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await capture(page, locale, testInfo.project.name, "21-password-reset-200");
    await accessible(page);
  });

  test(`${locale} sign-in throttle keeps the retry instruction and pending boundary`, async ({ page }, testInfo) => {
    const mock = await accountJourney(page);
    await page.goto(`/${locale}/sign-in`);
    await credentials(page);
    mock.fail("limited");
    const signIn = page.getByRole("button", { name: copy.signIn, exact: true });
    await signIn.click();
    await expect(page.getByTestId("participant-account-error").locator("p")).toHaveText(locale === "en" ? "Please wait before trying again." : "يرجى الانتظار قبل المحاولة مجددًا.");
    await expect(signIn).toBeDisabled();
    await capture(page, locale, testInfo.project.name, "22-signin-limited");
    await accessible(page);
    expect(mock.calls()).toBe(1);
  });

  test(`${locale} recovery codes cannot enable the email verification screen`, async ({ page }, testInfo) => {
    const mock = await accountJourney(page);
    await page.goto(`/${locale}/forgot-password`);
    await expect(page.locator("#participant-email")).toBeEnabled();
    await page.locator("#participant-email").fill("synthetic@example.invalid");
    await page.getByRole("button", { name: copy.requestReset, exact: true }).click();
    await page.getByRole("link", { name: copy.signIn, exact: true }).click();
    await page.locator(".participant-account-navigation").getByRole("link", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-code-restart")).toHaveText(copy.verificationRestart);
    await expect(page.getByRole("button", { name: copy.verify, exact: true })).toBeDisabled();
    await expect(page.locator(".participant-account-time time")).toHaveCount(1); // The shared resend cooldown still applies.
    await capture(page, locale, testInfo.project.name, "23-wrong-purpose-code");
    await accessible(page);
    expect(mock.calls()).toBe(1);
  });

  test(`${locale} availability failure replaces stale account success and preserves retry input`, async ({ page }, testInfo) => {
    const mock = await accountJourney(page);
    await page.goto(`/${locale}/sign-up`);
    await expect(page.locator("#participant-firstName")).toBeEnabled();
    await page.locator("#participant-firstName").fill("Synthetic"); await page.locator("#participant-lastName").fill("Participant");
    await credentials(page);
    await page.locator("#participant-ageConfirmed").check();
    // ENG-083: sign-up continues straight to verification, whose status read then fails.
    mock.failStatus(true);
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email$`));
    const retry = page.getByRole("button", { name: copy.retry, exact: true });
    await expect(retry).toBeEnabled();
    await capture(page, locale, testInfo.project.name, "27-verification-status-unavailable");
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.unavailable);
    await expect(page.locator("#participant-email")).toBeDisabled();
    await expect(page.locator("#participant-email")).toHaveValue("synthetic@example.invalid");
    await expect(page.locator("#participant-password")).toHaveValue(password);
    await accessible(page);
    expect(mock.calls()).toBe(1);
    mock.failStatus(false);
    await retry.click();
    await expect(page.locator("#participant-code")).toBeEnabled();
    await page.locator("#participant-code").fill(code);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.verified);
    expect(mock.calls()).toBe(2);
  });

  test(`${locale} direct and reloaded reset screens explain how to request a replacement code`, async ({ page }, testInfo) => {
    const mock = await accountJourney(page);
    await page.goto(`/${locale}/reset-password`);
    await expect(page.locator("#participant-email")).toBeEnabled();
    await expect(page.getByTestId("participant-code-restart")).toHaveText(copy.recoveryRestart);
    await expect(page.getByRole("button", { name: copy.reset, exact: true })).toBeDisabled();
    await capture(page, locale, testInfo.project.name, "28-reset-direct");
    await accessible(page);
    await page.locator("#participant-email").fill("synthetic@example.invalid");
    await page.getByRole("button", { name: copy.resend, exact: true }).click();
    await expect(page.getByTestId("participant-code-restart")).toHaveCount(0);
    await expect(page.locator("#participant-code")).toBeFocused();
    await capture(page, locale, testInfo.project.name, "29-reset-code-requested");
    expect(mock.calls()).toBe(1);
    await page.reload();
    await expect(page.locator("#participant-email")).toBeEnabled();
    await expect(page.getByTestId("participant-code-restart")).toHaveText(copy.recoveryRestart);
    await expect(page.getByRole("button", { name: copy.reset, exact: true })).toBeDisabled();
    await expect(page.locator("#participant-password")).toHaveValue("");
    await expect(page.locator("#participant-code")).toHaveValue("");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await capture(page, locale, testInfo.project.name, "30-reset-reloaded-200");
    await accessible(page);
  });
}
