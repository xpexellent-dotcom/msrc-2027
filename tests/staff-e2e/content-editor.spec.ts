import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { expect, test, type Page } from "../helpers/csp";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { contentCopy } from "../../src/features/staff-portal/content-editor-copy";
import { mediaCopy } from "../../src/features/staff-portal/media-copy";
import { contentPublishIssue, emptyContentFields, type ContentCollection, type ContentFields, type ContentItem, type ContentPayload, type ContentRevision, type ContentState } from "../../src/features/staff-portal/content-contract";
import type { Role } from "../../src/lib/permissions/contract";

const actorId = "57000000-0000-4000-8000-000000000001", imageId = "57000000-0000-4000-8000-000000000002";
const makeId = (n: number) => `57000000-0000-4000-8000-${String(n + 10).padStart(12, "0")}`;
const now = "2026-10-23T09:00:00Z";
function synthetic(collection: ContentCollection, n: number, published = false): ContentItem {
  return { id: makeId(n), collection, version: 1, publishedVersion: published ? 1 : null, updatedAt: now, draft: { ...emptyContentFields(), nameEn: `Synthetic person ${n}`, nameAr: `شخص تجريبي ${n}`, titleEn: `Synthetic role ${n}`, titleAr: `دور تجريبي ${n}`, sortOrder: n } };
}

/** UI boundary fixture; real handler and database suites enforce authorization and persistence. */
async function fixture(page: Page, options: { items?: ContentItem[]; roles?: Role[]; missing?: boolean } = {}) {
  const roles = options.roles ?? ["contentMediaEditor"], items = structuredClone(options.items ?? []), actions: ContentPayload[] = [], reads: string[] = [], shellActions: string[] = [];
  const versions = new Map<string, ContentRevision[]>(), published = new Map<string, ContentFields>();
  for (const item of items) { versions.set(item.id, [{ version: 1, action: "save", fields: structuredClone(item.draft), createdAt: now }]); if (item.publishedVersion) published.set(item.id, structuredClone(item.draft)); }
  const image = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#593270" } }).png().toBuffer();
  let missing = !!options.missing, failure: ContentState | undefined, sequence = 0;
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url()), formToken = `synthetic-content-token-${++sequence}`;
    if (url.pathname === "/api/staff-portal/media") {
      if (url.searchParams.has("preview")) return route.fulfill({ contentType: "image/png", body: image });
      return route.fulfill({ json: { state: "ready", formToken, total: 1, assets: [{ editionYear: null, kind: "photograph", displayOrder: 0, videoPath: null, id: imageId, filename: "Synthetic approved image.webp", state: "published", mime: "image/webp", size: 1000, width: 640, height: 480, version: 1, altEn: "Synthetic approved image", altAr: "صورة تجريبية معتمدة", captionEn: "", captionAr: "", creditEn: "", creditAr: "", focalX: 50, focalY: 50, rightsConfirmed: true, rightsEvidence: "Synthetic rights record", previewUrl: `/api/staff-portal/media?preview=${imageId}`, publicUrl: `/media/synthetic-${imageId}.webp`, createdAt: now, updatedAt: now }] } });
    }
    if (url.pathname !== "/api/staff-portal/content") {
      if (request.method() === "POST") shellActions.push(request.postDataJSON().action);
      return route.fulfill({ json: { state: "authenticated", profile: { actorId, name: "Synthetic Content Editor", roles }, formToken } });
    }
    if (!roles.some((role) => role === "superAdmin" || role === "contentMediaEditor")) return route.fulfill({ status: 403, json: { state: "denied", formToken } });
    if (request.method() === "GET") {
      reads.push(url.search); if (missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken } });
      if (url.searchParams.has("itemId")) return route.fulfill({ json: { state: "ready", history: [...(versions.get(url.searchParams.get("itemId")!) ?? [])].reverse(), formToken } });
      return route.fulfill({ json: { state: "ready", items: items.filter((item) => item.collection === url.searchParams.get("collection")).sort((a, b) => a.draft.sortOrder - b.draft.sortOrder), formToken } });
    }
    const payload = request.postDataJSON() as ContentPayload; actions.push(payload);
    if (failure) return route.fulfill({ status: 409, json: { state: failure, formToken } });
    if (payload.action === "reorder") {
      if (payload.items.some((entry) => items.find((item) => item.id === entry.id)?.version !== entry.version)) return route.fulfill({ status: 409, json: { state: "conflict", formToken } });
      payload.items.forEach((entry, order) => { const item = items.find((item) => item.id === entry.id)!; item.draft.sortOrder = order; item.version += 1; versions.get(item.id)!.push({ version: item.version, action: "reorder", fields: structuredClone(item.draft), createdAt: now }); });
      return route.fulfill({ json: { state: "updated", items, formToken } });
    }
    let item = items.find((entry) => entry.id === payload.itemId);
    if (payload.action === "save" && !payload.itemId) { item = { id: makeId(items.length + 100), collection: payload.collection, version: 0, publishedVersion: null, draft: emptyContentFields(), updatedAt: now }; items.push(item); versions.set(item.id, []); }
    if (!item || item.version !== payload.version) return route.fulfill({ status: 409, json: { state: "conflict", formToken } });
    if (payload.action === "publish") {
      const issue = contentPublishIssue(item.collection, item.draft);
      if (issue) return route.fulfill({ status: 400, json: { state: issue, formToken } });
      item.publishedVersion = item.version + 1; published.set(item.id, structuredClone(item.draft));
    } else if (payload.action === "unpublish") { item.publishedVersion = null; published.delete(item.id); }
    else if (payload.action === "save") item.draft = structuredClone(payload.fields);
    else if (payload.action === "restore") item.draft = structuredClone(versions.get(item.id)!.find((version) => version.version === payload.restoreVersion)!.fields);
    item.version += 1; versions.get(item.id)!.push({ version: item.version, action: payload.action, fields: structuredClone(item.draft), createdAt: now });
    return route.fulfill({ json: { state: "updated", item, formToken } });
  });
  return { items, actions, reads, shellActions, published, fail: (state?: ContentState) => { failure = state; }, recover: () => { missing = false; failure = undefined; } };
}
async function axe(page: Page) { const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze(); expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]); }

