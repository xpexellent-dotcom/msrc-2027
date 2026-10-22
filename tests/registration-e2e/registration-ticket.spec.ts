import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "../helpers/csp";
import { prepareRegistrationCapture } from "../helpers/registration";
import { registrationTicketCopy } from "../../src/features/registration/ticket-copy";

const origin = "http://127.0.0.1:3216";
const phase = process.env.JOURNEY_REVIEW_PHASE === "before" ? "before" : "after";
async function ticketSession(request: APIRequestContext, state: "issued" | "revoked" | "none" | "missing-rpc", stale = false) {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now();
  const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + (stale ? -30 : 3600),
    iat: Math.floor(now / 1000), amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv);
  cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic-refresh:" + actorId + ":" + sessionId,
    deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  const seeded = await request.post("http://127.0.0.1:3218/__synthetic/ticket", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, state } });
  expect(seeded.status()).toBe(200);
  return { name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin,
    httpOnly: true, sameSite: "Strict" as const };
}

for (const locale of ["en", "ar"] as const) {
  const copy = registrationTicketCopy[locale];
  for (const state of ["issued", "revoked", "none", "missing-rpc"] as const) test(`${locale} ${state} ticket display stays private, responsive and accessible`, async ({ page, context, request }, testInfo) => {
    const session = await ticketSession(request, state);
    await context.addCookies([session]);
    const unexpectedImages: string[] = [], errors: string[] = [];
    page.on("request", (req) => { if (req.resourceType() === "image" && !req.url().startsWith(origin) && !req.url().startsWith("data:")) unexpectedImages.push(req.url()); });
    page.on("pageerror", (error) => errors.push(error.name));
    await page.goto(`/${locale}/registration/ticket`);
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const card = page.getByTestId("registration-ticket");
    await expect(card.getByRole("status")).toHaveText(state === "issued" ? copy.issued : state === "revoked" ? copy.revoked : state === "none" ? copy.empty : copy.areaNotReady);
    if (state === "issued" || state === "revoked") await expect(page.getByTestId("ticket-reference")).toHaveText(/^[A-F0-9]{12}$/);
    else await expect(page.getByTestId("ticket-reference")).toHaveCount(0);
    if (state === "issued") {
      const image = page.getByTestId("ticket-qr");
      await expect(image).toHaveAttribute("src", /^data:image\/png;base64,/);
      await expect(image).toHaveAttribute("alt", copy.qrAlt);
      expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(200);
      expect(await card.textContent()).not.toContain("example.invalid");
    } else await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    const api = await context.request.get("/api/registration/ticket");
    const payload = await api.json();
    expect(api.headers()["cache-control"]).toContain("no-store");
    expect(JSON.stringify(payload)).not.toContain("msrc1.");
    expect(JSON.stringify(payload)).not.toContain("example.invalid");
    expect(JSON.stringify(payload)).not.toContain("actorId");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await prepareRegistrationCapture(page);
    await page.screenshot({ path: `.tools/journey-review/registration/${phase}/${testInfo.project.name}-${locale}/ticket-${state}.png`, fullPage: true, scale: "css" });
    const back = page.getByRole("link", { name: copy.registration, exact: true });
    await expect(back).toHaveAttribute("href", `/${locale}/registration`);
    if (state === "missing-rpc") {
      await expect(page.getByRole("link", { name: copy.signIn, exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: copy.retry }).click();
      await expect(card.getByRole("status")).toHaveText(copy.areaNotReady);
      expect((await context.cookies()).find((cookie) => cookie.name === session.name)?.value).toBe(session.value);
    }
    expect(errors).toEqual([]); expect(unexpectedImages).toEqual([]);
  });

  test(`${locale} ticket refresh restores an expired native token without exposing the QR first`, async ({ page, context, request }, testInfo) => {
    await context.addCookies([await ticketSession(request, "issued", true)]);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/registration/ticket", async (route) => { await held; await route.continue(); });
    try {
      await page.goto(`/${locale}/registration/ticket`);
      await expect(page.getByRole("status")).toHaveText(copy.checking);
      await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
      await prepareRegistrationCapture(page);
      await page.screenshot({ path: `.tools/journey-review/registration/${phase}/${testInfo.project.name}-${locale}/ticket-checking.png`, fullPage: true, scale: "css" });
      release();
      await expect(page.getByRole("status")).toHaveText(copy.issued);
      await expect(page.getByTestId("ticket-qr")).toBeVisible();
    } finally { release(); }
  });

  test(`${locale} a signed-out ticket request offers sign-in without private content`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/registration/ticket`);
    await expect(page.getByRole("status")).toHaveText(copy.denied);
    await expect(page.getByRole("link", { name: copy.signIn, exact: true })).toHaveAttribute("href", `/${locale}/sign-in`);
    await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
    await expect(page.getByTestId("ticket-reference")).toHaveCount(0);
    await prepareRegistrationCapture(page);
    await page.screenshot({ path: `.tools/journey-review/registration/${phase}/${testInfo.project.name}-${locale}/ticket-signed-out.png`, fullPage: true, scale: "css" });
  });
}
