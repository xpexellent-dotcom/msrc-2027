import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test } from "../helpers/csp";
import { abstractSettings, abstractSubmission } from "../fixtures/abstracts";
import { abstractCopy } from "../../src/features/submissions/copy";

for (const locale of ["en", "ar"] as const) test(`${locale} incomplete profile replaces abstract final submission with profile link`, async ({ page, context }) => {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now(), origin = "http://127.0.0.1:3216", claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const fixture = await context.request.post("http://127.0.0.1:3218/__synthetic/abstracts", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, mode: "profile_incomplete", submissions: [abstractSubmission], settings: abstractSettings } });
  expect(fixture.ok()).toBe(true);
  await page.goto(`/${locale}/abstracts/submit`);
  const gate = page.getByTestId("profile-submission-gate").first(); await expect(gate).toBeVisible();
  await expect(gate.getByRole("link")).toHaveAttribute("href", `/${locale}/my-msrc#profile`);
  await page.getByRole("button", { name: abstractCopy[locale].edit, exact: true }).click();
  await page.getByRole("button", { name: abstractCopy[locale].preview, exact: true }).click();
  await expect(page.getByRole("button", { name: abstractCopy[locale].finalize, exact: true })).toHaveCount(0);
  await expect(page.getByTestId("profile-submission-gate").last()).toBeVisible();
});
