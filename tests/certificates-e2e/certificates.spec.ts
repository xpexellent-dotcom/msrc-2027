import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "../helpers/csp";
import { certificateCopy } from "../../src/components/certificates/copy";
import { id, participantFixture, staffFixture, syntheticSurvey } from "./fixtures";

async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
}
for (const locale of ["en", "ar"] as const) {
  const copy = certificateCopy[locale];
  test(`${locale} public verification is noindex and reveals only the five allowed certificate fields`, async ({ page, request }, testInfo) => {
    const code = randomBytes(32).toString("hex");
    const details = { recipient_name: "Synthetic Participant", certificate_type: "Full Two-Day Conference Attendance", edition: "Synthetic edition", activity: "Synthetic conference", validity: "valid" };
    const fixture = await request.post("http://127.0.0.1:3218/__synthetic/verification", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { code, result: details } });
    expect(fixture.ok()).toBe(true);
    const response = await page.goto(`/${locale}/certificates/verify/${code}`);
    await expect(page.getByRole("heading", { level: 1, name: copy.verifyTitle })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    const area = page.getByTestId("certificate-verification");
    await expect(area.locator("dd")).toHaveCount(5);
    for (const value of [details.recipient_name, copy.conference, details.edition, details.activity, copy.validity.valid]) await expect(area.getByText(value, { exact: true })).toBeVisible();
    await expect(area).not.toContainText("@example.invalid");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`verification-${locale}.png`), fullPage: true, animations: "disabled" });
  });
  test(`${locale} revoked, replaced and rate-limited verification retain no directory or private account fields`, async ({ page, request }) => {
    for (const validity of ["revoked", "replaced"] as const) {
      const code = randomBytes(32).toString("hex");
      await request.post("http://127.0.0.1:3218/__synthetic/verification", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { code, result: { recipient_name: "Synthetic Participant", certificate_type: "Workshop Participation", edition: "Synthetic edition", activity: "Synthetic workshop", validity } } });
      await page.goto(`/${locale}/certificates/verify/${code}`);
      await expect(page.getByTestId("certificate-verification").getByText(copy.validity[validity], { exact: true })).toBeVisible();
      await expect(page.getByTestId("certificate-verification").locator("dd")).toHaveCount(5);
    }
    const code = randomBytes(32).toString("hex");
    await request.post("http://127.0.0.1:3218/__synthetic/verification", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { code, result: { state: "rate_limited" } } });
    await page.goto(`/${locale}/certificates/verify/${code}`);
    await expect(page.getByText(copy.verifyLimited, { exact: true })).toBeVisible();
    await expect(page.getByTestId("certificate-verification").locator("dd")).toHaveCount(0);
    await accessible(page);
  });
  test(`${locale} participant submits all three survey question types and completion survives reload`, async ({ page, context }, testInfo) => {
    await participantFixture(context); await page.goto(`/${locale}/my-msrc/certificates`);
    const area = page.getByTestId("participant-certificates");
    await expect(page.getByRole("heading", { level: 1, name: copy.participantTitle })).toBeVisible();
    await expect(area.getByText(copy.reasons.general_survey_required, { exact: true })).toBeVisible();
    await area.getByRole("button", { name: copy.takeSurvey, exact: true }).click();
    await expect(area.getByText(copy.privacy, { exact: true })).toBeVisible();
    const form = area.getByTestId("certificate-survey-form");
    await form.locator("#certificate-answer-rating").selectOption("4");
    await form.locator("#certificate-answer-choice").selectOption("second");
    await form.locator("#certificate-answer-comment").fill("Synthetic non-identifying feedback");
    await accessible(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.getByRole("heading", { level: 1, name: copy.participantTitle })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`survey-${locale}.png`), fullPage: true, animations: "disabled" });
    const submitted = page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/certificates");
    await form.getByRole("button", { name: copy.submitSurvey, exact: true }).click();
    const payload = (await submitted).postDataJSON();
    expect(payload).toMatchObject({ action: "submitSurvey", surveyId: syntheticSurvey.id, answers: { rating: 4, choice: "second", comment: "Synthetic non-identifying feedback" } });
    expect(payload).not.toHaveProperty("operationId"); expect(payload).not.toHaveProperty("responseId");
    await expect(area.getByText(copy.completed, { exact: true })).toBeVisible();
    await expect(area.getByText(copy.eligible, { exact: true })).toBeVisible();
    await expect(area.getByTestId("certificate-survey-form")).toHaveCount(0);
    await page.reload(); await expect(area.getByText(copy.completed, { exact: true })).toBeVisible();
    await expect(area.getByRole("link", { name: copy.download, exact: true })).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
  test(`${locale} pending survey migration keeps the participant session and reports area-not-ready`, async ({ page, context }) => {
    await participantFixture(context, "missing");
    const before = (await context.cookies()).find((cookie) => cookie.name === "msrc-participant-test")?.value;
    await page.goto(`/${locale}/my-msrc/certificates`);
    await expect(page.getByText(copy.notReady, { exact: true })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === "msrc-participant-test")?.value).toBe(before);
    await accessible(page);
  });
  test(`${locale} Super Admin approves a template before reviewing and releasing a batch`, async ({ page }, testInfo) => {
    const { actions } = await staffFixture(page, { releaseEnabled: true, failure: true });
    await page.goto(`http://127.0.0.1:3219/${locale}/staff/certificates`);
    const area = page.getByTestId("certificate-staff-panel"), template = area.getByTestId("certificate-template-conference");
    await expect(area.getByRole("heading", { name: copy.staffTitle })).toBeVisible();
    if (testInfo.project.name.includes("mobile")) {
      const evidence = area.locator(".certificate-table-wrap");
      await expect(evidence).toHaveAttribute("tabindex", "0");
      expect(await evidence.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await evidence.focus(); await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
      await expect.poll(() => evidence.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`eligibility-${locale}.png`), animations: "disabled" });
    }
    const release = area.getByTestId("certificate-release").getByRole("button", { name: copy.release, exact: true });
    await area.getByLabel(copy.selectTemplate, { exact: true }).selectOption(id(3));
    await expect(release).toBeDisabled();
    await template.getByRole("button", { name: copy.approveTemplate, exact: true }).click();
    await expect(area.getByText(copy.failure, { exact: true })).toBeVisible();
    await template.getByRole("button", { name: copy.approveTemplate, exact: true }).click();
    await expect(template.getByText(copy.approved, { exact: true })).toBeVisible();
    await release.click();
    await expect(area.getByText(copy.releaseHint, { exact: true }).last()).toBeVisible();
    const dialog = area.getByRole("dialog", { name: copy.batchReview }), bounds = await dialog.boundingBox(), viewport = page.viewportSize()!;
    expect(bounds).not.toBeNull();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`batch-release-${locale}.png`), animations: "disabled" });
    await area.getByTestId("certificate-confirm-release").click();
    await expect(area.getByText(copy.saved, { exact: true })).toBeVisible();
    expect(actions.map((input) => input.action)).toEqual(["approveTemplate", "approveTemplate", "release"]);
    expect(actions[0].operationId).toBe(actions[1].operationId);
    expect(actions[0]).toMatchObject({ templateId: id(3), expectedVersion: 1 });
    expect(actions[2]).toMatchObject({ templateId: id(3), workshopId: null, expectedVersion: 1 });
    await expect(area.getByText(copy.status.issued, { exact: true })).toBeVisible();
  });
  test(`${locale} staff receives empty editable surveys with unset retention and a missing-migration state`, async ({ page }) => {
    const { actions } = await staffFixture(page);
    await page.goto(`http://127.0.0.1:3219/${locale}/staff/certificates`);
    const area = page.getByTestId("certificate-staff-panel");
    await area.getByRole("button", { name: copy.newSurvey, exact: true }).click();
    const editor = area.getByTestId("certificate-survey-editor");
    await expect(editor.getByText(copy.emptyQuestions, { exact: true })).toBeVisible();
    await editor.getByLabel(copy.titleEn, { exact: true }).fill("Synthetic draft survey");
    await editor.getByLabel(copy.titleAr, { exact: true }).fill("استبيان تجريبي مسودة");
    await editor.getByRole("button", { name: copy.saveDraft, exact: true }).click();
    await expect(area.getByText(copy.saved, { exact: true })).toBeVisible();
    expect(actions[0]).toMatchObject({ action: "saveSurvey", survey: { titleEn: "Synthetic draft survey", titleAr: "استبيان تجريبي مسودة", questions: [], deadline: null, published: false } });
    await page.unroute("**/api/staff-portal**"); await staffFixture(page, { missing: true }); await page.reload();
    await expect(area.getByText(copy.notReady, { exact: true })).toBeVisible();
    await accessible(page);
  });
}
