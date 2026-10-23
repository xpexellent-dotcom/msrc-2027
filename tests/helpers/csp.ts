import { expect, test as base } from "@playwright/test";
import { isMediaPage, isPrivatePage } from "../../src/lib/content-security-policy";

export { expect } from "@playwright/test";
export type { Locator, Page } from "@playwright/test";

/** Inspect actual enforced policies and violations throughout existing synthetic flows. */
export const test = base.extend({
  page: async ({ page }, providePage) => {
    const violations: string[] = [];
    const policies: { value: string; media: boolean }[] = [];
    page.on("console", (message) => {
      if (/content security policy|violates.*directive|refused to (execute|load|connect|apply)/i.test(message.text())) {
        violations.push(message.text());
      }
    });
    await page.exposeFunction("recordCspViolation", (directive: string) => { violations.push(directive); });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        // Record only directive names, never addresses, form fields or credentials.
        (window as unknown as { recordCspViolation: (directive: string) => void }).recordCspViolation(event.effectiveDirective);
      });
    });
    page.on("response", (response) => {
      if (response.request().resourceType() === "document" && isPrivatePage(new URL(response.url()).pathname)) {
        policies.push({ value: response.headers()["content-security-policy"] ?? "", media: isMediaPage(new URL(response.url()).pathname) });
      }
    });
    await providePage(page);
    for (const { value: policy, media } of policies) {
      expect(policy).toMatch(/script-src 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic';/);
      expect(policy).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
      if (media) expect(policy).toMatch(/connect-src 'self'(?: http:\/\/127\.0\.0\.1:3220| https:\/\/ecemjggwlzqpjcwmchrl\.supabase\.co)?;/);
      else expect(policy).toContain("connect-src 'self';");
    }
    expect(violations).toEqual([]);
  },
});
