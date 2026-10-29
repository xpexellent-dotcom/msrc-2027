import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../helpers/csp";
import { abstractCopy } from "../../src/features/submissions/copy";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} abstract submission remains closed while the verified account shell stays available`, async ({ page, request }) => {
    // The incumbent account suite has no abstract flag and no abstract provider/mock.
    const response = await request.get("/api/abstracts?locale=" + locale);
    expect(response.status()).toBe(503); expect(await response.json()).toEqual({ state: "closed" });
    await page.goto(`/${locale}/abstracts/submit`);
    await expect(page.getByRole("status")).toHaveText(abstractCopy[locale].closed);
    await expect(page.locator("#abstract-title, input[type=file]")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    // Existing account presentation remains independent from the abstract release gate.
    await page.route("**/api/participant-accounts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      state: "ready", profile: { name: "Synthetic Participant", accountState: "verified" }, formToken: "synthetic-account-shell-only",
    }) }));
    await page.getByRole("link", { name: abstractCopy[locale].back, exact: true }).click();
    await expect(page.getByTestId("participant-profile-name")).toHaveText("Synthetic Participant");
    await expect(page.getByTestId("participant-account-state")).toHaveText(participantCopy[locale].verifiedState);
    await expect(page.getByRole("link", { name: abstractCopy[locale].title, exact: true })).toHaveCount(0);
  });
}
