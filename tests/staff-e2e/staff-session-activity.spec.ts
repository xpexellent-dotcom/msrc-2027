import { expect, test } from "@playwright/test";
import { staffCopy } from "../../src/features/staff-portal/copy";
import type { StaffPayload, StaffResponse } from "../../src/features/staff-portal/ui-contract";

for (const locale of ["en", "ar"] as const) {
  test(`${locale} deliberate read activity keeps a two-hour session while unattended polling expires`, async ({ page }) => {
    const start = Date.parse("2026-10-16T00:00:00Z");
    let now = start, lastActivity = start, activities = 0, reads = 0, sequence = 0;
    await page.clock.install({ time: start });
    await page.route("**/api/staff-portal**", async (route) => {
      const valid = now < start + 8 * 3_600_000 && now < lastActivity + 30 * 60_000;
      if (route.request().method() === "POST") {
        const payload = route.request().postDataJSON() as StaffPayload;
        expect(payload.action).toBe("activity"); expect(payload.formToken).toBeTruthy();
        if (valid) { lastActivity = now; activities += 1; }
      } else reads += 1;
      const response: StaffResponse = { state: valid ? "authenticated" : "ready", profile: valid ? {
        actorId: "c5100000-0000-4000-8000-000000000001", name: "Synthetic Reader", roles: ["finance"],
      } : null, formToken: "synthetic-activity-form-" + ++sequence };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(response) });
    });
    await page.goto(`/${locale}/staff`);
    await expect(page.getByRole("button", { name: staffCopy[locale].signOut, exact: true })).toBeVisible();
    await expect.poll(() => activities).toBe(1);
    for (let minute = 20; minute <= 120; minute += 20) {
      // Real pointer input marks a deliberate read; a timer merely batches it.
      await page.getByRole("heading", { level: 1, name: staffCopy[locale].home, exact: true }).click();
      now = start + minute * 60_000;
      await page.clock.fastForward(20 * 60_000);
      await expect.poll(() => activities).toBe(1 + minute / 20);
      await expect(page.getByRole("button", { name: staffCopy[locale].signOut, exact: true })).toBeVisible();
    }
    expect(lastActivity).toBe(start + 2 * 3_600_000);
    const activeCount = activities, readCount = reads;
    now += 20 * 60_000; await page.clock.fastForward(20 * 60_000);
    await expect.poll(() => reads).toBeGreaterThan(readCount);
    expect(activities).toBe(activeCount);
    now += 10 * 60_000; await page.clock.fastForward(10 * 60_000);
    await expect(page.getByRole("button", { name: staffCopy[locale].next, exact: true })).toBeVisible();
    expect(activities).toBe(activeCount);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
}

test("sign-out aborts an outstanding observation before its rotated cookie can arrive", async ({ page, context }) => {
  let gets = 0, signedOut = false, release = () => {}, pending = false, completed = false;
  const failed: string[] = [];
  page.on("requestfailed", (request) => { if (request.url().includes("/api/staff-portal")) failed.push(request.failure()?.errorText ?? ""); });
  await page.clock.install();
  await context.addCookies([{ name: "msrc-staff-test", value: "synthetic-original", url: "http://127.0.0.1:3219" }]);
  await page.route("**/api/staff-portal**", async (route) => {
    const payload = route.request().method() === "POST" ? route.request().postDataJSON() as StaffPayload : null;
    if (!payload && ++gets === 2) {
      pending = true; await new Promise<void>((resolve) => { release = resolve; });
      await route.fulfill({ contentType: "application/json", headers: { "Set-Cookie": "msrc-staff-test=synthetic-late-rotation; Path=/; HttpOnly; SameSite=Strict" },
        body: JSON.stringify({ state: "authenticated", profile: { actorId: "c5100000-0000-4000-8000-000000000001", name: "Synthetic Reader", roles: ["finance"] }, formToken: "late-token" }) });
      completed = true;
      return;
    }
    if (payload?.action === "logout") signedOut = true;
    await route.fulfill({ contentType: "application/json", ...(signedOut ? { headers: { "Set-Cookie": "msrc-staff-test=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" } } : {}),
      body: JSON.stringify({ state: payload?.action === "logout" ? "signed-out" : signedOut ? "ready" : "authenticated",
        profile: signedOut ? null : { actorId: "c5100000-0000-4000-8000-000000000001", name: "Synthetic Reader", roles: ["finance"] }, formToken: "synthetic-race-token-" + gets }) });
  });
  await page.goto("/en/staff");
  await expect(page.getByRole("button", { name: staffCopy.en.signOut, exact: true })).toBeVisible();
  await page.clock.fastForward(60_000);
  await expect.poll(() => pending).toBe(true);
  await page.getByRole("button", { name: staffCopy.en.signOut, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/staff\/sign-in$/);
  await expect.poll(() => failed.length).toBeGreaterThan(0);
  release();
  await expect.poll(() => completed).toBe(true);
  await expect(page.getByRole("button", { name: staffCopy.en.next, exact: true })).toBeVisible();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "msrc-staff-test")).toBe(false);
});
