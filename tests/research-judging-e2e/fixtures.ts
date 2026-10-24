import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import type { Role } from "../../src/lib/permissions/contract";
export const submissionId = "fa000000-0000-4000-8000-000000000001", assignmentId = "fa000000-0000-4000-8000-000000000002", awardId = "fa000000-0000-4000-8000-000000000003", judgeId = "fa000000-0000-4000-8000-000000000004";
export const title = "Synthetic accepted research";
export const rubric = [{ id: "synthetic", label: "Synthetic criterion", min: 0, max: 7 }];
export const emptySettings = { rubric: [], judgeCount: null, tieRule: null, categories: [], lockAt: null, supervisorDeadline: null, supervisorEvidence: null };
export const settings = { rubric, judgeCount: 1, tieRule: "Synthetic committee tie rule", categories: [{ id: "synthetic", label: "Synthetic award category" }], lockAt: "2099-01-01T00:00:00Z", supervisorDeadline: "2099-02-01T00:00:00Z", supervisorEvidence: "Synthetic supervisor evidence instructions" };
export const staffEntry = { id: submissionId, version: 1, reference: "SYNTHETIC-001", title, allocation: null, categoryId: null, assignments: [], award: null };
export const judgeAssignment = { id: assignmentId, submissionId, title, version: 1, status: "assigned", categoryId: "synthetic", lockAt: settings.lockAt, rubric, packet: { title, body: "Synthetic English background. Synthetic aim. Synthetic methods. Synthetic results. Synthetic conclusion." }, scorecard: null };
export const participantEntry = { id: submissionId, reference: "SYNTHETIC-001", title, presentationFormat: null, award: null, supervisorRequest: null };

type FixtureData = { roles?: Role[]; missing?: boolean; entries?: unknown[]; assignments?: unknown[]; settings?: unknown };
async function install(context: BrowserContext, kind: "staff" | "participant", data: FixtureData) {
  const suffix = randomBytes(6).toString("hex"), actorId = "fb000000-0000-4000-8000-" + suffix, sessionId = "fc000000-0000-4000-8000-" + suffix;
  const now = Date.now(), origin = "http://127.0.0.1:" + (kind === "staff" ? 3219 : 3216), deadline = now + (kind === "staff" ? 8 : 72) * 3600000;
  const roles = data.roles ?? [], claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: roles.includes("superAdmin") ? "aal2" : "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic", iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from((kind === "staff" ? "b" : "a").repeat(64), "hex"), iv); cipher.setAAD(Buffer.from(`msrc-${kind}-cookie-v1`));
  const payload = { actorId, sessionId, accessToken, refreshToken: "synthetic", deadline, origin, ...(kind === "staff" ? { challengeId: null, factorId: null, challengeExpiresAt: null } : {}) };
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  await context.addCookies([{ name: `msrc-${kind}-test`, value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const apikey = `sb_secret_${kind}_mock_only`;
  const replace = async (changed: FixtureData = {}) => expect((await context.request.post("http://127.0.0.1:3220/__synthetic/fixture", { headers: { apikey }, data: { actorId, sessionId, now, deadline, roles, settings: emptySettings, ...data, ...changed } })).ok()).toBe(true);
  await replace();
  return { actorId, replace, actions: async (): Promise<Array<{ action: string; payload: Record<string, unknown>; details?: Record<string, unknown> }>> => (await (await context.request.post("http://127.0.0.1:3220/__synthetic/actions", { headers: { apikey }, data: { actorId } })).json()).actions };
}
export const staffFixture = (context: BrowserContext, roles: Role[], data: FixtureData = {}) => install(context, "staff", { ...data, roles });
export const participantFixture = (context: BrowserContext, data: FixtureData = {}) => install(context, "participant", data);
export async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
}
