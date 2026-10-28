import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "../helpers/csp";
import { expectStylesheetsReady } from "../helpers/stylesheets";
import { profileCopy } from "../../src/features/participant-accounts/profile-copy";
import { SAUDI_UNIVERSITIES } from "../../src/content/saudi-universities";
import { EMPTY_PARTICIPANT_PROFILE, type OptionalParticipantProfile, type ParticipantProfileResponse } from "../../src/features/participant-accounts/profile-contract";
import { languageLink } from "../e2e/helpers/header-navigation";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
/** Synthetic fixture labels only, never a replacement for the configured abstract specialty list. */
const specialties = Array.from({ length: 6 }, (_, index) => ({ id: `synthetic-${index}`, label: `Synthetic specialty ${index + 1}` }));

async function fixture(page: Page) {
  let profile: OptionalParticipantProfile = { ...EMPTY_PARTICIPANT_PROFILE };
  let unavailable = false;
  let failure: "conflict" | "unavailable" | null = null;
  let saves = 0;
  let catalog = specialties;
  await page.route("**/api/participant-accounts", async (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    state: "ready", formToken: "synthetic-account-token", profileEnabled: true,
    profile: { name: "Synthetic Participant", accountState: "verified", email: "synthetic@example.invalid" },
  }) }));
  await page.route("**/api/participant-accounts/profile/avatar?*", async (route) => route.fulfill({ contentType: "image/png", body: png, headers: { "cache-control": "private, no-store" } }));
  await page.route("**/api/participant-accounts/profile", async (route) => {
    let result: ParticipantProfileResponse = { state: "ready", profile, specialties: catalog, formToken: "synthetic-profile-token" };
    if (unavailable) result = { state: "area-not-ready" };
    else if (route.request().method() === "POST") {
      saves += 1;
      if (failure) { result = { state: failure, formToken: "synthetic-profile-token" }; failure = null; }
      else {
        const request = new Request("http://synthetic.invalid", { method: "POST", headers: route.request().headers(), body: new Uint8Array(route.request().postDataBuffer()!) });
        const data = await request.formData();
        expect(data.get("action")).toBe("save"); expect(data.get("formToken")).toBe("synthetic-profile-token"); expect(data.get("website")).toBe(""); expect(data.get("version")).toBe(String(profile.version));
        const status = data.get("status") as OptionalParticipantProfile["status"];
        profile = { ...profile, institutionId: String(data.get("institutionId")) || null, institutionOther: String(data.get("institutionOther")).trim() || null, institution: String(data.get("institutionOther")).trim() || null,
          status: status || null, year: null, arabicName: String(data.get("arabicName")).trim() || null, nationality: String(data.get("nationality")) || null,
          gender: String(data.get("gender")) as OptionalParticipantProfile["gender"] || null, dateOfBirth: String(data.get("dateOfBirth")) || null, city: String(data.get("city")).trim() || null, phone: String(data.get("phone")) || null,
          identityType: data.get("removeIdentity") === "true" ? null : String(data.get("identityType")) as OptionalParticipantProfile["identityType"] || null,
          identityLast4: data.get("removeIdentity") === "true" ? null : data.get("identityNumber") ? String(data.get("identityNumber")).slice(-4) : profile.identityLast4,
          interests: JSON.parse(String(data.get("interests"))), version: profile.version + 1,
          avatarUrl: data.get("avatar") ? `/api/participant-accounts/profile/avatar?v=${profile.version + 1}` : data.get("removeAvatar") === "true" ? null : profile.avatarUrl };
        expect(profile.interests.every((id) => catalog.some((option) => option.id === id))).toBe(true);
        result = { state: "ready", profile, specialties: catalog, formToken: "synthetic-profile-token" };
      }
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(result) });
  });
  return { fail: (state: "conflict" | "unavailable") => { failure = state; }, unavailable: () => { unavailable = true; }, saves: () => saves, advance: () => { profile = { ...profile, version: profile.version + 1 }; }, hideCatalog: () => { catalog = []; } };
}

async function chooseOther(page: Page, locale: "en" | "ar", institution: string) {
  await page.locator("#profile-institution").fill("synthetic unmatched institution");
  await page.getByRole("option", { name: profileCopy[locale].other, exact: true }).click();
  await page.locator("#profile-institutionOther").fill(institution);
}

