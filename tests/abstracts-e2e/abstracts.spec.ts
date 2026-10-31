import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { abstractCopy } from "../../src/features/submissions/copy";
import { abstractDocument, abstractSubmission } from "../fixtures/abstracts";
import { captureAbstractViews } from "../helpers/abstract-captures";
import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import { mkdirSync } from "node:fs";
import { fixture } from "../helpers/abstract-fixture";

async function accessible(page: Page) {
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((element) => element.clientWidth));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}
for (const locale of ["en", "ar"] as const) {
  const copy = abstractCopy[locale];
  test(`${locale} create, autosave, resume, preview and finalize without uploads (ORG-070)`, async ({ page, context }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fixture(context); await page.goto(`/${locale}/abstracts/submit`);
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await page.locator("#abstract-title").fill(abstractDocument.title);
    await page.locator("#abstract-specialty").selectOption("internal_medicine"); await page.locator("#abstract-study-type").selectOption("retrospective_cohort");
    await page.getByRole("checkbox", { name: copy.completion, exact: true }).check();
    for (const [key, value] of Object.entries(abstractDocument.body)) await page.locator(`#abstract-${key}`).fill(value);
    await page.locator("#abstract-supervisor-name").fill(abstractDocument.supervisor.fullName);
    await page.locator("#abstract-supervisor-email").fill(abstractDocument.supervisor.email);
    await expect(page.locator("#abstract-supervisor-phone-country")).toHaveValue("+966");
    await page.locator("#abstract-supervisor-phone").fill("512345678");
    await expect(page.locator("#abstract-supervisor-phone")).toHaveValue("+966512345678");
    await page.locator("#abstract-committee").fill("Synthetic Committee"); await page.locator("#abstract-ethics-reference").fill("SYNTHETIC-IRB");
    await page.locator("#abstract-conflicts").fill("No declared conflicts"); await page.locator("#abstract-funding").fill("No funding");
    for (const label of [copy.authority, copy.english, copy.integrity, copy.singlePresenter, copy.oneSubmission]) await page.getByRole("checkbox", { name: label, exact: true }).check();
    await expect(page.getByTestId("abstract-word-count")).toContainText("19 / 350");
    await expect(page.locator("#abstract-title")).toHaveAttribute("dir", "ltr"); await expect(page.locator("#abstract-title")).toHaveAttribute("lang", "en");
    await expect(page.locator("#abstract-keywords")).toHaveCount(0); await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.saved);
    await page.reload(); await expect(page.getByRole("button", { name: copy.create, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: copy.edit, exact: true }).click(); await expect(page.locator("#abstract-title")).toHaveValue(abstractDocument.title);
    await expect(page.getByText("Synthetic Presenter", { exact: false }).first()).toBeVisible();
    await accessible(page);
    await captureAbstractViews(page, testInfo.project.name, locale, "form", [["research", "#abstract-title"], ["presenter", ".abstract-fields:nth-of-type(2) legend"], ["supervisor", "#abstract-supervisor-name"], ["ethics", "#abstract-committee"], ["body", "#abstract-background"], ["declarations", "#abstract-conflicts"]]);
    await page.getByRole("button", { name: copy.preview, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toBeEnabled();
    await expect(page.getByTestId("abstract-preview")).toContainText(abstractDocument.supervisor.fullName);
    await expect(page.locator("#abstract-title")).toHaveCount(0); await accessible(page);
    await captureAbstractViews(page, testInfo.project.name, locale, "preview", [["content", '[data-testid="abstract-preview"] h3'], ["submit", ".abstract-review-actions"]]);
    await page.getByRole("button", { name: copy.finalize, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.finalized);
    await expect(page.getByText(copy.locked, { exact: true })).toBeVisible();
    await expect(page.locator('.research-roadmap [aria-current="step"]')).toHaveCount(1);
    const current = page.locator('.research-roadmap [aria-current="step"]');
    await expect(current.locator(".research-current-step")).toHaveText(researchCompetitionCopy[locale].current);
    await expect(current.locator(".research-step-number")).toHaveCSS("color", "rgb(59, 30, 109)");
    expect(await current.evaluate((node) => getComputedStyle(node, "::before").opacity)).toBe("1");
    const tops = await page.locator(".abstract-workspace .research-roadmap > li").evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(testInfo.project.name.includes("mobile") ? 6 : 2);
    await accessible(page);
    mkdirSync("output/abs4", { recursive: true });
    await page.locator(".abstract-workspace .research-roadmap").screenshot({ path: `output/abs4/${locale}-${testInfo.project.name}-receipt.png`, animations: "disabled", style: ".site-header { visibility: hidden !important; }" });
    await page.reload(); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(page.getByTestId("abstract-preview")).toBeVisible(); await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toHaveCount(0);
  });
  test(`${locale} missing database function preserves session`, async ({ page, context }) => {
    await fixture(context, "missing"); const before = (await context.cookies()).find((value) => value.name === "msrc-participant-test")?.value;
    await page.goto(`/${locale}/abstracts/submit`); await expect(page.getByRole("status")).toHaveText(copy.notReady); await accessible(page);
    expect((await context.cookies()).find((value) => value.name === "msrc-participant-test")?.value).toBe(before);
  });
  test(`${locale} legacy database evidence response retains saved draft during rollout`, async ({ page, context }) => {
    await fixture(context, "evidence_gate", [abstractSubmission]); await page.goto(`/${locale}/abstracts/submit`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await page.getByRole("button", { name: copy.preview, exact: true }).click(); await page.getByRole("button", { name: copy.finalize, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.evidence_gate); await expect(page.getByTestId("abstract-preview")).toBeVisible(); await accessible(page);
  });
  for (const mode of ["profile_incomplete", "presenter_ineligible", "submission_used"] as const) test(`${locale} distinct ${mode} finalization gate`, async ({ page, context }) => {
    await fixture(context, mode, [abstractSubmission]); await page.goto(`/${locale}/abstracts/submit`);
    if (mode === "profile_incomplete") await expect(page.getByTestId("profile-submission-gate").first()).toBeVisible();
    if (mode === "presenter_ineligible") await expect(page.getByTestId("presenter-ineligible")).toContainText(copy.presenter_ineligible);
    await page.getByRole("button", { name: copy.edit, exact: true }).click(); await page.getByRole("button", { name: copy.preview, exact: true }).click();
    if (mode === "profile_incomplete") await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toHaveCount(0);
    if (mode === "presenter_ineligible") await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toBeDisabled();
    const state = await context.request.get(`/api/abstracts?locale=${locale}`); const data = await state.json();
    const response = await context.request.post(`/api/abstracts?locale=${locale}`, { headers: { origin: "http://127.0.0.1:3216" }, data: { action: "finalize", submissionId: abstractSubmission.id, expectedVersion: 1, operationId: randomUUID(), formToken: data.formToken } });
    expect(response.status()).toBe(409); expect(await response.json()).toEqual({ state: mode });
    await accessible(page);
  });
  test(`${locale} finalized withdrawn and historical revision records remain locked`, async ({ page, context }) => {
    await fixture(context, "ready", [{ ...abstractSubmission, status: "withdrawn", finalizedAt: "2026-10-27T12:00:00Z", reference: "SYNTHETIC-USED" }]);
    await page.goto(`/${locale}/abstracts/submit`); await expect(page.getByText(copy.submission_used, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.create, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: copy.edit, exact: true }).click(); await expect(page.getByTestId("abstract-preview")).toBeVisible();
    await expect(page.locator("#abstract-title")).toHaveCount(0); await accessible(page);
  });
  test(`${locale} headings count toward 350 and title has its own 20-word limit`, async ({ page, context }) => {
    await fixture(context, "ready", [abstractSubmission]); await page.goto(`/${locale}/abstracts/submit`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await page.locator("#abstract-background").fill("word ".repeat(350)); await expect(page.getByTestId("abstract-editor").getByRole("alert")).toHaveText(copy.overLimit);
    await expect(page.getByRole("button", { name: copy.save, exact: true })).toBeDisabled();
    await page.locator("#abstract-background").fill(abstractDocument.body.background); await page.locator("#abstract-title").fill("word ".repeat(21));
    await expect(page.getByTestId("abstract-editor").getByRole("alert")).toHaveText(copy.titleOverLimit); await expect(page.getByRole("button", { name: copy.save, exact: true })).toBeDisabled(); await accessible(page);
  });
  test(`${locale} co-authors reorder and ethics / registration conditional fields`, async ({ page, context }) => {
    await fixture(context, "ready", [abstractSubmission]); await page.goto(`/${locale}/abstracts/submit`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await page.getByRole("button", { name: copy.addAuthor, exact: true }).click(); await page.locator('[id^="author-name-"]').fill("Synthetic Coauthor");
    await page.locator('[id^="author-affiliations-"]').fill("Synthetic Affiliation");
    await page.getByRole("button", { name: copy.addAuthor, exact: true }).click(); await page.locator('[id^="author-name-"]').last().fill("Second Coauthor");
    await page.locator('[id^="author-affiliations-"]').last().fill("Second Affiliation");
    await page.getByRole("button", { name: copy.up, exact: true }).last().focus(); await page.keyboard.press("Enter");
    await expect(page.locator('[id^="author-name-"]').first()).toHaveValue("Second Coauthor");
    await page.locator("#abstract-ethics").selectOption("not_required"); await page.locator("#abstract-ethics-explanation").fill("Synthetic study without human participants or data");
    await page.locator("#abstract-registration").selectOption("registered"); await page.locator("#abstract-registry").fill("Synthetic Registry"); await page.locator("#abstract-registration-number").fill("SYNTHETIC-1");
    await page.getByRole("button", { name: copy.preview, exact: true }).click(); await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toBeEnabled(); await accessible(page);
  });
  test(`${locale} failed save retains local text and reload fetches a fresh form token`, async ({ page, context }) => {
    await fixture(context, "ready", [abstractSubmission]); await page.goto(`/${locale}/abstracts/submit`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    let refused = false;
    await page.route("**/api/abstracts?locale=*", async (route) => { if (route.request().method() === "POST" && !refused) { refused = true; await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid_input" }) }); } else await route.continue(); });
    await page.locator("#abstract-title").fill("Synthetic unsaved local title"); await page.getByRole("button", { name: copy.preview, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.invalid); await expect(page.locator("#abstract-title")).toHaveValue("Synthetic unsaved local title");
    const fresh = page.waitForResponse((response) => response.request().method() === "GET" && response.url().includes("/api/abstracts?locale="));
    await page.getByRole("button", { name: copy.reload, exact: true }).click(); expect((await fresh).ok()).toBe(true); await expect(page.locator("#abstract-title")).toHaveValue(abstractDocument.title);
  });
}
