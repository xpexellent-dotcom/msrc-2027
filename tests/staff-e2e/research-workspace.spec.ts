import { submissionAdvisoryCopy } from "../../src/features/staff-portal/submission-advisory-copy";
import type { AdvisoryPayload } from "../../src/features/staff-portal/advisory-contract";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "../helpers/csp";
import type { Role } from "../../src/lib/permissions/contract";
import { ABSTRACT_RUBRIC } from "../../src/features/staff-portal/abstract-rubric";
import { screeningCopy } from "../../src/features/staff-portal/screening-copy";
import type { ScreeningReview, ScreeningSettings } from "../../src/features/staff-portal/screening-contract";
import { submissionWindowCopy } from "../../src/features/staff-portal/submission-window-copy";
import { researchCopy, reviewCopy } from "../../src/features/staff-portal/research-copy";
import { emptyResearchSettings, type ResearchPayload, type ResearchPacket, type ResearchReviewSummary, type ResearchScorecard, type ResearchSettings, type ResearchSubmission } from "../../src/features/staff-portal/research-contract";

const actorId = "78000000-0000-4000-8000-000000000001", submissionId = "78000000-0000-4000-8000-000000000002", assignmentId = "78000000-0000-4000-8000-000000000003", decisionId = "78000000-0000-4000-8000-000000000004";
const packet: ResearchPacket = { title: "Completed synthetic study", specialtyId: "internal_medicine", studyTypeId: "cross_sectional", analysisComplete: true, studyTypeOther: "", body: { background: "Synthetic background.", objectives: "Describe a synthetic result.", methods: "A synthetic method.", results: "Synthetic estimate 1.2 with an uncertainty interval of 1.0 to 1.4.", limitations: "Synthetic limitations.", conclusion: "Potential synthetic implications require further study." } };
const rubric = [...ABSTRACT_RUBRIC];
const configured: ResearchSettings = { ...emptyResearchSettings(), opensAt: "2026-12-01T00:00:00Z", closesAt: "2026-12-20T00:00:00Z", reviewDeadline: "2027-01-01T00:00:00Z", specialties: [{ id: "synthetic-specialty", label: "Synthetic specialty" }], studyTypes: [{ id: "synthetic-type", label: "Synthetic study type", template: "research" }], rubric, reviewersPerAbstract: 2, keywordCount: 1, blindingPolicy: "Synthetic blinded policy", correspondingAuthorPolicy: "Synthetic eligibility policy", ongoingPolicy: "Synthetic ongoing policy", aggregationPolicy: "weighted_normalized_mean", acceptanceThreshold: 5, notApplicablePolicy: "all_required" };
/** Synthetic presentation fixture. RPC/SQL suites independently prove authority and persistence. */
async function fixture(page: Page, roles: Role[], options: { empty?: boolean; missing?: boolean; completedReview?: boolean; completedPair?: boolean; unscreened?: boolean; advisory?: boolean } = {}) {
  const actions: ResearchPayload[] = [], advisoryActions: AdvisoryPayload[] = [];
  let screeningSettings: ScreeningSettings = { version: options.completedPair ? 1 : 0, bands: options.completedPair ? { oralMin: 85, posterMin: 60, borderlineMin: 55, acceptanceMin: 55 } : null, similarityThreshold: options.unscreened || options.empty ? null : 30, oralCapacity: null };
  let screening: ScreeningReview = { sequence: options.unscreened ? 0 : 1, status: options.unscreened ? "pending" : "passed", investigation: false, investigationNote: "", actorId, at: "2026-10-31T06:00:00Z", ethicsNote: options.unscreened ? "" : "Synthetic ethics reviewed", gates: options.unscreened ? [] : Array.from({ length: 7 }, (_, i) => ({ gate: i + 1, passed: true, note: "Synthetic confirmation" })), automatic: Array.from({ length: 5 }, (_, i) => ({ gate: i + 1, passed: true, note: "Synthetic automatic check" })), externalChecked: !options.unscreened, externalReference: options.unscreened ? "" : "SYNTHETIC-REPORT", similarityThreshold: screeningSettings.similarityThreshold, matches: [{ id: actorId, reference: "SYN-MATCH-0002", title: "Synthetic related work", edition: "synthetic-staff-2027", version: 1, score: 12.5 }], current: !options.unscreened, specialty: "internal_medicine", history: [] }; let version = options.empty ? 0 : 1, settings = structuredClone(options.empty ? emptyResearchSettings() : configured), missing = options.missing ?? false;
  let accepts = false;
  const windowResult = () => ({ state: "ready", window: { version, enabled: accepts, opensAt: settings.opensAt, closesAt: settings.closesAt, observedAt: new Date().toISOString(), similarityReady: screeningSettings.similarityThreshold !== null, participantEnabled: false, privacyReady: false, emailReady: false, retentionReady: false, deploymentReady: false }, formToken: "synthetic-research-token" });
  let prepared: ResearchPacket | null = options.completedReview || options.completedPair ? packet : null, reviewVersion = 1, scorecard: ResearchScorecard | null = null, affiliations: string[] = [], reviewStatus = "assigned";
  let submission: ResearchSubmission = { id: submissionId, reference: "SYN-ABS-0001", status: prepared ? "scientific_review" : "submitted", version: 1, title: packet.title, wordCount: 30, packetReady: !!prepared, assignedCount: options.completedPair ? 2 : options.completedReview ? 1 : 0, completedCount: options.completedPair ? 2 : options.completedReview ? 1 : 0, decision: null };
  const reviewSummary: ResearchReviewSummary = options.completedPair
    ? { requiredReviews: 2, completedReviews: 2, meanScore: 83.335, reviews: [4, 3].map((value, i) => ({ assignmentId: i ? decisionId : assignmentId, submissionVersion: 1, rubricVersion: 1, total: i ? 66.67 : 100, rubric, scorecard: { scores: rubric.map((r) => ({ criterionId: r.id, value })), comments: "Synthetic independent assessment", recommendation: "accept" } })) }
    : options.completedReview ? { requiredReviews: 2, completedReviews: 1, meanScore: null, reviews: [{ assignmentId, submissionVersion: 1, rubricVersion: 1, total: 0, rubric, scorecard: { scores: rubric.map((r) => ({ criterionId: r.id, value: 1 })), comments: "Synthetic confidential review comment.", recommendation: "revise" } }] } : { requiredReviews: 2, completedReviews: 0, meanScore: null, reviews: [] };
  const band = () => screening.investigation ? "investigation" : screening.status === "failed_final" ? "reject" : !screening.current ? "screening_required" : !screeningSettings.bands ? "settings_unset" : reviewSummary.completedReviews < (reviewSummary.requiredReviews ?? 2) ? "reviews_incomplete" : "poster";
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url()), formToken = "synthetic-research-token";
    if (url.pathname === "/api/staff-portal/advisory") {
      if (request.method() === "POST") { const payload = request.postDataJSON() as AdvisoryPayload; advisoryActions.push(payload); return route.fulfill({ json: { state: "updated", formToken } }); }
      return route.fulfill({ json: { state: "ready", enabled: options.advisory === true, runtimeReady: options.advisory === true, notification: "draft_held", confirmations: [], advisory: options.advisory ? { id: decisionId, reference: submission.reference, submissionVersion: 1, rubricVersion: 1, model: "deepseek-flash", promptVersion: "staff-advisory-org069-v2", createdAt: "2026-10-31T06:00:00Z", rubric, total: 66.67, scores: rubric.map(r => ({ criterionId: r.id, value: 3, rationale: "Synthetic evidence only." })), gates: [1,2,3,4,5,6].map(gate => ({ gate, observation: "Synthetic blinded observation " + gate })) } : null, formToken } });
    }
    if (url.pathname !== "/api/staff-portal/research") return route.fulfill({ json: { state: "authenticated", profile: { actorId, name: "Synthetic Staff", roles }, formToken } });
    if (missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken } });
    const oversight = !roles.includes("abstractReviewer");
    const settingsResult = () => ({ state: "ready", version, settings, complete: !options.empty, enabled: false, evidenceReady: false, formToken });
    if (request.method() === "GET") {
      switch (url.searchParams.get("area")) {
        case "window": return route.fulfill({ json: windowResult() });
        case "screening-settings": return route.fulfill({ json: { state: "ready", screeningSettings, formToken } });
        case "settings": return route.fulfill({ json: settingsResult() });
        case "list": return route.fulfill({ json: { state: "ready", submissions: options.empty ? [] : [{ ...submission, screeningStatus: screening.status, recommendedBand: band() }], formToken } });
        case "reviewers": return route.fulfill({ json: { state: "ready", reviewers: [{ id: actorId, name: "Synthetic Reviewer", affiliations: ["Other synthetic institution"], activeAssignments: 0 }], formToken } });
        case "submission": return route.fulfill({ json: { state: "ready", submission: { id: submissionId, reference: submission.reference, status: submission.status, version: 1, wordCount: 30, document: packet, supervisor: { fullName: "Synthetic Private Supervisor", email: "supervisor@example.invalid", phone: "+966551234567" } }, packet: prepared, packetVersion: prepared ? 1 : 0, reviewSummary, screening, recommendedBand: band(), formToken } });
        case "queue": return route.fulfill({ json: { state: "ready", oversight, ownAffiliations: affiliations, assignments: [{ id: assignmentId, reference: submission.reference, title: packet.title, status: reviewStatus, version: reviewVersion }], formToken } });
        case "packet": return route.fulfill({ json: { state: "ready", assignment: { id: assignmentId, version: reviewVersion, status: reviewStatus, submissionVersion: 1, rubricVersion: 1 }, packet, rubric, scorecard: oversight ? null : scorecard, studyTemplate: "research", reviewPolicy: { deadline: configured.reviewDeadline, ongoingPolicy: configured.ongoingPolicy, requiredReviews: 2, aggregationPolicy: configured.aggregationPolicy, notApplicablePolicy: configured.notApplicablePolicy }, formToken } });
      }
    }
    const payload = request.postDataJSON() as ResearchPayload; actions.push(payload);
    switch (payload.action) {
      case "save-window": if (!roles.includes("superAdmin")) return route.fulfill({ status: 403, json: { state: "denied" } }); if (payload.version !== version) return route.fulfill({ status: 409, json: { state: "conflict" } }); settings = { ...settings, opensAt: payload.opensAt, closesAt: payload.closesAt }; accepts = payload.enabled; version++; return route.fulfill({ json: windowResult() });
      case "save-screening-settings": screeningSettings = { ...payload.settings, version: screeningSettings.version + 1 }; screening = { ...screening, similarityThreshold: screeningSettings.similarityThreshold }; return route.fulfill({ json: { state: "ready", screeningSettings, formToken } });
      case "request-additional-review": reviewSummary.requiredReviews = payload.requiredReviews; reviewSummary.meanScore = null; return route.fulfill({ json: { state: "updated", formToken } });
      case "confirm-screening": {
        const input = payload.screening;
        const passed = screening.similarityThreshold !== null && input.ethics.passed === true && input.relevance.passed === true && input.externalChecked && !input.investigation;
        const failed = input.ethics.passed === false || input.relevance.passed === false;
        const status = passed ? "passed" : failed ? input.failureDisposition === "final" ? "failed_final" : "failed_correctable" : "pending";
        const gates = [...screening.automatic.slice(0, 4), { gate: 5, ...input.ethics }, { gate: 6, ...input.relevance }, { gate: 7, passed: screening.similarityThreshold === null ? null : input.externalChecked, note: input.similarityNote }];
        screening = { ...screening, sequence: screening.sequence + 1, status, current: passed, gates, ethicsNote: input.ethics.note, externalChecked: input.externalChecked, externalReference: input.externalReference, investigation: input.investigation, investigationNote: input.investigationNote,
          history: [{ sequence: screening.sequence + 1, status, investigation: input.investigation, actorId, at: "2026-10-31T06:00:00Z", note: input.note, gates }, ...screening.history] };
        return route.fulfill({ json: { state: "updated", formToken } });
      }
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
  return { actions, advisoryActions, recover: () => { missing = false; } };
}
async function axe(page: Page) { expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]); }
async function snapshot(page: Page, name: string) { mkdirSync("test-results/abstract-consumers", { recursive: true }); await page.screenshot({ path: `test-results/abstract-consumers/${name}.png`, fullPage: true }); }

