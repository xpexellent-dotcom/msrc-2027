import { expect, test } from "@playwright/test";
import { researchStaffCopy } from "../../src/features/research-judging/staff-copy";
import { accessible, assignmentId, awardId, emptySettings, judgeAssignment, judgeId, settings, staffEntry, staffFixture, submissionId, title } from "./fixtures";

for (const locale of ["en", "ar"] as const) {
  const copy = researchStaffCopy[locale];
  test(`${locale} empty research settings are editable without activating judging`, async ({ page, context }, info) => {
    const f = await staffFixture(context, ["superAdmin"]); await page.goto(`/${locale}/staff/research-judging`);
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible(); await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.locator("details > summary").filter({ hasText: copy.settings }).click();
    for (const key of ["judgeCount", "tieRule", "lockAt", "supervisorDeadline", "supervisorEvidence"]) await expect(page.locator(`#setting-${key}`)).toHaveValue("");
    await expect(page.locator('[id^="criterion-"]')).toHaveCount(0); await expect(page.locator('[id^="category-"]')).toHaveCount(0);
    await page.getByRole("button", { name: copy.saveSettings, exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: copy.saved })).toBeVisible();
    const [saved] = await f.actions(); expect(saved.payload.settings).toEqual(emptySettings); expect(saved.payload).not.toHaveProperty("enabled");
    await page.reload(); await page.locator("details > summary").filter({ hasText: copy.settings }).click();
    await page.getByRole("button", { name: copy.addCriterion, exact: true }).click(); await page.locator("#criterion-0-id").fill("synthetic"); await page.locator("#criterion-0-label").fill("Synthetic criterion"); await page.locator("#criterion-0-min").fill("0"); await page.locator("#criterion-0-max").fill("7");
    await page.getByRole("button", { name: copy.addCategory, exact: true }).click(); await page.locator("#category-0-id").fill("synthetic"); await page.locator("#category-0-label").fill("Synthetic award category");
    await page.locator("#setting-judgeCount").fill("1"); await page.locator("#setting-tieRule").fill(settings.tieRule); await page.locator("#setting-lockAt").fill(settings.lockAt); await page.locator("#setting-supervisorDeadline").fill(settings.supervisorDeadline); await page.locator("#setting-supervisorEvidence").fill(settings.supervisorEvidence);
    await page.getByRole("button", { name: copy.saveSettings, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(2); expect((await f.actions())[1].payload.settings).toEqual(settings);
    await expect(page.getByRole("status").filter({ hasText: copy.saved })).toBeVisible(); await page.locator("details > summary").filter({ hasText: copy.settings }).click();
    await expect(page.locator("#criterion-0-id")).toBeVisible(); await expect(page.locator('input[type="file"]')).toHaveCount(0); await accessible(page); await page.screenshot({ path: info.outputPath(`${locale}-research-settings.png`), fullPage: true });
  });
  test(`${locale} allocation is prepared privately and explicitly published; judges are assigned`, async ({ page, context }) => {
    const f = await staffFixture(context, ["superAdmin"], { settings, entries: [staffEntry] }); await page.goto(`/${locale}/staff/research-judging`); await page.locator(".research-entry > summary").click();
    const allocation = page.getByRole("form", { name: copy.allocation, exact: true }); await allocation.getByLabel(copy.format, { exact: true }).selectOption("poster"); await allocation.getByRole("button", { name: copy.allocate, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(1); await page.reload(); await page.locator(".research-entry > summary").click(); await expect(page.getByText(copy.prepared, { exact: false }).first()).toBeVisible(); await expect(page.getByRole("button", { name: copy.publishAllocation, exact: true })).toBeEnabled();
    let actions = await f.actions(); expect(actions.map((row) => row.action)).toEqual(["allocate"]); expect(actions[0].payload).toEqual({ submissionId, expectedVersion: 1, format: "poster" });
    await page.getByRole("button", { name: copy.publishAllocation, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(2); actions = await f.actions(); expect(actions[1].action).toBe("publish_allocation"); expect(actions[1].payload.expectedVersion).toBe(2); await page.reload(); await page.locator(".research-entry > summary").click();
    const assign = page.getByRole("form", { name: copy.assign, exact: true }); await assign.getByLabel(copy.category, { exact: true }).selectOption("synthetic"); await assign.getByLabel(copy.judgeId, { exact: true }).fill(judgeId); await assign.getByRole("button", { name: copy.assign, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(3); expect((await f.actions())[2].payload.judgeId).toBe(judgeId); await page.reload(); await page.locator(".research-entry > summary").click(); await expect(page.getByText(judgeId, { exact: false }).first()).toBeVisible(); await accessible(page);
  });
  test(`${locale} prepared awards require supervisor evidence before confirmation and separate publication`, async ({ page, context }) => {
    const f = await staffFixture(context, ["superAdmin"], { settings, entries: [{ ...staffEntry, categoryId: "synthetic", assignments: [{ id: assignmentId, judgeId, version: 2, status: "completed" }] }] }); await page.goto(`/${locale}/staff/research-judging`); await page.locator(".research-entry > summary").click();
    const prepare = page.getByRole("form", { name: copy.prepareAward, exact: true }); await prepare.getByLabel(copy.category, { exact: true }).selectOption("synthetic"); await prepare.getByLabel(copy.reason, { exact: true }).fill("Synthetic completed scorecards reviewed"); await prepare.getByLabel(copy.tieResolution, { exact: true }).fill("Synthetic configured tie rule applied"); await prepare.getByRole("button", { name: copy.prepareAward, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(1); await page.reload(); await page.locator(".research-entry > summary").click(); await expect(page.getByText(copy.supervisorPending, { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: copy.confirmAward, exact: true })).toBeDisabled(); await expect(page.getByRole("button", { name: copy.publishAward, exact: true })).toHaveCount(0); expect((await f.actions()).map((row) => row.action)).toEqual(["prepare_award"]);
    // A later server response reflects separately supplied participant confirmation.
    await f.replace({ settings, entries: [{ ...staffEntry, version: 3, award: { id: awardId, categoryId: "synthetic", label: "Synthetic award category", status: "winner_pending_supervisor", reason: "Synthetic committee rationale", tieResolution: "Synthetic tie record", supervisorReady: true } }] }); await page.reload(); await page.locator(".research-entry > summary").click();
    await page.getByLabel(copy.validationReason, { exact: true }).fill("Synthetic supervisor validation completed"); await page.getByRole("button", { name: copy.confirmAward, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(1); await page.reload(); await page.locator(".research-entry > summary").click(); await expect(page.getByRole("button", { name: copy.publishAward, exact: true })).toBeEnabled(); expect((await f.actions()).map((row) => row.action)).toEqual(["confirm_award"]);
    await page.getByRole("button", { name: copy.publishAward, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(2); expect((await f.actions()).map((row) => row.action)).toEqual(["confirm_award", "publish_award"]); await accessible(page);
  });
  test(`${locale} missing research migration retains staff session`, async ({ page, context }) => {
    await staffFixture(context, ["superAdmin"], { missing: true }); const before = (await context.cookies()).find((row) => row.name === "msrc-staff-test")?.value;
    await page.goto(`/${locale}/staff/research-judging`); await expect(page.getByText(copy.notReady, { exact: true })).toBeVisible(); expect((await context.cookies()).find((row) => row.name === "msrc-staff-test")?.value).toBe(before); await accessible(page);
  });
  test(`${locale} committee reassigns conflicted judges and withdraws a prepared award`, async ({ page, context }) => {
    const f = await staffFixture(context, ["judgingCommittee"], { settings, entries: [{ ...staffEntry, categoryId: "synthetic", assignments: [{ id: assignmentId, judgeId, version: 2, status: "conflict" }], award: { id: awardId, categoryId: "synthetic", label: "Synthetic award category", status: "winner_pending_supervisor", reason: "Synthetic selection", tieResolution: "Synthetic tie handling", supervisorReady: false } }] });
    await page.goto(`/${locale}/staff/research-judging`); await page.locator(".research-entry > summary").click();
    await expect(page.getByRole("button", { name: copy.saveSettings, exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.confirmAward, exact: true })).toHaveCount(0);
    await expect(page.getByText(copy.conflictStatus, { exact: true })).toBeVisible();
    const reassign = page.getByRole("form", { name: copy.reassign, exact: true });
    const replacement = "fa000000-0000-4000-8000-000000000009";
    await reassign.getByLabel(copy.replacement, { exact: true }).fill(replacement); await reassign.getByRole("button", { name: copy.reassign, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(1); await page.reload(); await page.locator(".research-entry > summary").click();
    expect((await f.actions())[0]).toMatchObject({ action: "reassign", payload: { submissionId, assignmentId, expectedVersion: 1, judgeId: replacement } });
    await expect(page.getByText(copy.withdrawn, { exact: true })).toBeVisible(); await expect(page.getByText(replacement, { exact: true })).toBeVisible();
    const withdraw = page.getByRole("form", { name: copy.withdrawAward, exact: true });
    await withdraw.getByLabel(copy.reason, { exact: true }).fill("Synthetic conflict requires fresh award selection"); await withdraw.getByRole("button", { name: copy.withdrawAward, exact: true }).click();
    await expect.poll(async () => (await f.actions()).length).toBe(2); await page.reload(); await page.locator(".research-entry > summary").click();
    expect((await f.actions())[1]).toMatchObject({ action: "withdraw_award", payload: { submissionId, awardId, expectedVersion: 2, reason: "Synthetic conflict requires fresh award selection" } });
    await expect(page.getByRole("form", { name: copy.withdrawAward, exact: true })).toHaveCount(0); await expect(page.getByRole("form", { name: copy.prepareAward, exact: true })).toBeVisible(); await accessible(page);
  });
}
test("Arabic judge route redirects to English; independent own card survives reload and can be submitted", async ({ page, context }, info) => {
  const f = await staffFixture(context, ["facultyJudge"], { assignments: [judgeAssignment] }); await page.goto("/ar/judge/research"); await expect(page).toHaveURL("/en/judge/research"); await expect(page.locator("html")).toHaveAttribute("lang", "en"); await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1, name: researchStaffCopy.en.judgeTitle })).toBeVisible(); await expect(page.getByRole("heading", { name: title, exact: true }).first()).toBeVisible();
  const result = await page.request.get("/api/staff-portal/research-event?view=judge_queue"); const body = await result.text(); expect(body).not.toContain("SYNTHETIC PRIVATE PRE-EVENT SCORE"); expect(body).not.toContain("SYNTHETIC PRIVATE REVIEWER NOTE");
  await page.getByLabel("Synthetic criterion (0–7)", { exact: true }).fill("0"); await page.getByLabel(researchStaffCopy.en.comments, { exact: true }).fill("Synthetic independent event assessment"); await page.getByRole("button", { name: researchStaffCopy.en.saveDraft, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(1);
  await page.reload(); await expect(page.getByLabel("Synthetic criterion (0–7)", { exact: true })).toHaveValue("0"); await page.getByRole("button", { name: researchStaffCopy.en.submit, exact: true }).click(); await expect.poll(async () => (await f.actions()).length).toBe(2);
  expect((await f.actions()).map((row) => row.payload.submit)).toEqual([false, true]); await expect(page.getByRole("button", { name: researchStaffCopy.en.submit, exact: true })).toBeEnabled(); await expect(page.getByRole("button", { name: researchStaffCopy.en.saveDraft, exact: true })).toBeEnabled(); await expect(page.getByRole("button", { name: researchStaffCopy.en.conflict, exact: true })).toBeEnabled(); await expect(page.locator('input[type="file"]')).toHaveCount(0); await accessible(page); await page.screenshot({ path: info.outputPath("research-judge-english.png"), fullPage: true });
});
test("Judge declares a conflict and loses the scoring form", async ({ page, context }) => {
  const f = await staffFixture(context, ["facultyJudge"], { assignments: [judgeAssignment] }); await page.goto("/en/judge/research"); await page.getByLabel(researchStaffCopy.en.conflictReason, { exact: true }).fill("Synthetic declared research conflict"); await page.getByRole("button", { name: researchStaffCopy.en.conflict, exact: true }).click(); await expect(page.getByText(researchStaffCopy.en.noAssignments, { exact: true })).toBeVisible(); expect((await f.actions())[0].action).toBe("conflict"); await expect(page.getByRole("button", { name: researchStaffCopy.en.submit, exact: true })).toHaveCount(0);
});
test("Judge cannot amend scorecards after the configured lock time", async ({ page, context }) => {
  const f = await staffFixture(context, ["facultyJudge"], { assignments: [{ ...judgeAssignment, status: "completed", lockAt: "2026-01-01T00:00:00Z", scorecard: { scores: [{ criterionId: "synthetic", value: 0 }], comments: "Synthetic completed card" } }] });
  await page.goto("/en/judge/research");
  await expect(page.getByRole("button", { name: researchStaffCopy.en.submit, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: researchStaffCopy.en.saveDraft, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: researchStaffCopy.en.conflict, exact: true })).toBeEnabled(); expect(await f.actions()).toEqual([]); await accessible(page);
});
test("Faculty judge cannot read the staff list or prepare allocations", async ({ page, context }) => {
  const f = await staffFixture(context, ["facultyJudge"], { assignments: [judgeAssignment] });
  const list = await page.request.get("/api/staff-portal/research-event?view=list"); expect(list.status()).toBe(403); expect(await list.json()).not.toHaveProperty("entries");
  const allocation = await page.request.post("/api/staff-portal/research-event", { headers: { origin: "http://127.0.0.1:3219" }, data: { action: "allocate", operationId: awardId, formToken: "synthetic-denied-before-form", payload: { submissionId, expectedVersion: 1, format: "oral" } } });
  expect(allocation.status()).toBe(403); expect(await f.actions()).toEqual([]);
});
test("Default-off staff and participant APIs remain closed", async ({ request }) => {
  for (const path of ["/api/staff-portal/research-event?view=settings", "/api/research-event?locale=en"]) { const response = await request.get("http://127.0.0.1:3188" + path); expect(response.status()).toBe(503); expect(await response.json()).toEqual({ state: "closed" }); }
});
