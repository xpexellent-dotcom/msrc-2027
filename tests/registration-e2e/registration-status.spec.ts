import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../helpers/csp";
import { myRegistrationCopy } from "../../src/features/registration/my-registration-copy";
import { registrationCopy } from "../../src/features/registration/registration-copy";
import { registrationTicketCopy } from "../../src/features/registration/ticket-copy";

const origin = "http://127.0.0.1:3216";
type FixtureState = "not-requested" | "pending_approval" | "waitlisted" | "offered" | "approved" | "confirmed" | "cancelled" | "expired" | "missing-rpc";
type Fixture = { state: FixtureState; window?: { state: "early_access" | "scheduled" | "open" | "closed"; eligible: boolean; opensAt: string | null };
  attendance?: { conferenceDay: string; checkedInAt: string | null }[]; missingAttendance?: boolean;
  fewPlaces?: boolean; offerExpiresAt?: string; actionState?: string; missingCollection?: "context" | "submit" };

/** The application SSR, native session, handler and QR generator stay real; only the loopback provider is synthetic. */
async function registrationSession(request: APIRequestContext, context: BrowserContext, fixture: Fixture, stale = false) {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now();
  const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + (stale ? -30 : 3600),
    iat: Math.floor(now / 1000), amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv);
  cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic-refresh:" + actorId + ":" + sessionId,
    deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  const seeded = await request.post("http://127.0.0.1:3218/__synthetic/registration", {
    headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, ...fixture },
  });
  expect(seeded.status()).toBe(200);
  const cookie = { name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin,
    httpOnly: true, sameSite: "Strict" as const };
  await context.addCookies([cookie]);
  return { actorId, cookie };
}