for (const locale of ["en", "ar"] as const) {
  test(`${locale} screening advisory defaults off and shows held supervisor status`, async ({ page }) => {
    await fixture(page, ["scientificAdministrator"]); await page.goto(`/${locale}/staff/science`);
    await page.getByTestId("science-workspace").getByRole("button", { name: researchCopy[locale].open, exact: true }).click();
    const panel = page.getByTestId("submission-advisory"), t = submissionAdvisoryCopy[locale];
    await expect(panel.getByText(t.disabled, { exact: true })).toBeVisible(); await expect(panel.getByText(t.states.draft_held, { exact: true })).toBeVisible();
    await expect(panel.getByRole("button")).toHaveCount(0); await axe(page);
  });
  test(`${locale} synthetic advisory requires individual human confirmation and cannot set gates`, async ({ page }, info) => {
    const f = await fixture(page, ["scientificAdministrator"], { advisory: true, unscreened: true }); await page.goto(`/${locale}/staff/science`);
    await page.getByTestId("science-workspace").getByRole("button", { name: researchCopy[locale].open, exact: true }).click();
    const panel = page.getByTestId("submission-advisory"), checklist = page.getByTestId("abstract-screening"), t = submissionAdvisoryCopy[locale];
    await expect(panel).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); await expect(panel.getByText("66.67/100", { exact: true })).toBeVisible();
    expect(f.advisoryActions).toHaveLength(0);
    await panel.getByRole("button", { name: `${t.copy} G5`, exact: true }).click();
    await expect(checklist.getByLabel(`G5: ${screeningCopy[locale].note}`, { exact: true })).toHaveValue("Synthetic blinded observation 5");
    await expect(checklist.getByLabel(screeningCopy[locale].ethics, { exact: true })).toHaveValue("");
    await expect(checklist.getByRole("button", { name: screeningCopy[locale].confirm, exact: true })).toHaveCount(0);
    await panel.getByRole("button", { name: t.confirm, exact: true }).first().click();
    await expect(panel.getByText(t.confirmed, { exact: true })).toBeVisible();
    expect(f.advisoryActions).toHaveLength(1); expect(f.advisoryActions[0]).toMatchObject({ action: "confirm-item", advisoryId: decisionId, item: "significance", score: 3 });
    expect(f.actions).toHaveLength(0); await axe(page); await snapshot(page, `${locale}-ai-human-confirmation-${info.project.name}`);
  });
}

