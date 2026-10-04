import { expect, test } from "@playwright/test";
import { participantCopy, participantScreens } from "../../src/features/participant-accounts/participant-copy";

for (const locale of ["en", "ar"] as const) {
  for (const screen of participantScreens) test(`${locale} ${screen} keeps participant accounts closed by default`, async ({ page }) => {
    let calls = 0;
    page.on("request", (request) => { if (request.url().includes("/api/participant-accounts")) calls += 1; });
    await page.goto(`/${locale}/${screen}`);
    await expect(page.getByRole("heading", { name: participantCopy[locale].comingSoon, exact: true })).toBeVisible();
    await expect(page.getByTestId("participant-accounts-closed")).toContainText(participantCopy[locale].registrationClosed);
    await expect(page.locator("form, input, [data-testid=participant-profile-name]")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(calls).toBe(0);
  });
}

test("closed participant API rejects all actions without cookies or account fields", async ({ request }) => {
  for (const action of [null, "signup", "signin", "verify", "resend", "forgot", "reset", "logout"]) {
    const response = action === null ? await request.get("/api/participant-accounts") : await request.post("/api/participant-accounts", { data: { action, name: "Synthetic Participant", email: "closed@example.invalid", password: "Synthetic password only", code: "654321" } });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ state: "closed" });
    expect(response.headers()["set-cookie"]).toBeUndefined();
  }
});
