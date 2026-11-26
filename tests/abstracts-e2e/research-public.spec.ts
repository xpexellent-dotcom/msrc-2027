import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { formatIndex } from "../../src/lib/i18n";
import { researchCompetitionCopy } from "../../src/features/research-competition/copy";
import { abstractSettings, abstractSubmission } from "../fixtures/abstracts";
import { captureAbstractViews } from "../helpers/abstract-captures";

for (const locale of ["en", "ar"] as const) {
  const copy = researchCompetitionCopy[locale];
  test(`${locale} editorial journey and rubric respond, focus and respect reduced motion`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "abstracts-desktop", "Explicit width matrix runs once per locale.");
    mkdirSync("output/abs4", { recursive: true });
    await page.goto(`/${locale}/abstracts`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const steps = page.locator(".research-roadmap > li");
    const rubric = page.locator(".research-rubric-panel");
    await expect(steps).toHaveCount(6);
    await expect(page.locator(".research-step-number")).toHaveText(Array.from({ length: 6 }, (_, index) => locale === "en" ? formatIndex(index + 1, locale).padStart(2, "0") : formatIndex(index + 1, locale)));
    await expect(steps.nth(4).getByRole("heading")).toHaveText(copy.steps[4]);
    await expect(rubric.getByRole("listitem")).toHaveCount(7);
    await expect(rubric.locator(".research-criteria-count")).toHaveText(formatIndex(copy.criteria.length, locale));
    await expect(rubric.getByRole("heading", { level: 2, name: copy.evaluation })).toHaveAttribute("id", "research-evaluation-title");
    await expect(rubric.locator(".research-criterion-number")).toHaveText(locale === "en" ? ["I", "II", "III", "IV", "V", "VI", "VII"] : Array.from({ length: 7 }, (_, index) => formatIndex(index + 1, locale)));
    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const boxes = await steps.evaluateAll((nodes) => nodes.map((node) => { const rect = node.getBoundingClientRect(); return { top: rect.top, left: rect.left, width: rect.width }; }));
      if (width >= 960) {
        expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
        expect(new Set(boxes.map((box) => Math.round(box.width))).size).toBe(1);
        expect(locale === "ar" ? boxes[0].left > boxes[5].left : boxes[0].left < boxes[5].left).toBe(true);
      } else {
        expect(boxes.every((box, index) => index === 0 || box.top > boxes[index - 1].top)).toBe(true);
        expect(new Set(boxes.map((box) => Math.round(box.left))).size).toBe(1);
      }
      for (let index = 0; index < 6; index++) await expect(steps.nth(index).getByText(copy.stepDetails[index], { exact: true })).toBeVisible();
      const introBox = (await rubric.locator(".research-rubric-intro").boundingBox())!;
      const listBox = (await rubric.getByRole("list").boundingBox())!;
      expect(listBox.y).toBeGreaterThanOrEqual(introBox.y + introBox.height - 1);
      expect(await rubric.locator("h2").evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(width >= 960 ? 60 : 36);
      expect(await rubric.locator(".research-criteria-count").evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(105);
      expect(await rubric.locator("dt").first().evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(22);
      expect(await rubric.locator("dd").first().evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(18);
      const criterionBoxes = await rubric.getByRole("listitem").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
      if (width >= 960) expect(criterionBoxes[0]).toBeCloseTo(criterionBoxes[1], 1);
      else expect(criterionBoxes[1]).toBeGreaterThan(criterionBoxes[0]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width !== 320) {
        await page.locator(".research-journey").screenshot({ path: `output/abs4/${locale}-${width}-journey.png`, animations: "disabled", style: ".site-header { visibility: hidden !important; }" });
        await rubric.screenshot({ path: `output/abs4/${locale}-${width}-criteria.png`, animations: "disabled", style: ".site-header { visibility: hidden !important; }" });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.mouse.move(0, 0);
    await expect(page.locator(".research-roadmap-reveal")).toHaveAttribute("data-reveal", "ready");
    const firstDetail = steps.first().locator(".research-step-detail");
    await expect(firstDetail).toHaveCSS("opacity", "0");
    const numeral = steps.first().locator(".research-step-number");
    await expect(numeral).toHaveCSS("color", "rgb(217, 210, 223)");
    await steps.first().hover();
    await expect(firstDetail).toHaveCSS("opacity", "1");
    await expect(numeral).toHaveCSS("color", "rgb(59, 30, 109)");
    await expect(numeral).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -3)");
    const line = await steps.first().evaluate((node) => { const style = getComputedStyle(node, "::before"); return { color: style.backgroundColor, origin: style.transformOrigin, width: node.getBoundingClientRect().width }; });
    expect(line.color).toBe("rgb(201, 162, 74)");
    expect(parseFloat(line.origin)).toBeCloseTo(locale === "ar" ? line.width : 0, 1);
    await page.locator(".research-journey").screenshot({ path: `output/abs4/${locale}-1440-journey-hover.png`, animations: "disabled", style: ".site-header { visibility: hidden !important; }" });
    await page.mouse.move(0, 0);
    await steps.first().focus();
    await expect(steps.first()).toBeFocused();
    await expect(numeral).toHaveCSS("color", "rgb(59, 30, 109)");
    await page.keyboard.press("Tab");
    await expect(steps.nth(1)).toBeFocused();
    await expect(steps.nth(1).locator(".research-step-detail")).toHaveCSS("opacity", "1");
    await expect(steps.nth(1).locator(".research-step-number")).toHaveCSS("color", "rgb(59, 30, 109)");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(steps.nth(1).locator(".research-step-number")).toHaveCSS("transition-duration", "0s");
    await expect(steps.nth(1).locator(".research-step-number")).toHaveCSS("transform", "none");
    expect(await steps.nth(1).evaluate((node) => getComputedStyle(node, "::before").transitionDuration)).toBe("0s");
    expect(await steps.nth(1).evaluate((node) => getComputedStyle(node, "::before").opacity)).toBe("1");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await page.locator(".research-roadmap h3, .research-roadmap p, .research-rubric-intro h2, .research-rubric-intro p, .research-criteria dt, .research-criteria dd").evaluateAll((nodes) => nodes.every((node) => {
      const range = document.createRange(); range.selectNodeContents(node);
      return Array.from(range.getClientRects()).every((rect) => rect.left >= 0 && rect.right <= document.documentElement.clientWidth);
    }))).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  test(`${locale} public research information, dates, mobile layout and accessibility`, async ({ page }, testInfo) => {
    await page.route("**/api/abstracts/window", route => route.fulfill({ json: { state: "opening", opensAt: "2026-11-22T21:00:00.000Z", closesAt: "2026-12-13T20:59:00.000Z" } }));
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
    const stepIcons = page.locator(".research-step-marker .brand-icon img");
    await expect(stepIcons).toHaveCount(6);
    for (const [index, icon] of ["06-publications", "25-faq", "17-education", "26-contact", "15-schedule", "11-speakers"].entries()) {
      await expect(stepIcons.nth(index)).toHaveAttribute("src", new RegExp(icon + "\\.webp"));
      await expect(stepIcons.nth(index)).toHaveAttribute("alt", "");
    }
    await expect(page.getByRole("main").locator("time")).toHaveCount(0);
    await expect(page.locator(".research-guidelines > li")).toHaveCount(6);
    await expect(page.locator(".research-criteria dt")).toHaveCount(7);
    await expect(page.locator("#research-prepare, #research-rules")).toHaveCount(0);
    const presentations = page.getByRole("region", { name: copy.presentations });
    await expect(presentations.getByRole("article")).toHaveCount(2);
    await expect(presentations.getByRole("article").getByRole("heading", { level: 3 })).toHaveText([copy.oral, copy.poster]);
    await expect(presentations.locator(".research-format-label")).toHaveCount(2);
    const illustrations = presentations.locator(".research-format-art[aria-hidden='true'] img");
    await expect(illustrations).toHaveCount(2);
    await expect(illustrations.first()).toHaveAttribute("src", /11-speakers\.webp/);
    await expect(illustrations.last()).toHaveAttribute("src", /12-posters\.webp/);
    for (const illustration of await illustrations.all()) await expect(illustration).toHaveAttribute("alt", "");
    await expect(presentations.locator(".research-winners")).toContainText(copy.winners);
    await expect(presentations.locator(".research-winners")).toContainText(locale === "en" ? /cash prizes/i : "جوائز نقدية");
    const rubricArt = page.locator(".research-rubric-art");
    await expect(rubricArt).toHaveAttribute("aria-hidden", "true");
    await expect(rubricArt.locator("img")).toHaveAttribute("src", "/brand/identity/msrc27-seal-gold-456.webp");
    await expect(rubricArt.locator("img")).toHaveAttribute("alt", "");
    const eligibility = page.getByRole("region", { name: copy.eligibility });
    const requirements = eligibility.getByRole("listitem");
    await expect(requirements.getByRole("heading", { level: 3 })).toHaveText(copy.eligibilityCards.map(([heading]) => heading));
    await expect(requirements.locator("p")).toHaveText(copy.eligibilityCards.map(([, description]) => description));
    await expect(page.locator(".research-submission-cta").first()).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(".research-submission-cta").first()).toHaveText(copy.cta.opening);
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await captureAbstractViews(page, testInfo.project.name, locale, "public", [["roadmap", "#research-journey"], ["presentations", "#research-presentations"], ["eligibility", "#research-eligibility"], ["evaluation", "#research-evaluation"], ["closing", "#research-closing"]]);
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
    if (mode === "submit" || mode === "draft") {
      await page.locator(".research-submission-cta").first().click();
      await expect(page.getByRole("dialog", { name: copy.prepare, exact: true })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/${locale}/abstracts$`));
    }
  });
}
