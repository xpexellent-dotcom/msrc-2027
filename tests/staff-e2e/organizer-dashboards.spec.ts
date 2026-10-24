import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { BrowserContext } from "@playwright/test";
import { expect, test, type Page } from "../helpers/csp";
import { organizerCopy } from "../../src/features/staff-portal/organizer-copy";
import type { Role } from "../../src/lib/permissions/contract";

const origin = "http://127.0.0.1:3219", provider = "http://127.0.0.1:3220";
const participantId = "fd000000-0000-4000-8000-000000000001";
type RecordedRpc = { name: string; query?: string; module_filter?: string; export_kind?: string; status_filter?: string; actor_filter?: string; action_filter?: string; from_at?: string; to_at?: string };

/** Real app session/API/CSV coverage with an isolated loopback provider, never live Auth or SQL proof. */
async function fixture(context: BrowserContext, roles: Role[], options: { missing?: boolean; overReturn?: boolean; exportFailures?: number } = {}) {
  const suffix = randomBytes(6).toString("hex"), actorId = `fb000000-0000-4000-8000-${suffix}`, sessionId = `fc000000-0000-4000-8000-${suffix}`;
  const now = Date.now(), deadline = now + 8 * 3_600_000, superAdmin = roles.includes("superAdmin");
  const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: superAdmin ? "aal2" : "aal1", exp: Math.floor(now / 1000) + 3600,
    amr: [{ method: "password", timestamp: Math.floor(now / 1000) }, ...(superAdmin ? [{ method: "totp", timestamp: Math.floor(now / 1000) }] : [])] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("b".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-staff-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline, origin, challengeId: null, factorId: null, challengeExpiresAt: null }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-staff-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const dashboard = { suppressionThreshold: 5, modules: superAdmin || options.overReturn ? ["registrations", "accounts", "orders", "workshops"] : ["registrations", "workshops"], cells: [
    { module: "registrations", dimension: "status", value: "pending_approval", count: 8 },
    { module: "registrations", dimension: "status", value: "approved", count: superAdmin ? 12 : 2 },
    { module: "workshops", dimension: "status", value: "confirmed", count: 9 },
    ...(superAdmin || options.overReturn ? [{ module: "accounts", dimension: "status", value: "verified", count: 12 }, { module: "orders", dimension: "status", value: "mock_settled", count: 3 }] : []),
  ] };
  const response = await context.request.post(provider + "/__synthetic/organizer-fixture", { headers: { apikey: "sb_secret_staff_mock_only" }, data: { actorId, sessionId, roles, now, deadline, dashboard, missing: options.missing, exportFailures: options.exportFailures,
    matches: [{ actorId: participantId, name: "Synthetic مشارك", email: "synthetic@example.invalid", records: [{ module: "registrations", reference: "SYNTHETIC-REF", status: "approved" }] }],
    events: [{ id: "registrations:synthetic", module: "registrations", actorId, targetId: participantId, action: "request.approved", result: "approved", at: "2026-10-24T08:00:00.000Z", details: { previousStatus: "pending_approval", newStatus: "approved", reason: "Synthetic evidence" } }],
  } });
  expect(response.ok()).toBe(true);
  return { actorId, actions: async (): Promise<RecordedRpc[]> => (await (await context.request.post(provider + "/__synthetic/organizer-actions", { headers: { apikey: "sb_secret_staff_mock_only" }, data: { actorId } })).json()).actions };
}

async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
}

async function download(page: Page) {
  const file = page.waitForEvent("download"), response = page.waitForResponse((response) => response.url().endsWith("/api/staff-portal/organizer") && response.request().postDataJSON()?.action === "export");
  await page.getByTestId("organizer-export-download").click();
  const [artifact, receipt] = await Promise.all([file, response]);
  expect(receipt.status()).toBe(200); expect(receipt.headers()["cache-control"]).toContain("no-store"); expect(receipt.headers()["x-msrc-form-token"]).toBeTruthy();
  expect(receipt.headers()["content-type"]).toContain("text/csv"); expect(receipt.headers()["content-disposition"]).toContain("attachment;");
  const path = await artifact.path(); expect(path).toBeTruthy(); const bytes = await readFile(path!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); return bytes.toString("utf8");
}