async function accessible(page: Page) {
  await expectStylesheetsReady(page);
  expect((await new AxeBuilder({ page }).include('[data-testid="participant-profile-card"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

for (const locale of ["en", "ar"] as const) {
  const copy = profileCopy[locale];
  test(`${locale} university combobox searches both languages and supports keyboard selection`, async ({ page }) => {
    await fixture(page); await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card"); await card.getByRole("button", { name: copy.edit, exact: true }).click();
    const input = page.locator("#profile-institution"), university = SAUDI_UNIVERSITIES.find((item) => item.id === "king-abdulaziz")!;
    await input.fill(locale === "en" ? "عَبْدالعَزيز" : "ABDULAZIZ");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(card.getByRole("option", { name: university[locale === "ar" ? "nameAr" : "nameEn"], exact: true })).toBeVisible();
    await input.press("ArrowDown"); await expect(input).toBeFocused(); await input.press("Enter");
    await expect(input).toHaveValue(university[locale === "ar" ? "nameAr" : "nameEn"]); await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#profile-institutionOther")).toHaveCount(0);
    await card.getByRole("button", { name: copy.save, exact: true }).click(); await expect(card.locator("progress")).toHaveAttribute("value", "1");
    await card.getByRole("button", { name: copy.edit, exact: true }).click(); await input.focus(); await input.press("End");
    await expect(card.getByRole("option", { name: copy.other, exact: true })).toBeInViewport(); await input.press("Enter");
    await expect(page.locator("#profile-institutionOther")).toBeVisible(); await accessible(page);
  });
  test(`${locale} complete profile progress, private avatar, validation and removal`, async ({ page }, testInfo) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    await expect(card.locator("progress")).toHaveAttribute("value", "0");
    expect(await card.evaluate((element) => !!(element.compareDocumentPosition(document.querySelector('[data-testid="participant-next-steps"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(page.locator("#participant-profile-editor-title")).toBeFocused();
    await page.locator("#profile-dateOfBirth").fill("2020-01-01");
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator('[role="alert"]')).toBeFocused();
    await card.getByRole("link", { name: copy.dateOfBirth, exact: true }).click();
    await expect(page.locator("#profile-dateOfBirth")).toBeFocused(); expect(mock.saves()).toBe(0);
    await page.locator("#profile-dateOfBirth").fill("2000-01-01");
    await page.locator("#profile-status").selectOption("year_3");
    await chooseOther(page, locale, "  Synthetic Institution  ");
    await page.locator("#profile-arabicName").fill("مشارك تجريبي");
    await expect(page.locator("#profile-arabicName")).toHaveAttribute("dir", "rtl");
    await page.locator("#profile-nationality").selectOption("SA"); await page.locator("#profile-gender").selectOption("male");
    await page.locator("#profile-city").fill("Synthetic City");
    await expect(page.locator("#profile-phone-country")).toHaveValue("+966");
    await page.locator("#profile-phone").fill("+966500000000");
    await page.locator("#profile-identityType").selectOption("national_id"); await page.locator("#profile-identityNumber").fill("1000004321");
    await expect(page.locator("#profile-identityNumber")).toHaveAttribute("dir", "ltr");
    for (const option of specialties.slice(0, 5)) await card.getByRole("button", { name: option.label, exact: true }).click();
    await expect(card.getByRole("button", { name: specialties[5].label, exact: true })).toBeDisabled();
    await page.locator("#profile-avatar").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: png });
    await expect(card.getByAltText(copy.preview)).toHaveAttribute("src", /^data:image\/png;base64,/);
    await accessible(page);
    if (testInfo.project.name === "profile-mobile") await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    await accessible(page);
    const directory = resolve(".tools/profile-review"); await mkdir(directory, { recursive: true });
    await card.screenshot({ path: resolve(directory, `${locale}-${testInfo.project.name}-editor.png`), scale: "css" });
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    await expect(card.getByText(copy.complete, { exact: true })).toBeVisible();
    await expect(card.locator("form")).toHaveCount(0);
    await expect(page.getByTestId("header-primary-action").locator("img")).toHaveAttribute("src", /avatar\?v=1$/);
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await card.getByRole("button", { name: copy.remove, exact: true }).click();
    await card.getByRole("button", { name: copy.clearInstitution, exact: true }).click(); await page.locator("#profile-status").selectOption("");
    for (const field of ["arabicName", "dateOfBirth", "city", "phone"]) await page.locator("#profile-" + field).fill("");
    await page.locator("#profile-nationality").selectOption(""); await page.locator("#profile-gender").selectOption("");
    await expect(page.locator("#profile-identityNumber")).toHaveValue(""); await expect(card).toContainText("4321");
    await card.getByRole("button", { name: copy.removeIdentity, exact: true }).click();
    for (const option of specialties.slice(0, 5)) await card.getByRole("button", { name: option.label, exact: true }).click();
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator("progress")).toHaveAttribute("value", "0");
    await expect(page.getByTestId("header-primary-action").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("header-primary-action").locator("bdi")).toHaveText("SP");
    await accessible(page);
    expect(mock.saves()).toBe(2);
  });

  test(`${locale} missing migration and concurrent update remain recoverable`, async ({ page }) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await chooseOther(page, locale, "Synthetic unsaved institution");
    mock.fail("conflict");
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator('[role="alert"]')).toContainText(copy.conflict);
    await expect(page.locator("#profile-institutionOther")).toHaveValue("Synthetic unsaved institution");
    await expect(page.locator("#profile-institutionOther")).toBeDisabled();
    mock.unavailable(); await card.getByRole("button", { name: copy.reload, exact: true }).click();
    await expect(card).toContainText(copy.unavailable);
    await expect(card.locator("form")).toHaveCount(0);
  });

  test(`${locale} language changes retain an unsaved private draft and detect newer versions`, async ({ page }) => {
    const mock = await fixture(page);
    await page.goto(`/${locale}/my-msrc`);
    await page.getByTestId("participant-profile-card").getByRole("button", { name: copy.edit, exact: true }).click();
    await chooseOther(page, locale, "Synthetic bilingual draft");
    await page.locator("#profile-status").selectOption("year_4");
    await page.getByRole("button", { name: specialties[0].label, exact: true }).click();
    const other = locale === "en" ? "ar" : "en";
    await (await languageLink(page, other === "ar" ? "View this page in Arabic" : "View this page in English")).click();
    await expect(page).toHaveURL(new RegExp(`/${other}/my-msrc$`));
    await expect(page.locator("#profile-institutionOther")).toHaveValue("Synthetic bilingual draft");
    await expect(page.locator("#profile-status")).toHaveValue("year_4");
    await expect(page.getByRole("button", { name: specialties[0].label, exact: true })).toHaveAttribute("aria-pressed", "true");
    mock.advance();
    await (await languageLink(page, locale === "ar" ? "View this page in Arabic" : "View this page in English")).click();
    await expect(page.getByTestId("participant-profile-card").getByRole("alert")).toContainText(copy.conflict);
    await expect(page.locator("#profile-institutionOther")).toHaveValue("Synthetic bilingual draft");
    await expect(page.locator("#profile-institutionOther")).toBeDisabled();
    expect(mock.saves()).toBe(0);
  });

  test(`${locale} retry after an uncertain save detects a newer version without overwriting edits`, async ({ page }) => {
    const mock = await fixture(page); await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await chooseOther(page, locale, "Synthetic uncertain-save draft"); mock.fail("unavailable");
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.getByRole("alert")).toContainText(copy.error); mock.advance();
    await card.getByRole("button", { name: copy.retry, exact: true }).click();
    await expect(card.getByRole("alert")).toContainText(copy.conflict);
    await expect(page.locator("#profile-institutionOther")).toHaveValue("Synthetic uncertain-save draft");
    await expect(page.locator("#profile-institutionOther")).toBeDisabled(); expect(mock.saves()).toBe(1);
  });

  test(`${locale} a removed specialty can still be cleared before saving another field`, async ({ page }) => {
    const mock = await fixture(page); await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await card.getByRole("button", { name: specialties[0].label, exact: true }).click();
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator("form")).toHaveCount(0); mock.hideCatalog(); await page.reload();
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(card).toContainText(copy.interestsUnavailable);
    await card.getByRole("button", { name: copy.clearInterests, exact: true }).click();
    await chooseOther(page, locale, "Synthetic Institution after catalog change");
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator("form")).toHaveCount(0); await expect(card.locator("progress")).toHaveAttribute("value", "1"); expect(mock.saves()).toBe(2);
  });
}
