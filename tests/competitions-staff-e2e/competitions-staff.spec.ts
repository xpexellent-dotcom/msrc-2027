import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { COMPETITION_SETTING_KEYS } from "../../src/features/competitions/staff-contract";
import { competitionSettingLabels, staffCompetitionCopy } from "../../src/features/competitions/staff-copy";
import type { Role } from "../../src/lib/permissions/contract";
import { emptyHackathonDocument } from "../../src/features/competitions/contracts";
import { frameworkStaffCopy } from "../../src/features/competitions/framework-copy";
import { DEFAULT_HACKATHON_SCREENING_RUBRIC, DEFAULT_HACKATHON_FINAL_RUBRIC, HACKATHON_FINAL_FAIRNESS, HACKATHON_SCREENING_FAIRNESS } from "../../src/features/competitions/rubric-defaults";
const itemId = "ea000000-0000-4000-8000-000000000001", memberId = "ea000000-0000-4000-8000-000000000002";
const packet = { title: "Synthetic blinded project", pitch: "A synthetic English pitch for review.", narrative: "", track: "translating_research" };
const rubric = [{ id: "synthetic", label: "Synthetic criterion", min: 0, max: 7 }];
const applicationDocument = { ...emptyHackathonDocument(), title: packet.title, pitch: packet.pitch, references: "Synthetic evidence reference", links: ["https://example.invalid/synthetic-demo"], declarations: { ...emptyHackathonDocument().declarations, previouslyPresented: true, historyDetails: "Synthetic unawarded presentation", teamContributions: "Synthetic team research" } };
const entry = { id: itemId, kind: "hackathon", status: "submitted", version: 1, title: packet.title, track: "translating_research", document: applicationDocument, eligibility: "pending", assignedCount: 0, completedCount: 0, roster: [{ id: memberId, memberId, email: "synthetic-member@example.invalid", isLead: true, confirmed: false, profile: { university: "Synthetic Saudi University", fieldOfStudy: "Engineering", phone: "+966500000000", enrolledInSaudiUniversity: true, complete: true, proofFileId: memberId, proofState: "clean" } }], files: [], outcome: null, decision: null, framework: { integrityFlag: false, committeeCleared: false, thirdReviewRequired: true, screeningAverage: 16, reserveRank: 1, finalistConfirmed: false } };
async function fixture(context: BrowserContext, roles: Role[], options: { assignment?: boolean; missing?: boolean; entries?: boolean; framework?: boolean } = {}) {
  const suffix = randomBytes(6).toString("hex"), actorId = "eb000000-0000-4000-8000-" + suffix, sessionId = "ec000000-0000-4000-8000-" + suffix, now = Date.now(), origin = "http://127.0.0.1:3219", deadline = now + 8 * 3600000;
  const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: roles.includes("superAdmin") ? "aal2" : "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] }, accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("b".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-staff-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline, origin, challengeId: null, factorId: null, challengeExpiresAt: null }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-staff-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const defaults = options.framework ? { selectionCriteria: DEFAULT_HACKATHON_SCREENING_RUBRIC, finalRubric: DEFAULT_HACKATHON_FINAL_RUBRIC, trackLabels: { translating_research: { en: "Evidence to Impact", ar: "Evidence to Impact" }, advancing_research: { en: "Research Reimagined", ar: "Research Reimagined" } }, trackDescriptions: { translating_research: { en: "Synthetic healthcare scope", ar: "نطاق صحي تجريبي" }, advancing_research: { en: "Synthetic research scope", ar: "نطاق بحثي تجريبي" } } } : {};
  expect((await context.request.post("http://127.0.0.1:3220/__synthetic/fixture", { headers: { apikey: "sb_secret_staff_mock_only" }, data: { actorId, sessionId, now, deadline, roles, missing: options.missing, settings: { ...Object.fromEntries(COMPETITION_SETTING_KEYS.map((key) => [key, null])), ...defaults }, entries: options.entries ? [entry] : [], assignments: options.assignment ? [{ id: itemId, entryId: itemId, version: 1, status: "assigned", title: packet.title, packet: options.framework ? { ...packet, references: applicationDocument.references, links: applicationDocument.links } : packet, rubric: options.framework ? roles.includes("facultyJudge") ? DEFAULT_HACKATHON_FINAL_RUBRIC : DEFAULT_HACKATHON_SCREENING_RUBRIC : rubric, scorecard: null, ...(roles.includes("facultyJudge") ? { files: [{ id: memberId, name: "Synthetic final presentation.pdf" }] } : {}) }] : [] } })).ok()).toBe(true);
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
  test(`${locale} versioned framework rubrics and labels are editable while threshold remains unset`, async ({ page, context }) => {
    const f = await fixture(context, ["superAdmin"], { framework: true }); await page.goto(`/${locale}/staff/competitions`); await page.locator(".competition-settings > summary").click();
    await expect(page.getByLabel(competitionSettingLabels.thirdReviewDifference[locale], { exact: true })).toHaveValue("");
    await expect(page.locator('[id^="selectionCriteria-"][id$="-label"]')).toHaveCount(4); await expect(page.locator('[id^="finalRubric-"][id$="-label"]')).toHaveCount(7);
    await page.locator(".competition-rubric-metadata > summary").first().click();
    await expect(page.locator("#selectionCriteria-0-metadata-version")).toHaveValue("screening-v1"); await expect(page.locator("#selectionCriteria-0-metadata-questions")).toHaveValue(DEFAULT_HACKATHON_SCREENING_RUBRIC[0].questions!.join("\n"));
    expect(JSON.parse(await page.locator("#selectionCriteria-0-metadata-scale").inputValue())).toEqual(DEFAULT_HACKATHON_SCREENING_RUBRIC[0].scale);
    await page.getByLabel(competitionSettingLabels.thirdReviewDifference[locale], { exact: true }).fill("4");
    await page.locator("#trackLabels-translating_research-en").fill("Synthetic approved display label");
    await page.locator("#trackDescriptions-translating_research-ar").fill("وصف تجريبي معتمد");
    await page.getByRole("button", { name: copy.saveSettings, exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: copy.saved })).toBeVisible();
    const actions = await f.actions(); expect(actions[0].payload.settings.thirdReviewDifference).toBe(4); expect(actions[0].payload.settings.trackLabels.translating_research.en).toBe("Synthetic approved display label"); expect(actions[0].payload.settings.selectionCriteria).toEqual(DEFAULT_HACKATHON_SCREENING_RUBRIC); expect(actions[0].payload.settings.finalRubric).toEqual(DEFAULT_HACKATHON_FINAL_RUBRIC); expect(actions[0].payload).not.toHaveProperty("enabled");
    await page.locator(".competition-settings > summary").click(); await accessible(page);
  });
  test(`${locale} eligibility staff inspect private profile and refer history concerns without committee clearance`, async ({ page, context }) => {
    const f = await fixture(context, ["registrationWorkshopAdministrator"], { entries: true }); await page.goto(`/${locale}/staff/competitions`); await page.locator(".competition-entry > summary").click();
    await expect(page.getByText("+966500000000", { exact: true })).toBeVisible(); await expect(page.getByText("Synthetic Saudi University", { exact: true })).toBeVisible(); await expect(page.locator(".competition-settings")).toHaveCount(0);
    await page.locator(".competition-application-declarations > summary").click(); await expect(page.getByText("Synthetic unawarded presentation", { exact: true })).toBeVisible();
    const form = page.getByRole("form", { name: locale === "ar" ? "إحالة ملاحظة أهلية أو نزاهة للجنة" : "Refer eligibility or integrity concern to committee" });
    await form.getByLabel(frameworkStaffCopy[locale].reason).fill("Synthetic history needs committee clarification"); await form.getByRole("button", { name: frameworkStaffCopy[locale].record, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(1); expect((await f.actions())[0]).toMatchObject({ action: "eligibility_flag", payload: { entryId: itemId, reason: "Synthetic history needs committee clarification" } });
    await expect(page.getByRole("form", { name: frameworkStaffCopy[locale].committee, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: locale === "ar" ? "طلب رابط إثبات القيد الخاص" : "Request private enrollment proof", exact: true }).click(); await expect(page.getByRole("link", { name: locale === "ar" ? "فتح إثبات القيد — ينتهي الرابط خلال دقيقة" : "Open enrollment proof — link expires in one minute", exact: true })).toHaveAttribute("href", /storage\/v1\/object\/sign\/msrc-competition-files\//);
    await accessible(page);
  });
  test(`${locale} scientific administration checks anonymization and records third-review and reserve actions`, async ({ page, context }) => {
    const f = await fixture(context, ["scientificAdministrator"], { entries: true }); await page.goto(`/${locale}/staff/competitions`); await page.locator(".competition-entry > summary").click();
    await expect(page.getByText("+966500000000", { exact: true })).toHaveCount(0);
    const packetForm = page.getByRole("form", { name: copy.prepare, exact: true }); await expect(packetForm.getByLabel(frameworkStaffCopy[locale].references, { exact: true })).toHaveValue("Synthetic evidence reference");
    await packetForm.getByRole("checkbox", { name: copy.attestation, exact: true }).check(); await packetForm.getByRole("button", { name: copy.prepare, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(1); expect((await f.actions())[0].payload).toMatchObject({ attestation: true, packet: { references: applicationDocument.references, links: applicationDocument.links } });
    const third = page.getByRole("form", { name: frameworkStaffCopy[locale].escalate, exact: true }); await third.getByLabel(frameworkStaffCopy[locale].reason).fill("Synthetic disputed borderline review"); await third.getByRole("button", { name: frameworkStaffCopy[locale].record, exact: true }).click();
    const reserve = page.getByRole("form", { name: frameworkStaffCopy[locale].offer, exact: true }); await reserve.getByLabel(frameworkStaffCopy[locale].reason).fill("Synthetic withdrawal; preparation remains feasible"); await reserve.getByRole("button", { name: frameworkStaffCopy[locale].record, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(3); expect((await f.actions()).map((action: { action: string }) => action.action)).toEqual(["prepare_packet", "third_review", "reserve_offer"]); await accessible(page);
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
    await workspace.getByRole("button", { name: staffCompetitionCopy.en.submit, exact: true }).click(); await expect(workspace.getByLabel("Synthetic criterion (0–7)", { exact: true })).toBeDisabled(); const actions = await f.actions(); expect(actions.filter((action: { action: string }) => action.action === (mode === "judge" ? "judge" : "review")).map((action: { payload: { submit: boolean } }) => action.payload.submit)).toEqual([false, true]);
  });
}
for (const mode of ["reviewer", "judge"] as const) {
  test(`${mode} framework rubric shows exact guiding questions, anchors and separate concerns`, async ({ page, context }) => {
    const f = await fixture(context, [mode === "judge" ? "facultyJudge" : "hackathonReviewer"], { assignment: true, framework: true }); await page.goto(`/en/${mode}/competitions`);
    const expectedRubric = mode === "judge" ? DEFAULT_HACKATHON_FINAL_RUBRIC : DEFAULT_HACKATHON_SCREENING_RUBRIC, workspace = page.getByTestId(`competition-${mode}`);
    await expect(workspace.locator(".competition-criterion-guidance")).toHaveCount(expectedRubric.length); await expect(workspace.getByText(mode === "judge" ? HACKATHON_FINAL_FAIRNESS : HACKATHON_SCREENING_FAIRNESS, { exact: true })).toBeVisible();
    for (const criterion of expectedRubric) { const group = workspace.locator(".competition-rubric").filter({ has: page.locator(`input[id$="-${criterion.id}"]`) }); for (const question of criterion.questions ?? []) await expect(group.getByText(question, { exact: true })).toBeVisible(); for (const point of criterion.scale ?? []) await expect(group.getByText(point.description, { exact: true })).toBeVisible(); for (const point of criterion.anchors ?? []) await expect(group.getByText(point.description, { exact: true })).toBeVisible(); await workspace.getByLabel(`${criterion.label} (${criterion.min}–${criterion.max})`, { exact: true }).fill("4"); }
    await expect(workspace.getByText(`Total: ${expectedRubric.length * 4} / ${expectedRubric.length * 5}`, { exact: true })).toBeVisible();
    if (mode === "judge") { await workspace.getByLabel("Concern category", { exact: true }).selectOption("privacy"); await workspace.getByLabel("Evidence and reason", { exact: true }).fill("Synthetic privacy concern for committee review"); await workspace.getByRole("button", { name: "Refer concern", exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(1); expect((await f.actions())[0]).toMatchObject({ action: "judge_concern", payload: { category: "privacy", reason: "Synthetic privacy concern for committee review" } }); }
    await expect(workspace).not.toContainText("+966500000000"); await expect(workspace).not.toContainText("synthetic-member@example.invalid"); await accessible(page);
  });
}
