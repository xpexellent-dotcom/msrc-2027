import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "../helpers/csp";
import type { Role } from "../../src/lib/permissions/contract";
import { advisoryCopy } from "../../src/features/staff-portal/advisory-copy";
import { emptyAdvisorySettings, type AdvisoryPayload, type AdvisoryRecord, type AdvisorySettings } from "../../src/features/staff-portal/advisory-contract";
import { emptyResearchSettings } from "../../src/features/staff-portal/research-contract";
import { reviewCopy } from "../../src/features/staff-portal/research-copy";
import { summarizeCalibration } from "../../src/lib/ai-assessment/calibration";

const actorId = "79000000-0000-4000-8000-000000000001", submissionId = "79000000-0000-4000-8000-000000000002", runId = "79000000-0000-4000-8000-000000000003", assignmentId = "79000000-0000-4000-8000-000000000004";
const rubric = [{ id: "synthetic-criterion", label: "Synthetic scientific merit", weight: 1, min: 0, max: 10 }];
const record: AdvisoryRecord = { id: runId, reference: "SYN-ADV-0001", submissionVersion: 1, rubricVersion: 1, model: "deepseek-flash", promptVersion: "synthetic-v1", createdAt: "2026-10-23T06:00:00Z", rubric, scores: [{ criterionId: rubric[0].id, value: 7, rationale: "Synthetic rationale describing the scientific method only." }] };
const configured: AdvisorySettings = { enabled: true, reviewerVisible: false, noticeReference: "Synthetic notice review", evaluationReference: "Synthetic offline evaluation", operatingReference: "Synthetic operating approval", model: "deepseek-flash", maxPerRun: 2, maxPerDay: 3, estimatedCostPerAbstract: 0.1, dailyCostCap: 3, currency: "USD", maxAttempts: 2, maxTokens: 1000 };
const calibration = summarizeCalibration([1, 2, 3].map((value) => ({ submissionId: `synthetic-${value}`, submissionVersion: 1, rubricVersion: 1, criterionId: rubric[0].id, min: 0, max: 10, aiScore: value + 1, humanScore: value })));

/** Presentation mocks only: no external provider request, credentials or production activation. */
async function fixture(page: Page, roles: Role[], options: { empty?: boolean; runtime?: boolean; missing?: boolean; failFirst?: boolean } = {}) {
  const actions: AdvisoryPayload[] = [], reviewerReads: string[] = []; let settings = structuredClone(options.empty ? emptyAdvisorySettings() : configured), version = 1, missing = options.missing ?? false, queued = false, reveal = false;
  let callsToProvider = 0;
  await page.route("https://api.deepseek.com/**", async route => { callsToProvider++; await route.abort(); });
  await page.route("**/api/staff-portal**", async route => {
    const request = route.request(), url = new URL(request.url()), formToken = "synthetic-advisory-form";
    if (url.pathname === "/api/staff-portal/research") {
      if (url.searchParams.get("area") === "queue") return route.fulfill({ json: { state: "ready", oversight: false, ownAffiliations: [], assignments: [{ id: assignmentId, reference: record.reference, title: "Synthetic finalized study", status: "completed", version: 1 }], formToken } });
      if (url.searchParams.get("area") === "packet") return route.fulfill({ json: { state: "ready", assignment: { id: assignmentId, version: 1, status: "completed", submissionVersion: 1, rubricVersion: 1 }, packet: { title: "Synthetic finalized study", body: { background: "Synthetic background", aim: "Synthetic aim", methods: "Synthetic methods", results: "Synthetic results", conclusion: "Synthetic conclusion" }, specialtyId: "synthetic", studyTypeId: "synthetic", completionStatus: "completed", keywords: [] }, rubric, scorecard: null, formToken } });
      return route.fulfill({ json: { state: "ready", settings: emptyResearchSettings(), version: 0, submissions: [], reviewers: [], formToken } });
    }
    if (url.pathname !== "/api/staff-portal/advisory") return route.fulfill({ json: { state: "authenticated", profile: { actorId, name: "Synthetic Staff", roles }, formToken } });
    if (missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken } });
    if (request.method() === "GET") {
      if (url.searchParams.get("area") === "reviewer") { reviewerReads.push(url.searchParams.get("assignmentId") ?? ""); return route.fulfill({ json: { state: "ready", advisory: reveal ? record : null, formToken } }); }
      if (url.searchParams.get("area") === "calibration") return route.fulfill({ json: { state: "ready", calibration, formToken } });
      return route.fulfill({ json: { state: "ready", version, settings, runtimeReady: options.runtime ?? false, eligibleCount: queued ? 0 : 1, candidates: queued ? [] : [{ id: submissionId, reference: record.reference, title: "Synthetic finalized study", submissionVersion: 1, rubricVersion: 1 }], records: options.empty ? [] : [record], runs: queued ? [{ id: runId, createdAt: record.createdAt, count: 2, completed: 1, failed: 1, pending: 0, estimatedCost: 0.4, currency: "USD", errors: [{ code: "invalid_output", count: 1 }] }] : [], formToken } });
    }
    const payload = request.postDataJSON() as AdvisoryPayload; actions.push(payload);
    if (payload.action === "save-settings") { settings = payload.settings; version++; return route.fulfill({ json: { state: "updated", version, formToken } }); }
    if (options.failFirst && actions.filter(action => action.action === "start").length === 1) return route.fulfill({ status: 409, json: { state: "budget-exceeded", formToken } });
    queued = true; return route.fulfill({ json: { state: "queued", runId, count: 1, formToken } });
  });
  return { actions, reviewerReads, recover: () => { missing = false; }, reveal: () => { reveal = true; }, providerCalls: () => callsToProvider };
}
async function open(page: Page, locale: "en" | "ar") { await page.goto(`/${locale}/staff/science`); await page.getByRole("tab", { name: advisoryCopy[locale].advisory, exact: true }).click(); return page.getByTestId("advisory-workspace"); }
async function axe(page: Page) { expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]); }
async function snapshot(page: Page, name: string) { mkdirSync("test-results/advisory", { recursive: true }); await page.screenshot({ path: `test-results/advisory/${name}.png`, fullPage: true }); }

