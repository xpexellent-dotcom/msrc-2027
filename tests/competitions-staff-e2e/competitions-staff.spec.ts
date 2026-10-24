import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { COMPETITION_SETTING_KEYS } from "../../src/features/competitions/staff-contract";
import { competitionSettingLabels, staffCompetitionCopy } from "../../src/features/competitions/staff-copy";
import type { Role } from "../../src/lib/permissions/contract";
const itemId = "ea000000-0000-4000-8000-000000000001", memberId = "ea000000-0000-4000-8000-000000000002";
const packet = { title: "Synthetic blinded project", pitch: "A synthetic English pitch for review.", narrative: "", track: "translating_research" };
const rubric = [{ id: "synthetic", label: "Synthetic criterion", min: 0, max: 7 }];
const entry = { id: itemId, kind: "hackathon", status: "submitted", version: 1, title: packet.title, track: "translating_research", document: { title: packet.title, pitch: packet.pitch }, eligibility: "pending", assignedCount: 0, completedCount: 0, roster: [{ id: memberId, email: "synthetic-member@example.invalid", isLead: true, confirmed: false }], files: [], outcome: null, decision: null };
async function fixture(context: BrowserContext, roles: Role[], options: { assignment?: boolean; missing?: boolean; entries?: boolean } = {}) {
  const suffix = randomBytes(6).toString("hex"), actorId = "eb000000-0000-4000-8000-" + suffix, sessionId = "ec000000-0000-4000-8000-" + suffix, now = Date.now(), origin = "http://127.0.0.1:3219", deadline = now + 8 * 3600000;
  const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: roles.includes("superAdmin") ? "aal2" : "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] }, accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("b".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-staff-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline, origin, challengeId: null, factorId: null, challengeExpiresAt: null }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-staff-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  expect((await context.request.post("http://127.0.0.1:3220/__synthetic/fixture", { headers: { apikey: "sb_secret_staff_mock_only" }, data: { actorId, sessionId, now, deadline, roles, missing: options.missing, settings: Object.fromEntries(COMPETITION_SETTING_KEYS.map((key) => [key, null])), entries: options.entries ? [entry] : [], assignments: options.assignment ? [{ id: itemId, entryId: itemId, version: 1, status: "assigned", title: packet.title, packet, rubric, scorecard: null, ...(roles.includes("facultyJudge") ? { files: [{ id: memberId, name: "Synthetic final presentation.pdf" }] } : {}) }] : [] } })).ok()).toBe(true);
  return { actions: async () => (await (await context.request.post("http://127.0.0.1:3220/__synthetic/actions", { headers: { apikey: "sb_secret_staff_mock_only" }, data: { actorId } })).json()).actions };
}
async function accessible(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1); expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]); }
for (const locale of ["en", "ar"] as const) {
  const copy = staffCompetitionCopy[locale];
  test(`${locale} Super Admin sees unset policies and saves without activation`, async ({ page, context }, info) => {
    const f = await fixture(context, ["superAdmin"]); await page.goto(`/${locale}/staff/competitions`); await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible(); await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.locator(".competition-settings > summary").click();
    for (const key of ["finalistCapPerTrack", "minimumReviews", "judgeCount", "pitchPromptStructure"] as const) await expect(page.getByLabel(competitionSettingLabels[key][locale], { exact: true })).toHaveValue("");
    await expect(page.getByLabel(competitionSettingLabels.soloConsumesFinalistQuota[locale], { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: copy.saveSettings, exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: copy.saved })).toBeVisible();
    const actions = await f.actions(); expect(actions[0].payload.settings.soloConsumesFinalistQuota).toBeNull(); expect(actions[0].payload).not.toHaveProperty("enabled");
    await page.locator(".competition-settings > summary").click(); await accessible(page); await page.screenshot({ path: info.outputPath(`${locale}-competition-settings.png`), fullPage: true });
  });
  test(`${locale} eligibility and individual activity record exact roster member`, async ({ page, context }) => {
    const f = await fixture(context, ["superAdmin"], { entries: true }); await page.goto(`/${locale}/staff/competitions`); await page.locator(".competition-entry > summary").click();
    const eligibility = page.getByRole("form", { name: copy.eligibility }); await eligibility.getByLabel(copy.eligibility, { exact: true }).selectOption("true"); await eligibility.getByLabel(copy.reason).fill("Synthetic eligible evidence"); await eligibility.getByRole("button", { name: copy.record }).click(); await expect(page.getByRole("status").filter({ hasText: copy.saved })).toBeVisible();
    const activity = page.getByRole("form", { name: copy.activity }); await activity.getByLabel(copy.participant).selectOption(memberId); await activity.getByLabel(copy.activityName).fill("Synthetic orientation"); await activity.getByLabel(copy.evidence).fill("Synthetic individual receipt"); await activity.getByRole("button", { name: copy.record }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(2); const actions = await f.actions(); expect(actions[0].payload.eligibility).toBe("eligible"); expect(actions[1].payload.participantId).toBe(memberId); await accessible(page);
  });
  test(`${locale} missing migration preserves session and shows translated pending state`, async ({ page, context }) => {
    await fixture(context, ["superAdmin"], { missing: true }); const before = (await context.cookies()).find((cookie) => cookie.name === "msrc-staff-test")?.value; await page.goto(`/${locale}/staff/competitions`); await expect(page.getByText(copy.notReady, { exact: true })).toBeVisible(); expect((await context.cookies()).find((cookie) => cookie.name === "msrc-staff-test")?.value).toBe(before); await accessible(page);
  });
}
for (const mode of ["reviewer", "judge"] as const) {
  test(`${mode} Arabic route arrives in English and persists an own scorecard`, async ({ page, context }, info) => {
    const f = await fixture(context, [mode === "judge" ? "facultyJudge" : "hackathonReviewer"], { assignment: true }); await page.goto(`/ar/${mode}/competitions`); await expect(page).toHaveURL(`/en/${mode}/competitions`); await expect(page.locator("html")).toHaveAttribute("lang", "en"); await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport(); await expect(page.locator("#main-content")).toHaveClass("staff-main"); await expect(page.locator("main")).toHaveCount(1); await expect(page.locator(".site-header, footer")).toHaveCount(0);
    const workspace = page.getByTestId(`competition-${mode}`); await expect(workspace.getByRole("heading", { name: packet.title, exact: true }).first()).toBeVisible(); await expect(workspace).not.toContainText("SYNTHETIC PRIVATE PRE-EVENT CARD"); await expect(workspace).not.toContainText("synthetic-member@example.invalid");
    if (mode === "judge") { await workspace.getByRole("button", { name: "Request private download", exact: true }).click(); await expect(workspace.getByRole("link", { name: "Open file — link expires in one minute" })).toHaveAttribute("href", /storage\/v1\/object\/sign\/msrc-competition-files\/synthetic-staff-2027\//); }
    await workspace.getByLabel("Synthetic criterion (0–7)", { exact: true }).fill("0"); await workspace.getByLabel(staffCompetitionCopy.en.comments).fill("Synthetic final comments"); await workspace.getByRole("button", { name: staffCompetitionCopy.en.draft, exact: true }).click(); await expect(workspace.getByRole("status").filter({ hasText: staffCompetitionCopy.en.saved })).toBeVisible();
    await page.reload(); await expect(workspace.getByLabel("Synthetic criterion (0–7)", { exact: true })).toHaveValue("0"); await accessible(page); await page.screenshot({ path: info.outputPath(`${mode}-english-scorecard.png`), fullPage: true });
    await workspace.getByRole("button", { name: staffCompetitionCopy.en.submit, exact: true }).click(); await expect(workspace.getByLabel("Synthetic criterion (0–7)", { exact: true })).toBeDisabled(); await expect.poll(async () => (await f.actions()).filter((action: { action: string }) => action.action === (mode === "judge" ? "judge" : "review")).map((action: { payload: { submit: boolean } }) => action.payload.submit)).toEqual([false, true]);
  });
}
