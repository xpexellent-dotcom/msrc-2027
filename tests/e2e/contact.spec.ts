import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// BL-PUB-06 / SUP-01–03 / LOC-01 / ACC-01: the form renders, but delivery
// remains closed. Mapping and server validation have independent unit coverage.
const copy = {
  en: {
    title: "Contact | MSRC 2027",
    heading: "Contact the team.",
    footer: "Contact",
    breadcrumb: "Breadcrumb",
    home: "Home",
    closed: "The form is not open yet",
    privacy: "We receive no information from this form.",
    send: "Send message",
    topics: ["General", "Registration", "Research & abstracts", "Workshops", "Hackathon", "3MT", "Sponsors & partners", "Website & account support", "Privacy & data requests"],
  },
  ar: {
    title: "تواصل معنا | MSRC 2027",
    heading: "تواصل مع فريق المؤتمر.",
    footer: "التواصل",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    closed: "النموذج غير متاح حاليًا",
    privacy: "لا نتلقى أي معلومات من هذا النموذج.",
    send: "إرسال الرسالة",
    topics: ["استفسارات عامة", "التسجيل", "البحوث والملخصات", "ورش العمل", "الهاكاثون", "مسابقة الأطروحة في ثلاث دقائق (3MT)", "الرعاة والشركاء", "دعم الموقع والحساب", "الخصوصية وطلبات البيانات"],
  },
} as const;

const fieldNames = ["topic", "name", "email", "relatedReference", "message"];
const topicIds = ["general", "registration", "abstracts", "workshops", "hackathon", "3mt", "sponsors", "support", "privacy"];

