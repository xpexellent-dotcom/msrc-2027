import { readFileSync } from "node:fs";
import { expect, test } from "../helpers/csp";
import { participantScreens } from "../../src/features/participant-accounts/participant-copy";

const publicPolicy = "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} concurrent private responses never share nonces`, async ({ request }) => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => request.get(`/${locale}/sign-in`)));
    const nonces = responses.map((response) => {
      expect(response.status()).toBe(200);
      return /script-src 'nonce-([^']+)'/.exec(response.headers()["content-security-policy"])?.[1];
    });
    expect(nonces.every(Boolean)).toBe(true);
    expect(new Set(nonces).size).toBe(responses.length);
    for (const [index, response] of responses.entries()) {
      expect(await response.text()).toContain(`nonce="${nonces[index]}"`);
    }
  });

  test(`${locale} encoded locale cannot bypass the private policy`, async ({ page }) => {
    const encodedLocale = locale === "en" ? "%65n" : "%61r";
    for (const path of ["sign-in", "registration"]) {
      const response = await page.goto(`/${encodedLocale}/${path}`);
      expect(response?.status()).toBe(200);
      expect(response!.headers()["content-security-policy"]).toContain("'strict-dynamic'");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    }
  });

  test(`${locale} private documents carry fresh enforced nonces and hydrate without CSP violations`, async ({ page, request }) => {
    for (const path of ["staff", "staff/sign-in", "staff/accept-invitation", "staff/people", "staff/audit", "staff/participants", "staff/security", ...participantScreens, "registration"]) {
      const response = await page.goto(`/${locale}/${path}`);
      expect(response?.status()).toBe(path.startsWith("staff") ? 404 : 200);
      const policy = response!.headers()["content-security-policy"];
      expect(response!.headers()["content-security-policy-report-only"]).toBeUndefined();
      expect(response!.headers()["cache-control"]).toContain("no-store");
      const nonce = /script-src 'nonce-([^']+)'/.exec(policy)?.[1];
      expect(nonce).toBeTruthy();
      expect(policy).toContain("upgrade-insecure-requests");
      // Parser-inserted scripts require the document nonce. Runtime chunks may
      // inherit trust from the nonced bootstrap through strict-dynamic.
      const scripts = (await response!.text()).match(/<script\b[^>]*>/g) ?? [];
      expect(scripts.length).toBeGreaterThan(0);
      expect(scripts.every((tag) => tag.includes(`nonce="${nonce}"`))).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const again = await request.get(`/${locale}/${path}`, { headers: { "x-nonce": "forged", "Content-Security-Policy": "script-src 'nonce-forged'" } });
      const secondPolicy = again.headers()["content-security-policy"];
      expect(secondPolicy).not.toContain(`nonce-${nonce}`);
      expect(secondPolicy).not.toContain("forged");
    }
  });

  test(`${locale} public documents keep their baseline policy and SSG entries`, async ({ page }) => {
    const { routes } = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
    for (const path of ["", "/dates-venue", "/participate", "/speakers", "/sponsors", "/team", "/workshops", "/hackathon", "/3mt", "/submissions", "/privacy", "/privacy/v1.0", "/terms", "/terms/v1.0"]) {
      expect(routes[`/${locale}${path}`], `${locale}${path} remains SSG`).toBeDefined();
    }
    expect(routes[`/${locale}/registration`]).toBeUndefined();
    for (const path of ["", "/participate", "/dates-venue"]) {
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      expect(response!.headers()["content-security-policy"]).toBe(publicPolicy);
      expect(await page.locator("script[nonce]").count()).toBe(0);
    }
    // A hard document boundary must deliver CSP when entering a protected page.
    if (await page.locator(".menu-toggle").isVisible()) {
      await page.locator(".menu-toggle").click();
      await page.locator(".mobile-reserve-action").click();
    } else await page.locator(".header-primary-action").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/registration$`));
    expect(await page.locator("script").first().evaluate((script) => script.nonce)).not.toBe("");
  });
}
