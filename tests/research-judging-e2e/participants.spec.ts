import { expect, test } from "@playwright/test";
import { researchParticipantCopy } from "../../src/features/research-judging/participant-copy";
import { accessible, awardId, participantEntry, participantFixture, settings, title } from "./fixtures";
const origin = "http://127.0.0.1:3216";
for (const locale of ["en", "ar"] as const) {
  const copy = researchParticipantCopy[locale];
  test(`${locale} participant sees only published presentation and award outcomes`, async ({ page, context }, info) => {
    const f = await participantFixture(context, { entries: [participantEntry] }); await page.goto(`${origin}/${locale}/my-msrc/research`);
    await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible(); await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); await expect(page.getByText(copy.unpublished, { exact: true })).toBeVisible();
    await expect(page.getByTestId("research-published-award")).toHaveCount(0); await expect(page.getByLabel(copy.name, { exact: true })).toHaveCount(0); await expect(page.getByRole("heading", { name: title, exact: true })).toHaveAttribute("dir", "ltr");
    await f.replace({ entries: [{ ...participantEntry, presentationFormat: "poster", award: { categoryId: "synthetic", label: "Synthetic published award" } }] }); await page.reload();
    await expect(page.getByText(copy.poster, { exact: true })).toBeVisible(); await expect(page.getByTestId("research-published-award")).toContainText("Synthetic published award"); await expect(page.getByText(copy.unpublished, { exact: true })).toHaveCount(0); await expect(page.locator('input[type="file"]')).toHaveCount(0); await accessible(page); await page.screenshot({ path: info.outputPath(`${locale}-research-published-outcomes.png`), fullPage: true });
  });
  test(`${locale} winner privately confirms supervisor details before any award is published`, async ({ page, context }) => {
    const request = { awardId, deadline: settings.supervisorDeadline, evidence: settings.supervisorEvidence, details: null };
    const f = await participantFixture(context, { entries: [{ ...participantEntry, supervisorRequest: request }] }); await page.goto(`${origin}/${locale}/my-msrc/research`);
    await expect(page.getByRole("heading", { name: copy.supervisor, exact: true })).toBeVisible(); await expect(page.getByTestId("research-published-award")).toHaveCount(0);
    await page.getByLabel(copy.name, { exact: true }).fill("Synthetic Supervisor"); await page.getByLabel(copy.affiliation, { exact: true }).fill("Synthetic Institution"); await page.getByLabel(copy.email, { exact: true }).fill("synthetic-supervisor@example.invalid");
    await page.getByRole("button", { name: copy.submit, exact: true }).click(); expect(await f.actions()).toEqual([]);
    await page.getByRole("checkbox", { name: copy.confirmation, exact: true }).check(); await page.getByRole("button", { name: copy.submit, exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: copy.saved })).toBeVisible();
    const [saved] = await f.actions(); expect(saved.details).toEqual({ name: "Synthetic Supervisor", affiliation: "Synthetic Institution", email: "synthetic-supervisor@example.invalid", confirmed: true });
    await page.reload(); await expect(page.getByLabel(copy.email, { exact: true })).toHaveValue("synthetic-supervisor@example.invalid"); await expect(page.getByRole("checkbox", { name: copy.confirmation, exact: true })).toBeChecked(); await expect(page.getByTestId("research-published-award")).toHaveCount(0); await accessible(page);
  });
  test(`${locale} missing research migration retains participant session`, async ({ page, context }) => {
    await participantFixture(context, { missing: true }); const before = (await context.cookies()).find((row) => row.name === "msrc-participant-test")?.value;
    await page.goto(`${origin}/${locale}/my-msrc/research`); await expect(page.getByRole("status").filter({ hasText: copy.notReady })).toBeVisible(); expect((await context.cookies()).find((row) => row.name === "msrc-participant-test")?.value).toBe(before); await accessible(page);
  });
  test(`${locale} My MSRC embeds the published research outcomes`, async ({ page, context }) => {
    await participantFixture(context, { entries: [{ ...participantEntry, presentationFormat: "oral", award: { categoryId: "synthetic", label: "Synthetic published research award" } }] });
    await page.goto(`${origin}/${locale}/my-msrc`);
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await expect(page.getByTestId("research-participant")).toBeVisible();
    await expect(page.getByText(copy.oral, { exact: true })).toBeVisible();
    await expect(page.getByTestId("research-published-award")).toContainText("Synthetic published research award");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr"); await accessible(page);
  });
}
