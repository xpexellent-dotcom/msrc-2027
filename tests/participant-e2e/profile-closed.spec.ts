import { expect, test } from "../helpers/csp";

for (const locale of ["en", "ar"] as const) test(`${locale} optional profile stays hidden when its independent flag is off`, async ({ page, request }) => {
  let profileRequests = 0;
  page.on("request", (entry) => { if (entry.url().includes("/api/participant-accounts/profile")) profileRequests++; });
  await page.route("**/api/participant-accounts", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    state: "authenticated", formToken: "synthetic-account-token", profile: { name: "Synthetic Participant", accountState: "verified" },
  }) }));
  await page.goto(`/${locale}/my-msrc`);
  await expect(page.getByTestId("participant-next-steps")).toBeVisible();
  await expect(page.getByTestId("participant-profile-card")).toHaveCount(0);
  expect(profileRequests).toBe(0);
  const response = await request.get("/api/participant-accounts/profile");
  expect(response.status()).toBe(503); expect(await response.json()).toEqual({ state: "closed" });
});