async function accessible(page: Page, locale: "en" | "ar") {
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = myRegistrationCopy[locale];
  test(`${locale} attendance shows separate day credit and preserves login before its migration`, async ({ page, context, request }) => {
    const days = [{ conferenceDay: "2027-01-27", checkedInAt: "2027-01-27T06:30:00Z" }, { conferenceDay: "2027-01-28", checkedInAt: null }];
    const { actorId } = await registrationSession(request, context, { state: "approved", attendance: days });
    await page.goto(`/${locale}/registration`);
    const attendance = page.getByTestId("registration-attendance");
    await expect(attendance.getByRole("heading", { name: copy.attendance })).toBeVisible();
    await expect(attendance.getByTestId("attendance-2027-01-27")).toContainText(copy.checkedIn);
    await expect(attendance.getByTestId("attendance-2027-01-28")).toContainText(copy.notCheckedIn);
    await expect(attendance.locator('time[datetime="2027-01-27T06:30:00Z"]')).toBeVisible();
    await expect(attendance).toContainText(copy.attendanceHint);
    await accessible(page, locale);
    const originalCookie = (await context.cookies()).find((cookie) => cookie.name === "msrc-participant-test")?.value;
    await request.post("http://127.0.0.1:3218/__synthetic/registration", {
      headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, state: "approved", missingAttendance: true },
    });
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.areaNotReady);
    expect((await context.cookies()).find((cookie) => cookie.name === "msrc-participant-test")?.value).toBe(originalCookie);
    await expect(page.getByTestId("registration-attendance")).toHaveCount(0);
    await accessible(page, locale);
  });
  const statusStates = ["pending_approval", "waitlisted", "offered", "approved", "confirmed", "cancelled", "expired"] as const;
  for (const state of statusStates) test(`${locale} ${state} is a single server-owned, private and accessible registration state`, async ({ page, context, request }, testInfo) => {
    const { actorId } = await registrationSession(request, context, { state });
    const response = await page.goto(`/${locale}/registration`);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
    const card = page.getByTestId("my-registration");
    await expect(card.getByTestId("registration-status")).toHaveText(copy.states[state]);
    await expect(page.getByTestId("registration-request")).toHaveCount(0);
    await expect(page.locator("#registration-document-number")).toHaveCount(0);
    if (state === "offered") {
      await expect(page.getByTestId("offer-countdown")).toBeVisible();
      await expect(page.getByRole("button", { name: copy.accept, exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: copy.decline, exact: true })).toBeEnabled();
    } else {
      await expect(page.getByTestId("offer-countdown")).toHaveCount(0);
      await expect(page.getByRole("button", { name: copy.accept, exact: true })).toHaveCount(0);
    }
    if (["approved", "confirmed"].includes(state)) {
      await expect(page.getByTestId("ticket-qr")).toHaveAttribute("src", /^data:image\/png;base64,/);
      await expect(page.getByTestId("ticket-qr")).toHaveAttribute("alt", registrationTicketCopy[locale].qrAlt);
      await expect(page.getByTestId("ticket-reference")).toHaveText(/^[A-F0-9]{12}$/);
      await expect(page.getByTestId("ticket-reference")).toHaveAttribute("dir", "ltr");
    } else await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    if (["cancelled", "expired", "confirmed"].includes(state)) await expect(page.getByRole("button", { name: copy.cancel, exact: true })).toHaveCount(0);
    else await expect(page.getByRole("button", { name: copy.cancel, exact: true })).toBeEnabled();
    const api = await context.request.get("/api/registration/me");
    expect(api.status()).toBe(200);
    expect(api.headers()["cache-control"]).toContain("no-store");
    const data = await api.json();
    expect(data.registration.status).toBe(state);
    for (const privateValue of [actorId, "msrc1.", "example.invalid", "request_id", "session_claims", "remaining", "capacity"]) expect(JSON.stringify(data)).not.toContain(privateValue);
    expect(data.registration).not.toHaveProperty("id");
    await accessible(page, locale);
    await page.screenshot({ path: `test-results/registration/${testInfo.project.name}-${locale}-status-${state}.png`, fullPage: true });
  });

  const windows = [
    { name: "early access on list", state: "early_access", eligible: true, opensAt: null, form: true },
    { name: "early access outside list", state: "early_access", eligible: false, opensAt: "2030-11-18T17:00:00.000Z", form: false },
    { name: "scheduled", state: "scheduled", eligible: false, opensAt: "2030-11-18T17:00:00.000Z", form: false },
    { name: "open", state: "open", eligible: true, opensAt: null, form: true },
    { name: "closed", state: "closed", eligible: false, opensAt: null, form: false },
  ] as const;
  for (const window of windows) test(`${locale} not requested with ${window.name} renders the eligibility and configured opening time`, async ({ page, context, request }, testInfo) => {
    await registrationSession(request, context, { state: "not-requested", window: { state: window.state, eligible: window.eligible, opensAt: window.opensAt } });
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.not_requested);
    await expect(page.locator("#registration-document-number")).toHaveCount(window.form ? 1 : 0);
    if (window.opensAt) await expect(page.locator(`time[datetime="${window.opensAt}"]`)).toBeVisible();
    await expect(page.getByText(copy.fewPlaces, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    await accessible(page, locale);
    await page.screenshot({ path: `test-results/registration/${testInfo.project.name}-${locale}-window-${window.state}-${window.eligible}.png`, fullPage: true });
  });

  test(`${locale} low-capacity notice uses only the private server projection`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "not-requested", fewPlaces: true });
    await page.goto(`/${locale}/registration`);
    await expect(page.getByText(copy.fewPlaces, { exact: true })).toBeVisible();
    const payload = await (await context.request.get("/api/registration/me")).json();
    expect(payload.fewPlacesLeft).toBe(true);
    expect(payload).not.toHaveProperty("remaining");
    expect(payload).not.toHaveProperty("capacity");
    expect(payload).not.toHaveProperty("placesRemainingThreshold");
    await accessible(page, locale);
  });

  test(`${locale} accept uses a server operation and replaces the offer with its ticket`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "offered" });
    await page.goto(`/${locale}/registration`);
    const posted = page.waitForResponse((response) => response.url().endsWith("/api/registration/me") && response.request().method() === "POST");
    await page.getByRole("button", { name: copy.accept, exact: true }).click();
    const response = await posted;
    expect(response.status()).toBe(200);
    const payload = response.request().postDataJSON();
    expect(Object.keys(payload).sort()).toEqual(["action", "formToken", "operationId"]);
    expect(payload.action).toBe("accept");
    expect(payload.operationId).toMatch(/^[a-f0-9-]{36}$/);
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
    await expect(page.getByTestId("ticket-qr")).toBeVisible();
    await expect(page.getByTestId("offer-countdown")).toHaveCount(0);
    const reference = await page.getByTestId("ticket-reference").textContent();
    const retry = await context.request.post("/api/registration/me", { headers: { origin }, data: payload });
    expect(retry.status()).toBe(200);
    await page.reload();
    await expect(page.getByTestId("ticket-reference")).toHaveText(reference ?? "");
    await accessible(page, locale);
  });

  test(`${locale} countdown moves while local expiry waits for a server status`, async ({ page, context, request }) => {
    await page.clock.install();
    await registrationSession(request, context, { state: "offered", offerExpiresAt: new Date(Date.now() + 60_000).toISOString() });
    await page.goto(`/${locale}/registration`);
    const countdown = page.getByTestId("offer-countdown");
    await expect(countdown).toHaveAttribute("aria-live", "off");
    const original = await countdown.textContent();
    await page.clock.runFor(1_000);
    await expect(countdown).not.toHaveText(original ?? "");
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/registration/me*", async (route) => { await held; await route.continue(); });
    try {
      await page.clock.fastForward(61_000);
      await expect(countdown.locator("bdi")).toHaveText(locale === "ar" ? "٠٠:٠٠:٠٠" : "00:00:00");
      await expect(page.getByText(copy.deadlinePassed, { exact: true })).toBeVisible();
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.offered);
      await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    } finally { release(); }
  });

  test(`${locale} decline releases the visible offer only after a successful server response`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "offered" });
    await page.goto(`/${locale}/registration`);
    await page.getByRole("button", { name: copy.decline, exact: true }).click();
    const confirmation = page.getByTestId("registration-confirmation");
    await expect(confirmation.getByRole("heading", { name: copy.declineTitle, exact: true })).toBeFocused();
    await confirmation.getByRole("button", { name: copy.confirmDecline, exact: true }).click();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.cancelled);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    await expect(page.getByTestId("offer-countdown")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.cancelled);
    await accessible(page, locale);
  });

  for (const state of ["pending_approval", "approved"] as const) test(`${locale} ${state} cancellation has a keyboard confirmation and revokes any ticket`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state });
    await page.goto(`/${locale}/registration`);
    const posts: string[] = [];
    page.on("request", (req) => { if (req.method() === "POST" && req.url().endsWith("/api/registration/me")) posts.push(req.url()); });
    await page.getByRole("button", { name: copy.cancel, exact: true }).click();
    const dialog = page.getByTestId("registration-confirmation");
    await expect(dialog).toBeVisible();
    await accessible(page, locale);
    await dialog.getByRole("button", { name: copy.keep, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.cancel, exact: true })).toBeFocused();
    expect(posts).toHaveLength(0);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: copy.confirmCancel, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.cancelled);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    expect(posts).toHaveLength(1);
    await page.reload();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.cancelled);
    if (state === "approved") {
      const ticket = await (await context.request.get("/api/registration/ticket")).json();
      expect(ticket.ticket.status).toBe("revoked");
      expect(ticket.ticket.qrDataUrl).toBeNull();
    }
    await accessible(page, locale);
  });

  test(`${locale} missing status RPC keeps the account session and presents retry`, async ({ page, context, request }) => {
    const { cookie } = await registrationSession(request, context, { state: "missing-rpc" });
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("my-registration")).toContainText(copy.areaNotReady);
    await expect(page.getByRole("link", { name: copy.signIn, exact: true })).toHaveCount(0);
    await expect(page.getByTestId("registration-request")).toHaveCount(0);
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    await expect(page.getByTestId("my-registration")).toContainText(copy.areaNotReady);
    expect((await context.cookies()).find((item) => item.name === cookie.name)?.value).toBe(cookie.value);
    await accessible(page, locale);
  });

  for (const missingCollection of ["context", "submit"] as const) test(`${locale} missing collection ${missingCollection} RPC preserves the participant session and retry`, async ({ page, context, request }) => {
    const { cookie } = await registrationSession(request, context, { state: "not-requested", missingCollection });
    const formCopy = registrationCopy[locale];
    await page.goto(`/${locale}/registration`);
    const form = page.getByTestId("registration-request");
    if (missingCollection === "submit") {
      await page.locator("#registration-document-type").selectOption("passport");
      await page.locator("#registration-document-number").fill("FAKE0001");
      await page.locator("#registration-terms").check();
      await form.getByRole("button", { name: formCopy.submit, exact: true }).click();
    }
    await expect(form.getByRole("alert")).toContainText(formCopy.areaNotReady);
    await expect(page.locator("#registration-document-number")).toHaveCount(0);
    await expect(form.getByRole("link", { name: formCopy.signIn, exact: true })).toHaveCount(0);
    const retried = page.waitForResponse((response) => response.url().includes("/api/workflows/registration?locale=") && response.request().method() === "GET");
    await form.getByRole("button", { name: formCopy.retry, exact: true }).click();
    expect((await retried).status()).toBe(missingCollection === "context" ? 503 : 200);
    if (missingCollection === "context") await expect(form.getByRole("alert")).toContainText(formCopy.areaNotReady);
    else await expect(page.locator("#registration-document-number")).toBeVisible();
    expect((await context.cookies()).find((item) => item.name === cookie.name)?.value).toBe(cookie.value);
    await accessible(page, locale);
  });

  test(`${locale} rejected acceptance preserves the server offer and has no optimistic ticket`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "offered", actionState: "conflict" });
    await page.goto(`/${locale}/registration`);
    await page.getByRole("button", { name: copy.accept, exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(copy.conflict);
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.offered);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    await accessible(page, locale);
  });

  test(`${locale} the server rejects an elapsed deadline even if a client sends acceptance directly`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "offered", offerExpiresAt: new Date(Date.now() - 60_000).toISOString() });
    const current = await (await context.request.get("/api/registration/me")).json();
    const response = await context.request.post("/api/registration/me", { headers: { origin },
      data: { action: "accept", operationId: randomUUID(), formToken: current.formToken } });
    expect(response.status()).toBe(409);
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.expired);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    await accessible(page, locale);
  });

  test(`${locale} a stale native session refreshes before private registration is revealed`, async ({ page, context, request }) => {
    await registrationSession(request, context, { state: "approved" }, true);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/registration/me*", async (route) => { await held; await route.continue(); });
    try {
      await page.goto(`/${locale}/registration`);
      await expect(page.getByTestId("my-registration")).toContainText(copy.checking);
      await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
      release();
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
      await expect(page.getByTestId("ticket-qr")).toBeVisible();
    } finally { release(); }
  });

  test(`${locale} the initial registration state is rendered without JavaScript`, async ({ browser, request }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      await registrationSession(request, context, { state: "approved" });
      const page = await context.newPage();
      await page.goto(origin + `/${locale}/registration`);
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
      await expect(page.getByTestId("ticket-qr")).toBeVisible();
      await expect(page.getByTestId("ticket-reference")).toHaveText(/^[A-F0-9]{12}$/);
      await expect(page.getByText(registrationCopy[locale].confirmation, { exact: true })).toHaveCount(0);
    } finally { await context.close(); }
  });
}
