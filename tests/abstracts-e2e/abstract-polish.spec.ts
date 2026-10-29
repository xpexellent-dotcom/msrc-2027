import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import { abstractCopy } from "../../src/features/submissions/copy";
import { abstractDocument } from "../fixtures/abstracts";

async function fillReviewAbstract(page: Page, locale: "en" | "ar") {
  const copy = abstractCopy[locale];
  await page.locator("#abstract-title").fill(abstractDocument.title);
  await page.locator("#abstract-specialty").selectOption("internal_medicine");
  await page.locator("#abstract-study-type").selectOption("retrospective_cohort");
  await page.getByRole("checkbox", { name: copy.completion, exact: true }).check();
  for (const [key, value] of Object.entries(abstractDocument.body)) await page.locator(`#abstract-${key}`).fill(value);
  await page.locator("#abstract-supervisor-name").fill(abstractDocument.supervisor.fullName);
  await page.locator("#abstract-supervisor-email").fill(abstractDocument.supervisor.email);
  await page.locator("#abstract-supervisor-phone").fill("512345678");
  await page.locator("#abstract-committee").fill("Synthetic Review Committee");
  await page.locator("#abstract-ethics-reference").fill("SYNTHETIC-REVIEW-IRB");
  await page.locator("#abstract-conflicts").fill(abstractDocument.conflictOfInterest);
  await page.locator("#abstract-funding").fill(abstractDocument.fundingDeclaration);
  for (const label of [copy.authority, copy.english, copy.integrity, copy.singlePresenter, copy.oneSubmission]) await page.getByRole("checkbox", { name: label, exact: true }).check();
}