for (const locale of ["en", "ar"] as const) {
  const text = advisoryCopy[locale];
  test(`${locale} advisory stays closed with blank budget fields and safe keyboard tabs`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["scientificAdministrator"], { empty: true }); const workspace = await open(page, locale);
    await expect(workspace).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); await expect(workspace.getByText(text.prc, { exact: true })).toBeVisible();
    await workspace.locator("summary").click();
    for (const key of ["maxPerRun", "maxPerDay", "estimatedCostPerAbstract", "dailyCostCap", "currency"] as const) await expect(workspace.getByLabel(text[key], { exact: true })).toHaveValue("");
    await expect(workspace.getByRole("checkbox", { name: text.activate, exact: true })).toHaveCount(0); await expect(workspace.getByRole("checkbox", { name: text.reviewers, exact: true })).toHaveCount(0);
    await workspace.getByRole("checkbox", { name: `${text.select} ${record.reference}`, exact: true }).check(); await workspace.getByRole("checkbox", { name: text.runConfirmation, exact: true }).check(); await expect(workspace.getByRole("button", { name: text.start, exact: true })).toBeDisabled();
    await workspace.getByRole("button", { name: text.save, exact: true }).click(); await expect(workspace.getByRole("status").filter({ hasText: text.saved })).toBeVisible(); expect(f.actions[0]).toMatchObject({ action: "save-settings", settings: { enabled: false, maxPerRun: null, maxPerDay: null, estimatedCostPerAbstract: null, dailyCostCap: null } });
    await axe(page); await snapshot(page, `${locale}-advisory-closed-${testInfo.project.name}`);
    const advisoryTab = page.getByRole("tab", { name: text.advisory, exact: true }); await advisoryTab.focus(); await page.keyboard.press("Home"); await expect(page.getByRole("tab", { name: text.abstracts, exact: true })).toBeFocused(); await page.keyboard.press("End"); await expect(advisoryTab).toBeFocused(); await expect(advisoryTab).toHaveAttribute("aria-selected", "true");
    expect(f.providerCalls()).toBe(0);
  });
  test(`${locale} mocked advisory queue retains idempotency after failure and logs counts only`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["scientificAdministrator"], { runtime: true, failFirst: true }); const workspace = await open(page, locale);
    await workspace.getByRole("checkbox", { name: `${text.select} ${record.reference}`, exact: true }).check(); await workspace.getByRole("checkbox", { name: text.runConfirmation, exact: true }).check(); await workspace.getByRole("button", { name: text.start, exact: true }).click();
    await expect(workspace.getByRole("alert")).toContainText(text.errors["budget-exceeded"]); await expect(page.getByTestId("staff-name")).toContainText("Synthetic Staff");
    await workspace.getByRole("button", { name: text.start, exact: true }).click(); await expect(workspace.getByRole("status").filter({ hasText: text.queued })).toBeVisible();
    const starts = f.actions.filter(action => action.action === "start"); expect(starts).toHaveLength(2); expect(starts[0].action === "start" && starts[0].operationId).toBe(starts[1].action === "start" && starts[1].operationId); expect(starts[0]).toMatchObject({ submissionIds: [submissionId] }); expect(JSON.stringify(starts)).not.toContain("rationale");
    const log = workspace.getByRole("region", { name: text.runs, exact: true }).first(); await expect(log).toContainText(text.errorCodes.invalid_output); await expect(log).not.toContainText(record.scores[0].rationale); await expect(log).not.toContainText("Synthetic finalized study");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1); await axe(page); await snapshot(page, `${locale}-advisory-run-${testInfo.project.name}`); expect(f.providerCalls()).toBe(0);
  });
  test(`${locale} Super Admin controls reviewer visibility and inspects descriptive calibration`, async ({ page }, testInfo) => {
    const f = await fixture(page, ["superAdmin"]); const workspace = await open(page, locale); await workspace.locator("summary").click();
    const visibility = workspace.getByRole("checkbox", { name: text.reviewers, exact: true }); await expect(visibility).not.toBeChecked(); await visibility.check(); await workspace.getByRole("button", { name: text.save, exact: true }).click(); await expect(workspace.getByRole("status").filter({ hasText: text.saved })).toBeVisible(); expect(f.actions[0]).toMatchObject({ action: "save-settings", settings: { reviewerVisible: true } });
    await expect(workspace.getByRole("button", { name: text.start, exact: true })).toBeDisabled(); const records = workspace.getByRole("region", { name: text.records, exact: true }); await expect(records.getByText(record.scores[0].rationale, { exact: true })).toHaveAttribute("dir", "ltr"); await expect(records.getByText(text.label, { exact: true })).toBeVisible();
    await workspace.getByRole("button", { name: text.calibration, exact: true }).click(); const calibrationRegion = workspace.getByRole("region", { name: text.calibration, exact: true }).first(); await expect(calibrationRegion.getByText(text.calibrationScale, { exact: true })).toBeVisible(); await expect(calibrationRegion.getByText(text.correlation, { exact: true }).first()).toBeVisible(); await expect(calibrationRegion.getByText(text.agreement, { exact: true }).first()).toBeVisible();
    // Selecting an already selected view must not leave it loading forever.
    await workspace.getByRole("button", { name: text.calibration, exact: true }).click(); await expect(calibrationRegion).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1); await axe(page); await snapshot(page, `${locale}-advisory-calibration-${testInfo.project.name}`); expect(f.providerCalls()).toBe(0);
  });
  test(`${locale} missing advisory RPC preserves staff session and retries`, async ({ page }) => {
    const f = await fixture(page, ["scientificAdministrator"], { missing: true }); const workspace = await open(page, locale); await expect(workspace.getByRole("alert")).toContainText(text.errors["area-not-ready"]); await expect(page.getByTestId("staff-name")).toContainText("Synthetic Staff"); f.recover(); await workspace.getByRole("button", { name: text.retry, exact: true }).click(); await expect(workspace.getByRole("heading", { name: text.candidates, exact: true })).toBeVisible(); await axe(page);
  });
  test(`${locale} completed reviewer sees advisory only when server reveals it without scorecard changes`, async ({ page }) => {
    const f = await fixture(page, ["abstractReviewer"]); await page.goto(`/${locale}/staff/review`); const review = page.getByTestId("review-workspace"); await review.getByRole("button", { name: reviewCopy.open, exact: true }).click(); await expect.poll(() => f.reviewerReads.length).toBe(1); await expect(review.getByRole("region", { name: advisoryCopy.en.label, exact: true })).toHaveCount(0);
    await review.getByRole("button", { name: reviewCopy.close, exact: true }).click(); f.reveal(); await review.getByRole("button", { name: reviewCopy.open, exact: true }).click(); const advice = review.getByRole("region", { name: advisoryCopy.en.label, exact: true }); await expect(advice).toBeVisible(); await expect(advice).toHaveAttribute("lang", "en"); await expect(advice).toHaveAttribute("dir", "ltr"); await expect(review.getByLabel(/Synthetic scientific merit/)).toHaveValue(""); expect(f.actions).toHaveLength(0); expect(f.reviewerReads).toEqual([assignmentId, assignmentId]); await axe(page);
  });
}

test("advisory tab is not available to unrelated staff roles", async ({ page }) => {
  await fixture(page, ["registrationWorkshopAdministrator"]); await page.goto("/en/staff/science"); await expect(page.getByTestId("staff-name")).toContainText("Synthetic Staff"); await expect(page.getByRole("tab", { name: advisoryCopy.en.advisory, exact: true })).toHaveCount(0); await expect(page.getByTestId("advisory-workspace")).toHaveCount(0); await axe(page);
});
