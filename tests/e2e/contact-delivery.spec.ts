import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
import { ContactBrowserDiagnostics } from "../helpers/contact-browser-diagnostics";
import { waitForContactOfflineReady } from "../helpers/contact-offline-readiness";

// BL-PUB-06: real Next route, local fake Resend/RPCs, synthetic visitors only.
// The harness rejects managed provider/project endpoints and stores no content.
const backend = "http://127.0.0.1:3214";
const closedOrigin = "http://127.0.0.1:3213";
const copy = {
  en: {
    send: "Send message", sent: "Thanks, we’ll reply by email.", invalid: "Please check your message",
    unavailable: "We couldn’t send your message", unconfirmed: "Delivery isn’t confirmed",
    limited: "Please wait before trying again", retry: "Try again", start: "Start a new attempt",
    closed: "The form is not open yet", duplicate: "Starting a new attempt could send it twice.",
    another: "Send another message",
    expired: "The form has expired", tooFast: "Please wait a moment",
  },
  ar: {
    send: "إرسال الرسالة", sent: "شكرًا، سنرد عليك عبر البريد الإلكتروني.", invalid: "يرجى مراجعة رسالتك",
    unavailable: "تعذّر إرسال رسالتك", unconfirmed: "لم يتأكد إرسال الرسالة",
    limited: "يرجى الانتظار قبل المحاولة مجددًا", retry: "حاول مجددًا", start: "ابدأ محاولة جديدة",
    closed: "النموذج غير متاح حاليًا", duplicate: "قد يؤدي بدء محاولة جديدة إلى إرسالها مرتين.",
    another: "أرسل رسالة أخرى",
    expired: "انتهت صلاحية النموذج", tooFast: "يرجى الانتظار قليلًا",
  },
} as const;
type Locale = keyof typeof copy;

