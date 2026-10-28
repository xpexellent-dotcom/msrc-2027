import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import { abstractSettings, abstractSubmission } from "../fixtures/abstracts";
import { captureAbstractViews } from "../helpers/abstract-captures";

for (const locale of ["en", "ar"] as const) {
  const copy = researchCompetitionCopy[locale];
  test(`${locale} public research information, dates, mobile layout and accessibility`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install({ time: new Date("2026-10-28T12:00:00Z") });
    const response = await page.goto(`/${locale}/abstracts`);
    expect(response?.status()).toBe(200);
    // Local/preview deployments are globally noindex; only the workspace gets a nonce policy.
    expect(response?.headers()["content-security-policy"]).not.toContain("strict-dynamic");
    await expect(page).toHaveTitle(`${copy.title} | MSRC 2027`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
    await expect(page.locator(".research-roadmap > li")).toHaveCount(6);
    await expect(page.locator(".research-roadmap time")).toHaveCount(7);
    await expect(page.locator(".research-guidelines > li")).toHaveCount(6);
    await expect(page.locator(".research-criteria dt")).toHaveCount(7);
    await expect(page.locator(".research-rules > li")).toHaveCount(9);
    await expect(page.locator(".research-submission-cta").first()).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(".research-submission-cta").first()).toContainText(copy.cta.opening);
    await expect(page.locator(".research-submission-cta time").first()).toHaveAttribute("datetime", "2026-11-23");
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await captureAbstractViews(page, testInfo.project.name, locale, "public", [["roadmap", "#research-journey"], ["evaluation", "#research-evaluation"], ["rules", "#research-rules"], ["closing", "#research-closing"]]);
    await page.getByRole("link", { name: copy.contact, exact: true }).focus();
    await expect(page.getByRole("link", { name: copy.contact, exact: true })).toBeFocused();
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
  test(`${locale} signed-out CTA stays public and old information links resolve`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-30T12:00:00Z") });
    await page.goto(`/${locale}/submissions`); await expect(page).toHaveURL(new RegExp(`/${locale}/abstracts$`));
    await expect(page.locator(".research-submission-cta").first()).toHaveText(copy.cta.signIn);
    await expect(page.locator(".research-submission-cta").first()).toHaveAttribute("href", `/${locale}/sign-in`);
  });
  for (const mode of ["profile", "draft", "finalized", "submit"] as const) test(`${locale} public CTA recognizes ${mode} participant state`, async ({ page, context }) => {
    await page.clock.install({ time: new Date("2026-11-30T12:00:00Z") });
    await context.addCookies([{ name: "msrc-signed-in", value: "1", url: "http://127.0.0.1:3216", sameSite: "Strict" }]);
    await page.route("**/api/participant-accounts", (route) => route.fulfill({ json: { state: "authenticated", profile: { name: "Synthetic Presenter", accountState: "verified" } } }));
    await page.route("**/api/abstracts?locale=*", (route) => route.fulfill({ json: { state: "ready", settings: abstractSettings, profileComplete: mode !== "profile", formToken: "synthetic",
      submissions: mode === "draft" ? [abstractSubmission] : mode === "finalized" ? [{ ...abstractSubmission, status: "withdrawn", finalizedAt: "2026-11-24T10:00:00Z" }] : [] } }));
    await page.goto(`/${locale}/abstracts`);
    await expect(page.locator(".research-submission-cta").first()).toHaveText(copy.cta[mode]);
    await expect(page.locator(".research-submission-cta").first()).toHaveAttribute("href", mode === "profile" ? `/${locale}/my-msrc#profile` : `/${locale}/abstracts/submit`);
  });
}
