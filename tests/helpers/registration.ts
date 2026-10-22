import { createCipheriv, randomBytes } from "node:crypto";
import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3216";
export type FixtureState = "not-requested" | "pending_approval" | "waitlisted" | "offered" | "approved" | "confirmed" | "cancelled" | "expired" | "missing-rpc";
export type Fixture = { state: FixtureState; window?: { state: "early_access" | "scheduled" | "open" | "closed"; eligible: boolean; opensAt: string | null };
  attendance?: { conferenceDay: string; checkedInAt: string | null }[]; missingAttendance?: boolean;
  fewPlaces?: boolean; offerExpiresAt?: string; actionState?: string; missingCollection?: "context" | "submit" };

/** Keep the fixed header at the top of full-page evidence without changing focus. */
export async function prepareRegistrationCapture(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

/** The application SSR, native session, handler and QR generator stay real; only the loopback provider is synthetic. */
export async function registrationSession(request: APIRequestContext, context: BrowserContext, fixture: Fixture, stale = false) {
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

