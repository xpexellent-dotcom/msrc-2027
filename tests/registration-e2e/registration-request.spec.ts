import AxeBuilder from "@axe-core/playwright";
import { createCipheriv, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { registrationCopy } from "../../src/features/registration/registration-copy";
import { myRegistrationCopy } from "../../src/features/registration/my-registration-copy";

/** Actual SSR/API/crypto/form against a loopback synthetic provider. Database enforcement has separate SQL tests. */
async function sessionCookie(stale = false) {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now(), origin = "http://127.0.0.1:3216";
  const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + (stale ? -30 : 3600),
    iat: Math.floor(now / 1000), amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv);
  cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic-refresh:" + actorId + ":" + sessionId,
    deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  return { name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin,
    httpOnly: true, sameSite: "Strict" as const };
}

for (const locale of ["en", "ar"] as const) {
  const copy = registrationCopy[locale];
  test(`${locale} stale native token restores the same session before showing identity fields`, async ({ page, context }) => {
    const failedResponses: string[] = [];
    page.on("response", (response) => { if (response.status() >= 500) failedResponses.push(new URL(response.url()).pathname); });
    const original = await sessionCookie(true);
    await context.addCookies([original]);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/workflows/registration?locale=*", async (route) => { await held; await route.continue(); });
    try {
      await page.goto(`/${locale}/registration`);
      await expect(page.getByRole("status")).toContainText(copy.checking);
      await expect(page.locator("#registration-document-number")).toHaveCount(0);
      const restored = page.waitForResponse((response) => response.url().includes("/api/workflows/registration?locale="));
      release();
      expect((await restored).status()).toBe(200);
      await expect(page.locator("#registration-document-number")).toBeVisible();
      await expect(page.getByRole("link", { name: copy.termsLink, exact: true })).toHaveAttribute("href", `/${locale}/terms/v1.0`);
      const cookie = (await context.cookies()).find((value) => value.name === original.name);
      expect(cookie?.value).not.toBe(original.value);
      expect(failedResponses).toEqual([]);
    } finally { release(); }
  });
  test(`${locale} keyboard request, private response, retry, RTL and axe`, async ({ page, context }, testInfo) => {
    await context.addCookies([await sessionCookie()]);
    const errors: string[] = [];
    const failedResponses: string[] = [];
    page.on("pageerror", (error) => errors.push(error.name));
    page.on("response", (response) => { if (response.status() >= 500) failedResponses.push(new URL(response.url()).pathname); });
    await page.goto(`/${locale}/registration`);
    await expect(page.getByRole("heading", { level: 1, name: myRegistrationCopy[locale].title })).toBeVisible();
    await expect(page.getByTestId("registration-request")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("#registration-document-number")).toHaveAttribute("dir", "ltr");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // Navigate from the document through controls using only Tab, arrows, text, Space and Enter.
    for (let stop = 0; stop < 60 && !await page.locator("#registration-document-type").evaluate((element) => element === document.activeElement); stop++) await page.keyboard.press("Tab");
    await expect(page.locator("#registration-document-type")).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.locator("#registration-document-type")).toHaveValue("passport");
    await page.keyboard.press("Tab"); await page.keyboard.type("FAKE0001");
    await page.keyboard.press("Tab"); await page.keyboard.press("Space");
    await expect(page.locator("#registration-terms")).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    const button = page.getByRole("button", { name: copy.submit, exact: true });
    await expect(button).toBeEnabled();
    await page.screenshot({ path: `test-results/registration/${testInfo.project.name}-${locale}-form.png`, fullPage: true });
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    const submitted = page.waitForResponse((response) => response.url().endsWith("/api/workflows/registration") && response.request().method() === "POST");
    await page.keyboard.press("Enter");
    const response = await submitted, value = await response.json();
    expect(response.status()).toBe(200); expect(value.state).toBe("submitted");
    expect(JSON.stringify(value)).not.toContain("FAKE0001");
    await expect(page.getByTestId("registration-status")).toHaveText(myRegistrationCopy[locale].states.pending_approval);
    await expect(page.locator("#registration-document-number")).toHaveCount(0);
    const payload = response.request().postDataJSON();
    const retries = await Promise.all([context.request.post("/api/workflows/registration", { headers: { origin: "http://127.0.0.1:3216" }, data: payload }),
      context.request.post("/api/workflows/registration", { headers: { origin: "http://127.0.0.1:3216" }, data: payload })]);
    for (const retry of retries) { expect(retry.status()).toBe(200); expect((await retry.json()).request.id).toBe(value.request.id); }
    await page.reload(); await expect(page.getByTestId("registration-status")).toHaveText(myRegistrationCopy[locale].states.pending_approval);
    expect(errors).toEqual([]);
    expect(failedResponses).toEqual([]);
  });
}