for (const locale of ["en", "ar"] as const) {
  test(`${locale} Contact shows the ordered topics and receives no form data`, async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    const response = await page.goto(`/${locale}/contact`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(copy[locale].title);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[locale].heading);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.msrc2027.com/${locale}/contact`);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://www.msrc2027.com/en/contact");
    await expect(page.locator('link[hreflang="ar"]')).toHaveAttribute("href", "https://www.msrc2027.com/ar/contact");

    const form = page.locator(".contact-form");
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute("aria-describedby", "contact-form-closed");
    // Playwright's disabled matcher applies to controls; fieldset uses the native attribute.
    await expect(form.locator("fieldset")).toHaveAttribute("disabled");
    await expect(form.locator("#contact-form-closed")).toContainText(copy[locale].closed);
    await expect(form.locator("#contact-form-closed")).toContainText(copy[locale].privacy);
    expect(await form.locator('[name]:not([name="website"])').evaluateAll((fields) => fields.map((field) => field.getAttribute("name"))))
      .toEqual(fieldNames);
    for (const name of fieldNames) {
      await expect(form.locator(`[name="${name}"]`)).toBeDisabled();
      await expect(form.locator(`[name="${name}"]`)).toHaveValue("");
    }
    await expect(form.locator('[name="relatedReference"]')).not.toHaveAttribute("required");
    for (const name of ["topic", "name", "email", "message"]) {
      await expect(form.locator(`[name="${name}"]`)).toHaveAttribute("required");
    }
    await expect(form.locator('[name="email"]')).toHaveAttribute("type", "email");
    await expect(form.locator('[name="email"]')).toHaveAttribute("dir", "ltr");
    expect(await form.locator("select option").evaluateAll((options) => options.slice(1).map((option) => ({
      value: (option as HTMLOptionElement).value,
      label: option.textContent,
    })))).toEqual(topicIds.map((value, index) => ({ value, label: copy[locale].topics[index] })));
    await expect(form.locator('[name="website"]')).toBeHidden();
    await expect(form.locator('[name="website"]')).toBeDisabled();
    await expect(form.locator('[name="website"]')).toHaveAttribute("tabindex", "-1");
    const send = form.getByRole("button", { name: copy[locale].send, exact: true });
    await expect(send).toBeDisabled();
    await expect(send).toHaveAttribute("type", "button");
    expect(await form.evaluate((element) => Array.from(new FormData(element as HTMLFormElement).entries()))).toEqual([]);

    const email = page.getByRole("main").getByRole("link", { name: "contact@msrc2027.com", exact: true });
    await expect(email).toHaveAttribute("href", "mailto:contact@msrc2027.com");
    await expect(email).toHaveAttribute("dir", "ltr");
    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await form.evaluate((element) => element.contains(document.activeElement))).toBe(false);
    await expect(page.locator('iframe, [src*="recaptcha"], [src*="hcaptcha"], [src*="turnstile"]')).toHaveCount(0);
    expect(writes).toEqual([]);
    expect(response?.headers()["set-cookie"]).toBeUndefined();
    if (locale === "en") expect((await page.request.get("/fr/contact")).status()).toBe(404);
  });

  test(`${locale} Contact is accessible, responsive and reachable through the footer`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const footerLink = page.getByRole("contentinfo").getByRole("link", { name: copy[locale].footer, exact: true });
    await expect(footerLink).toHaveAttribute("href", `/${locale}/contact`);
    await footerLink.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/contact$`));
    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await testInfo.attach(`${locale}-contact-accessibility`, {
      body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2),
      contentType: "application/json",
    });
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    const assertReadable = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
      const clipped = await page.locator("main h1, main h2:not(.sr-only), main h3, .contact-email-link").evaluateAll((elements) => elements.some((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
      }));
      expect(clipped).toBe(false);
    };
    await assertReadable();
    await testInfo.attach(`${locale}-contact-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true }), contentType: "image/png",
    });
    if (testInfo.project.name === "chromium-mobile") {
      await page.setViewportSize({ width: 320, height: 850 });
      await assertReadable();
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await assertReadable();
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.getByRole("navigation", { name: copy[locale].breadcrumb })
      .getByRole("link", { name: copy[locale].home, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
  });

  test(`${locale} registration stays closed and clearly shows the photography notice`, async ({ page }) => {
    const notice = locale === "en"
      ? { heading: "Photography and recording", body: "The conference will be photographed and recorded.", closed: "Registration is not open yet" }
      : { heading: "التصوير والتسجيل", body: "سيُصوَّر المؤتمر وتُسجَّل فعالياته.", closed: "لم يُفتح التسجيل بعد" };
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    const response = await page.goto(`/${locale}/registration`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByTestId("journey-closed")).toContainText(notice.closed);
    const photography = page.locator(".journey-guidelines-list article").filter({
      has: page.getByRole("heading", { level: 3, name: notice.heading, exact: true }),
    });
    await expect(photography).toHaveCount(1);
    await expect(photography.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(photography.locator("p")).toHaveText(notice.body);
    await expect(page.locator("main form, main input, main textarea, main select, main button[type=submit]")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(writes).toEqual([]);
  });
}

test("Contact keyboard and language navigation preserve the page and section", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/contact?view=preview");
  await page.keyboard.press("Tab");
  await expect(page.locator('a[href="#main-content"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.goto("/en/contact?view=preview#contact-form");
  await page.getByRole("link", { name: "View this page in Arabic" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ar\/contact\?view=preview#contact-form$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#contact-form")).toBeInViewport();
  await page.getByRole("link", { name: "View this page in English" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/contact\?view=preview#contact-form$/);
  await expect(page.locator("#contact-form")).toBeInViewport();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});

test("Contact stays closed without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    for (const locale of ["en", "ar"] as const) {
      await page.goto(`http://127.0.0.1:3210/${locale}/contact`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[locale].heading);
      await expect(page.locator(".contact-form fieldset")).toHaveAttribute("disabled");
      await expect(page.locator(".contact-form button")).toBeDisabled();
      await expect(page.getByRole("main").getByRole("link", { name: "contact@msrc2027.com", exact: true }))
        .toHaveAttribute("href", "mailto:contact@msrc2027.com");
    }
    expect(writes).toEqual([]);
  } finally {
    await context.close();
  }
});

test("Direct Contact POST is closed before parsing any submitted data", async ({ request }) => {
  for (const payload of [
    { data: { topic: "privacy", name: "Synthetic Visitor", email: "visitor@example.invalid", relatedReference: "TEST-ONLY", message: "Synthetic test message", website: "" } },
    { data: "malformed", headers: { "content-type": "application/json" } },
  ]) {
    const response = await request.post("/api/contact", payload);
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["set-cookie"]).toBeUndefined();
    const body = await response.json();
    expect(body).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
    expect(JSON.stringify(body)).not.toMatch(/Synthetic Visitor|visitor@example|TEST-ONLY|Synthetic test message/);
  }
});
