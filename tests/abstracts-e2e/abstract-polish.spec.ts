import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import { abstractCopy } from "../../src/features/submissions/copy";
import { fixture } from "../helpers/abstract-fixture";

test.beforeEach(async ({ page, context }) => {
    await fixture(context);
    await page.clock.install({ time: new Date("2026-11-30T12:00:00Z") });
    await context.addCookies([{ name: "msrc-signed-in", value: "1", url: "http://127.0.0.1:3216", sameSite: "Strict" }]);
    await page.route("**/api/participant-accounts", route => route.fulfill({ json: { state: "authenticated", profile: { name: "Synthetic Presenter", accountState: "verified" } } }));
});
for (const locale of ["en", "ar"] as const) {
  const copy = researchCompetitionCopy[locale], formCopy = abstractCopy[locale];
  test(`${locale} acknowledgement requires every item, traps focus, Escape returns focus and Cancel resets`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/abstracts`);
    const trigger = page.locator(".research-submission-cta").first();
    await expect(trigger).toHaveAttribute("href", `/${locale}/abstracts/submit`);
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

  test(`${locale} closing CTA acknowledgement continues to signed-in form with rules first`, async ({ page }) => {
    await page.goto(`/${locale}/abstracts`);
    const trigger = page.locator(".research-closing .research-submission-cta");
    await expect(trigger).toHaveAttribute("href", `/${locale}/abstracts/submit`);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: copy.prepare, exact: true });
    await expect(dialog).toBeVisible();
    for (const checkbox of await dialog.getByRole("checkbox").all()) await checkbox.check();
    await dialog.getByRole("button", { name: copy.continueToForm, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/abstracts/submit$`));
    await expect(page.getByTestId("abstract-workspace")).toBeVisible();
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
    await page.goto(`/${locale}/abstracts`);
    const trigger = page.locator(".research-submission-cta").first();
    await expect(trigger).toHaveAttribute("href", `/${locale}/abstracts/submit`);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: copy.prepare, exact: true });
    await expect(dialog).toBeVisible();
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await dialog.evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.height <= innerHeight; })).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await dialog.getByRole("button", { name: copy.cancel, exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(dialog).not.toBeVisible();
  });

  test(`${locale} signed-in editor retains associated helpers and English scientific controls`, async ({ page }) => {
    await page.goto(`/${locale}/abstracts/submit`);
    await page.getByRole("button", { name: formCopy.create, exact: true }).click();
    await expect(page.locator("#abstract-title")).toHaveAccessibleDescription(/0 \/ 20/);
    await expect(page.locator("#abstract-ethics")).toHaveAccessibleDescription(formCopy.ethicsHelp);
    await expect(page.locator("#abstract-registration")).toHaveAccessibleDescription(formCopy.registrationHelp);
    await expect(page.getByText("Synthetic Presenter", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: formCopy.addAuthor, exact: true }).click();
    const name = page.locator('input[id^="author-name-"]');
    await name.fill("Synthetic Co-author");
    await expect(name).toHaveAttribute("dir", "ltr");
    await expect(name).toHaveAttribute("lang", "en");
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.locator("html").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.getByTestId("abstract-editor").locator("input, select, textarea").evaluateAll(elements => elements.every(element => {
      const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth;
    }))).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test(`${locale} acknowledgement CTA remains a working link without JavaScript`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: String(testInfo.project.use.baseURL) });
    const page = await context.newPage();
    try {
      // Static HTML retains a signed-out link; private data still requires a session.
      await page.goto(`/${locale}/abstracts`);
      await expect(page.locator(".research-submission-cta").first()).toHaveAttribute("href", `/${locale}/sign-in`);
      await page.goto(`/${locale}/abstracts/submit`);
      await expect(page.getByTestId("abstract-submission-rules")).toBeVisible();
      await expect(page.getByTestId("abstract-unavailable")).toBeVisible();
    } finally { await context.close(); }
  });

}