for (const locale of ["en", "ar"] as const) {
  const copy = contentCopy[locale], media = mediaCopy[locale], staff = staffCopy[locale];
  test(`${locale} content draft, bilingual preview, picker, publication and restore`, async ({ page }, testInfo) => {
    const mock = await fixture(page, { roles: ["superAdmin"] }); await page.goto(`/${locale}/staff/content`);
    const editor = page.getByTestId("content-editor");
    await expect(editor.getByText(copy.empty, { exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await editor.getByRole("button", { name: copy.create, exact: true }).click();
    const details = editor.getByRole("region", { name: copy.details, exact: true });
    await details.getByLabel(copy.nameEn, { exact: true }).fill("Synthetic speaker");
    await details.getByLabel(copy.titleEn, { exact: true }).fill("Synthetic role");
    await expect(details.getByLabel(copy.nameAr, { exact: true })).toHaveAttribute("dir", "rtl");
    await expect(details.getByLabel(copy.nameEn, { exact: true })).toHaveAttribute("dir", "ltr");
    await details.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(editor.getByText(copy.saved, { exact: true })).toBeVisible();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeDisabled();
    await expect(details.getByText(copy.errors["translation-required"], { exact: true })).toBeVisible();
    await details.getByLabel(copy.nameAr, { exact: true }).fill("متحدث تجريبي");
    await details.getByLabel(copy.titleAr, { exact: true }).fill("دور تجريبي");
    await details.getByRole("button", { name: `${media.choose}: ${locale === "ar" ? "صورة تجريبية معتمدة" : "Synthetic approved image"}`, exact: true }).click();
    await expect(details.locator(".staff-content-preview img")).toHaveCount(2);
    await details.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeEnabled();
    expect(mock.items[0].draft.assetId).toBe(imageId); expect(mock.published.size).toBe(0);
    await axe(page);
    await page.screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-content-editor-draft.png`, fullPage: true });
    const before = mock.actions.length;
    await details.getByRole("button", { name: copy.publish, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: copy.confirmations.publish, exact: true });
    await expect(dialog).toBeVisible(); expect(mock.actions).toHaveLength(before);
    await expect.poll(() => dialog.evaluate((element) => { const bounds = element.getBoundingClientRect(); return Math.abs(bounds.x + bounds.width / 2 - window.innerWidth / 2) <= 2 && Math.abs(bounds.y + bounds.height / 2 - window.innerHeight / 2) <= 2; })).toBe(true);
    await axe(page);
    await page.screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-content-editor-confirmation.png` });
    await dialog.getByRole("button", { name: copy.cancel, exact: true }).click(); expect(mock.actions).toHaveLength(before);
    await details.getByRole("button", { name: copy.publish, exact: true }).click();
    await dialog.getByRole("button", { name: `${copy.confirm} ${copy.publish}`, exact: true }).click();
    await expect(editor.getByText(copy.publishedSuccess, { exact: true })).toBeVisible();
    expect(mock.actions.at(-1)).toMatchObject({ action: "publish", confirmed: true });
    await details.getByLabel(copy.nameEn, { exact: true }).fill("Synthetic revised speaker");
    await details.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(editor.getByText(copy.saved, { exact: true })).toBeVisible();
    expect(mock.published.get(mock.items[0].id)?.nameEn).toBe("Synthetic speaker");
    await details.getByRole("button", { name: copy.loadHistory, exact: true }).click();
    const history = details.getByRole("region", { name: copy.history, exact: true });
    await history.getByRole("button", { name: `${copy.restore} ${locale === "ar" ? "٢" : "2"}`, exact: true }).click();
    await expect(editor.getByText(copy.restored, { exact: true })).toBeVisible();
    await expect(details.getByLabel(copy.nameEn, { exact: true })).toHaveValue("Synthetic speaker");
    expect(mock.published.get(mock.items[0].id)?.nameEn).toBe("Synthetic speaker");
    await details.getByRole("button", { name: copy.unpublish, exact: true }).click();
    await page.getByRole("dialog", { name: copy.confirmations.unpublish, exact: true }).getByRole("button", { name: `${copy.confirm} ${copy.unpublish}`, exact: true }).click();
    await expect(editor.getByText(copy.unpublishedSuccess, { exact: true })).toBeVisible(); expect(mock.published.size).toBe(0);
    if (testInfo.project.name.includes("mobile")) { await page.setViewportSize({ width: 320, height: 740 }); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    await axe(page); await page.screenshot({ path: `test-results/staff-evidence/${testInfo.project.name}-${locale}-content-editor.png`, fullPage: true });
  });

  test(`${locale} ordering supports keyboard buttons and drag without publishing`, async ({ page }) => {
    const mock = await fixture(page, { items: [synthetic("speakers", 1, true), synthetic("speakers", 2, true)] }); await page.goto(`/${locale}/staff/content`);
    const editor = page.getByTestId("content-editor"), second = locale === "ar" ? "شخص تجريبي 2" : "Synthetic person 2";
    await editor.getByRole("button", { name: `${copy.up}: ${second}`, exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(editor.locator('.staff-feedback[role="status"]')).toContainText(copy.moved);
    await expect(editor.locator(".staff-content-list > li").first()).toHaveAttribute("data-content-id", makeId(2));
    await expect(editor.getByRole("button", { name: `${copy.down}: ${second}`, exact: true })).toBeEnabled();
    await editor.locator(`[data-content-id="${makeId(2)}"]`).dragTo(editor.locator(`[data-content-id="${makeId(1)}"]`));
    await expect(editor.locator(".staff-content-list > li").first()).toHaveAttribute("data-content-id", makeId(1));
    expect(mock.actions.map((action) => action.action)).toEqual(["reorder", "reorder"]);
    expect(mock.published.get(makeId(1))?.sortOrder).toBe(1); await axe(page);
  });

  test(`${locale} programme, partner permission and committee translations`, async ({ page }) => {
    const mock = await fixture(page, { items: [synthetic("speakers", 1, true)] }); await page.goto(`/${locale}/staff/content`);
    const editor = page.getByTestId("content-editor"), details = editor.getByRole("region", { name: copy.details, exact: true });
    await editor.getByLabel(copy.collection, { exact: true }).selectOption("sessions");
    await editor.getByRole("button", { name: copy.create, exact: true }).click();
    await details.getByLabel(copy.titleEn, { exact: true }).fill("Synthetic session"); await details.getByLabel(copy.titleAr, { exact: true }).fill("جلسة تجريبية");
    await details.getByLabel(copy.day, { exact: true }).fill("2027-01-27"); await details.getByLabel(copy.startTime, { exact: true }).fill("09:00"); await details.getByLabel(copy.endTime, { exact: true }).fill("10:00");
    await details.getByLabel(copy.type, { exact: true }).selectOption("talk");
    await details.getByRole("checkbox", { name: locale === "ar" ? "شخص تجريبي 1" : "Synthetic person 1", exact: true }).check();
    await details.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeEnabled();
    expect(mock.items.find((item) => item.collection === "sessions")?.draft).toMatchObject({ day: "2027-01-27", startTime: "09:00", endTime: "10:00", speakerIds: [makeId(1)] }); await axe(page);
    await details.getByRole("button", { name: copy.close, exact: true }).click();
    await editor.getByLabel(copy.collection, { exact: true }).selectOption("partners"); await editor.getByRole("button", { name: copy.create, exact: true }).click();
    await details.getByLabel(copy.nameEn, { exact: true }).fill("Synthetic partner"); await details.getByLabel(copy.nameAr, { exact: true }).fill("شريك تجريبي"); await details.getByLabel(copy.tier, { exact: true }).selectOption("partner");
    await details.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeDisabled(); await expect(details.getByText(copy.errors["permission-required"], { exact: true })).toBeVisible();
    await details.getByLabel(copy.permission, { exact: true }).check(); await details.getByRole("button", { name: copy.save, exact: true }).click(); await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeEnabled(); await axe(page);
    await details.getByRole("button", { name: copy.close, exact: true }).click(); await editor.getByLabel(copy.collection, { exact: true }).selectOption("team"); await editor.getByRole("button", { name: copy.create, exact: true }).click();
    for (const [field, value] of [[copy.nameEn, "Synthetic member"], [copy.nameAr, "عضو تجريبي"], [copy.titleEn, "Synthetic role"], [copy.titleAr, "دور تجريبي"], [copy.groupEn, "Synthetic committee"], [copy.groupAr, "لجنة تجريبية"]]) await details.getByLabel(field, { exact: true }).fill(value);
    await details.getByRole("button", { name: copy.save, exact: true }).click(); await expect(details.getByRole("button", { name: copy.publish, exact: true })).toBeEnabled(); await axe(page);
  });

  test(`${locale} stale draft and publication errors preserve the editor`, async ({ page }) => {
    const mock = await fixture(page, { items: [synthetic("speakers", 1)] }); await page.goto(`/${locale}/staff/content`);
    const editor = page.getByTestId("content-editor"), details = editor.getByRole("region", { name: copy.details, exact: true });
    await editor.getByRole("button", { name: `${copy.edit}: ${locale === "ar" ? "شخص تجريبي 1" : "Synthetic person 1"}`, exact: true }).click();
    await details.getByLabel(copy.nameEn, { exact: true }).fill("Unsaved synthetic correction"); mock.items[0].version += 1;
    await details.getByRole("button", { name: copy.save, exact: true }).click(); await expect(editor.getByText(copy.errors.conflict, { exact: true })).toBeVisible();
    await expect(details.getByLabel(copy.nameEn, { exact: true })).toHaveValue("Unsaved synthetic correction"); await expect(page.getByRole("button", { name: staff.signOut, exact: true })).toBeVisible(); await axe(page);
    await editor.getByRole("button", { name: copy.retry, exact: true }).click();
    await editor.getByRole("button", { name: `${copy.edit}: ${locale === "ar" ? "شخص تجريبي 1" : "Synthetic person 1"}`, exact: true }).click();
    mock.fail("media-required"); await details.getByRole("button", { name: copy.publish, exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: `${copy.confirm} ${copy.publish}`, exact: true }).click();
    await expect(editor.getByText(copy.errors["media-required"], { exact: true })).toBeVisible(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(mock.shellActions).not.toContain("logout"); await axe(page);
  });

  test(`${locale} missing content RPC keeps the staff shell signed in and recovers`, async ({ page }) => {
    const mock = await fixture(page, { missing: true }); await page.goto(`/${locale}/staff/content`); const editor = page.getByTestId("content-editor");
    await expect(editor.getByText(copy.errors["area-not-ready"], { exact: true })).toBeVisible(); await expect(editor.getByRole("button", { name: copy.create, exact: true })).toBeDisabled(); await expect(page.getByRole("button", { name: staff.signOut, exact: true })).toBeVisible(); await axe(page);
    mock.recover(); await editor.getByRole("button", { name: copy.retry, exact: true }).click(); await expect(editor.getByText(copy.empty, { exact: true })).toBeVisible(); expect(mock.shellActions).not.toContain("logout");
  });

  test(`${locale} unrelated staff never mount content tools`, async ({ page }) => {
    const mock = await fixture(page, { roles: ["registrationWorkshopAdministrator"] }); await page.goto(`/${locale}/staff/content`);
    await expect(page.getByText(staff.states.denied, { exact: true }).first()).toBeVisible(); await expect(page.getByTestId("content-editor")).toHaveCount(0); expect(mock.reads).toEqual([]); expect(mock.actions).toEqual([]); await axe(page);
  });
}