for (const locale of ["en", "ar"] as const) {
  const copy = organizerCopy[locale];
  test(`${locale} scoped dashboard and statistics download use the real staff endpoint`, async ({ page, context }, info) => {
    const f = await fixture(context, ["superAdmin"]); await page.goto(`/${locale}/staff`);
    await expect(page.getByTestId("organizer-dashboard")).toBeVisible(); await expect(page.getByTestId("organizer-cell-registrations-status-pending_approval")).toContainText(locale === "ar" ? "٨" : "8");
    await expect(page.getByTestId("organizer-cell-accounts-status-verified")).toContainText(locale === "ar" ? "١٢" : "12"); await expect(page.getByText(copy.mock, { exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const csv = await download(page); expect(csv).toContain('"module","dimension","value","count"'); expect(csv).toContain('"registrations","status","pending_approval","8"');
    expect((await f.actions()).some((action) => action.name === "msrc_staff_dashboard_export" && action.export_kind === "aggregate")).toBe(true);
    await page.getByTestId("organizer-dashboard").getByRole("button", { name: copy.refresh, exact: true }).click();
    await expect.poll(async () => (await f.actions()).filter((action) => action.name === "msrc_staff_dashboard").length).toBe(2);
    expect(await download(page)).toContain('"registrations","status","pending_approval","8"');
    await accessible(page); await page.screenshot({ path: info.outputPath(`${locale}-organizer-dashboard.png`), fullPage: true });
  });

  test(`${locale} exact participant lookup and personal CSV preserve Arabic and neutralize formulas`, async ({ page, context }) => {
    const f = await fixture(context, ["superAdmin"]); await page.goto(`/${locale}/staff`);
    await page.getByTestId("organizer-find-query").fill("synthetic@example.invalid"); await page.getByTestId("organizer-find-submit").click();
    await expect(page.getByText("Synthetic مشارك", { exact: true })).toBeVisible(); await expect(page.getByText("SYNTHETIC-REF", { exact: true })).toBeVisible();
    expect((await f.actions()).find((action) => action.name === "msrc_staff_dashboard_find")?.query).toBe("synthetic@example.invalid");
    await page.getByTestId("organizer-find-query").fill("SYNTHETIC-REF"); await page.getByTestId("organizer-find-submit").click();
    await expect.poll(async () => (await f.actions()).filter((action) => action.name === "msrc_staff_dashboard_find").length).toBe(2);
    await page.getByTestId("organizer-export-module").selectOption("registrations"); await page.getByTestId("organizer-export-kind").selectOption("personal"); await page.getByTestId("organizer-export-status").fill("approved");
    const csv = await download(page); expect(csv).toContain('"\'=Synthetic مشارك"'); expect(csv).toContain("synthetic@example.invalid");
    expect((await f.actions()).find((action) => action.name === "msrc_staff_dashboard_export")).toMatchObject({ module_filter: "registrations", export_kind: "personal", status_filter: "approved" });
    await page.getByTestId("organizer-export-kind").selectOption("operational"); expect(await download(page)).toContain('"\'=Synthetic"');
    // A previously entered operational state cannot silently narrow final statistics.
    await page.getByTestId("organizer-export-kind").selectOption("aggregate"); await page.getByTestId("organizer-export-module").selectOption("all");
    await expect(page.getByTestId("organizer-export-status")).toBeDisabled(); await download(page);
    expect((await f.actions()).findLast((action) => action.name === "msrc_staff_dashboard_export")).toMatchObject({ module_filter: "all", export_kind: "aggregate", status_filter: "all" });
    await accessible(page);
  });

  test(`${locale} failed export shows feedback and an explicit new download succeeds`, async ({ page, context }) => {
    const f = await fixture(context, ["superAdmin"], { exportFailures: 1 }); await page.goto(`/${locale}/staff`);
    await expect(page.getByTestId("organizer-export-download")).toBeEnabled();
    const downloads: string[] = []; page.on("download", (artifact) => downloads.push(artifact.suggestedFilename()));
    const failed = page.waitForResponse((response) => response.url().endsWith("/api/staff-portal/organizer") && response.request().postDataJSON()?.action === "export");
    await page.getByTestId("organizer-export-download").click(); expect((await failed).status()).toBe(503);
    await expect(page.getByRole("alert")).toHaveText(copy.unavailable); await expect(page.getByTestId("organizer-export-download")).toBeEnabled(); expect(downloads).toEqual([]);
    await download(page); await expect(page.getByRole("alert")).toHaveCount(0); expect(downloads).toEqual(["msrc-all-aggregate.csv"]);
    expect((await f.actions()).filter((action) => action.name === "msrc_staff_dashboard_export")).toHaveLength(2); await accessible(page);
  });

  test(`${locale} operational role sees suppressed partitions and cannot request personal lookup, audit or export`, async ({ page, context }) => {
    const f = await fixture(context, ["registrationWorkshopAdministrator"], { overReturn: true }); await page.goto(`/${locale}/staff`);
    await expect(page.getByTestId("organizer-cell-registrations-status-pending_approval")).toContainText("—"); await expect(page.getByTestId("organizer-cell-registrations-status-approved")).toContainText("—");
    await expect(page.getByTestId("organizer-cell-workshops-status-confirmed")).toContainText(locale === "ar" ? "٩" : "9");
    await expect(page.getByTestId("organizer-cell-accounts-status-verified")).toHaveCount(0); await expect(page.getByTestId("organizer-find-query")).toHaveCount(0);
    await expect(page.getByTestId("organizer-export-kind").locator('option[value="personal"]')).toHaveCount(0); await expect(page.getByText(copy.suppression, { exact: true })).toBeVisible();
    const session = await context.request.get(origin + "/api/staff-portal"), token = (await session.json()).formToken;
    for (const data of [{ action: "find", query: "synthetic@example.invalid" }, { action: "audit" }, { action: "export", module: "registrations", kind: "personal" }]) {
      const response = await context.request.post(origin + "/api/staff-portal/organizer", { headers: { origin }, data: { ...data, formToken: token } }); expect(response.status()).toBe(403); expect(await response.json()).toMatchObject({ state: "denied" });
    }
    expect((await f.actions()).some((action) => ["msrc_staff_dashboard_find", "msrc_staff_dashboard_audit", "msrc_staff_dashboard_export"].includes(action.name))).toBe(false);
    await page.getByTestId("organizer-export-kind").selectOption("operational");
    const csv = await download(page); expect(csv).toContain('"\'=Synthetic"'); expect(csv).not.toContain("synthetic@example.invalid"); await accessible(page);
  });

  test(`${locale} Super Admin audit filters reach the unified read-only endpoint`, async ({ page, context }, info) => {
    const f = await fixture(context, ["superAdmin"]); await page.goto(`/${locale}/staff/audit`);
    await page.getByTestId("organizer-audit-module").selectOption("registrations"); await page.getByTestId("organizer-audit-actor").fill(f.actorId); await page.getByTestId("organizer-audit-event").fill("request.approved");
    await page.getByTestId("organizer-audit-from").fill("2026-10-23"); await page.getByTestId("organizer-audit-to").fill("2026-10-24"); await page.getByTestId("organizer-audit-filter").click();
    await expect.poll(async () => (await f.actions()).findLast((action) => action.name === "msrc_staff_dashboard_audit")?.action_filter).toBe("request.approved");
    expect((await f.actions()).findLast((action) => action.name === "msrc_staff_dashboard_audit")).toMatchObject({ module_filter: "registrations", actor_filter: f.actorId, from_at: "2026-10-22T21:00:00.000Z", to_at: "2026-10-24T21:00:00.000Z" });
    await expect(page.getByText(participantId, { exact: true })).toBeVisible(); await accessible(page); await page.screenshot({ path: info.outputPath(`${locale}-organizer-audit.png`), fullPage: true });
  });

  test(`${locale} missing organizer migration preserves the private staff session`, async ({ page, context }) => {
    await fixture(context, ["superAdmin"], { missing: true }); const before = (await context.cookies()).find((cookie) => cookie.name === "msrc-staff-test")?.value;
    await page.goto(`/${locale}/staff`); await expect(page.getByText(copy.missing, { exact: true })).toBeVisible(); expect((await context.cookies()).find((cookie) => cookie.name === "msrc-staff-test")?.value).toBe(before); await accessible(page);
  });
}
