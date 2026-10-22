import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "../helpers/csp";
import { prepareRegistrationCapture, registrationSession, type Fixture } from "../helpers/registration";
import { myRegistrationCopy } from "../../src/features/registration/my-registration-copy";
import { registrationCopy } from "../../src/features/registration/registration-copy";

const phase = process.env.JOURNEY_REVIEW_PHASE === "before" ? "before" : "after";
const before = phase === "before";

async function capture(page: Page, info: TestInfo, locale: string, state: string) {
  const directory = `.tools/journey-review/registration/${phase}/${info.project.name}-${locale}`;
  await mkdir(directory, { recursive: true });
  await prepareRegistrationCapture(page);
  await page.screenshot({ path: `${directory}/${state}.png`, fullPage: true, scale: "css" });
}

async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
  const copy = myRegistrationCopy[locale], formCopy = registrationCopy[locale];
  const submitLabel = before ? locale === "ar" ? "احجز مقعدك" : "Reserve your seat" : formCopy.submit;
  const fixtures: { name: string; fixture: Fixture }[] = [
    ...(["pending_approval", "waitlisted", "offered", "approved", "confirmed", "cancelled", "expired", "missing-rpc"] as const).map((state) => ({ name: state, fixture: { state } })),
    { name: "attendance", fixture: { state: "approved", attendance: [{ conferenceDay: "2027-01-27", checkedInAt: "2027-01-27T06:30:00Z" }, { conferenceDay: "2027-01-28", checkedInAt: null }] } },
    ...([
      { name: "scheduled", state: "scheduled", eligible: false },
      { name: "early-eligible", state: "early_access", eligible: true },
      { name: "early-ineligible", state: "early_access", eligible: false },
      { name: "open-few-places", state: "open", eligible: true },
      { name: "closed", state: "closed", eligible: false },
    ] as const).map((window) => ({ name: window.name, fixture: { state: "not-requested" as const, fewPlaces: window.state === "open",
      window: { state: window.state, eligible: window.eligible, opensAt: ["scheduled", "early_access"].includes(window.state) ? "2030-11-18T17:00:00Z" : null } } })),
  ];
  for (const { name, fixture } of fixtures) test(`${locale} ${name} at normal and 200 percent text`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, fixture);
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("registration-status")).not.toHaveText(copy.checking);
    await capture(page, info, locale, name);
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    await capture(page, info, locale, `${name}-200-text`);
    const geometry = { state: name, ...(await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }))) };
    if (!before) {
      await accessible(page);
      if (fixture.window?.state === "early_access") {
        await expect(page.getByTestId("registration-window")).toContainText(copy.generalOpening);
        await expect(page.getByTestId("registration-window")).toContainText(copy.earlyAccess);
      }
      if (fixture.fewPlaces) await expect(page.getByTestId("few-places-left")).toHaveText(copy.fewPlaces);
      if (fixture.attendance) await expect(page.getByTestId("attendance-2027-01-27")).toContainText(locale === "ar" ? "وقت التسجيل (توقيت الرياض)" : "Recorded at (Riyadh time)");
      for (const time of await page.getByTestId("my-registration").locator("time").all()) await expect(time.locator('bdi[dir="ltr"]')).toHaveCount(1);
    }
    const directory = `.tools/journey-review/registration/${phase}/${info.project.name}-${locale}`;
    await writeFile(`${directory}/${name}-geometry.json`, JSON.stringify(geometry, null, 2));
  });

  test(`${locale} identity recovery, pending request and keyboard focus are clear`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, { state: "not-requested" });
    await page.goto(`/${locale}/registration`);
    const form = page.getByTestId("registration-request"), document = page.locator("#registration-document-number");
    await document.fill("123");
    await page.locator("#registration-terms").check();
    const submit = form.getByRole("button", { name: submitLabel, exact: true });
    await submit.click();
    await expect(form.getByRole("alert")).toContainText(formCopy.invalid);
    await capture(page, info, locale, "identity-invalid");
    if (!before) {
      await expect(document).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator("#registration-document-number-hint")).toContainText(formCopy.nationalNumberHint);
      await expect(document).toHaveAttribute("inputmode", "numeric");
      await expect(form.getByRole("alert")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("#registration-document-type")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(document).toBeFocused();
      expect(await document.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
      for (const link of await form.locator("a").all()) expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await accessible(page);
    }
    await page.locator("#registration-document-type").selectOption("passport");
    if (!before) {
      await expect(page.locator("#registration-document-number-hint")).toContainText(formCopy.passportNumberHint);
      await expect(document).toHaveAttribute("inputmode", "text");
    }
    await document.fill("FAKE0001");
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let releaseStatus!: () => void;
    const statusHeld = new Promise<void>((resolve) => { releaseStatus = resolve; });
    await page.route("**/api/registration/me?locale=*", async (route) => { await statusHeld; await route.continue(); });
    let posts = 0;
    await page.route("**/api/workflows/registration", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts++; await held; await route.continue();
    });
    try {
      await submit.click();
      await expect(form.getByRole("button", { name: formCopy.sending, exact: true })).toBeDisabled();
      await expect(document).toBeDisabled();
      await capture(page, info, locale, "request-sending");
      await page.keyboard.press("Enter");
      expect(posts).toBe(1);
      release();
      await expect(form).toContainText(formCopy.confirmation);
      await capture(page, info, locale, "request-submitted-status-loading");
      if (!before) {
        await expect(form.getByRole("link", { name: copy.title, exact: true })).toHaveAttribute("href", `/${locale}/registration`);
        await expect(form.locator('a[href$="/ticket"]')).toHaveCount(0);
        await accessible(page);
      }
      releaseStatus();
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.pending_approval);
      await capture(page, info, locale, "request-submitted");
      if (!before) { await expect(page.getByTestId("registration-status")).toBeFocused(); await accessible(page); }
    } finally { release(); releaseStatus(); }
  });

  test(`${locale} cancellation and offer loading have one clear action`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, { state: "offered" });
    await page.goto(`/${locale}/registration`);
    await page.getByRole("button", { name: copy.decline, exact: true }).click();
    await capture(page, info, locale, "decline-confirmation");
    await page.getByRole("button", { name: copy.keep, exact: true }).click();
    await page.getByRole("button", { name: copy.cancel, exact: true }).click();
    await capture(page, info, locale, "cancel-confirmation");
    if (!before) await accessible(page);
    await page.getByRole("button", { name: copy.keep, exact: true }).click();
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let posts = 0;
    await page.route("**/api/registration/me", async (route) => { posts++; await held; await route.continue(); });
    try {
      await page.getByRole("button", { name: copy.accept, exact: true }).click();
      await expect(page.getByRole("button", { name: copy.working, exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: copy.decline, exact: true })).toBeDisabled();
      await capture(page, info, locale, "offer-updating");
      await page.keyboard.press("Enter");
      expect(posts).toBe(1);
      release();
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
      if (!before) await accessible(page);
    } finally { release(); }
  });

  test(`${locale} signed out registration offers both account entry routes`, async ({ page }, info) => {
    await page.goto(`/${locale}/registration`);
    await expect(page.getByTestId("registration-status")).toHaveText(copy.denied);
    await capture(page, info, locale, "signed-out");
    if (!before) {
      const card = page.getByTestId("my-registration");
      await expect(card.getByRole("link", { name: copy.signIn, exact: true })).toHaveAttribute("href", `/${locale}/sign-in`);
      await expect(card.getByRole("link", { name: copy.createAccount, exact: true })).toHaveAttribute("href", `/${locale}/sign-up`);
      await accessible(page);
    }
  });

  test(`${locale} a rejected request never blames a correctly formatted identity number`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, { state: "not-requested" });
    await page.goto(`/${locale}/registration`);
    const form = page.getByTestId("registration-request"), document = page.locator("#registration-document-number");
    await page.locator("#registration-document-type").selectOption("passport");
    await document.fill("FAKE0001");
    await page.locator("#registration-terms").check();
    await page.route("**/api/workflows/registration", (route) => route.fulfill({ status: 400, json: { state: "invalid_input" } }));
    await form.getByRole("button", { name: submitLabel, exact: true }).click();
    await expect(form.getByRole("alert")).toContainText(formCopy.invalid);
    await capture(page, info, locale, "request-rejected");
    const targets = await form.locator("a").evaluateAll((links) => links.map((link) => ({ text: link.textContent, height: link.getBoundingClientRect().height })));
    await writeFile(`.tools/journey-review/registration/${phase}/${info.project.name}-${locale}/request-targets.json`, JSON.stringify(targets, null, 2));
    if (!before) {
      await expect(document).not.toHaveAttribute("aria-invalid", "true");
      await expect(page.locator("#registration-document-number-error")).toHaveCount(0);
      await accessible(page);
    }
  });

  test(`${locale} registration closing during submission keeps a clear status action`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, { state: "not-requested" });
    await page.goto(`/${locale}/registration`);
    const form = page.getByTestId("registration-request");
    await page.locator("#registration-document-type").selectOption("passport");
    await page.locator("#registration-document-number").fill("FAKE0001");
    await page.locator("#registration-terms").check();
    await page.route("**/api/workflows/registration", (route) => route.fulfill({ status: 503, json: { error: "closed" } }));
    await form.getByRole("button", { name: submitLabel, exact: true }).click();
    await expect(form.getByRole("alert")).toContainText(formCopy.closed);
    await expect(page.locator("#registration-document-number")).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.refresh, exact: true })).toBeEnabled();
    await capture(page, info, locale, "request-closed");
    if (!before) await accessible(page);
  });

  test(`${locale} a limited request explains waiting and preserves details for retry`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, { state: "not-requested" });
    await page.goto(`/${locale}/registration`);
    const form = page.getByTestId("registration-request"), document = page.locator("#registration-document-number");
    const accepted = page.locator("#registration-terms");
    await page.locator("#registration-document-type").selectOption("passport");
    await document.fill("FAKE0001");
    await accepted.check();
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let posts = 0;
    await page.route("**/api/workflows/registration", async (route) => {
      if (++posts !== 1) return route.continue();
      await held;
      await route.fulfill({ status: 429, json: { state: "limited" } });
    });
    try {
      await form.getByRole("button", { name: formCopy.submit, exact: true }).click();
      await expect(form.getByRole("button", { name: formCopy.sending, exact: true })).toBeDisabled();
      await expect(document).toBeDisabled();
      release();
      await expect(form.getByRole("alert")).toContainText(before ? formCopy.unavailable : formCopy.limited);
      await expect(document).toHaveValue("FAKE0001");
      await expect(accepted).toBeChecked();
      const submit = form.getByRole("button", { name: formCopy.submit, exact: true });
      await expect(submit).toBeDisabled();
      await capture(page, info, locale, "request-limited");
      await accessible(page);
      await submit.click();
      await expect(page.getByTestId("registration-status")).toHaveText(copy.states.pending_approval);
      expect(posts).toBe(2);
    } finally { release(); }
  });

  test(`${locale} refresh keeps keyboard context through a failed read and retry`, async ({ page, context, request }, info) => {
    await registrationSession(request, context, { state: "approved" });
    await page.goto(`/${locale}/registration`);
    const failure = async (route: import("@playwright/test").Route) => route.fulfill({ status: 503, json: { state: "unavailable" } });
    await page.route("**/api/registration/me?locale=*", failure);
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.unavailable);
    await capture(page, info, locale, "status-unavailable");
    if (!before) { await expect(page.getByTestId("registration-status")).toBeFocused(); await accessible(page); }
    await page.unroute("**/api/registration/me?locale=*", failure);
    await page.getByRole("button", { name: copy.refresh, exact: true }).click();
    await expect(page.getByTestId("registration-status")).toHaveText(copy.states.approved);
    if (!before) await expect(page.getByTestId("registration-status")).toBeFocused();
  });
}