const browserFailures = new WeakMap<Page, ContactBrowserDiagnostics>();
test.beforeEach(async ({ page }, testInfo) => {
  const expectedFailure = /native and server errors|server validation focuses|stalled|offline submission|unexpected server|expired-token response|too-fast response|provider-failure|provider-timeout|database failure|shared rate limits|Fast repeated clicks/.test(testInfo.title);
  const audit = new ContactBrowserDiagnostics(["http://127.0.0.1:3212", closedOrigin], expectedFailure);
  browserFailures.set(page, audit);
  page.on("pageerror", (error) => audit.applicationFailure(error.message));
  page.on("crash", () => audit.applicationFailure("Contact page crashed"));
  page.on("close", () => audit.applicationFailure("Contact page closed unexpectedly"));
  page.on("response", (response) => { if (response.status() >= 400) audit.networkFailure(response.url(), `HTTP ${response.status()}`); });
  page.on("requestfailed", (request) => audit.networkFailure(request.url(), request.failure()?.errorText ?? "Request failed", { method: request.method(), headers: request.headers() }));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) audit.consoleMessage(message.text(), message.location().url);
  });
});
test.afterEach(async ({ page }, testInfo) => {
  const result = browserFailures.get(page)?.snapshot();
  if (result?.expectedContactFailures.length || result?.expectedPrefetchCancellations.length || result?.expectedOfflinePrefetchFailures.length || result?.expectedBrowserDiagnostics.length) {
    await testInfo.attach("expected-contact-network-failures", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  }
  expect(result?.failures ?? []).toEqual([]);
});

async function control(request: APIRequestContext, mode = "success", globalCount = 0) {
  const response = await request.post(`${backend}/__control`, { data: { reset: true, mode, globalCount } });
  expect(response.ok()).toBe(true);
}

async function counts(request: APIRequestContext) {
  const response = await request.get(`${backend}/__state`);
  expect(response.ok()).toBe(true);
  return await response.json() as { sendCount: number; reservationCount: number; lastEnvelopeContainsHtml: boolean };
}

async function fill(page: Page, locale: Locale) {
  await page.locator("#contact-topic").selectOption("abstracts");
  await page.locator("#contact-name").fill(locale === "en" ? "Synthetic Visitor" : "زائر تجريبي");
  await page.locator("#contact-email").fill("synthetic.contact@example.invalid");
  await page.locator("#contact-reference").fill("TEST-ONLY");
  await page.locator("#contact-message").fill(locale === "en"
    ? "Question about conference information\n<script>This is plain synthetic text.</script>"
    : "استفسار تجريبي عن المؤتمر\n<script>هذه بيانات اختبار فقط.</script>");
}

async function send(page: Page, locale: Locale) {
  // Match the configured defensive minimum, without weakening production guards.
  await page.waitForTimeout(3_100);
  const response = page.waitForResponse((response) => response.url().endsWith("/api/contact") && response.request().method() === "POST");
  await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
  return await response;
}

async function assertReadable(page: Page) {
  const widths = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  const clipped = await page.locator("main h1, main h2:not(.sr-only), main h3, .contact-email-link").evaluateAll((elements) => elements.some((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
  }));
  expect(clipped).toBe(false);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} disabled delivery retains the closed form without accepting information`, async ({ page, request }) => {
    await control(request);
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    await page.goto(`${closedOrigin}/${locale}/contact`);
    await expect(page.locator(".contact-form fieldset")).toHaveAttribute("disabled", "");
    await expect(page.locator("#contact-name")).toBeDisabled();
    await expect(page.locator(".contact-form button")).toBeDisabled();
    await expect(page.locator("#contact-form-closed")).toContainText(copy[locale].closed);
    await expect(page.getByRole("main").getByRole("link", { name: "contact@msrc2027.com", exact: true })).toHaveAttribute("href", "mailto:contact@msrc2027.com");
    const response = await request.post(`${closedOrigin}/api/contact`, { data: "not parsed", headers: { "Content-Type": "application/json" } });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ state: "closed", code: "CONTACT_CLOSED" });
    expect((await counts(request)).sendCount).toBe(0);
    expect(writes).toEqual([]);
  });

  test(`${locale} enabled form is accessible, bilingual and readable at enlarged text sizes`, async ({ page, request }, testInfo) => {
    await control(request);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/contact`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".contact-form fieldset")).not.toHaveAttribute("disabled", "");
    await expect(page.locator("#contact-name")).toBeEnabled();
    await expect(page.locator("#contact-email")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#contact-form-closed")).toHaveCount(0);
    await expect(page.locator("[data-contact-test-only]")).toContainText(locale === "en" ? "No real email is sent." : "لا تُرسل رسائل بريد إلكتروني حقيقية.");
    await expect(page.locator("#contact-website")).toBeHidden();
    await expect(page.locator('iframe, [src*="recaptcha"], [src*="hcaptcha"], [src*="turnstile"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    await testInfo.attach(`${locale}-contact-delivery-accessibility`, {
      body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2), contentType: "application/json",
    });
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    await assertReadable(page);
    await testInfo.attach(`${locale}-contact-enabled-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    for (const width of [791, 320]) {
      await page.setViewportSize({ width, height: 850 });
      await assertReadable(page);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await assertReadable(page);
    expect((await counts(request)).sendCount).toBe(0);
  });

  test(`${locale} keyboard submission sends once, clears on success and leaves no browser storage`, async ({ page, request }) => {
    await control(request);
    const writes: string[] = [];
    page.on("request", (request) => { if (request.method() === "POST") writes.push(request.url()); });
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await page.waitForTimeout(3_100);
    await page.getByRole("button", { name: copy[locale].send, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
    for (const name of ["topic", "name", "email", "relatedReference", "message"]) await expect(page.locator(`.contact-form [name="${name}"]`)).toHaveValue("");
    await expect(page.locator(".contact-form fieldset")).toHaveAttribute("disabled", "");
    await expect(page.locator("#contact-name")).toBeDisabled();
    expect((await counts(request)).sendCount).toBe(1);
    expect((await counts(request)).lastEnvelopeContainsHtml).toBe(false);
    expect(writes).toEqual(["http://127.0.0.1:3212/api/contact"]);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
    expect(await page.context().cookies()).toEqual([]);
    await page.getByRole("button", { name: copy[locale].another, exact: true }).click();
    await expect(page.locator(".contact-form fieldset")).not.toHaveAttribute("disabled", "");
    await expect(page.locator("#contact-name")).toBeEnabled();
    expect((await counts(request)).sendCount).toBe(1);
  });

  test(`${locale} native and server errors preserve details and allow a corrected submission`, async ({ page, request }) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
    await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].invalid);
    await expect(page.locator("#contact-topic")).toBeFocused();
    expect((await counts(request)).sendCount).toBe(0);
    await fill(page, locale);
    await page.locator("#contact-name").fill("Synthetic \u202eVisitor");
    const invalid = await send(page, locale);
    expect(invalid.status()).toBe(400);
    await expect(page.locator("#contact-name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#contact-name")).toHaveAttribute("aria-describedby", /contact-name-error/);
    await expect(page.locator("#contact-name")).toBeFocused();
    await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
    await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
    expect((await counts(request)).sendCount).toBe(0);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    await page.locator("#contact-name").fill("Corrected Synthetic Visitor");
    await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
    expect((await counts(request)).sendCount).toBe(1);
  });

  test(`${locale} validation uses the page language without browser-language popovers`, async ({ page, request }, testInfo) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await expect(page.locator("#contact-name")).toBeEnabled();
    await expect(page.locator("#contact-name")).toHaveAttribute("autocomplete", "name");
    await expect(page.locator("#contact-email")).toHaveAttribute("type", "email");
    await expect(page.locator("#contact-email")).toHaveAttribute("autocomplete", "email");
    await page.evaluate(() => {
      const invalidEvents: { prevented: boolean }[] = [];
      (window as unknown as { contactInvalidEvents: typeof invalidEvents }).contactInvalidEvents = invalidEvents;
      document.querySelector(".contact-form")?.addEventListener("invalid", (event) => {
        queueMicrotask(() => invalidEvents.push({ prevented: event.defaultPrevented }));
      }, true);
    });
    await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
    await expect(page.locator("#contact-topic")).toBeFocused();
    await expect(page.locator("#contact-topic-error")).toHaveText(locale === "en" ? "!Please complete this field." : "!يرجى إكمال هذا الحقل.");
    const events = await page.evaluate(() => (window as unknown as { contactInvalidEvents: { prevented: boolean }[] }).contactInvalidEvents);
    expect(events).toHaveLength(4);
    expect(events.every((event) => event.prevented)).toBe(true);
    await fill(page, locale);
    await page.locator("#contact-email").fill("invalid-address");
    await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
    await expect(page.locator("#contact-email")).toBeFocused();
    await expect(page.locator("#contact-email-error")).toHaveText(locale === "en" ? "!Please check this field." : "!يرجى مراجعة هذا الحقل.");
    expect((await counts(request)).sendCount).toBe(0);
    await testInfo.attach(`${locale}-localized-validation-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });

  test(`${locale} server validation focuses each error after controls are re-enabled`, async ({ page, request }, testInfo) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await page.evaluate(() => {
      const focus = HTMLInputElement.prototype.focus;
      const attempts: { name: string; disabled: boolean }[] = [];
      (window as unknown as { contactErrorFocus: typeof attempts }).contactErrorFocus = attempts;
      HTMLInputElement.prototype.focus = function (options) {
        attempts.push({ name: this.name, disabled: this.matches(":disabled") });
        focus.call(this, options);
      };
    });
    let field: "name" | "email" = "name";
    let release!: () => void;
    let held = Promise.resolve();
    let attempts = 0;
    await page.route("**/api/contact", async (route) => {
      attempts += 1;
      const invalidField = field;
      await held;
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid", fieldErrors: { [invalidField]: "invalid" } }) });
    });
    for (field of ["name", "email"] as const) {
      held = new Promise<void>((resolve) => { release = resolve; });
      await page.evaluate(() => { (window as unknown as { contactErrorFocus: unknown[] }).contactErrorFocus.length = 0; });
      try {
        const button = page.getByRole("button", { name: copy[locale].send, exact: true });
        if (testInfo.project.use.hasTouch) await button.tap();
        else await button.click();
        await expect(page.locator(`#contact-${field}`)).toBeDisabled();
      } finally { release(); }
      await expect(page.locator(`#contact-${field}`)).toBeEnabled();
      await expect(page.locator(`#contact-${field}`)).toBeFocused();
      expect(await page.evaluate(() => (window as unknown as { contactErrorFocus: { name: string; disabled: boolean }[] }).contactErrorFocus))
        .toEqual([{ name: field, disabled: false }]);
      await page.locator(`#contact-${field}`).fill(field === "name" ? "Corrected Synthetic Visitor" : "corrected@example.invalid");
    }
    expect(attempts).toBe(2);
    expect((await counts(request)).sendCount).toBe(0);
  });

  test(`${locale} stalled submission recovers after a deadline without claiming failure or retrying`, async ({ page, request }) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await page.clock.install();
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let attempts = 0;
    await page.route("**/api/contact", async (route) => {
      attempts += 1;
      await held;
      await route.abort();
    });
    try {
      await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
      await expect(page.locator("[data-contact-status]")).toHaveAttribute("data-contact-status", "sending");
      await page.clock.fastForward(30_001);
      await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].unconfirmed);
      await expect(page.locator(".contact-duplicate-warning")).toContainText(copy[locale].duplicate);
      await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
      await expect(page.getByRole("button", { name: copy[locale].start, exact: true })).toBeEnabled();
      await page.clock.fastForward(60_000);
      expect(attempts).toBe(1);
      expect((await counts(request)).sendCount).toBe(0);
    } finally { release(); }
  });

  test(`${locale} stalled token refresh preserves the draft and offers another explicit retry`, async ({ page, request }) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await page.route("**/api/contact", (route) => route.fulfill({
      status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid", code: "CONTACT_INVALID_TOKEN" }),
    }), { times: 1 });
    await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
    await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].expired);
    await page.clock.install();
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let attempts = 0;
    await page.route("**/api/contact?locale=*", async (route) => { attempts += 1; await held; await route.abort(); });
    try {
      await page.getByRole("button", { name: copy[locale].start, exact: true }).click();
      await expect(page.locator("[data-contact-status]")).toHaveAttribute("data-contact-status", "preparing");
      await page.clock.fastForward(30_001);
      await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].unavailable);
      await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
      await expect(page.getByRole("button", { name: copy[locale].retry, exact: true })).toBeEnabled();
      expect(attempts).toBe(1);
      expect((await counts(request)).sendCount).toBe(0);
    } finally { release(); }
  });

  test(`${locale} offline submission preserves the draft and never resends on reconnection`, async ({ page, request }) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await waitForContactOfflineReady(page, page.getByRole("button", { name: copy[locale].send, exact: true }));
    const audit = browserFailures.get(page);
    if (!audit) throw new Error("Missing Contact browser evidence collector");
    audit.setForcedOffline(true);
    try {
      await page.context().setOffline(true);
      // Force a genuine Next-style prefetch during the offline window instead
      // of relying on whether background links happen to prefetch in this run.
      const probeUrl = new URL(`/${locale}/program?_rsc=contact-offline-probe`, page.url()).href;
      const failedPrefetch = page.waitForEvent("requestfailed", { predicate: (request) => request.url() === probeUrl });
      expect(await page.evaluate(async (url) => {
        try { await fetch(url, { headers: { rsc: "1", "next-router-prefetch": "1" } }); return false; }
        catch { return true; }
      }, probeUrl)).toBe(true);
      await failedPrefetch;
      expect(audit.snapshot().expectedOfflinePrefetchFailures).toEqual(expect.arrayContaining([{ url: probeUrl, reason: expect.any(String) }]));
      await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
      await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].unconfirmed);
      await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
      await page.getByRole("button", { name: copy[locale].start, exact: true }).click();
      await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].unconfirmed);
    } finally {
      try { await page.context().setOffline(false); }
      finally { audit.setForcedOffline(false); }
    }
    expect((await counts(request)).sendCount).toBe(0);
    await expect(page.locator(".contact-duplicate-warning")).toContainText(copy[locale].duplicate);
    await page.getByRole("button", { name: copy[locale].start, exact: true }).click();
    await expect(page.locator("#contact-name")).toBeEnabled();
    await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
    expect((await counts(request)).sendCount).toBe(0);
  });

  for (const failure of [
    { label: "HTTP 500", status: 500, body: "<html><body>Private server error details</body></html>", contentType: "text/html", expected: "unconfirmed" },
    { label: "HTTP 503", status: 503, body: JSON.stringify({ state: "closed", code: "CONTACT_CLOSED" }), contentType: "application/json", expected: "unavailable" },
    { label: "malformed JSON", status: 200, body: "{ invalid json", contentType: "application/json", expected: "unconfirmed" },
    { label: "HTTP 429", status: 429, body: JSON.stringify({ state: "limited", code: "CONTACT_LIMITED", retryAfter: 1 }), contentType: "application/json", expected: "limited" },
  ] as const) {
    test(`${locale} unexpected server ${failure.label} response stays localized and recoverable`, async ({ page, request }) => {
      await control(request);
      await page.goto(`/${locale}/contact`);
      await fill(page, locale);
      await page.route("**/api/contact", (route) => route.fulfill({ status: failure.status, contentType: failure.contentType, body: failure.body }), { times: 1 });
      await page.getByRole("button", { name: copy[locale].send, exact: true }).click();
      await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale][failure.expected]);
      await expect(page.locator(".contact-form")).not.toContainText(/Private server error|invalid json|CONTACT_/);
      await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
      expect((await counts(request)).sendCount).toBe(0);
    });
  }

  test(`${locale} slow response survives rapid submits and rotation without a second send`, async ({ page, request }, testInfo) => {
    await control(request);
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let attempts = 0;
    await page.route("**/api/contact", async (route) => {
      attempts += 1;
      await held;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "sent", code: "CONTACT_SENT" }) });
    }, { times: 1 });
    try {
      const button = page.getByRole("button", { name: copy[locale].send, exact: true });
      if (testInfo.project.use.hasTouch) await button.tap();
      else await button.click();
      await page.locator(".contact-form").evaluate((form) => {
        (form as HTMLFormElement).requestSubmit();
        (form as HTMLFormElement).requestSubmit();
      });
      await expect(page.locator("#contact-name")).toBeDisabled();
      await page.setViewportSize({ width: 844, height: 390 });
      await page.setViewportSize({ width: 390, height: 844 });
      await assertReadable(page);
      expect(attempts).toBe(1);
      await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
    } finally { release(); }
    await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
    expect(attempts).toBe(1);
    expect((await counts(request)).sendCount).toBe(0);
  });

  test(`${locale} expired-token response preserves text and prepares a fresh attempt without sending`, async ({ page, request }) => {
    await control(request);
    // This focused UI fixture represents the cryptographically expired response;
    // the genuine signature/expiry boundary has independent server unit coverage.
    await page.route("**/api/contact", (route) => route.fulfill({
      status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid", code: "CONTACT_INVALID_TOKEN" }),
    }), { times: 1 });
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await send(page, locale);
    await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].expired);
    await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
    await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
    expect((await counts(request)).sendCount).toBe(0);
    await page.getByRole("button", { name: copy[locale].start, exact: true }).click();
    await expect(page.getByRole("button", { name: copy[locale].send, exact: true })).toBeVisible();
    await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
    expect((await counts(request)).sendCount).toBe(0);
    await send(page, locale);
    await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
    expect((await counts(request)).sendCount).toBe(1);
  });

  test(`${locale} too-fast response keeps the current token and waits for an explicit retry`, async ({ page, request }) => {
    await control(request);
    let originalToken = "";
    await page.route("**/api/contact", async (route) => {
      originalToken = route.request().postDataJSON().token;
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ state: "invalid", code: "CONTACT_TOO_FAST", retryAfter: 3 }) });
    }, { times: 1 });
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await send(page, locale);
    await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].tooFast);
    const sendButton = page.getByRole("button", { name: copy[locale].send, exact: true });
    await expect(sendButton).toBeDisabled();
    await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
    expect((await counts(request)).sendCount).toBe(0);
    await expect(sendButton).toBeEnabled({ timeout: 10_000 });
    expect((await counts(request)).sendCount).toBe(0);
    const retried = page.waitForResponse((response) => response.url().endsWith("/api/contact") && response.request().method() === "POST");
    await sendButton.click();
    expect((await retried).request().postDataJSON().token).toBe(originalToken);
    await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
    expect((await counts(request)).sendCount).toBe(1);
  });

  for (const mode of ["provider-failure", "provider-timeout"]) {
    test(`${locale} ${mode} preserves details, warns about duplicates and never retries automatically`, async ({ page, request }) => {
      await control(request, mode);
      await page.goto(`/${locale}/contact`);
      await fill(page, locale);
      await send(page, locale);
      await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].unconfirmed);
      await expect(page.locator(".contact-duplicate-warning")).toContainText(copy[locale].duplicate);
      await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
      await expect(page.locator(".contact-form fieldset")).toHaveAttribute("disabled", "");
      await expect(page.locator("#contact-name")).toBeDisabled();
      const first = await counts(request);
      expect(first.sendCount).toBe(1);
      await page.waitForTimeout(1_000);
      expect((await counts(request)).sendCount).toBe(1);
      await control(request);
      await page.getByRole("button", { name: copy[locale].start, exact: true }).click();
      await expect(page.locator(".contact-form fieldset")).not.toHaveAttribute("disabled", "");
      await expect(page.locator("#contact-name")).toBeEnabled();
      await expect(page.locator(".contact-duplicate-warning")).toBeVisible();
      expect((await counts(request)).sendCount).toBe(0);
      await send(page, locale);
      await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
      expect((await counts(request)).sendCount).toBe(1);
    });
  }

  test(`${locale} database failure keeps values and fails closed before provider access`, async ({ page, request }) => {
    await control(request, "database-failure");
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    await send(page, locale);
    await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].unavailable);
    await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
    await expect(page.locator("#contact-reference")).toHaveValue("TEST-ONLY");
    expect((await counts(request)).sendCount).toBe(0);
    await control(request);
    await page.getByRole("button", { name: copy[locale].retry, exact: true }).click();
    await expect(page.getByRole("button", { name: copy[locale].send, exact: true })).toBeVisible();
    expect((await counts(request)).sendCount).toBe(0);
    await send(page, locale);
    await expect(page.getByRole("status")).toHaveText(copy[locale].sent);
  });

  test(`${locale} shared rate limits preserve the form and deny provider delivery`, async ({ page, request }) => {
    await control(request, "success", 60);
    await page.goto(`/${locale}/contact`);
    await fill(page, locale);
    const response = await send(page, locale);
    expect(response.status()).toBe(429);
    await expect(page.locator(".contact-delivery-error")).toContainText(copy[locale].limited);
    await expect(page.locator("#contact-email")).toHaveValue("synthetic.contact@example.invalid");
    await expect(page.locator(".contact-form button")).toBeDisabled();
    expect((await counts(request)).sendCount).toBe(0);
  });
}

