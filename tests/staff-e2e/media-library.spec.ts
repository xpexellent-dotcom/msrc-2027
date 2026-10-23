import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { expect, test, type Page } from "../helpers/csp";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { mediaCopy } from "../../src/features/staff-portal/media-copy";
import type { Role } from "../../src/lib/permissions/contract";
import type { MediaAsset, MediaPayload, MediaResponseState } from "../../src/features/staff-portal/media-contract";

const actorId = "56000000-0000-4000-8000-000000000001";
const draftId = "56000000-0000-4000-8000-000000000002";
const syntheticImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#36234e"/><path d="M0 0h640v360H0zm640 360h640v360H640z" fill="#533772"/><circle cx="880" cy="310" r="150" fill="#cba85c"/><path d="M840 210h80v200h-80zM780 270h200v80H780z" fill="#36234e"/><path d="M80 590h440v28H80zm0 48h280v20H80z" fill="#e6d9f5"/></svg>`;
function asset(id: string, filename: string, state: MediaAsset["state"]): MediaAsset {
  return { id, filename, state, mime: "image/webp", size: 1280, width: 1280, height: 720, version: 1,
    altEn: state === "published" ? "Synthetic published image" : "", altAr: state === "published" ? "صورة تجريبية منشورة" : "",
    captionEn: "", captionAr: "", creditEn: "", creditAr: "", focalX: 50, focalY: 50,
    rightsConfirmed: state === "published", rightsEvidence: state === "published" ? "Synthetic permission record v1; approved website use; grant current." : "",
    previewUrl: `/api/staff-portal/media?preview=${id}`, publicUrl: state === "published" ? `/media/synthetic-${id}.webp` : null,
    createdAt: "2026-10-23T00:00:00Z", updatedAt: "2026-10-23T00:00:00Z" };
}

/** Browser presentation boundary only; handler and database suites prove authorization, bytes and persistence. */
async function fixture(page: Page, options: { roles?: Role[]; missing?: boolean; holdUpload?: boolean; duplicateUpload?: boolean } = {}) {
  const imageBytes = await sharp(Buffer.from(syntheticImage)).png().toBuffer();
  const roles = options.roles ?? ["contentMediaEditor"];
  const assets = [asset(draftId, "Synthetic draft.png", "draft"), asset("56000000-0000-4000-8000-000000000003", "Synthetic published.webp", "published"), asset("56000000-0000-4000-8000-000000000004", "Synthetic archive.jpg", "archived")];
  const actions: MediaPayload[] = [], reads: { q: string; state: string }[] = [], shellActions: string[] = [];
  const uploads: { bytes: Buffer | null; headers: Record<string, string> }[] = [];
  let missing = Boolean(options.missing), failure: MediaResponseState | undefined, storageFailure = false, sequence = 0, uploadedName = "";
  let releaseUpload = () => {};
  const uploadGate = options.holdUpload ? new Promise<void>((resolve) => { releaseUpload = resolve; }) : Promise.resolve();
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === "/api/staff-portal/media" && url.searchParams.has("preview")) return route.fulfill({ contentType: "image/png", body: imageBytes });
    if (url.pathname !== "/api/staff-portal/media") {
      if (request.method() === "POST") shellActions.push(request.postDataJSON().action);
      return route.fulfill({ json: { state: "authenticated", profile: { actorId, name: "Synthetic Media Editor", roles }, formToken: `synthetic-shell-${++sequence}` } });
    }
    const formToken = `synthetic-media-${++sequence}`;
    if (!roles.some((role) => role === "superAdmin" || role === "contentMediaEditor")) return route.fulfill({ status: 403, json: { state: "denied", formToken } });
    if (request.method() === "GET") {
      if (missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken } });
      const q = url.searchParams.get("q") ?? "", state = url.searchParams.get("state") ?? "all";
      reads.push({ q, state });
      const matches = assets.filter((entry) => (state === "all" || entry.state === state) && `${entry.filename} ${entry.altEn} ${entry.altAr}`.toLowerCase().includes(q.toLowerCase()));
      return route.fulfill({ json: { state: "ready", assets: matches, total: matches.length, formToken } });
    }
    const payload = request.postDataJSON() as MediaPayload; actions.push(payload);
    if (failure) return route.fulfill({ status: failure === "area-not-ready" || failure === "unavailable" ? 503 : 409, json: { state: failure, formToken } });
    if (payload.action === "upload-url") {
      uploadedName = payload.filename;
      return route.fulfill({ json: { state: "ready", uploadId: "56000000-0000-4000-8000-000000000010", path: "synthetic/image", signedUrl: "http://127.0.0.1:3220/storage/v1/object/upload/sign/msrc-media-drafts/synthetic/image?token=synthetic-upload-only", formToken } });
    }
    if (payload.action === "complete-upload") {
      if (options.duplicateUpload) return route.fulfill({ json: { state: "ready", asset: assets[1], duplicate: true, formToken } });
      const entry = asset(`56000000-0000-4000-8000-${String(assets.length + 20).padStart(12, "0")}`, uploadedName, "draft");
      assets.unshift(entry); return route.fulfill({ json: { state: "updated", asset: entry, formToken } });
    }
    const entry = assets.find((item) => item.id === payload.assetId)!;
    if (payload.version !== entry.version) return route.fulfill({ status: 409, json: { state: "conflict", formToken } });
    if (payload.action === "save") {
      for (const key of ["altEn", "altAr", "captionEn", "captionAr", "creditEn", "creditAr", "rightsEvidence"] as const) entry[key] = payload[key];
      entry.focalX = payload.focalX; entry.focalY = payload.focalY; entry.rightsConfirmed = payload.rightsConfirmed;
    } else {
      entry.state = payload.action === "publish" ? "published" : payload.action === "unpublish" ? "draft" : "archived";
      entry.publicUrl = entry.state === "published" ? `/media/synthetic-${entry.id}.webp` : null;
    }
    entry.version += 1;
    return route.fulfill({ json: { state: "updated", asset: entry, formToken } });
  });
  await page.route("**/storage/v1/object/upload/sign/msrc-media-drafts/**", async (route) => {
    const headers = { "access-control-allow-origin": "http://127.0.0.1:3219", "access-control-allow-methods": "PUT, OPTIONS", "access-control-allow-headers": "content-type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    uploads.push({ bytes: route.request().postDataBuffer(), headers: route.request().headers() });
    await uploadGate;
    return route.fulfill({ status: storageFailure ? 500 : 200, headers, json: storageFailure ? { error: "Synthetic storage failure" } : { Key: "synthetic/image" } });
  });
  return { actions, reads, assets, uploads, shellActions, imageBytes, releaseUpload, recover: () => { missing = false; failure = undefined; storageFailure = false; }, fail: (state?: MediaResponseState) => { failure = state; }, failStorage: () => { storageFailure = true; } };
}

