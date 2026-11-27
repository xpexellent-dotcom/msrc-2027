import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "../helpers/csp";
import { openStaffNavigation } from "./helpers/navigation";
import { staffCopy } from "../../src/features/staff-portal/copy";
import { emailPreviewsCopy } from "../../src/features/staff-portal/email-previews-copy";
import type { StaffEmailPreview, StaffResponse } from "../../src/features/staff-portal/ui-contract";
import renderedPreviews from "./fixtures/email-previews.json" with { type: "json" };

/** Exact server-rendered samples, kept in sync by the renderer unit test; session responses are presentation fixtures. */
const previews = renderedPreviews as StaffEmailPreview[];

async function fixture(page: Page, options: { denied?: boolean; clipboardFails?: boolean; maliciousMarkup?: boolean } = {}) {
  const reads: string[] = [], mutations: string[] = [];
  const emails = options.maliciousMarkup ? previews.map((preview) => ({ ...preview, html: '<script>window.emailPreviewExecuted = true</script><img src="https://example.invalid/pixel">' })) : previews;
  await page.addInitScript(({ fails }) => {
    const browser = window as unknown as { copiedEmailTexts: string[] };
    browser.copiedEmailTexts = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => {
      if (fails) throw new DOMException("Synthetic permission refusal", "NotAllowedError");
      browser.copiedEmailTexts.push(value);
    } } });
  }, { fails: options.clipboardFails ?? false });
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), area = new URL(request.url()).searchParams.get("area") ?? "status";
    const base: StaffResponse = { state: "authenticated", formToken: "synthetic-preview-form", profile: {
      actorId: "57000000-0000-4000-8000-000000000001", name: "Synthetic Preview Staff",
      roles: options.denied ? ["registrationWorkshopAdministrator"] : ["superAdmin"],
    } };
    if (request.method() === "POST") mutations.push(request.postDataJSON().action);
    else reads.push(area);
    if (area === "email-previews") return route.fulfill(options.denied ? { status: 403, json: { state: "denied" } }
      : { json: { ...base, emailPreviews: emails } });
    return route.fulfill({ json: base });
  });
  return { reads, mutations };
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = emailPreviewsCopy[locale];
  test(`${locale} email previews show the current seal and bilingual drafts and copy exact plain text by keyboard`, async ({ page }, testInfo) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/staff/email-previews`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy[locale].areas["email-previews"]);
    const navigation = await openStaffNavigation(page, locale);
    await expect(navigation.getByRole("link", { name: staffCopy[locale].areas["email-previews"], exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByText(copy.draft, { exact: true })).toHaveCount(previews.length);
    const cards = page.getByTestId("email-preview");
    await expect(cards).toHaveCount(previews.length);
    for (let index = 0; index < previews.length; index++) {
      const card = cards.nth(index);
      await expect(card.getByTestId("email-preview-text")).toHaveAttribute("dir", "ltr");
      await expect(card.getByTestId("email-preview-text")).toHaveText(previews[index].text);
      const english = card.getByTestId("email-message-english"), arabic = card.getByTestId("email-message-arabic");
      await expect(english).toHaveAttribute("lang", "en"); await expect(english).toHaveAttribute("dir", "ltr");
      await expect(arabic).toHaveAttribute("lang", "ar"); await expect(arabic).toHaveAttribute("dir", "rtl");
      await expect(english.locator("p")).toHaveText(previews[index].englishText.split("\n\n"));
      await expect(arabic.locator("p")).toHaveText(previews[index].arabicText.split("\n\n"));
      const brand = card.locator(".staff-email-brand");
      const logo = brand.locator("img");
      await expect(brand).toHaveCSS("direction", "ltr");
      await expect(brand.getByText("MSRC’27", { exact: true })).toBeVisible();
      await expect(logo).toHaveAttribute("src", "/brand/identity/msrc27-seal-dark-192.png");
      await expect(logo).toHaveAttribute("alt", "");
      await logo.scrollIntoViewIfNeeded();
      await expect.poll(() => logo.evaluate((node) => {
        const image = node as HTMLImageElement;
        return { width: image.naturalWidth, height: image.naturalHeight };
      })).toEqual({ width: 192, height: 192 });
      await card.getByRole("button").focus(); await page.keyboard.press("Enter");
      await expect(card.getByRole("status")).toHaveText(copy.copied);
      await card.getByText(copy.html, { exact: true }).click();
      await expect(card.getByTestId("email-preview-html")).toHaveText(previews[index].html);
      await expect(card.locator("iframe, script")).toHaveCount(0);
      await expect(card.locator("img")).toHaveCount(1);
      await card.getByText(copy.html, { exact: true }).click();
    }
    expect(await page.evaluate(() => (window as unknown as { copiedEmailTexts: string[] }).copiedEmailTexts)).toEqual(previews.map((preview) => preview.text));
    expect(mock.mutations.filter((action) => action !== "activity")).toEqual([]);
    expect(mock.reads.every((area) => ["status", "email-previews"].includes(area))).toBe(true);
    await axe(page);
    await mkdir(".tools/bilingual-emails", { recursive: true });
    await cards.first().screenshot({ path: `.tools/bilingual-emails/email-previews-${locale}-${testInfo.project.name}.png` });
  });

  test(`${locale} clipboard refusal preserves readable text and HTML stays escaped`, async ({ page }) => {
    await fixture(page, { clipboardFails: true, maliciousMarkup: true });
    await page.goto(`/${locale}/staff/email-previews`);
    const card = page.getByTestId("email-preview").first();
    await card.getByRole("button").click();
    await expect(card.getByRole("status")).toHaveText(copy.copyFailed);
    await expect(card.getByTestId("email-preview-text")).toHaveText(previews[0].text);
    await card.getByText(copy.html, { exact: true }).click();
    await expect(card.getByTestId("email-preview-html")).toContainText("<script>");
    expect(await page.evaluate(() => "emailPreviewExecuted" in window)).toBe(false);
    await expect(card.locator("script, iframe")).toHaveCount(0);
    await expect(card.locator("img")).toHaveCount(1);
    await expect(card.locator('img[src="https://example.invalid/pixel"]')).toHaveCount(0);
    await axe(page);
  });

  test(`${locale} other staff see neither preview content nor its menu entry`, async ({ page }) => {
    await fixture(page, { denied: true });
    await page.goto(`/${locale}/staff/email-previews`);
    await expect(page.getByTestId("staff-name")).toBeVisible();
    const navigation = await openStaffNavigation(page, locale);
    await expect(navigation.getByRole("link", { name: staffCopy[locale].areas["email-previews"], exact: true })).toHaveCount(0);
    await expect(page.getByTestId("email-preview")).toHaveCount(0);
    await expect(page.getByText(copy.draft, { exact: true })).toHaveCount(0);
    await axe(page);
  });

  test(`${locale} narrow enlarged-text previews retain keyboard controls without page overflow`, async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "The mobile project covers the narrow layout.");
    await fixture(page); await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/${locale}/staff/email-previews`);
    await expect(page.getByTestId("email-preview")).toHaveCount(previews.length);
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const card = page.getByTestId("email-preview").first();
    const brand = card.locator(".staff-email-brand");
    const messageBounds = (await card.getByTestId("email-preview-message").boundingBox())!;
    const brandBounds = (await brand.boundingBox())!;
    expect(brandBounds.x).toBeGreaterThanOrEqual(messageBounds.x);
    expect(brandBounds.x + brandBounds.width).toBeLessThanOrEqual(messageBounds.x + messageBounds.width);
    for (const element of [brand.locator("img"), brand.getByText("MSRC’27", { exact: true })]) {
      const bounds = (await element.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(brandBounds.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(brandBounds.x + brandBounds.width);
    }
    await card.getByRole("button").focus(); await page.keyboard.press("Enter");
    await expect(card.getByRole("status")).toHaveText(copy.copied);
    await card.getByText(copy.html, { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await axe(page);
  });
}
