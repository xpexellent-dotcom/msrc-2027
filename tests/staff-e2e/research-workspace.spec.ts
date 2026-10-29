import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "../helpers/csp";
import type { Role } from "../../src/lib/permissions/contract";
import { researchCopy, reviewCopy } from "../../src/features/staff-portal/research-copy";
import { emptyResearchSettings, type ResearchPayload, type ResearchPacket, type ResearchScorecard, type ResearchSettings, type ResearchSubmission } from "../../src/features/staff-portal/research-contract";

const actorId = "78000000-0000-4000-8000-000000000001", submissionId = "78000000-0000-4000-8000-000000000002", assignmentId = "78000000-0000-4000-8000-000000000003", decisionId = "78000000-0000-4000-8000-000000000004";
const packet: ResearchPacket = { title: "Synthetic ongoing study", specialtyId: "synthetic-specialty", studyTypeId: "synthetic-type", analysisComplete: true, studyTypeOther: "", body: { background: "Synthetic background.", objectives: "Describe an ongoing study.", methods: "A synthetic method.", results: "Recruitment is ongoing; results are unavailable.", limitations: "Synthetic limitations.", conclusion: "Potential implications remain under study." } };
const rubric = [{ id: "synthetic-criterion", label: "Synthetic criterion", weight: 2, min: 0, max: 10 }];
const configured: ResearchSettings = { ...emptyResearchSettings(), opensAt: "2026-12-01T00:00:00Z", closesAt: "2026-12-20T00:00:00Z", reviewDeadline: "2027-01-01T00:00:00Z", specialties: [{ id: "synthetic-specialty", label: "Synthetic specialty" }], studyTypes: [{ id: "synthetic-type", label: "Synthetic study type", template: "research" }], rubric, reviewersPerAbstract: 1, keywordCount: 1, blindingPolicy: "Synthetic blinded policy", correspondingAuthorPolicy: "Synthetic eligibility policy", ongoingPolicy: "Synthetic ongoing policy", aggregationPolicy: "weighted_normalized_mean", acceptanceThreshold: 5, notApplicablePolicy: "all_required" };
/** Synthetic presentation fixture. RPC/SQL suites independently prove authority and persistence. */
async function fixture(page: Page, roles: Role[], options: { empty?: boolean; missing?: boolean; completedReview?: boolean } = {}) {
  const actions: ResearchPayload[] = []; let version = options.empty ? 0 : 1, settings = structuredClone(options.empty ? emptyResearchSettings() : configured), missing = options.missing ?? false;
  let prepared: ResearchPacket | null = options.completedReview ? packet : null, reviewVersion = 1, scorecard: ResearchScorecard | null = null, affiliations: string[] = [], reviewStatus = "assigned";
  let submission: ResearchSubmission = { id: submissionId, reference: "SYN-ABS-0001", status: options.completedReview ? "scientific_review" : "submitted", version: 1, title: packet.title, wordCount: 30, packetReady: !!options.completedReview, assignedCount: options.completedReview ? 1 : 0, completedCount: options.completedReview ? 1 : 0, decision: null };
  const reviewSummary = options.completedReview ? { requiredReviews: 2, completedReviews: 1, meanScore: null, reviews: [{ assignmentId, submissionVersion: 1, rubricVersion: 1, total: 0, rubric, scorecard: { scores: [{ criterionId: rubric[0].id, value: 0 }], comments: "Synthetic confidential review comment.", recommendation: "revise" } }] } : { requiredReviews: 1, completedReviews: 0, meanScore: null, reviews: [] };
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url()), formToken = "synthetic-research-token";
    if (url.pathname !== "/api/staff-portal/research") return route.fulfill({ json: { state: "authenticated", profile: { actorId, name: "Synthetic Staff", roles }, formToken } });
    if (missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken } });
    const oversight = !roles.includes("abstractReviewer");
    const settingsResult = () => ({ state: "ready", version, settings, complete: !options.empty, enabled: false, evidenceReady: false, formToken });
    if (request.method() === "GET") {
      switch (url.searchParams.get("area")) {
        case "settings": return route.fulfill({ json: settingsResult() });
        case "list": return route.fulfill({ json: { state: "ready", submissions: options.empty ? [] : [submission], formToken } });
        case "reviewers": return route.fulfill({ json: { state: "ready", reviewers: [{ id: actorId, name: "Synthetic Reviewer", affiliations: ["Other synthetic institution"], activeAssignments: 0 }], formToken } });
        case "submission": return route.fulfill({ json: { state: "ready", submission: { id: submissionId, reference: submission.reference, status: submission.status, version: 1, wordCount: 30, document: packet, supervisor: { fullName: "Synthetic Private Supervisor", email: "supervisor@example.invalid", phone: "+966551234567" } }, packet: prepared, packetVersion: prepared ? 1 : 0, reviewSummary, formToken } });
        case "queue": return route.fulfill({ json: { state: "ready", oversight, ownAffiliations: affiliations, assignments: [{ id: assignmentId, reference: submission.reference, title: packet.title, status: reviewStatus, version: reviewVersion }], formToken } });
        case "packet": return route.fulfill({ json: { state: "ready", assignment: { id: assignmentId, version: reviewVersion, status: reviewStatus, submissionVersion: 1, rubricVersion: 1 }, packet, rubric, scorecard: oversight ? null : scorecard, studyTemplate: "research", reviewPolicy: { deadline: configured.reviewDeadline, ongoingPolicy: configured.ongoingPolicy, requiredReviews: 1, aggregationPolicy: configured.aggregationPolicy, notApplicablePolicy: configured.notApplicablePolicy }, formToken } });
      }
    }
    const payload = request.postDataJSON() as ResearchPayload; actions.push(payload);
    switch (payload.action) {
      case "save-settings": settings = payload.settings; version++; return route.fulfill({ json: settingsResult() });
      case "prepare-packet": prepared = payload.packet; submission = { ...submission, packetReady: true }; return route.fulfill({ json: { state: "prepared", formToken } });
      case "assign": case "auto-assign": submission = { ...submission, assignedCount: 1, status: "scientific_review" }; return route.fulfill({ json: { state: "assigned", count: 1, formToken } });
      case "decision": submission = { ...submission, decision: { id: decisionId, outcome: payload.outcome, reason: payload.reason, instructions: payload.instructions, revisionDeadline: payload.revisionDeadline, state: "draft" } }; return route.fulfill({ json: { state: "prepared", decisionId, formToken } });
      case "batch": {
        if (payload.stage === "prepare") return route.fulfill({ json: { state: "prepared", batchId: decisionId, count: 1, decisions: [{ id: decisionId, reference: submission.reference, outcome: submission.decision!.outcome, instructions: submission.decision!.instructions, revisionDeadline: submission.decision!.revisionDeadline }], formToken } });
        submission = { ...submission, status: "accepted", decision: { ...submission.decision!, state: "published" } }; return route.fulfill({ json: { state: "published", batchId: decisionId, count: 1, emailState: "draft_held", formToken } });
      }
      case "declare-affiliations": affiliations = payload.affiliations; return route.fulfill({ json: { state: "updated", formToken } });
      case "scorecard": scorecard = payload.scorecard; reviewVersion++; reviewStatus = payload.submit ? "completed" : "draft"; return route.fulfill({ json: { state: "updated", version: reviewVersion, formToken } });
      case "review-response": reviewStatus = payload.response === "conflict" ? "conflict" : "declined"; return route.fulfill({ json: { state: "updated", formToken } });
    }
  });
  return { actions, recover: () => { missing = false; } };
}
async function axe(page: Page) { expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]); }
async function snapshot(page: Page, name: string) { mkdirSync("test-results/abstract-consumers", { recursive: true }); await page.screenshot({ path: `test-results/abstract-consumers/${name}.png`, fullPage: true }); }

