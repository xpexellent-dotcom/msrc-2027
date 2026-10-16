import { expect, test } from "@playwright/test";
import { staffCopy } from "../../src/features/staff-portal/copy";
import type { StaffPayload, StaffResponse } from "../../src/features/staff-portal/ui-contract";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} staff can sign out when a restore response has no form token`, async ({ page }) => {
    let signedOut = false;
    await page.route("**/api/staff-portal**", async (route) => {
      let response: StaffResponse;
      if (route.request().method() === "POST") {
        const input = route.request().postDataJSON() as StaffPayload;
        expect(input.action).toBe("logout"); expect(input.formToken).toBe("");
        signedOut = true; response = { state: "signed-out" };
      } else response = { state: signedOut ? "ready" : "authenticated", profile: signedOut ? null : {
        actorId: "c6100000-0000-4000-8000-000000000001", name: "Synthetic Staff", roles: ["finance"],
      } };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(response) });
    });
    await page.goto(`/${locale}/staff`);
    const signOut = page.getByRole("button", { name: staffCopy[locale].signOut, exact: true });
    await expect(signOut).toBeEnabled(); await signOut.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/staff/sign-in$`));
    await expect(page.getByRole("button", { name: staffCopy[locale].next, exact: true })).toBeVisible();
    expect(signedOut).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
}
