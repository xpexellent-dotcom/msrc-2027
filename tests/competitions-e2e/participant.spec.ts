import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { competitionCopy } from "../../src/features/competitions/copy";
import { emptyHackathonDocument, emptyThesisDocument, type CompetitionKind } from "../../src/features/competitions/contracts";
import { hackathonFrameworkCopy } from "../../src/features/competitions/framework-copy";

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
  return { actorId, settings };
}
async function accessible(page: Page) {
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((element) => element.clientWidth));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = competitionCopy[locale];
  const framework = hackathonFrameworkCopy[locale];
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
        await page.getByLabel(framework.university, { exact: true }).fill("Synthetic Saudi University");
        await page.getByLabel(framework.fieldOfStudy, { exact: true }).fill("Engineering");
        await page.getByLabel(framework.phone, { exact: true }).fill("+966500000000");
        await page.getByRole("checkbox", { name: framework.enrolled, exact: true }).check();
        await page.getByRole("button", { name: framework.saveProfile, exact: true }).click();
        await page.getByLabel(copy.mode, { exact: true }).selectOption("team");
        await page.getByLabel(copy.track, { exact: true }).selectOption("advancing_research");
        await expect(page.locator("#competition-track option")).toHaveCount(2);
        await page.getByLabel(copy.pitch, { exact: true }).fill("Synthetic English project pitch.");
        await expect(page.getByTestId("competition-word-count")).toContainText("4 / 300");
        for (const key of ["originalityPermissions", "rulesAcknowledged", "mediaNoticeAcknowledged", "authorityConfirmed"] as const) await page.getByRole("checkbox", { name: framework[key], exact: true }).check();
        await page.getByLabel(framework.teamContributions, { exact: true }).fill("Synthetic lead: evidence research and concept development.");
        await page.getByLabel(framework.references, { exact: true }).fill("Synthetic references ".repeat(300));
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
      if (kind === "hackathon") {
        await expect(page.getByLabel(framework.phone, { exact: true })).toHaveValue("+966500000000");
        await expect(page.getByRole("button", { name: framework.accept, exact: true })).toHaveCount(0);
      }
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
    await expect(page.locator(".competition-error").filter({ hasText: copy.overLimit }).first()).toBeVisible();
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
  test(`${locale} accepted finalist sees private instructions and confirms separately from conference admission`, async ({ page, context }) => {
    const seeded = await fixture(context);
    const settings = { ...seeded.settings, hackathon: { ...seeded.settings.hackathon, stageStates: { entry: "closed", selection: "closed", judging: "closed", final_material: "not_ready", membership: "open" } } };
    const entry = { id: "dc000000-0000-4000-8000-000000000001", kind: "hackathon", version: 1, status: "accepted", document: { ...emptyHackathonDocument(), title: "Synthetic finalist" }, roster: [{ id: seeded.actorId, email: "synthetic@example.invalid", isLead: true, confirmed: true }], files: [], outcome: "Accepted", finalistWorkspace: { orientationDetails: "Synthetic orientation details", timetable: "Synthetic timetable", whatsappSupportUrl: "https://chat.whatsapp.com/synthetic-invite", finalDeckLockAt: null, participantInstructions: "Synthetic finalist instructions", confirmed: false } };
    await context.request.post("http://127.0.0.1:3218/__synthetic/competitions", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId: seeded.actorId, settings, entries: [entry] } });
    await page.goto(`/${locale}/entries?kind=hackathon`); await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(page.getByTestId("hackathon-finalist-workspace")).toBeVisible();
    await expect(page.getByText(framework.provisional, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: framework.registration, exact: true })).toHaveAttribute("href", `/${locale}/registration`);
    await expect(page.getByRole("link", { name: framework.support, exact: true })).toHaveAttribute("href", "https://chat.whatsapp.com/synthetic-invite");
    await expect(page.getByText("Synthetic finalist instructions", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: framework.finalistConfirm, exact: true }).click();
    await expect(page.getByRole("button", { name: framework.finalistConfirmed, exact: true })).toBeDisabled();
    await accessible(page);
  });
  test(`${locale} invited member completes private profile and accepts without lead editing controls`, async ({ page, context }) => {
    const seeded = await fixture(context), leadId = "dd000000-0000-4000-8000-000000000001";
    const entry = { id: "dc000000-0000-4000-8000-000000000001", kind: "hackathon", version: 1, status: "draft", isLead: false, invitationAccepted: false,
      document: { ...emptyHackathonDocument(), participationMode: "team" },
      roster: [{ id: leadId, email: "synthetic-lead@example.invalid", isLead: true, confirmed: false }, { id: seeded.actorId, email: "synthetic@example.invalid", isLead: false, confirmed: false }], files: [], outcome: null };
    await context.request.post("http://127.0.0.1:3218/__synthetic/competitions", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId: seeded.actorId, settings: seeded.settings, entries: [entry] } });
    await page.goto(`/${locale}/entries?kind=hackathon`);
    await expect(page.getByRole("button", { name: copy.create, exact: true })).toBeDisabled();
    await page.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(page.getByRole("button", { name: framework.accept, exact: true })).toBeDisabled();
    await expect(page.locator("#competition-title")).toBeDisabled();
    await expect(page.getByRole("button", { name: copy.save, exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.invite, exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: framework.support, exact: true })).toHaveCount(0);
    await page.getByLabel(framework.university, { exact: true }).fill("Synthetic Saudi University");
    await page.getByLabel(framework.fieldOfStudy, { exact: true }).fill("Synthetic discipline");
    await page.getByLabel(framework.phone, { exact: true }).fill("+966500000001");
    await page.getByRole("checkbox", { name: framework.enrolled, exact: true }).check();
    await page.getByRole("button", { name: framework.saveProfile, exact: true }).click();
    await expect(page.getByRole("button", { name: framework.accept, exact: true })).toBeEnabled();
    await page.getByRole("button", { name: framework.accept, exact: true }).click();
    await expect(page.getByRole("button", { name: framework.invitationAccepted, exact: true })).toBeDisabled();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await accessible(page);
  });
  test(`${locale} unset application settings keep profile and application closed`, async ({ page, context }) => {
    const seeded = await fixture(context);
    const settings = { ...seeded.settings, hackathon: { ...seeded.settings.hackathon, stageStates: { ...seeded.settings.hackathon.stageStates, entry: "not_ready" } } };
    await context.request.post("http://127.0.0.1:3218/__synthetic/competitions", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId: seeded.actorId, settings, entries: [] } });
    await page.goto(`/${locale}/entries?kind=hackathon`);
    await expect(page.getByRole("button", { name: copy.create, exact: true })).toBeDisabled();
    await expect(page.getByLabel(framework.phone, { exact: true })).toBeDisabled();
    await expect(page.getByRole("link", { name: framework.support, exact: true })).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await accessible(page);
  });
}
