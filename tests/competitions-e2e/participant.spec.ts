import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { competitionCopy } from "../../src/features/competitions/copy";
import { emptyHackathonDocument, emptyThesisDocument, type CompetitionKind } from "../../src/features/competitions/contracts";

async function fixture(context: BrowserContext, mode = "ready") {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now(), origin = "http://127.0.0.1:3216", claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const settings = Object.fromEntries((["hackathon", "three_minute_thesis"] as const).map((kind) => [kind, {
    stageStates: { entry: "open", selection: "open", judging: "open", final_material: "closed", membership: "closed" },
    pitchPrompt: kind === "hackathon" ? "Synthetic approved English pitch prompt" : null, finalistCapPerTrack: null, filesReady: false,
  }]));
  const response = await context.request.post("http://127.0.0.1:3218/__synthetic/competitions", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, mode, entries: [], settings } });
  expect(response.ok()).toBe(true);
}
async function accessible(page: Page) {
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((element) => element.clientWidth));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = competitionCopy[locale];
  for (const kind of ["hackathon", "three_minute_thesis"] as const satisfies readonly CompetitionKind[]) {
    test(`${locale} ${kind}: draft, resume, preview, submit English content`, async ({ page, context }, testInfo) => {
      await fixture(context); await page.goto(`/${locale}/entries?kind=${kind}`);
      await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await page.getByRole("button", { name: copy.create, exact: true }).click();
      await page.getByLabel(copy.titleField, { exact: true }).fill("Synthetic competition entry");
      await expect(page.locator("#competition-title")).toHaveAttribute("dir", "ltr");
      await expect(page.locator("#competition-title")).toHaveAttribute("lang", "en");
      if (kind === "hackathon") {
        await page.getByLabel(copy.mode, { exact: true }).selectOption("team");
        await page.getByLabel(copy.track, { exact: true }).selectOption("advancing_research");
        await expect(page.locator("#competition-track option")).toHaveCount(2);
        await page.getByLabel(copy.pitch, { exact: true }).fill("Synthetic English project pitch.");
        await expect(page.getByTestId("competition-word-count")).toContainText("4 / 300");
        const keys = Object.keys(emptyHackathonDocument().declarations) as Array<keyof ReturnType<typeof emptyHackathonDocument>["declarations"]>;
        for (const key of keys) await page.getByRole("checkbox", { name: copy[key], exact: true }).check();
      } else {
        // TMT-01/02: do not inherit the hackathon pitch limit.
        await page.getByLabel(copy.narrative, { exact: true }).fill("Narrative ".repeat(301));
        await page.getByLabel(copy.presenter, { exact: true }).fill("Synthetic Presenter");
        await page.getByLabel(copy.affiliation, { exact: true }).fill("Synthetic Institution");
        await page.getByRole("checkbox", { name: copy.postgraduateDeclaration, exact: true }).check();
        await page.getByRole("checkbox", { name: copy.authorityConfirmed, exact: true }).check();
        expect(emptyThesisDocument().declarations.postgraduate).toBe(false);
        await expect(page.getByTestId("competition-word-count")).toHaveCount(0);
      }
      await page.getByRole("button", { name: copy.save, exact: true }).click();
      await expect(page.locator(".competition-status")).toHaveText(copy.saved);
      await page.reload(); await page.getByRole("button", { name: copy.edit, exact: true }).click();
      await expect(page.locator("#competition-title")).toHaveValue("Synthetic competition entry");
      await expect(page.locator('input[name*="phone"], input[name*="national"], input[name*="passport"]')).toHaveCount(0);
      await accessible(page);
      await page.getByRole("button", { name: copy.preview, exact: true }).click();
      await expect(page.getByRole("button", { name: copy.submit, exact: true })).toBeEnabled();
      await expect(page.locator("#competition-title")).toBeDisabled();
      if (testInfo.project.name.includes("mobile")) await page.screenshot({ path: testInfo.outputPath(`competition-${locale}-${kind}.png`), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: copy.submit, exact: true }).click();
      await expect(page.locator(".competition-status")).toHaveText(copy.submitted);
      await expect(page.getByText(copy.locked, { exact: true })).toBeVisible();
      await accessible(page);
    });
  }
  test(`${locale} hackathon 301 words blocks saving, titles do not count`, async ({ page, context }) => {
    await fixture(context); await page.goto(`/${locale}/entries?kind=hackathon`);
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await page.getByLabel(copy.titleField, { exact: true }).fill("Title ".repeat(301));
    await page.getByLabel(copy.pitch, { exact: true }).fill("Pitch ".repeat(301));
    await expect(page.getByRole("alert")).toHaveText(copy.overLimit);
    await expect(page.getByRole("button", { name: copy.save, exact: true })).toBeDisabled();
    await page.getByLabel(copy.pitch, { exact: true }).fill("Pitch ".repeat(300));
    await expect(page.getByRole("button", { name: copy.save, exact: true })).toBeEnabled();
    await accessible(page);
  });
  test(`${locale} missing migration retains session and shows pending state`, async ({ page, context }) => {
    await fixture(context, "missing");
    const before = (await context.cookies()).find((cookie) => cookie.name === "msrc-participant-test")?.value;
    await page.goto(`/${locale}/entries`);
    await expect(page.getByRole("status")).toHaveText(copy.notReady);
    expect((await context.cookies()).find((cookie) => cookie.name === "msrc-participant-test")?.value).toBe(before);
    await accessible(page);
  });
  test(`${locale} failed save retains local text`, async ({ page, context }) => {
    await fixture(context); await page.goto(`/${locale}/entries`);
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await page.getByLabel(copy.titleField, { exact: true }).fill("Synthetic local text survives");
    await page.route("**/api/competitions?locale=*", (route) => route.request().method() === "POST"
      ? route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid_input" }) }) : route.continue());
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.locator(".competition-status")).toHaveText(copy.invalid);
    await expect(page.locator("#competition-title")).toHaveValue("Synthetic local text survives");
  });
  test(`${locale} team invitations are distinct from post-acceptance confirmation`, async ({ page, context }) => {
    await fixture(context); await page.goto(`/${locale}/entries?kind=hackathon`);
    await page.getByRole("button", { name: copy.create, exact: true }).click();
    await page.getByLabel(copy.mode, { exact: true }).selectOption("team");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.locator(".competition-status")).toHaveText(copy.saved);
    await page.getByLabel(copy.email, { exact: true }).fill("unverified@example.invalid");
    await page.getByRole("button", { name: copy.invite, exact: true }).click();
    await expect(page.locator(".competition-status")).toHaveText(copy.memberUnavailable);
    await page.getByLabel(copy.email, { exact: true }).fill("synthetic-member@example.invalid");
    await page.getByRole("button", { name: copy.invite, exact: true }).click();
    await expect(page.locator(".competition-roster")).toContainText("synthetic-member@example.invalid");
    await expect(page.getByRole("button", { name: copy.confirm, exact: true })).toHaveCount(0);
    await expect(page.locator(".competition-roster li")).toHaveCount(2);
    await page.getByLabel(copy.email, { exact: true }).fill("synthetic-member@example.invalid");
    await page.getByRole("button", { name: copy.invite, exact: true }).click();
    await expect(page.locator(".competition-status")).toHaveText(copy.memberUnavailable);
    await expect(page.locator(".competition-roster li")).toHaveCount(2);
    await accessible(page);
  });
}