for (const locale of ["en", "ar"] as const) {
  const copy = researchCompetitionCopy[locale], formCopy = abstractCopy[locale];
  test(`${locale} acknowledgement requires every item, traps focus, Escape returns focus and Cancel resets`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/abstracts?review=1`);
    const trigger = page.locator(".research-submission-cta").first();
    await expect(trigger).toHaveAttribute("href", `/${locale}/abstracts/submit?review=1`);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: copy.prepare, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("checkbox")).toHaveCount(copy.checklist.length);
    for (const label of copy.checklist) await expect(dialog.getByRole("checkbox", { name: label, exact: true })).toBeVisible();
    const proceed = dialog.getByRole("button", { name: copy.continueToForm, exact: true });
    await expect(proceed).toBeDisabled();
    for (let index = 0; index < copy.checklist.length - 1; index++) await dialog.getByRole("checkbox").nth(index).check();
    await expect(proceed).toBeDisabled();
    await dialog.getByRole("checkbox").last().check();
    await expect(proceed).toBeEnabled();
    await dialog.getByRole("checkbox").first().uncheck();
    await expect(proceed).toBeDisabled();
    await dialog.getByRole("checkbox").first().check();
    await proceed.focus(); await page.keyboard.press("Tab");
    await expect(dialog.getByRole("checkbox").first()).toBeFocused();
    await page.keyboard.press("Shift+Tab"); await expect(proceed).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog.getByRole("checkbox").first()).not.toBeChecked();
    await expect(proceed).toBeDisabled();
    await dialog.getByRole("button", { name: copy.cancel, exact: true }).click();
    await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  });

  test(`${locale} closing CTA acknowledgement continues to review form with rules first`, async ({ page }) => {
    await page.goto(`/${locale}/abstracts?review=1`);
    await page.locator(".research-closing .research-submission-cta").click();
    const dialog = page.getByRole("dialog", { name: copy.prepare, exact: true });
    for (const checkbox of await dialog.getByRole("checkbox").all()) await checkbox.check();
    await dialog.getByRole("button", { name: copy.continueToForm, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/abstracts/submit\\?review=1$`));
    await expect(page.getByTestId("abstract-review-banner")).toBeVisible();
    const rules = page.getByTestId("abstract-submission-rules");
    await expect(rules.getByRole("heading", { level: 2 })).toHaveText(copy.rulesTitle);
    for (const [title, text] of copy.rules) { await expect(rules).toContainText(title); await expect(rules).toContainText(text); }
    expect(await rules.evaluate((element) => {
      const workspace = document.querySelector('[data-testid="abstract-workspace"]');
      return workspace !== null && Boolean(element.compareDocumentPosition(workspace) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test(`${locale} acknowledgement is accessible at 320px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/abstracts?review=1`);
    await page.locator(".research-submission-cta").first().click();
    const dialog = page.getByRole("dialog", { name: copy.prepare, exact: true });
    await expect(dialog).toBeVisible();
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await dialog.evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.height <= innerHeight; })).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await dialog.getByRole("button", { name: copy.cancel, exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(dialog).not.toBeVisible();
  });

  test(`${locale} review mode requires an explicit query and has no participant API traffic`, async ({ page }) => {
    await page.goto(`/${locale}/abstracts/submit`);
    await expect(page.getByTestId("abstract-review-banner")).toHaveCount(0);
    await expect(page.getByTestId("abstract-editor")).toHaveCount(0);
    await page.goto(`/${locale}/abstracts/submit?review=0`);
    await expect(page.getByTestId("abstract-review-banner")).toHaveCount(0);
    await expect(page.getByTestId("abstract-editor")).toHaveCount(0);
    const requests: string[] = [];
    page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/abstracts") requests.push(request.method()); });
    await page.goto(`/${locale}/abstracts/submit?review=1`);
    const banner = page.getByTestId("abstract-review-banner");
    await expect(banner).toBeVisible();
    if (locale === "en") await expect(banner).toHaveText("Review mode — preview only. Nothing is saved or submitted.");
    await expect(page.getByTestId("abstract-editor")).toBeVisible();
    await expect(page.locator("#abstract-title")).toHaveAccessibleDescription(/0 \/ 20/);
    await expect(page.locator("#abstract-ethics")).toHaveAccessibleDescription(formCopy.ethicsHelp);
    await expect(page.locator("#abstract-registration")).toHaveAccessibleDescription(formCopy.registrationHelp);
    await expect(page.getByText("Review Presenter", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("reviewer@example.test", { exact: false }).first()).toBeVisible();
    await fillReviewAbstract(page, locale);
    await page.getByRole("button", { name: formCopy.save, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(formCopy.saved);
    await page.getByRole("button", { name: formCopy.preview, exact: true }).click();
    await expect(page.getByTestId("abstract-preview")).toBeVisible();
    await expect(page.getByRole("button", { name: formCopy.finalize, exact: true })).toBeEnabled();
    await page.getByRole("button", { name: formCopy.finalize, exact: true }).click();
    await expect(page.locator(".abstract-save-status")).toHaveText(formCopy.finalized);
    await expect(page.getByText(formCopy.locked, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: formCopy.finalize, exact: true })).toHaveCount(0);
    await page.getByTestId("abstract-preview").locator("ul").scrollIntoViewIfNeeded();
    await expect(banner).toBeVisible();
    await expect(banner).toBeInViewport({ ratio: 1 });
    expect(await banner.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    })).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    await expect(page.locator("#abstract-title")).toHaveValue("");
    await expect(page.getByTestId("abstract-review-banner")).toBeVisible();
    await page.getByRole("button", { name: formCopy.addAuthor, exact: true }).click();
    const authorName = page.locator('input[id^="author-name-"]');
    await authorName.fill("Synthetic Co-author");
    await expect(authorName).toHaveAttribute("dir", "ltr");
    await expect(authorName).toHaveAttribute("lang", "en");
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.getByTestId("abstract-editor").locator("input, select, textarea").evaluateAll((elements) => elements.every((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth;
    }))).toBe(true);
    expect(requests).toEqual([]);
  });

  test(`${locale} acknowledgement CTA remains a working link without JavaScript`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: String(testInfo.project.use.baseURL) });
    const page = await context.newPage();
    try {
      // The public page is static, so without JavaScript the review query cannot reach the CTA.
      await page.goto(`/${locale}/abstracts?review=1`);
      await expect(page.locator(".research-submission-cta").first()).toHaveAttribute("href", `/${locale}/sign-in`);
      await page.goto(`/${locale}/abstracts/submit?review=1`);
      await expect(page.getByTestId("abstract-submission-rules")).toBeVisible();
      await expect(page.getByTestId("abstract-editor")).toBeVisible();
    } finally { await context.close(); }
  });

  if (process.env.ABS2_CAPTURE === "1") test(`${locale} owner review screenshots`, async ({ page }, testInfo) => {
    const device = testInfo.project.name.includes("mobile") ? "390" : "desktop";
    await page.setViewportSize(device === "390" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    mkdirSync("output/abs2", { recursive: true });
    await page.goto(`/${locale}/abstracts`);
    await page.screenshot({ path: `output/abs2/${locale}-${device}-public.png`, fullPage: true, scale: "css", animations: "disabled" });
    await page.goto(`/${locale}/abstracts?review=1`);
    await page.locator(".research-submission-cta").first().click();
    await expect(page.getByRole("dialog", { name: copy.prepare, exact: true })).toBeVisible();
    await page.screenshot({ path: `output/abs2/${locale}-${device}-dialog.png`, scale: "css", animations: "disabled" });
    await page.goto(`/${locale}/abstracts/submit?review=1`);
    await expect(page.getByTestId("abstract-editor")).toBeVisible();
    await page.screenshot({ path: `output/abs2/${locale}-${device}-form.png`, fullPage: true, scale: "css", animations: "disabled" });
  });
}