for (const locale of ["en", "ar"] as const) {
  const copy = researchCopy[locale];
  test(`${locale} science settings have no defaults and save without opening`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["scientificAdministrator"], { empty: true }); await page.goto(`/${locale}/staff/science`);
    const workspace = page.getByTestId("science-workspace"); await expect(workspace).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); await expect(workspace.getByText(copy.empty)).toBeVisible();
    await workspace.locator("summary").click(); for (const key of ["opensAt", "closesAt", "reviewDeadline", "reviewersPerAbstract", "keywordCount", "acceptanceThreshold"] as const) await expect(workspace.getByLabel(copy[key], { exact: true })).toHaveValue("");
    await expect(workspace.locator('input[type="file"]')).toHaveCount(0); await expect(workspace.getByText(copy.gate)).toBeVisible();
    for (const collection of ["specialties", "studyTypes", "rubric"] as const) {
      const group = workspace.getByRole("group", { name: copy[collection], exact: true }); await group.getByRole("button", { name: copy.add, exact: true }).click();
      await group.getByLabel(copy.id, { exact: true }).fill(`synthetic-${collection}`); await group.getByLabel(copy.label, { exact: true }).fill(`Synthetic ${collection}`);
      if (collection === "studyTypes") { await expect(group.getByLabel(copy.template, { exact: true })).toHaveValue(""); await group.getByLabel(copy.template, { exact: true }).selectOption("research"); }
      if (collection === "rubric") { for (const [key, value] of [["min", "0"], ["max", "10"], ["weight", "2"]] as const) { await expect(group.getByLabel(copy[key], { exact: true })).toHaveValue(""); await group.getByLabel(copy[key], { exact: true }).fill(value); } }
    }
    await expect(workspace.getByLabel(copy.aggregationPolicy, { exact: true })).toHaveValue(""); await workspace.getByLabel(copy.aggregationPolicy, { exact: true }).selectOption("weighted_normalized_mean");
    await expect(workspace.getByLabel(copy.notApplicablePolicy, { exact: true })).toHaveValue(""); await workspace.getByLabel(copy.notApplicablePolicy, { exact: true }).selectOption("all_required");
    await workspace.getByLabel(copy.blindingPolicy, { exact: true }).fill("Synthetic blind policy awaiting owner approval"); await workspace.getByRole("button", { name: copy.saveSettings, exact: true }).click(); await expect(workspace.getByRole("status").filter({ hasText: copy.settingsSaved })).toBeVisible();
    const saved = f.actions.find((action) => action.action === "save-settings"); expect(saved?.action === "save-settings" && saved.settings.reviewersPerAbstract).toBeNull(); expect(saved).not.toHaveProperty("enabled");
    await workspace.locator("summary").click(); await axe(page); await snapshot(page, `${locale}-science-settings-${testInfo.project.name}`);
  });
  test(`${locale} science prepares anonymous packet, assigns and previews a held-email batch`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["scientificAdministrator"]); await page.goto(`/${locale}/staff/science`); const workspace = page.getByTestId("science-workspace");
    await expect(workspace.getByRole("button", { name: copy.open, exact: true })).toBeVisible();
    // The offscreen action heading must scroll with its table, never widen the mobile document.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await snapshot(page, `${locale}-science-list-${testInfo.project.name}`);
    await workspace.getByRole("button", { name: copy.open, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(workspace.getByRole("region", { name: copy.supervisor, exact: true })).toContainText("Synthetic Private Supervisor"); await expect(workspace.getByText("supervisor@example.invalid", { exact: true })).toBeVisible(); await expect(workspace.locator("#packet-objectives")).toBeVisible(); await expect(workspace.locator("#packet-limitations")).toBeVisible();
    await workspace.getByLabel(copy.scientificTitle, { exact: true }).fill("Synthetic anonymous ongoing study");
    await workspace.getByRole("checkbox", { name: copy.attestation, exact: true }).check(); await workspace.getByLabel(copy.scientificTitle, { exact: true }).fill("Synthetic anonymous study"); await expect(workspace.getByRole("checkbox", { name: copy.attestation, exact: true })).not.toBeChecked(); await workspace.getByRole("checkbox", { name: copy.attestation, exact: true }).check();
    await workspace.getByRole("button", { name: copy.savePacket, exact: true }).click(); const preparedAction = f.actions.find((action) => action.action === "prepare-packet"); expect(preparedAction).not.toHaveProperty("packet.supervisor"); await expect(workspace.getByText(copy.packetReady)).toBeVisible(); await workspace.getByRole("button", { name: copy.autoAssign, exact: true }).click();
    await workspace.getByLabel(copy.outcome, { exact: true }).selectOption("accept"); await workspace.getByLabel(copy.reason, { exact: true }).fill("Synthetic committee decision after review"); await workspace.getByLabel(copy.instructions, { exact: true }).fill("Synthetic accepted decision. Further details will follow."); await workspace.getByRole("button", { name: copy.saveDecision, exact: true }).click();
    await workspace.getByRole("checkbox", { name: `${copy.selectDecision} SYN-ABS-0001` }).check(); await workspace.getByRole("button", { name: copy.prepareBatch, exact: true }).click(); await expect(workspace.getByText(copy.batchWarning)).toBeVisible();
    const beforePublish = f.actions.filter((action) => action.action === "batch"); expect(beforePublish).toHaveLength(1); expect(beforePublish[0]).toMatchObject({ stage: "prepare" });
    await axe(page); await snapshot(page, `${locale}-science-batch-${testInfo.project.name}`); await workspace.getByRole("button", { name: copy.publishBatch, exact: true }).click(); await expect(workspace.getByText(copy.batchPublished)).toBeVisible();
    const stages = f.actions.filter((action) => action.action === "batch"); expect(stages).toHaveLength(2); expect(stages[0].action === "batch" && stages[0].operationId).toBe(stages[1].action === "batch" && stages[1].operationId);
  });
  test(`${locale} review is entirely English and supports draft scoring and conflict response`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["abstractReviewer"]); await page.goto(`/${locale}/staff/review`); const workspace = page.getByTestId("review-workspace"); await expect(page.getByTestId("staff-portal")).toHaveAttribute("lang", "en"); await expect(page.getByTestId("staff-portal")).toHaveAttribute("dir", "ltr");
    await workspace.getByLabel(reviewCopy.affiliations, { exact: true }).fill("Synthetic institution"); await workspace.getByRole("button", { name: reviewCopy.saveAffiliations, exact: true }).click();
    await workspace.getByRole("button", { name: reviewCopy.open, exact: true }).click(); const packetRegion = workspace.getByRole("region", { name: reviewCopy.packet, exact: true }); await expect(packetRegion).not.toContainText("author@example.invalid"); await expect(packetRegion).not.toContainText("Synthetic Private Supervisor"); await expect(packetRegion).not.toContainText("supervisor@example.invalid"); await expect(packetRegion.getByRole("heading", { name: "Objectives", exact: true })).toBeVisible(); await expect(packetRegion.getByRole("heading", { name: "Limitations", exact: true })).toBeVisible(); await expect(packetRegion.getByText(reviewCopy.noResults)).toBeVisible();
    await packetRegion.getByLabel(reviewCopy.comments, { exact: true }).fill("Synthetic unfinished notes."); await packetRegion.getByRole("button", { name: reviewCopy.save, exact: true }).click(); await workspace.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await expect(packetRegion.getByLabel(reviewCopy.recommendation, { exact: true })).toHaveValue(""); await expect(packetRegion.getByLabel(reviewCopy.comments, { exact: true })).toHaveValue("Synthetic unfinished notes.");
    await packetRegion.getByLabel(/Synthetic criterion/).fill("7"); await packetRegion.getByLabel(reviewCopy.comments, { exact: true }).fill("Synthetic ongoing-work review."); await packetRegion.getByLabel(reviewCopy.recommendation, { exact: true }).selectOption("revise"); await axe(page); await snapshot(page, `${locale}-review-scorecard-${testInfo.project.name}`);
    await packetRegion.getByRole("button", { name: reviewCopy.save, exact: true }).click(); await workspace.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await expect(workspace.getByLabel(/Synthetic criterion/)).toHaveValue("7");
    await workspace.getByRole("button", { name: reviewCopy.submit, exact: true }).click(); expect(f.actions.filter((action) => action.action === "scorecard").map((action) => action.action === "scorecard" && action.submit)).toEqual([false, false, true]);
    await workspace.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await workspace.getByLabel(reviewCopy.responseReason).fill("Synthetic newly identified conflict"); await workspace.getByRole("button", { name: reviewCopy.conflict, exact: true }).click(); await expect(workspace.getByText("conflict", { exact: true })).toBeVisible();
  });
  test(`${locale} science can inspect completed scores while incomplete quorum stays explicit`, async ({ page }, testInfo) => {
    await fixture(page, ["scientificAdministrator"], { completedReview: true }); await page.goto(`/${locale}/staff/science`); const workspace = page.getByTestId("science-workspace"); await workspace.getByRole("button", { name: copy.open, exact: true }).click();
    const results = workspace.getByRole("region", { name: copy.reviewResults, exact: true }); await expect(results.getByText(copy.quorumIncomplete, { exact: true })).toBeVisible(); await expect(results.getByText(copy.noScores, { exact: true })).toHaveCount(0); await results.locator("summary").click(); await expect(results.getByText("Synthetic confidential review comment.", { exact: true })).toBeVisible(); await expect(results.getByText("Synthetic criterion", { exact: true })).toBeVisible(); await expect(results).not.toContainText("Synthetic Reviewer");
    const components = results.getByRole("region", { name: new RegExp(copy.scoreComponents) });
    await results.locator("summary").focus(); await page.keyboard.press("Tab"); await expect(components).toBeFocused();
    if (testInfo.project.name === "staff-mobile") {
      expect(await components.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
      const initialScroll = await components.evaluate((element) => element.scrollLeft);
      await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
      await expect.poll(async () => Math.abs(await components.evaluate((element) => element.scrollLeft) - initialScroll)).toBeGreaterThan(1);
    }
    await axe(page); await snapshot(page, `${locale}-science-review-results-${testInfo.project.name}`);
  });
  test(`${locale} Super Admin has settings access and read-only scientific/review oversight`, async ({ page }) => {
    const f = await fixture(page, ["superAdmin"]); await page.goto(`/${locale}/staff/science`); const science = page.getByTestId("science-workspace"); await expect(science.getByText(copy.oversight, { exact: true })).toBeVisible(); await science.getByRole("button", { name: copy.open, exact: true }).click(); await expect(science.getByRole("button", { name: copy.autoAssign, exact: true })).toHaveCount(0); await expect(science.getByRole("button", { name: copy.saveDecision, exact: true })).toHaveCount(0);
    await page.goto(`/${locale}/staff/review`); const review = page.getByTestId("review-workspace"); await expect(review.getByText(reviewCopy.oversight, { exact: true })).toBeVisible(); await review.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await expect(review.getByRole("button", { name: reviewCopy.submit, exact: true })).toHaveCount(0); await expect(review.getByRole("button", { name: reviewCopy.conflict, exact: true })).toHaveCount(0); expect(f.actions).toHaveLength(0); await axe(page);
  });
  test(`${locale} missing research RPC keeps the staff session and offers retry`, async ({ page }) => {
    const f = await fixture(page, ["scientificAdministrator"], { missing: true }); await page.goto(`/${locale}/staff/science`); const workspace = page.getByTestId("science-workspace"); await expect(workspace.getByRole("alert")).toContainText(copy.errors["area-not-ready"]); await expect(page.getByTestId("staff-name")).toContainText("Synthetic Staff"); f.recover(); await workspace.getByRole("button", { name: copy.retry, exact: true }).click(); await expect(workspace.getByRole("button", { name: copy.open, exact: true })).toBeVisible(); await axe(page);
  });
}