for (const locale of ["en", "ar"] as const) {
  const copy = researchCopy[locale];
  test(`${locale} Super Admin fills published window without saving, then saves UTC and sees closed readiness`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["superAdmin"], { empty: true }), text = submissionWindowCopy[locale];
    await page.goto(`/${locale}/staff/science`); const section = page.getByTestId("submission-window");
    await expect(section).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(section.getByLabel(text.opens, { exact: true })).toHaveValue("");
    await section.getByRole("button", { name: text.suggestion, exact: true }).click();
    await expect(section.getByLabel(text.opens, { exact: true })).toHaveValue("2026-11-23T00:00");
    await expect(section.getByLabel(text.closes, { exact: true })).toHaveValue("2026-12-13T23:59");
    expect(f.actions).toHaveLength(0);
    await expect(section.getByRole("switch", { name: text.enabled, exact: true })).not.toBeChecked();
    await expect(section.locator("[data-gate]")).toHaveCount(9);
    await section.getByRole("button", { name: text.save, exact: true }).click();
    await expect(section.locator('[data-gate="dates"]')).toHaveAttribute("data-ready", "true");
    await expect(section.locator(".staff-window-utc")).toHaveAttribute("dir", "ltr");
    await expect(section.locator(".staff-window-utc time")).toHaveText(["2026-11-22T21:00:00.000Z", "2026-12-13T20:59:00.000Z"]);
    expect(f.actions).toContainEqual(expect.objectContaining({ action: "save-window", version: 0, enabled: false, opensAt: "2026-11-22T21:00:00.000Z", closesAt: "2026-12-13T20:59:00.000Z" }));
    await expect(section.locator('[data-gate="evidence"]')).toHaveCount(0);
    await expect(section.locator('[data-gate="similarity"]')).toContainText("ORG-070");
    await expect(section.getByRole("status")).toHaveText(text.closed);
    await axe(page); await snapshot(page, `${locale}-submission-window-${testInfo.project.name}`);
  });
  test(`${locale} Scientific Administrator can read readiness but cannot change window`, async ({ page }) => {
    const f = await fixture(page, ["scientificAdministrator"]), text = submissionWindowCopy[locale];
    await page.goto(`/${locale}/staff/science`); const section = page.getByTestId("submission-window");
    await expect(section.getByLabel(text.opens, { exact: true })).toBeDisabled();
    await expect(section.getByRole("switch", { name: text.enabled, exact: true })).toBeDisabled();
    await expect(section.getByRole("button", { name: text.save, exact: true })).toBeDisabled();
    await expect(section.locator('[data-gate="evidence"]')).toHaveCount(0);
    await expect(section.locator('[data-gate="similarity"]')).toContainText("ORG-070");
    expect(f.actions).toHaveLength(0); await axe(page);
  });
  test(`${locale} staff see provisional bands and criterion disagreement, then route additional review`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["scientificAdministrator"], { completedPair: true }), t = screeningCopy[locale];
    await page.goto(`/${locale}/staff/science`); const workspace = page.getByTestId("science-workspace");
    await expect(workspace.getByText(t.bands.poster, { exact: true })).toBeVisible(); await expect(workspace.getByRole("region", { name: copy.submissions, exact: true }).getByText(t.provisional, { exact: true })).toBeVisible();
    await workspace.getByRole("button", { name: copy.open, exact: true }).click();
    const disagreement = workspace.getByRole("region", { name: t.disagreement, exact: true }); await expect(disagreement.locator("dd")).toHaveText(Array(7).fill("1"));
    await workspace.locator("summary").filter({ hasText: t.additional }).click();
    await workspace.getByLabel(t.requiredReviews, { exact: true }).fill("3"); await workspace.getByLabel(t.additionalNote, { exact: true }).fill("Synthetic disagreement needs another independent review");
    await workspace.getByRole("button", { name: t.additional, exact: true }).click();
    await expect(workspace.getByText(t.bands.reviews_incomplete, { exact: true }).first()).toBeVisible();
    expect(f.actions.find((p) => p.action === "request-additional-review")).toMatchObject({ expectedRequired: 2, requiredReviews: 3 });
    expect(f.actions.some((p) => p.action === "decision" || p.action === "batch")).toBe(false);
    await axe(page); await snapshot(page, `${locale}-criterion-disagreement-${testInfo.project.name}`);
  });
  test(`${locale} screening stays pending without a threshold, then confirms and audits an investigation`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["superAdmin"], { unscreened: true }), t = screeningCopy[locale];
    await page.goto(`/${locale}/staff/science`);
    const workspace = page.getByTestId("science-workspace");
    await workspace.getByRole("button", { name: copy.open, exact: true }).click();
    const checklist = workspace.getByTestId("abstract-screening");
    await expect(workspace).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(checklist.getByText(t.thresholdUnset, { exact: true })).toBeVisible();
    await expect(checklist.getByRole("button", { name: t.confirm, exact: true })).toHaveCount(0);
    await checklist.getByLabel(t.ethics, { exact: true }).selectOption("true"); await checklist.getByLabel(`G5: ${t.note}`, { exact: true }).fill("Synthetic ethics confirmed");
    await checklist.getByLabel(t.relevance, { exact: true }).selectOption("true"); await checklist.getByLabel(`G6: ${t.note}`, { exact: true }).fill("Synthetic medical relevance");
    await checklist.getByLabel(t.external, { exact: true }).check(); await checklist.getByLabel(t.externalReference, { exact: true }).fill("SYNTHETIC-REPORT-001");
    await checklist.getByRole("button", { name: t.record, exact: true }).click(); await expect(checklist.getByRole("button", { name: t.confirm, exact: true })).toHaveCount(0);
    expect(f.actions.filter((p) => p.action === "confirm-screening")).toHaveLength(1);
    const settings = workspace.locator(".staff-screening-settings"); await settings.locator(":scope > summary").click();
    await expect(settings.getByLabel(t.threshold, { exact: true })).toHaveValue(""); await expect(settings.getByLabel(t.capacity, { exact: true })).toHaveValue("");
    await expect(settings.getByLabel(t.useBands, { exact: true })).not.toBeChecked();
    await settings.getByLabel(t.threshold, { exact: true }).fill("30"); await settings.getByRole("button", { name: t.saveSettings, exact: true }).click();
    // The saved confirmation note remains editable after settings are refreshed.
    await checklist.getByLabel(`G5: ${t.note}`, { exact: true }).fill("Synthetic ethics confirmed again");
    await checklist.getByRole("button", { name: t.confirm, exact: true }).click();
    await expect(checklist.getByTestId("screening-status")).toHaveText(t.statuses.passed);
    await expect(checklist.getByText("SYN-MATCH-0002", { exact: true })).toBeVisible();
    await checklist.getByLabel(t.investigation, { exact: true }).check(); await checklist.getByLabel(t.investigationNote, { exact: true }).fill("Synthetic integrity concern for investigation");
    await checklist.getByRole("button", { name: t.record, exact: true }).click();
    await expect(checklist.getByLabel(t.investigation, { exact: true })).toBeChecked();
    await expect(workspace.getByText(t.bands.investigation, { exact: true }).first()).toBeVisible();
    await checklist.getByText(t.history, { exact: true }).click(); await expect(checklist.getByText(t.recordedBy, { exact: false }).first()).toBeVisible();
    await checklist.getByLabel(t.investigation, { exact: true }).uncheck(); await checklist.getByLabel(t.investigationNote, { exact: true }).fill("Synthetic investigation resolved; relevance requires correction");
    await checklist.getByLabel(t.relevance, { exact: true }).selectOption("false"); await checklist.getByLabel(`G6: ${t.note}`, { exact: true }).fill("Synthetic correctable relevance issue");
    await checklist.getByLabel(t.failureDisposition, { exact: true }).selectOption("correctable"); await checklist.getByLabel(t.rationale, { exact: true }).fill("Synthetic correction required before scoring");
    await checklist.getByRole("button", { name: t.record, exact: true }).click(); await expect(checklist.getByTestId("screening-status")).toHaveText(t.statuses.failed_correctable);
    await settings.locator(":scope > summary").click(); await settings.getByLabel(t.useBands, { exact: true }).check();
    await settings.getByRole("button", { name: t.applySuggestions, exact: true }).click();
    await expect(settings.getByLabel(t.oralMin, { exact: true })).toHaveValue("85"); await expect(settings.getByLabel(t.acceptanceMin, { exact: true })).toHaveValue("");
    expect(f.actions.filter((p) => p.action === "save-screening-settings")).toHaveLength(1);
    await settings.getByLabel(t.acceptanceMin, { exact: true }).fill("55"); await settings.getByRole("button", { name: t.saveSettings, exact: true }).click();
    const savedBands = f.actions.filter((p) => p.action === "save-screening-settings").at(-1);
    expect(savedBands?.action === "save-screening-settings" && savedBands.settings).toMatchObject({ bands: { oralMin: 85, posterMin: 60, borderlineMin: 55, acceptanceMin: 55 }, oralCapacity: null });
    expect(f.actions.some((p) => p.action === "batch")).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await axe(page); await snapshot(page, `${locale}-screening-investigation-${testInfo.project.name}`);
  });
  test(`${locale} science settings have no defaults and save without opening`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["scientificAdministrator"], { empty: true }); await page.goto(`/${locale}/staff/science`);
    const workspace = page.getByTestId("science-workspace"); await expect(workspace).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); await expect(workspace.getByText(copy.empty)).toBeVisible();
    await workspace.locator(".staff-research-settings > summary").click(); for (const key of ["reviewDeadline", "reviewersPerAbstract", "keywordCount"] as const) await expect(workspace.getByLabel(copy[key], { exact: true })).toHaveValue("");
    await expect(workspace.locator('input[type="file"]')).toHaveCount(0); await expect(workspace.getByText(copy.gate)).toBeVisible();
    for (const collection of ["specialties", "studyTypes"] as const) {
      const group = workspace.getByRole("group", { name: copy[collection], exact: true }); await group.getByRole("button", { name: copy.add, exact: true }).click();
      await group.getByLabel(copy.id, { exact: true }).fill(`synthetic-${collection}`); await group.getByLabel(copy.label, { exact: true }).fill(`Synthetic ${collection}`);
      if (collection === "studyTypes") { await expect(group.getByLabel(copy.template, { exact: true })).toHaveValue(""); await group.getByLabel(copy.template, { exact: true }).selectOption("research"); }
    }
    await expect(workspace.getByLabel(copy.aggregationPolicy, { exact: true })).toHaveValue(""); await workspace.getByLabel(copy.aggregationPolicy, { exact: true }).selectOption("weighted_normalized_mean");
    await expect(workspace.getByLabel(copy.notApplicablePolicy, { exact: true })).toHaveValue(""); await workspace.getByLabel(copy.notApplicablePolicy, { exact: true }).selectOption("all_required");
    await workspace.getByLabel(copy.blindingPolicy, { exact: true }).fill("Synthetic blind policy awaiting owner approval"); await workspace.getByRole("button", { name: copy.saveSettings, exact: true }).click(); await expect(workspace.getByRole("status").filter({ hasText: copy.settingsSaved })).toBeVisible();
    const saved = f.actions.find((action) => action.action === "save-settings"); expect(saved?.action === "save-settings" && saved.settings.reviewersPerAbstract).toBeNull(); expect(saved).not.toHaveProperty("enabled");
    await workspace.locator(".staff-research-settings > summary").click(); await axe(page); await snapshot(page, `${locale}-science-settings-${testInfo.project.name}`);
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
    for (const r of rubric) await packetRegion.locator(`#score-${r.id}`).fill("3"); await packetRegion.getByText("Scoring anchors: Poor (1) to Excellent (4)", { exact: true }).first().click(); await expect(packetRegion.getByText(/Addresses an important clinical/)).toBeVisible(); await packetRegion.getByLabel(reviewCopy.comments, { exact: true }).fill("Synthetic ongoing-work review."); await packetRegion.getByLabel(reviewCopy.recommendation, { exact: true }).selectOption("revise"); await axe(page); await snapshot(page, `${locale}-review-scorecard-${testInfo.project.name}`);
    await packetRegion.getByRole("button", { name: reviewCopy.save, exact: true }).click(); await workspace.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await expect(workspace.locator("#score-significance")).toHaveValue("3");
    await workspace.getByRole("button", { name: reviewCopy.submit, exact: true }).click(); expect(f.actions.filter((action) => action.action === "scorecard").map((action) => action.action === "scorecard" && action.submit)).toEqual([false, false, true]);
    await workspace.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await workspace.getByLabel(reviewCopy.responseReason).fill("Synthetic newly identified conflict"); await workspace.getByRole("button", { name: reviewCopy.conflict, exact: true }).click(); await expect(workspace.getByText("conflict", { exact: true })).toBeVisible();
  });
  test(`${locale} science can inspect completed scores while incomplete quorum stays explicit`, async ({ page }, testInfo) => {
    await fixture(page, ["scientificAdministrator"], { completedReview: true }); await page.goto(`/${locale}/staff/science`); const workspace = page.getByTestId("science-workspace"); await workspace.getByRole("button", { name: copy.open, exact: true }).click();
    const results = workspace.getByRole("region", { name: copy.reviewResults, exact: true }); await expect(results.getByText(copy.quorumIncomplete, { exact: true })).toBeVisible(); await expect(results.getByText(copy.noScores, { exact: true })).toHaveCount(0); await results.locator("summary").click(); await expect(results.getByText("Synthetic confidential review comment.", { exact: true })).toBeVisible(); await expect(results.getByText("Significance and Contribution", { exact: true })).toBeVisible(); await expect(results).not.toContainText("Synthetic Reviewer");
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
  test(`${locale} Super Admin can screen and decide while blind review scoring remains read-only`, async ({ page }) => {
    const f = await fixture(page, ["superAdmin"]); await page.goto(`/${locale}/staff/science`); const science = page.getByTestId("science-workspace"); await expect(science.getByText(copy.oversight, { exact: true })).toHaveCount(0); await science.getByRole("button", { name: copy.open, exact: true }).click(); await expect(science.getByRole("button", { name: copy.autoAssign, exact: true })).toBeVisible(); await expect(science.getByRole("button", { name: copy.saveDecision, exact: true })).toBeVisible();
    await page.goto(`/${locale}/staff/review`); const review = page.getByTestId("review-workspace"); await expect(review.getByText(reviewCopy.oversight, { exact: true })).toBeVisible(); await review.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await expect(review.getByRole("button", { name: reviewCopy.submit, exact: true })).toHaveCount(0); await expect(review.getByRole("button", { name: reviewCopy.conflict, exact: true })).toHaveCount(0); expect(f.actions).toHaveLength(0); await axe(page);
  });
  test(`${locale} missing research RPC keeps the staff session and offers retry`, async ({ page }) => {
    const f = await fixture(page, ["scientificAdministrator"], { missing: true }); await page.goto(`/${locale}/staff/science`); const workspace = page.getByTestId("science-workspace"); await expect(workspace.getByRole("alert")).toContainText(copy.errors["area-not-ready"]); await expect(page.getByTestId("staff-name")).toContainText("Synthetic Staff"); f.recover(); await workspace.getByRole("button", { name: copy.retry, exact: true }).click(); await expect(workspace.getByRole("button", { name: copy.open, exact: true })).toBeVisible(); await axe(page);
  });
}
