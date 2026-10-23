import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { abstractCopy } from "../../src/features/submissions/copy";
import { abstractDocument, abstractSettings, abstractSubmission } from "../fixtures/abstracts";

async function fixture(context: BrowserContext, mode = "ready", submissions: unknown[] = []) {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now(), origin = "http://127.0.0.1:3216", claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const response = await context.request.post("http://127.0.0.1:3218/__synthetic/abstracts", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, mode, submissions, settings: abstractSettings } });
  expect(response.ok()).toBe(true);
}
async function accessible(page: Page) {
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((element) => element.clientWidth));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}
for (const locale of ["en", "ar"] as const) {
  const copy = abstractCopy[locale];
  test(`${locale} create, autosave, resume, preview and finalize a synthetic abstract`, async ({ page, context }, testInfo) => {
    await fixture(context); await page.goto(`/${locale}/abstracts`);
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await page.getByLabel(copy.fields.title, { exact: true }).fill(abstractDocument.title);
    await page.locator("#abstract-specialty").selectOption("synthetic-specialty"); await page.locator("#abstract-study-type").selectOption("synthetic-study");
    for (const [key, value] of Object.entries(abstractDocument.body)) await page.locator(`#abstract-${key}`).fill(value);
    await page.locator("#abstract-keywords").fill("synthetic");
    await page.getByLabel(copy.fields.name, { exact: true }).fill("Synthetic Author");
    await page.locator('[id^="author-email-"]').fill("synthetic-author@example.invalid");
    await page.getByLabel(copy.fields.affiliations, { exact: true }).fill("Synthetic Institution");
    await page.locator("#abstract-piAuthorId").selectOption({ index: 1 }); await page.locator("#abstract-correspondingAuthorId").selectOption({ index: 1 });
    await page.locator("#abstract-ethics-explanation").fill("Synthetic explanation"); await page.locator("#abstract-conflicts").fill("Synthetic declaration"); await page.locator("#abstract-funding").fill("Synthetic funding");
    await page.getByRole("checkbox", { name: copy.authority }).check();
    await expect(page.getByTestId("abstract-word-count")).toContainText("13 / 300");
    await expect(page.locator("#abstract-title")).toHaveAttribute("dir", "ltr"); await expect(page.locator("#abstract-title")).toHaveAttribute("lang", "en");
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.saved);
    await page.reload(); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(page.locator("#abstract-title")).toHaveValue(abstractDocument.title);
    await accessible(page);
    if (testInfo.project.name.includes("mobile")) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`abstract-${locale}-form.png`), fullPage: true, animations: "disabled" });
    }
    await page.getByRole("button", { name: copy.preview, exact: true }).click();
    await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toBeEnabled();
    await expect(page.locator("#abstract-title")).toBeDisabled(); await accessible(page);
    if (testInfo.project.name.includes("mobile")) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`abstract-${locale}-preview.png`), fullPage: true, animations: "disabled" });
    }
    await page.getByRole("button", { name: copy.finalize, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.finalized);
    await expect(page.getByText(copy.locked, { exact: true })).toBeVisible();
    await page.reload(); await page.getByRole("button", { name: copy.edit, exact: true }).click(); await expect(page.locator("#abstract-title")).toBeDisabled();
  });
  test(`${locale} missing database function keeps session and presents translated pending state`, async ({ page, context }) => {
    await fixture(context, "missing"); const before = (await context.cookies()).find((value) => value.name === "msrc-participant-test")?.value;
    await page.goto(`/${locale}/abstracts`); await expect(page.getByRole("status")).toHaveText(copy.notReady); await accessible(page);
    expect((await context.cookies()).find((value) => value.name === "msrc-participant-test")?.value).toBe(before);
  });
  test(`${locale} evidence gate retains saved draft and never exposes upload controls`, async ({ page, context }) => {
    await fixture(context, "evidence_gate", [abstractSubmission]); await page.goto(`/${locale}/abstracts`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await page.getByRole("button", { name: copy.preview, exact: true }).click(); await page.getByRole("button", { name: copy.finalize, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.evidence_gate); await expect(page.locator('input[type="file"]')).toHaveCount(0); await accessible(page);
  });
  test(`${locale} published revision shows exact deadline and locks identities`, async ({ page, context }) => {
    const deadline = "2028-01-01T12:00:00Z";
    await fixture(context, "ready", [{ ...abstractSubmission, status: "revision_requested", decision: { outcome: "revise", instructions: "Synthetic published instruction", revisionDeadline: deadline, permittedFields: ["title", "body", "keywords"] } }]);
    await page.goto(`/${locale}/abstracts`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.revision })).toBeVisible(); await expect(page.locator(`time[datetime="${deadline}"]`)).toBeVisible();
    await expect(page.getByLabel(copy.fields.name, { exact: true })).toBeDisabled(); await expect(page.locator("#abstract-title")).toBeEnabled();
    await page.locator("#abstract-title").fill("Synthetic revised title"); await page.getByRole("button", { name: copy.preview, exact: true }).click();
    await page.getByRole("button", { name: copy.finalize, exact: true }).click(); await expect(page.locator(".abstract-save-status")).toHaveText(copy.finalized); await accessible(page);
  });
  test(`${locale} 301 body words block saving while excluded title is unrestricted`, async ({ page, context }) => {
    await fixture(context, "ready", [abstractSubmission]); await page.goto(`/${locale}/abstracts`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await page.locator("#abstract-background").fill("word ".repeat(301)); await expect(page.getByTestId("abstract-editor").getByRole("alert")).toHaveText(copy.overLimit);
    await expect(page.getByRole("button", { name: copy.save, exact: true })).toBeDisabled(); await accessible(page);
  });
  test(`${locale} failed save retains local text and reload fetches fresh session-bound form state`, async ({ page, context }) => {
    await fixture(context, "ready", [abstractSubmission]); await page.goto(`/${locale}/abstracts`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    let refused = false;
    await page.route("**/api/abstracts?locale=*", async (route) => {
      if (route.request().method() === "POST" && !refused) { refused = true; await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid_input" }) }); }
      else await route.continue();
    });
    await page.locator("#abstract-title").fill("Synthetic unsaved local title"); await page.getByRole("button", { name: copy.preview, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(copy.invalid);
    await expect(page.locator("#abstract-title")).toHaveValue("Synthetic unsaved local title");
    const fresh = page.waitForResponse((response) => response.request().method() === "GET" && response.url().includes("/api/abstracts?locale="));
    await page.getByRole("button", { name: copy.reload, exact: true }).click(); expect((await fresh).ok()).toBe(true);
    await expect(page.locator("#abstract-title")).toHaveValue(abstractDocument.title);
    await page.getByRole("button", { name: copy.preview, exact: true }).click(); await expect(page.getByRole("button", { name: copy.finalize, exact: true })).toBeEnabled();
  });
}
