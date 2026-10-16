import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"]) test(`${locale} enforced CSP blocks untrusted scripts, handlers and network calls`, async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { cspDirectives: string[]; untrustedExecuted?: boolean };
    state.cspDirectives = [];
    document.addEventListener("securitypolicyviolation", (event) => { state.cspDirectives.push(event.effectiveDirective); });
  });
  // Parser injection exercises the browser policy; CDP's evaluate() itself is
  // privileged and bypasses inline-script checks in Chromium.
  await page.route(`**/${locale}/sign-in`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("</head>", "<script>window.untrustedExecuted = true</script></head>");
    await route.fulfill({ response, body });
  });
  await page.goto(`/${locale}/sign-in`);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.setAttribute("onclick", "window.untrustedExecuted = true");
    document.body.append(button);
    button.click();
    void fetch("https://csp-blocked.example.invalid/probe").catch(() => {});
    button.remove();
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { cspDirectives: string[] }).cspDirectives.sort())).toEqual(["connect-src", "script-src-attr", "script-src-elem"]);
  expect(await page.evaluate(() => (window as unknown as { untrustedExecuted?: boolean }).untrustedExecuted)).toBeUndefined();
});
