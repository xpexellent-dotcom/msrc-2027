import { expect, test } from "@playwright/test";

test("authentication lab stays unavailable on a deployment environment", async ({ request }) => {
  for (const locale of ["en", "ar"]) {
    const response = await request.get(`/${locale}/staff-security-preview`);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain("otpauth://");
  }
  expect((await request.get("/api/auth-preview")).status()).toBe(404);
  expect((await request.post("/api/auth-preview", { data: { action: "start", kind: "staff" } })).status()).toBe(404);
});
