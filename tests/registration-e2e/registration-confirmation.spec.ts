import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/csp";
import { prepareRegistrationCapture, registrationSession } from "../helpers/registration";
import { myRegistrationCopy } from "../../src/features/registration/my-registration-copy";

const origin = "http://127.0.0.1:3216";
const deadline = () => new Date(Date.now() + 3_600_000).toISOString();
async function accessible(page: Page, locale: "en" | "ar") {
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = myRegistrationCopy[locale];
  test(`${locale} confirms attendance with the same private ticket and idempotent response`, async ({ page, context, request }, testInfo) => {
    const expires = deadline();
    await registrationSession(request, context, { state: "approved", confirmation: { state: "awaiting", deadline: expires } });
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("seat-confirmation").getByRole("heading", { name: copy.confirmationTitle })).toBeVisible();
    await expect(page.getByTestId("confirmation-countdown")).toHaveAttribute("aria-live", "off");
    await expect(page.locator(`time[datetime="${expires}"]`)).toBeVisible();
    await expect(page.getByRole("button", { name: copy.cancel, exact: true })).toHaveCount(0);
    const reference = await page.getByTestId("ticket-reference").textContent(), qr = await page.getByTestId("ticket-qr").getAttribute("src");
    await accessible(page, locale);
    await prepareRegistrationCapture(page);
    await page.screenshot({ path: `.tools/night3-confirm-seat/participant-${testInfo.project.name}-${locale}-awaiting.png`, fullPage: true, scale: "css" });
    const posted = page.waitForResponse((response) => response.url().endsWith("/api/registration/me") && response.request().method() === "POST");
    await page.getByRole("button", { name: copy.confirmSeat, exact: true }).click();
    const response = await posted, payload = response.request().postDataJSON();
    expect(response.status()).toBe(200);
    expect(Object.keys(payload).sort()).toEqual(["action", "formToken", "operationId"]);
    expect(payload.action).toBe("confirm");
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.confirmed);
    await expect(page.getByTestId("ticket-reference")).toHaveText(reference ?? "");
    await expect(page.getByTestId("ticket-qr")).toHaveAttribute("src", qr ?? "");
    await expect(page.getByTestId("seat-confirmation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.releaseSeat, exact: true })).toBeVisible();
    expect((await context.request.post("/api/registration/me", { headers: { origin }, data: payload })).status()).toBe(200);
    await page.reload();
    await expect(page.getByTestId("ticket-reference")).toHaveText(reference ?? "");
    await accessible(page, locale);
    await prepareRegistrationCapture(page);
    await page.screenshot({ path: `.tools/night3-confirm-seat/participant-${testInfo.project.name}-${locale}-confirmed.png`, fullPage: true, scale: "css" });
  });

  for (const status of ["approved", "confirmed"] as const) test(`${locale} ${status} releases only after keyboard confirmation and revokes the ticket`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: status, confirmation: { state: status === "approved" ? "awaiting" : "confirmed", deadline: deadline() } });
    await page.goto(`/${locale}/registration`);
    const posts: string[] = [];
    page.on("request", (req) => { if (req.method() === "POST" && req.url().endsWith("/api/registration/me")) posts.push(req.url()); });
    await page.getByRole("button", { name: copy.releaseSeat, exact: true }).click();
    const dialog = page.getByTestId("registration-confirmation");
    await expect(dialog.getByRole("heading", { name: copy.releaseTitle, exact: true })).toBeFocused();
    await accessible(page, locale);
    await dialog.getByRole("button", { name: copy.keep, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.releaseSeat, exact: true })).toBeFocused();
    expect(posts).toHaveLength(0);
    await page.keyboard.press("Enter");
    await dialog.getByRole("button", { name: copy.confirmRelease, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.cancelled);
    await expect(page.getByTestId("confirmation-released")).toHaveText(copy.confirmationReleased);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    expect(posts).toHaveLength(1);
    const ticket = await (await context.request.get("/api/registration/ticket")).json();
    expect(ticket.ticket.status).toBe("revoked"); expect(ticket.ticket.qrDataUrl).toBeNull();
    await accessible(page, locale);
  });

  for (const policy of ["keep", "release"] as const) test(`${locale} elapsed confirmation follows the recorded ${policy} decision and refuses late confirm`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "approved", deadlinePolicy: policy,
      confirmation: { state: "awaiting", deadline: new Date(Date.now() - 60_000).toISOString() } });
    const current = await (await context.request.get("/api/registration/me")).json();
    const late = await context.request.post("/api/registration/me", { headers: { origin },
      data: { action: "confirm", formToken: current.formToken, operationId: randomUUID() } });
    expect(late.status()).toBe(409);
    expect((await late.json()).registration.confirmation.state).toBe(policy === "keep" ? "kept" : "released");
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("registration-status")).toHaveText(policy === "keep" ? copy.states.approved : copy.states.cancelled);
    await expect(page.getByTestId(policy === "keep" ? "confirmation-kept" : "confirmation-released")).toBeVisible();
    await expect(page.getByRole("button", { name: copy.confirmSeat, exact: true })).toHaveCount(0);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(policy === "keep" ? 1 : 0);
    await accessible(page, locale);
  });

  test(`${locale} countdown is a display clock and never changes a seat locally`, async ({ page, context, request }) => {
    await page.clock.install();
    await registrationSession(request, context, { state: "approved", confirmation: { state: "awaiting", deadline: new Date(Date.now() + 60_000).toISOString() } });
    await page.goto(`/${locale}/registration`);
    const timer = page.getByTestId("confirmation-countdown"), initial = await timer.textContent();
    await page.clock.runFor(1_000);
    await expect(timer).not.toHaveText(initial ?? "");
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/registration/me*", async (route) => { await held; await route.continue(); });
    try {
      await page.clock.fastForward(61_000);
      await expect(timer.locator("bdi")).toHaveText(locale === "ar" ? "٠٠:٠٠:٠٠" : "00:00:00");
      await expect(page.getByText(copy.confirmationExpired, { exact: true })).toBeVisible();
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
      await expect(page.getByTestId("ticket-qr")).toBeVisible();
      await accessible(page, locale);
    } finally { release(); }
  });

  for (const missing of ["version", "action"] as const) test(`${locale} missing confirmation ${missing} preserves the session and provides retry`, async ({ page, context, request }) => {
    const { cookie } = await registrationSession(request, context, { state: "approved", missingConfirmation: missing,
      confirmation: { state: "awaiting", deadline: deadline() } });
    await page.goto(`/${locale}/registration`);
    if (missing === "action") await page.getByRole("button", { name: copy.confirmSeat, exact: true }).click();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.areaNotReady);
    await expect(page.getByRole("link", { name: copy.signIn, exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.refresh, exact: true })).toBeVisible();
    expect((await context.cookies()).find((value) => value.name === cookie.name)?.value).toBe(cookie.value);
    await accessible(page, locale);
  });

  test(`${locale} a refused confirmation shows the unchanged seat and no successful confirmation`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "approved", actionState: "conflict", confirmation: { state: "awaiting", deadline: deadline() } });
    await page.goto(`/${locale}/registration`);
    const reference = await page.getByTestId("ticket-reference").textContent();
    await page.getByRole("button", { name: copy.confirmSeat, exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(copy.conflict);
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
    await expect(page.getByTestId("ticket-reference")).toHaveText(reference ?? "");
    await expect(page.getByRole("button", { name: copy.confirmSeat, exact: true })).toBeVisible();
    await accessible(page, locale);
  });
}