test("Fast repeated clicks and direct token replay cannot send a second email", async ({ page, request }) => {
  await control(request);
  await page.goto("/en/contact");
  await fill(page, "en");
  await page.waitForTimeout(3_100);
  const submissionResponse = page.waitForResponse((response) => response.url().endsWith("/api/contact") && response.request().method() === "POST");
  await page.getByRole("button", { name: copy.en.send, exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  const first = await submissionResponse;
  await expect(page.getByRole("status")).toHaveText(copy.en.sent);
  const payload = first.request().postDataJSON();
  const replay = await page.evaluate(async (body) => {
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, payload);
  expect(replay.status).toBe(429);
  expect(replay.body).toMatchObject({ state: "limited", code: "CONTACT_ATTEMPT_USED" });
  expect((await counts(request)).sendCount).toBe(1);
});

test("Enabled delivery without JavaScript offers email and never submits form values", async ({ browser, request }) => {
  await control(request);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    for (const locale of ["en", "ar"] as const) {
      await page.goto(`http://127.0.0.1:3212/${locale}/contact`);
      await expect(page.locator(".contact-form fieldset")).toHaveAttribute("disabled", "");
      await expect(page.locator("#contact-name")).toBeDisabled();
      await expect(page.locator(".contact-form button")).toBeDisabled();
      await expect(page.locator("[data-contact-no-script]")).toBeVisible();
      await expect(page.locator("[data-contact-no-script]")).toContainText(locale === "en" ? "Please enable JavaScript" : "يرجى تفعيل JavaScript");
      await expect(page.getByRole("main").getByRole("link", { name: "contact@msrc2027.com", exact: true })).toHaveAttribute("href", "mailto:contact@msrc2027.com");
    }
    expect(writes).toEqual([]);
    expect((await counts(request)).sendCount).toBe(0);
  } finally { await context.close(); }
});
