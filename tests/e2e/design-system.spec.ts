import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// DSN-01/02, LOC-01/02, ACC-01, MED-01: bounded local preview checks.
// Automated accessibility findings supplement the recorded visual/keyboard
// review; they do not certify public-launch accessibility or approved media.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} homepage and components meet automated accessibility checks`, async ({ page }, testInfo) => {
    for (const path of [`/${locale}`, `/${locale}/design-system`]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await testInfo.attach(`${path.replaceAll("/", "-")}-accessibility`, {
        body: JSON.stringify({
          violations: results.violations,
          needsManualReview: results.incomplete,
          contrast: results.passes.find((rule) => rule.id === "color-contrast")?.nodes,
        }, null, 2),
        contentType: "application/json",
      });
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    }
    await testInfo.attach(`${locale}-design-system-${testInfo.project.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  test(`${locale} local demonstration announces validation and preserves scientific text across language changes`, async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    });
    await page.goto(`/${locale}/design-system`);
    const title = page.locator("#demo-title");
    const example = page.locator("#demo-example");
    await expect(title).toHaveAttribute("dir", "ltr");
    await expect(title).toHaveAttribute("lang", "en");
    await expect(title).toHaveAttribute("readonly", "");
    await page.getByRole("button", { name: locale === "ar" ? "تحقق من المثال" : "Check example", exact: true }).click();
    const summary = page.getByRole("form").getByRole("alert");
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(example).toHaveAttribute("aria-invalid", "true");
    const descriptions = (await example.getAttribute("aria-describedby"))?.split(/\s+/) ?? [];
    expect(descriptions.length).toBeGreaterThan(0);
    for (const id of descriptions) await expect(page.locator(`[id="${id}"]`)).not.toBeEmpty();

    await example.selectOption("research-question");
    const scientificTitle = await title.inputValue();
    expect(scientificTitle).toMatch(/synthetic/i);
    await page.getByRole("link", { name: locale === "ar" ? "View this page in English" : "View this page in Arabic" }).click();
    const nextLocale = locale === "ar" ? "en" : "ar";
    await expect(page).toHaveURL(new RegExp(`/${nextLocale}/design-system$`));
    await expect(example).toHaveValue("research-question");
    await expect(title).toHaveValue(scientificTitle);
    await expect(title).toHaveAttribute("dir", "ltr");
    await page.getByRole("button", { name: nextLocale === "ar" ? "تحقق من المثال" : "Check example", exact: true }).click();
    await expect(page.getByRole("form").getByRole("status")).toHaveText(nextLocale === "en" ? "Demo checked. No submission was created or sent." : "تم التحقق من المثال. لم يُنشأ أو يُرسل أي طلب.");
    expect(writes).toEqual([]);
  });
}

test("disabled and loading demonstrations cannot trigger operations", async ({ page }) => {
  await page.goto("/en/design-system");
  const loading = page.locator('button[aria-busy="true"]');
  expect(await loading.count()).toBeGreaterThan(0);
  for (const button of await loading.all()) await expect(button).toBeDisabled();
  const disabled = page.locator("main button:disabled");
  expect(await disabled.count()).toBeGreaterThanOrEqual(2);
  for (const button of await disabled.all()) {
    await button.evaluate((element: HTMLButtonElement) => element.focus());
    await expect(button).not.toBeFocused();
  }
  await page.goto("/en");
  const registration = page.locator("button.header-registration");
  expect(await registration.count()).toBeGreaterThan(0);
  for (const button of await registration.all()) await expect(button).toBeDisabled();
});

test("absent approved footage stays static with reduced motion and limited bandwidth", async ({ page }) => {
  const externalRequests: string[] = [];
  const videoRequests: string[] = [];
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:3210") externalRequests.push(request.url());
    if (request.resourceType() === "media" || /\.(mp4|webm)(\?|$)/i.test(request.url())) videoRequests.push(request.url());
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "2g", addEventListener() {}, removeEventListener() {} },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ar");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("video, iframe")).toHaveCount(0);
  // The private workshop has an original synthetic test clip. With these
  // preferences, even that configured clip must never be fetched.
  await page.goto("/ar/design-system");
  await expect(page.locator("video, iframe")).toHaveCount(0);
  await expect(page.locator(".hero-media-poster")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(fontRequests.length).toBeGreaterThan(0);
  expect(externalRequests).toEqual([]);
  expect(videoRequests).toEqual([]);
});

test("synthetic video controls pause, resume and fall back after an asset failure", async ({ page }) => {
  await page.goto("/en/design-system");
  const video = page.locator(".design-media-frame video");
  await expect(video).toHaveAttribute("playsinline", "");
  expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect(page.getByRole("button", { name: "Pause background video" })).toBeVisible();
  const pause = page.getByRole("button", { name: "Pause background video" });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Play background video" })).toBeFocused();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  // A system preference change must not silently undo the user's pause.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(video).toHaveCount(1);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const resume = page.getByRole("button", { name: "Play background video" });
  await expect(resume).toBeVisible();
  await resume.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause background video" })).toBeFocused();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCount(0);
  await expect(page.getByText("Still image mode", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-media-poster")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/brand/synthetic-motion.webm", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Background video unavailable. Showing a still image." })).toBeVisible();
  await expect(video).toHaveCount(0);
  await expect(page.locator(".hero-media-poster")).toBeVisible();
});
