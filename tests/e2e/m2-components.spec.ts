import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openShowcase(page: Page, locale: "en" | "ar") {
  await page.goto(`/${locale}/design-system`);
  // A loading boundary can leave server-rendered controls in a hidden stream
  // container. Focus and setInputFiles do not perform visibility auto-waits.
  await expect(page.locator(".design-system-intro h1")).toBeVisible();
}

test("unlocalized design-system alias redirects to the English gated preview without caching or indexing", async ({ page }) => {
  const response = await page.goto("/design-system");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/en\/design-system$/);
  const aliasResponse = await response?.request().redirectedFrom()?.response();
  expect(aliasResponse?.status()).toBe(307);
  expect(aliasResponse?.headers()["cache-control"]).toBe("private, no-store");
  expect(aliasResponse?.headers()["x-robots-tag"].split(/,\s*/)).toEqual(expect.arrayContaining(["noindex", "nofollow"]));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

// M2 / LOC-01/02 / ACC-01. Synthetic controls never submit or persist data.
for (const locale of ["en", "ar"] as const) {
  const ar = locale === "ar";
  const text = (en: string, arabic: string) => ar ? arabic : en;

  test(`${locale} form controls expose labels, guidance and native keyboard selection`, async ({ page }) => {
    await openShowcase(page, locale);
    await expect(page.locator("html")).toHaveAttribute("dir", ar ? "rtl" : "ltr");
    const input = page.locator("#m2-default");
    await expect(input).toHaveAccessibleName(text("Default field", "حقل افتراضي"));
    await expect(input).toHaveAccessibleDescription(text("Try keyboard focus with synthetic text.", "جرّب التركيز بلوحة المفاتيح بنص تجريبي."));
    await input.focus();
    await page.keyboard.type("Synthetic example");
    await expect(input).toHaveValue("Synthetic example");
    await page.keyboard.press("Tab");
    await expect(page.locator("#m2-required")).toBeFocused();
    await expect(page.locator("#m2-required")).toHaveAttribute("required", "");

    const invalid = page.locator("#m2-invalid");
    await expect(invalid).toHaveAttribute("aria-invalid", "true");
    await expect(invalid).toHaveAttribute("aria-describedby", "m2-invalid-error");
    await expect(invalid).toHaveAccessibleDescription(text("Example error: review this value.", "خطأ تجريبي: راجع هذه القيمة."));
    await expect(page.locator("#m2-disabled")).toBeDisabled();
    await expect(page.locator("#m2-loading")).toBeDisabled();
    await expect(page.locator("#m2-loading")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#m2-valid")).toHaveAttribute("readonly", "");
    const scientific = page.locator("#m2-science");
    await expect(scientific).toHaveAttribute("dir", "ltr");
    await expect(scientific).toHaveAttribute("lang", "en");
    await expect(scientific).toHaveValue("Synthetic scientific title");
    await expect(scientific).toHaveAccessibleName(text("Scientific text (English)", "نص علمي (بالإنجليزية)"));

    const select = page.locator("#m2-select");
    await expect(select).toHaveAccessibleName(text("Select example", "قائمة اختيار تجريبية"));
    await select.selectOption("two");
    await expect(select).toHaveValue("two");
    await expect(page.locator("#m2-select-invalid")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#m2-select-disabled")).toBeDisabled();

    const checkbox = page.locator("#m2-checkbox");
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
    await page.keyboard.press("Space");
    await expect(checkbox).not.toBeChecked();
    await expect(page.locator("#m2-checkbox-disabled")).toBeDisabled();
    await page.locator("#m2-radio-one").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#m2-radio-two")).toBeChecked();
    await expect(page.locator("#m2-radio-two")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#m2-radio-one")).toBeChecked();
    await expect(page.locator("#m2-radio-disabled")).toBeDisabled();
  });

  test(`${locale} synthetic file selection clears and restores focus without a write request`, async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
    });
    await openShowcase(page, locale);
    const file = page.locator("#m2-file");
    await file.setInputFiles({ name: "synthetic-example.txt", mimeType: "text/plain", buffer: Buffer.from("Synthetic test only") });
    await expect(page.locator(".file-selection").filter({ hasText: "synthetic-example.txt" })).toBeVisible();
    expect(await file.evaluate((element: HTMLInputElement) => element.files?.length)).toBe(1);
    const clear = page.getByRole("button", { name: text("Clear selection", "مسح الاختيار"), exact: true });
    await clear.focus();
    await page.keyboard.press("Enter");
    await expect(file).toBeFocused();
    await expect(clear).toHaveCount(0);
    expect(await file.evaluate((element: HTMLInputElement) => element.files?.length)).toBe(0);
    await expect(page.locator("#m2-file-disabled")).toBeDisabled();
    expect(writes).toEqual([]);
  });

  test(`${locale} table pagination changes synthetic rows and enforces disabled boundaries`, async ({ page }) => {
    await openShowcase(page, locale);
    const table = page.getByRole("table", { name: text("Synthetic table example", "مثال جدول تجريبي"), exact: true });
    const pages = page.getByRole("navigation", { name: text("Example pages", "صفحات المثال"), exact: true });
    const previous = pages.getByRole("button", { name: text("Previous", "السابق"), exact: true });
    const next = pages.getByRole("button", { name: text("Next", "التالي"), exact: true });
    await expect(previous).toBeDisabled();
    await expect(table.getByRole("rowheader")).toHaveText([text("Example 1", "مثال 1"), text("Example 2", "مثال 2")]);
    await expect(pages.getByRole("button", { name: text("Page 1", "صفحة 1"), exact: true })).toHaveAttribute("aria-current", "page");
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(table.getByRole("rowheader")).toHaveText([text("Example 3", "مثال 3")]);
    await expect(next).toBeDisabled();
    await expect(pages.getByRole("button", { name: text("Page 2", "صفحة 2"), exact: true })).toHaveAttribute("aria-current", "page");
    await previous.click();
    await expect(previous).toBeDisabled();
    await expect(table.getByRole("rowheader")).toHaveCount(2);
    const unavailable = page.getByRole("navigation", { name: text("Unavailable pagination", "تنقل صفحات غير متاح"), exact: true });
    for (const button of await unavailable.getByRole("button").all()) await expect(button).toBeDisabled();
    await expect(page.getByRole("table", { name: text("Loading table", "جدول قيد التحميل"), exact: true })).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("table", { name: text("Empty table", "جدول فارغ"), exact: true })).toContainText(text("No synthetic rows to show.", "لا توجد صفوف تجريبية للعرض."));
  });

  test(`${locale} dialog contains keyboard focus and Escape restores the opener`, async ({ page }, testInfo) => {
    await openShowcase(page, locale);
    const opener = page.getByRole("button", { name: text("Open dialog example", "فتح مثال الحوار"), exact: true });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: text("Synthetic dialog", "حوار تجريبي"), exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(text("A keyboard and focus demonstration. No action changes data.", "عرض للوحة المفاتيح والتركيز. لا يغيّر أي إجراء البيانات."));
    const close = dialog.getByRole("button", { name: text("Close dialog", "إغلاق الحوار"), exact: true });
    const finish = dialog.getByRole("button", { name: text("Finish example", "إنهاء المثال"), exact: true });
    await expect(close).toBeFocused();
    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page })
      .include("dialog[open]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await testInfo.attach(`${locale}-open-dialog-accessibility-${testInfo.project.name}`, {
      body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach(`${locale}-open-dialog-${testInfo.project.name}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    await dialog.evaluate((element) => {
      // Exercise the focus boundary with real hidden/disabled elements after the final action.
      const disabled = document.createElement("button");
      disabled.disabled = true;
      disabled.textContent = "Synthetic disabled action";
      const hidden = document.createElement("button");
      hidden.hidden = true;
      hidden.textContent = "Synthetic hidden action";
      element.append(disabled, hidden);
    });
    await page.keyboard.press("Tab");
    await expect(finish).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(finish).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog.click({ position: { x: 4, y: 4 } });
    await expect(dialog).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  });

  test(`${locale} toast reports synthetic feedback and manual dismissal restores focus`, async ({ page }) => {
    await openShowcase(page, locale);
    const trigger = page.locator("#m2-toast-trigger");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const toast = page.locator(".feedback-toast");
    await expect(toast.getByRole("status")).toContainText(text("Example notification", "إشعار تجريبي"));
    await expect(toast).toContainText(text("Nothing was saved or sent. This message stays until you dismiss it.", "لم يُحفظ أو يُرسل أي شيء. تبقى هذه الرسالة حتى تغلقها."));
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Tab");
    const dismiss = toast.getByRole("button", { name: text("Dismiss notification", "إغلاق الإشعار"), exact: true });
    await expect(dismiss).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toast).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test(`${locale} explicit anchor clicks move focus and respect reduced motion without changing native scroll behavior`, async ({ page }) => {
    await page.addInitScript(() => {
      const originalScrollIntoView = Element.prototype.scrollIntoView;
      const calls: { behavior: ScrollBehavior | undefined; block: ScrollLogicalPosition | undefined }[] = [];
      Object.defineProperty(window, "__m2AnchorScrollCalls", { value: calls });
      Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
        if (this.id === "design-data") {
          calls.push({
            behavior: typeof options === "object" ? options.behavior : undefined,
            block: typeof options === "object" ? options.block : undefined,
          });
        }
        return originalScrollIntoView.call(this, options);
      };
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openShowcase(page, locale);
    const anchor = page.getByRole("link", { name: text("Jump to table examples", "انتقل إلى أمثلة الجداول"), exact: true });
    const destination = page.locator("#design-data");
    for (const preference of ["no-preference", "reduce"] as const) {
      await page.emulateMedia({ reducedMotion: preference });
      await anchor.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/design-system#design-data$`));
      await expect(destination).toBeFocused();
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    }
    const calls = await page.evaluate(() => (window as unknown as {
      __m2AnchorScrollCalls: { behavior: ScrollBehavior; block: ScrollLogicalPosition }[];
    }).__m2AnchorScrollCalls);
    expect(calls).toEqual([
      { behavior: "smooth", block: "start" },
      { behavior: "instant", block: "start" },
    ]);
  });

  test(`${locale} 320px preview retains focus, touch targets and reduced-motion behavior`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openShowcase(page, locale);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const input = page.locator("#m2-default");
    await input.focus();
    await expect(input).toBeFocused();
    const outline = await input.evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect(outline.style).toBe("solid");
    for (const selector of ["#m2-default", "#m2-select", 'label[for="m2-checkbox"]', 'label[for="m2-radio-one"]', "#m2-file", "#m2-toast-trigger"]) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds, selector).not.toBeNull();
      expect(bounds!.height, `${selector} height`).toBeGreaterThanOrEqual(44);
      expect(bounds!.width, `${selector} width`).toBeGreaterThanOrEqual(44);
    }
    const trigger = page.locator("#m2-toast-trigger");
    await trigger.hover();
    await expect(trigger).toHaveCSS("transform", "none");
    await expect(trigger).toHaveCSS("transition-duration", "0s");
    await page.locator(".reveal").scrollIntoViewIfNeeded();
    await expect(page.locator(".reveal")).toHaveCSS("animation-name", "none");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    const region = page.getByRole("region", { name: text("Synthetic table example", "مثال جدول تجريبي"), exact: true });
    await region.focus();
    await expect(region).toBeFocused();
    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}
