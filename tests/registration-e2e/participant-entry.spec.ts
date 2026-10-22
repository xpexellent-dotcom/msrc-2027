import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test } from "../helpers/csp";
import { registrationSession } from "../helpers/registration";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";
import { myRegistrationCopy } from "../../src/features/registration/my-registration-copy";
import type { ParticipantPayload, ParticipantProfile, ParticipantResponse } from "../../src/features/participant-accounts/contracts";

// Both existing runtime gates are enabled only by the local registration config.
// Account delivery is mocked; registration SSR/API uses the loopback provider.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} first visitor reaches registration after creating and verifying an account`, async ({ page, context, request }, info) => {
    const copy = participantCopy[locale], registration = myRegistrationCopy[locale];
    const password = "Synthetic Journey 2027!", code = "654321";
    const actions: string[] = [];
    let profile: ParticipantProfile | null = null;
    let requestId: string | null = null;
    await page.route("**/api/participant-accounts", async (route) => {
      const response: ParticipantResponse = { state: "ready", profile, formToken: "synthetic-journey-form" };
      if (route.request().method() === "POST") {
        const payload = route.request().postDataJSON() as ParticipantPayload;
        actions.push(payload.action);
        if (payload.action === "signup") {
          expect(payload.ageConfirmed).toBe(true);
          expect(payload.password).toBe(password);
          response.state = "accepted";
          response.requestId = requestId = randomUUID();
          response.expiresAt = new Date(Date.now() + 600_000).toISOString();
          response.resendAvailableAt = new Date(Date.now() + 60_000).toISOString();
        } else if (payload.action === "verify") {
          expect(payload.requestId).toBe(requestId);
          expect(payload.code).toBe(code);
          expect(payload.password).toBe(password);
          response.state = "verified";
        } else if (payload.action === "signin") {
          expect(actions).toEqual(["signup", "verify", "signin"]);
          expect(payload.password).toBe(password);
          await registrationSession(request, context, { state: "not-requested" });
          response.state = "authenticated";
          response.profile = profile = { name: "Synthetic Participant", accountState: "verified" };
        }
      }
      await route.fulfill({ status: 200, json: response });
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const directory = `.tools/journey-review/bridge/${info.project.name}-${locale}`;
    await mkdir(directory, { recursive: true });
    const capture = async (step: string) => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo({ top: 0, behavior: "instant" });
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      await page.screenshot({ path: `${directory}/${step}.png`, fullPage: true, scale: "css",
        mask: [page.locator('input[type="password"], #participant-code')] });
    };
    await page.goto(`/${locale}`);
    await page.locator(".hero-actions a").first().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/participate$`));
    await page.locator(`.participation-path-link[href="/${locale}/registration"]`).click();
    await expect(page.getByTestId("registration-status")).toHaveText(registration.denied);
    await capture("01-attend-signed-out");
    await page.getByRole("link", { name: registration.createAccount, exact: true }).click();
    await expect(page.locator("#participant-name")).toBeEnabled();
    await page.locator("#participant-name").fill("Synthetic Participant");
    await page.locator("#participant-email").fill("synthetic@example.invalid");
    await page.locator("#participant-password").fill(password);
    await page.locator("#participant-ageConfirmed").check();
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.accepted);
    await capture("02-account-created");
    await page.getByRole("link", { name: copy.verify, exact: true }).click();
    await page.locator("#participant-code").fill(locale === "ar" ? "٦٥٤٣٢١" : code);
    await page.getByRole("button", { name: copy.verify, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.verified);
    await capture("03-email-verified");
    await page.getByRole("link", { name: copy.signIn, exact: true }).first().click();
    await page.locator("#participant-password").fill(password);
    await page.getByRole("button", { name: copy.signIn, exact: true }).click();
    await expect(page.getByTestId("participant-account-status")).toHaveText(copy.states.authenticated);
    await expect(page.locator("form")).toHaveCount(0);
    const next = page.locator(".participant-account-primary-next");
    await expect(next).toHaveAttribute("href", `/${locale}/registration`);
    await capture("04-signed-in-next-action");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await next.click();
    await expect(page.getByTestId("registration-status")).toHaveText(registration.states.not_requested);
    await expect(page.locator("#registration-document-number")).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await capture("05-registration-request");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  });
}