async function axe(page: Page, locale: "en" | "ar") {
  await expect(page).toHaveTitle(`MSRC 2027 | ${staffCopy[locale].portal}`);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = mediaCopy[locale], staff = staffCopy[locale];
  test(`${locale} entering and leaving media installs the document-specific Storage policy`, async ({ page }) => {
    await fixture(page);
    const initial = await page.goto(`/${locale}/staff`);
    expect(initial!.headers()["content-security-policy"]).toContain("connect-src 'self';");
    const mediaDocument = page.waitForResponse((response) => response.request().resourceType() === "document" && new URL(response.url()).pathname === `/${locale}/staff/content`);
    await page.getByRole("navigation", { name: staff.menu }).getByRole("link", { name: staff.areas.content, exact: true }).click();
    expect((await mediaDocument).headers()["content-security-policy"]).toContain("connect-src 'self' http://127.0.0.1:3220;");
    await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    const staffDocument = page.waitForResponse((response) => response.request().resourceType() === "document" && new URL(response.url()).pathname === `/${locale}/staff`);
    await page.getByRole("navigation", { name: staff.menu }).locator(`a[href="/${locale}/staff"]`).click();
    expect((await staffDocument).headers()["content-security-policy"]).toContain("connect-src 'self';");
  });

  test(`${locale} media grid searches and filters with localized accessible narrow layouts`, async ({ page }, testInfo) => {
    const mock = await fixture(page);
    const response = await page.goto(`/${locale}/staff/content`);
    expect(response!.headers()["content-security-policy"]).toContain("connect-src 'self' http://127.0.0.1:3220;");
    await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true })).toBeVisible();
    await expect.poll(() => page.locator(".staff-media-grid img").evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth === 1280))).toBe(true);
    await expect(page.getByRole("navigation", { name: staff.menu }).getByRole("link", { name: staff.areas.content, exact: true })).toHaveAttribute("aria-current", "page");
    await axe(page, locale);
    await page.getByLabel(copy.filter, { exact: true }).selectOption("published");
    await expect(page.getByRole("button", { name: `${copy.open}: Synthetic published.webp`, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true })).toHaveCount(0);
    await page.getByLabel(copy.filter, { exact: true }).selectOption("all");
    await page.getByLabel(copy.search, { exact: true }).fill("no synthetic match");
    await page.getByRole("button", { name: copy.searchAction, exact: true }).click();
    await expect(page.getByText(copy.empty, { exact: true })).toBeVisible();
    expect(mock.reads).toContainEqual({ q: "no synthetic match", state: "all" });
    await axe(page, locale);
    await page.getByLabel(copy.search, { exact: true }).fill("");
    await page.getByRole("button", { name: copy.searchAction, exact: true }).click();
    await expect(page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true })).toBeVisible();
    if (testInfo.project.name.includes("mobile")) {
      await page.setViewportSize({ width: 320, height: 740 });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await axe(page, locale);
    }
    await page.screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-media-grid.png`, fullPage: true });
  });

  test(`${locale} click and drop uploads show progress and create only private drafts`, async ({ page }) => {
    const mock = await fixture(page, { holdUpload: true });
    await page.goto(`/${locale}/staff/content`);
    await page.locator("#media-upload").setInputFiles({ name: "Synthetic click.png", mimeType: "image/png", buffer: mock.imageBytes });
    await expect.poll(() => mock.uploads.length, { timeout: 15_000 }).toBe(1);
    await expect(page.getByRole("progressbar")).toBeVisible();
    expect(mock.actions.some((entry) => entry.action === "complete-upload")).toBe(false);
    expect(mock.uploads[0].headers.authorization).toBeUndefined();
    expect(mock.uploads[0].bytes).toEqual(mock.imageBytes);
    mock.releaseUpload();
    await expect(page.getByText(copy.uploaded, { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: copy.details, exact: true })).toBeVisible();
    expect(mock.assets[0]).toMatchObject({ filename: "Synthetic click.png", state: "draft", publicUrl: null });
    await axe(page, locale);
    const transfer = await page.evaluateHandle((bytes) => {
      const data = new DataTransfer(); data.items.add(new File([new Uint8Array(bytes)], "Synthetic drop.png", { type: "image/png" })); return data;
    }, [...mock.imageBytes]);
    await page.locator(".staff-media-drop").dispatchEvent("drop", { dataTransfer: transfer });
    await transfer.dispose();
    await expect.poll(() => mock.uploads.length, { timeout: 15_000 }).toBe(2);
    await expect.poll(() => mock.assets[0].filename).toBe("Synthetic drop.png");
    expect(mock.assets[0]).toMatchObject({ state: "draft", publicUrl: null });
    expect(mock.actions.filter((entry) => entry.action === "publish")).toHaveLength(0);
    expect(new Set(mock.actions.map((entry) => entry.formToken)).size).toBe(mock.actions.length);
  });

  test(`${locale} duplicate uploads preserve and accurately describe an existing published image`, async ({ page }) => {
    const mock = await fixture(page, { duplicateUpload: true });
    const before = structuredClone(mock.assets[1]);
    await page.goto(`/${locale}/staff/content`);
    await page.locator("#media-upload").setInputFiles({ name: "Synthetic duplicate.png", mimeType: "image/png", buffer: mock.imageBytes });
    await expect(page.getByText(copy.duplicate, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.uploaded, { exact: true })).toHaveCount(0);
    const details = page.getByRole("region", { name: copy.details, exact: true });
    await expect(details).toContainText(before.filename);
    await expect(details.getByRole("button", { name: copy.unpublish, exact: true })).toBeEnabled();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toHaveCount(0);
    expect(mock.assets).toHaveLength(3); expect(mock.assets[1]).toEqual(before);
    expect(mock.actions.filter((entry) => ["publish", "unpublish", "archive", "save"].includes(entry.action))).toHaveLength(0);
    await axe(page, locale);
  });

  test(`${locale} details require alt and rights, support keyboard focal selection and confirm every transition`, async ({ page }, testInfo) => {
    const mock = await fixture(page, { roles: ["superAdmin"] });
    await page.goto(`/${locale}/staff/content`);
    const open = page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true });
    await open.focus(); await page.keyboard.press("Enter");
    const details = page.getByRole("region", { name: copy.details, exact: true });
    await expect(details).toBeVisible();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeDisabled();
    await expect(details).toContainText(copy.publishBlocked);
    await page.getByLabel(copy.altEn, { exact: true }).fill("Synthetic image of a medical illustration");
    await page.getByLabel(copy.altAr, { exact: true }).fill("صورة تجريبية لرسم طبي");
    await page.getByLabel(copy.captionEn, { exact: true }).fill("Synthetic caption");
    await page.getByLabel(copy.captionAr, { exact: true }).fill("تعليق تجريبي");
    await page.getByLabel(copy.creditEn, { exact: true }).fill("Synthetic image credit");
    await page.getByLabel(copy.creditAr, { exact: true }).fill("مصدر الصورة التجريبية");
    await expect(page.getByLabel(copy.altEn, { exact: true })).toHaveAttribute("dir", "ltr");
    await expect(page.getByLabel(copy.altAr, { exact: true })).toHaveAttribute("dir", "rtl");
    const focal = page.getByRole("button", { name: copy.focalChoose, exact: true });
    await focal.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.getByText(copy.saved, { exact: true })).toBeVisible();
    expect(mock.assets[0].focalX).toBeGreaterThan(50); expect(mock.assets[0].focalY).toBeGreaterThan(50);
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeDisabled();
    await page.getByLabel(copy.rightsConfirmed, { exact: true }).check();
    await page.getByLabel(copy.rightsEvidence, { exact: true }).fill("Synthetic permission v1, approved website purpose, applicable subject permission granted, evidence SYNTHETIC-ONLY.");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeEnabled();
    await axe(page, locale);
    await page.screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-media-details.png`, fullPage: true });
    for (const action of ["publish", "unpublish", "archive"] as const) {
      const before = mock.actions.length;
      await details.getByRole("button", { name: copy[action], exact: true }).click();
      const confirmation = page.getByRole("group", { name: copy.confirmations[action], exact: true });
      await expect(confirmation).toBeVisible(); expect(mock.actions).toHaveLength(before);
      await confirmation.getByRole("button", { name: copy.cancel, exact: true }).click();
      await expect(confirmation).toHaveCount(0); expect(mock.actions).toHaveLength(before);
      await details.getByRole("button", { name: copy[action], exact: true }).click();
      await axe(page, locale);
      await confirmation.getByRole("button", { name: `${copy.confirm} ${copy[action]}`, exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => mock.actions.length).toBe(before + 1);
      expect(mock.actions.at(-1)).toMatchObject({ action, assetId: draftId, operationId: expect.any(String) });
      await expect(page.getByText(copy[action === "publish" ? "published" : action === "unpublish" ? "unpublished" : "archived"], { exact: true })).toBeVisible();
      expect(mock.assets[0].state).toBe(action === "publish" ? "published" : action === "unpublish" ? "draft" : "archived");
    }
    expect(mock.assets[0].publicUrl).toBeNull();
    await expect(page.getByLabel(copy.altEn, { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: copy.save, exact: true })).toBeDisabled();
    await axe(page, locale);
  });

  test(`${locale} missing media migration preserves the signed-in shell and recovers`, async ({ page }) => {
    const mock = await fixture(page, { missing: true });
    await page.goto(`/${locale}/staff/content`);
    await expect(page.getByText(copy.errors["area-not-ready"], { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: staff.signOut, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true })).toHaveCount(0);
    await axe(page, locale);
    mock.recover(); await page.getByRole("button", { name: copy.retry, exact: true }).click();
    await expect(page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true })).toBeVisible();
    expect(mock.shellActions).not.toContain("logout");
  });

  test(`${locale} stale saves require reload and failed uploads never complete a private draft`, async ({ page }) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/staff/content`);
    await page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true }).click();
    await page.getByLabel(copy.altEn, { exact: true }).fill("Unsaved synthetic detail");
    mock.assets[0].version += 1;
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.getByText(copy.errors.conflict, { exact: true })).toBeVisible();
    await expect(page.getByLabel(copy.altEn, { exact: true })).toHaveValue("Unsaved synthetic detail");
    await expect(page.getByRole("button", { name: staff.signOut, exact: true })).toBeVisible();
    expect(mock.assets[0].altEn).toBe("");
    await axe(page, locale);
    await page.getByRole("button", { name: copy.retry, exact: true }).click();
    await page.getByRole("button", { name: `${copy.open}: Synthetic draft.png`, exact: true }).click();
    await page.getByLabel(copy.altEn, { exact: true }).fill("Recovered synthetic detail after reviewing the current version");
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.getByText(copy.saved, { exact: true })).toBeVisible();
    mock.failStorage();
    await page.locator("#media-upload").setInputFiles({ name: "Synthetic failure.png", mimeType: "image/png", buffer: mock.imageBytes });
    await expect(page.getByText(copy.errors.unavailable, { exact: true })).toBeVisible();
    expect(mock.actions.filter((entry) => entry.action === "complete-upload")).toHaveLength(0);
    expect(mock.assets).toHaveLength(3); expect(mock.shellActions).not.toContain("logout");
    await axe(page, locale);
  });

  test(`${locale} unrelated staff cannot open the media tools or their navigation`, async ({ page }) => {
    const mock = await fixture(page, { roles: ["registrationWorkshopAdministrator"] });
    await page.goto(`/${locale}/staff/content`);
    await expect(page.getByText(staff.states.denied, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: staff.menu }).getByRole("link", { name: staff.areas.content, exact: true })).toHaveCount(0);
    await expect(page.locator("#media-upload")).toHaveCount(0);
    expect(mock.actions).toHaveLength(0); expect(mock.reads).toHaveLength(0);
    await axe(page, locale);
  });
}
