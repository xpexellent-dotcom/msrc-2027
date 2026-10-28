import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../helpers/csp";
import { profileCopy } from "../../src/features/participant-accounts/profile-copy";
import { EMPTY_PARTICIPANT_PROFILE } from "../../src/features/participant-accounts/profile-contract";
import type { ParticipantDetail } from "../../src/features/staff-portal/participant-detail-contract";

const staffId = "11000000-0000-4000-8000-000000000001", participantId = "11000000-0000-4000-8000-000000000003";
const institution = "Synthetic University · الجامعة المصطنعة";
const avatarPath = `/api/staff-portal/participant-detail/avatar?actorId=${participantId}&v=1`;
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2lAAAAABJRU5ErkJggg==", "base64");

/** Presentation-only authenticated staff fixture; real handler/SQL authority has separate tests. */
async function fixture(page: Page) {
  let missingAvatar = false;
  const detailReads: string[] = [], avatarReads: string[] = [], writes: string[] = [];
  const profile = { actorId: staffId, name: "Synthetic Staff", roles: ["registrationWorkshopAdministrator"] };
  const participant: ParticipantDetail = {
    actorId: participantId, name: "Synthetic Participant", email: "participant@example.invalid", status: "verified",
    createdAt: "2026-10-27T08:00:00Z", verifiedAt: "2026-10-27T08:05:00Z", lastSignInAt: null, privacyVersion: "v1.1", ageConfirmedAt: "2026-10-27T08:00:00Z",
    registration: { status: "approved", createdAt: "2026-10-27T08:10:00Z", decidedAt: null, identityMasked: "••••••1234", ticket: null, attendance: [] },
    workshops: [], submissions: [], competitions: [], hackathonProfile: null, certificates: [],
    optionalProfile: { ...EMPTY_PARTICIPANT_PROFILE, institution, institutionOther: institution, status: "year_4", year: null, interests: ["synthetic-specialty", "synthetic-second-specialty"],
      specialties: [{ id: "synthetic-specialty", label: "Synthetic specialty" }, { id: "synthetic-second-specialty", label: "Synthetic second specialty" }],
      avatarUrl: avatarPath, version: 1 },
  };
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== "GET") writes.push(`${request.method()} ${url.pathname} ${String(request.postDataJSON()?.action)}`);
    if (url.pathname === "/api/staff-portal/participant-detail/avatar") {
      avatarReads.push(request.url());
      return route.fulfill({ status: missingAvatar ? 404 : 200, contentType: "image/png", headers: { "Cache-Control": "private, no-store" }, body: missingAvatar ? Buffer.alloc(0) : image });
    }
    if (url.pathname === "/api/staff-portal/participant-detail") {
      detailReads.push(url.searchParams.get("actorId") ?? "");
      return route.fulfill({ json: { state: "ready", participant: { ...participant,
        optionalProfile: { ...participant.optionalProfile, avatarUrl: missingAvatar ? avatarPath.replace("v=1", "v=2") : avatarPath } } } });
    }
    return route.fulfill({ json: { state: "authenticated", profile, formToken: "synthetic-profile-staff-form",
      ...(url.searchParams.get("area") === "participants" ? { participants: [{ actorId: participantId, name: participant.name, email: participant.email,
        status: "verified", createdAt: participant.createdAt, identityMasked: "••••••1234" }] } : {}) } });
  });
  return { detailReads, avatarReads, writes, failAvatar: () => { missingAvatar = true; } };
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} authorized staff sees optional profile and private avatar with accessible RTL and initials fallback`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (testInfo.project.name.includes("mobile")) await page.setViewportSize({ width: 320, height: 850 });
    const mock = await fixture(page), copy = profileCopy[locale];
    await page.goto(`/${locale}/staff/participants`);
    const opener = page.getByRole("button", { name: "Synthetic Participant", exact: true });
    await expect(opener).toBeVisible(); await opener.focus(); await page.keyboard.press("Enter");
    const detail = page.getByTestId("participant-detail"), optional = page.getByTestId("staff-participant-profile");
    await expect(detail.getByRole("heading", { level: 2 })).toHaveText("Synthetic Participant");
    await expect(detail.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(optional.getByRole("heading", { name: copy.optionalProfile, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const row = (label: string) => optional.locator("dl > div").filter({ has: page.locator("dt").filter({ hasText: label }) });
    await expect(row(copy.institution).locator("dd")).toHaveText(institution);
    await expect(row(copy.status).locator("dd")).toHaveText(copy.statuses.year_4);
    await expect(row(copy.interests).locator("dd bdi")).toHaveText(["Synthetic specialty", "Synthetic second specialty"]);
    for (const chip of await row(copy.interests).locator("dd bdi").all()) {
      await expect(chip).toHaveAttribute("dir", "ltr"); await expect(chip).toHaveAttribute("lang", "en");
    }
    const avatar = row(copy.picture).locator("img");
    await expect(avatar).toHaveAttribute("src", avatarPath); await expect(avatar).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect.poll(() => avatar.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    expect(mock.detailReads).toEqual([participantId]); expect(mock.avatarReads).toHaveLength(1);
    await expect(detail).toContainText("••••••1234"); await expect(detail.locator("input, textarea, select, form")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page).toHaveTitle(/^MSRC 2027 \| .+/);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    await testInfo.attach(`${locale}-staff-profile`, { body: await page.screenshot({ path: testInfo.outputPath(`${locale}-staff-profile.png`), fullPage: true }), contentType: "image/png" });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await detail.getByRole("button").first().click(); await expect(detail).toHaveCount(0);
    mock.failAvatar(); await opener.click(); await expect(optional).toBeVisible();
    await expect(optional.locator(".participant-profile-avatar img")).toHaveCount(0);
    await expect(optional.locator(".participant-profile-avatar bdi")).toHaveText("SP");
    expect(mock.detailReads).toEqual([participantId, participantId]);
    // Mounted staff navigation records its existing authenticated idle-clock touch.
    // This participant detail flow must issue no participant or staff mutations.
    expect(mock.writes.filter((action) => action !== "POST /api/staff-portal activity")).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)))).toEqual([]);
  });
}
