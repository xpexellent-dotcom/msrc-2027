import AxeBuilder from "@axe-core/playwright";
import { expectHeaderSettled } from "../helpers/header";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "../helpers/csp";
import { expectStylesheetsReady } from "../helpers/stylesheets";
import { participantAnnouncementsCopy } from "../../src/features/announcements/participant-copy";
import { participantCopy } from "../../src/features/participant-accounts/participant-copy";
import { profileCopy } from "../../src/features/participant-accounts/profile-copy";
import { SAUDI_UNIVERSITIES } from "../../src/content/saudi-universities";
import { EMPTY_PARTICIPANT_PROFILE, type OptionalParticipantProfile, type ParticipantProfileResponse } from "../../src/features/participant-accounts/profile-contract";
import { languageLink } from "../e2e/helpers/header-navigation";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOwlMv9DwADHAHESsQ2AwAAAABJRU5ErkJggg==", "base64");
/** Synthetic fixture labels only, never a replacement for the configured abstract specialty list. */
const specialties = Array.from({ length: 6 }, (_, index) => ({ id: `synthetic-${index}`, label: `Synthetic specialty ${index + 1}` }));

async function fixture(
  page: Page,
  account = { name: "Synthetic Participant", email: "synthetic@example.invalid" },
  { latinNameAvailable = true, professionalStatusesAvailable = false } = {},
) {
  let profile: OptionalParticipantProfile = { ...EMPTY_PARTICIPANT_PROFILE };
  let unavailable = false;
  let failure: "conflict" | "unavailable" | null = null;
  let saves = 0;
  let catalog = latinNameAvailable ? specialties : specialties.slice(0, 1);
  const ready = (): ParticipantProfileResponse => ({
    state: "ready", profile, specialties: catalog, formToken: "synthetic-profile-token", latinNameAvailable,
    ...(professionalStatusesAvailable ? { professionalStatusesAvailable } : {}),
  });
  await page.route("**/api/participant-accounts", async (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    state: "ready", formToken: "synthetic-account-token", profileEnabled: true,
    profile: { ...account, accountState: "verified", createdAt: "2026-10-25T10:00:00Z" },
  }) }));
  await page.route("**/api/participant-accounts/profile/avatar?*", async (route) => route.fulfill({ contentType: "image/png", body: png, headers: { "cache-control": "private, no-store" } }));
  await page.route("**/api/participant-accounts/profile", async (route) => {
    let result = ready();
    if (unavailable) result = { state: "area-not-ready" };
    else if (route.request().method() === "POST") {
      saves += 1;
      if (failure) { result = { state: failure, formToken: "synthetic-profile-token" }; failure = null; }
      else {
        const request = new Request("http://synthetic.invalid", { method: "POST", headers: route.request().headers(), body: new Uint8Array(route.request().postDataBuffer()!) });
        const data = await request.formData();
        expect(data.get("action")).toBe("save"); expect(data.get("formToken")).toBe("synthetic-profile-token"); expect(data.get("website")).toBe(""); expect(data.get("version")).toBe(String(profile.version));
        expect(data.has("latinName")).toBe(latinNameAvailable);
        const status = data.get("status") as OptionalParticipantProfile["status"];
        profile = { ...profile, institutionId: String(data.get("institutionId")) || null, institutionOther: String(data.get("institutionOther")).trim() || null, institution: String(data.get("institutionOther")).trim() || null,
          status: status || null, year: null, arabicName: String(data.get("arabicName") ?? "").trim() || null,
          latinName: String(data.get("latinName") ?? "").trim() || null, nationality: String(data.get("nationality")) || null,
          gender: String(data.get("gender")) as OptionalParticipantProfile["gender"] || null, dateOfBirth: String(data.get("dateOfBirth")) || null, city: String(data.get("city")).trim() || null, phone: String(data.get("phone")) || null,
          identityType: data.get("removeIdentity") === "true" ? null : String(data.get("identityType")) as OptionalParticipantProfile["identityType"] || null,
          identityLast4: data.get("removeIdentity") === "true" ? null : data.get("identityNumber") ? String(data.get("identityNumber")).slice(-4) : profile.identityLast4,
          interests: JSON.parse(String(data.get("interests"))), version: profile.version + 1,
          avatarUrl: data.get("avatar") ? `/api/participant-accounts/profile/avatar?v=${profile.version + 1}` : data.get("removeAvatar") === "true" ? null : profile.avatarUrl };
        expect(profile.interests.every((id) => catalog.some((option) => option.id === id))).toBe(true);
        result = ready();
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

async function accessible(page: Page, scope = '[data-testid="participant-profile-card"]') {
  await expectHeaderSettled(page);
  await expectStylesheetsReady(page);
  expect((await new AxeBuilder({ page }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

for (const locale of ["en", "ar"] as const) {
  const copy = profileCopy[locale];
  test(`${locale} dashboard links reach private sections and honor each workflow flag`, async ({ page }, testInfo) => {
    const account = {
      name: locale === "ar" ? "دانا الحربي" : "Dana Alharbi",
      email: "dana.alharbi@example.invalid",
    };
    await fixture(page, account);
    await page.route("**/api/announcements?locale=*", (route) =>
      route.fulfill({ json: { state: "ready", announcements: [], formToken: "synthetic-inbox-token" } }));

    await page.goto(`/${locale}/my-msrc`);
    const main = page.getByRole("main");
    const profileCard = main.getByTestId("participant-profile-card");
    const nextSteps = main.getByTestId("participant-next-steps");
    const inbox = main.getByTestId("participant-announcements");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.getByTestId("participant-profile-name")).toHaveText(account.name);
    await expect(main.getByTestId("participant-profile-email").locator("bdi")).toHaveAttribute("dir", "ltr");
    await expect(main.getByTestId("participant-profile-email")).toHaveText(account.email);
    await expect(main.getByTestId("participant-member-since")).toBeVisible();
    await expect(profileCard.locator("progress")).toHaveAttribute("value", "0");
    await expect(inbox).toContainText(participantAnnouncementsCopy[locale].empty);
    await expect(main.getByRole("link", { name: participantCopy[locale].links["sign-in"], exact: true })).toHaveCount(0);
    await expect(main.getByRole("button", { name: participantCopy[locale].signOut, exact: true })).toBeEnabled();

    const steps = [
      ["attend", "false", "/registration"],
      ["abstract", "true", "/abstracts/submit"],
      ["workshops", "false", "/workshops"],
      ["hackathon", "false", "/hackathon"],
      ["three-minute-thesis", "false", "/3mt"],
    ];
    await expect(nextSteps.getByRole("listitem")).toHaveCount(steps.length);
    for (const [step, open, path] of steps) {
      const item = nextSteps.locator(`[data-step="${step}"]`);
      await expect(item).toHaveAttribute("data-open", open);
      await expect(item.getByRole("link")).toHaveAttribute("href", `/${locale}${path}`);
    }
    await expect(main.locator("#my-bookings").getByRole("button")).toHaveCount(0);

    await accessible(page, "main");
    await page.evaluate(async () => { await document.fonts.ready; });
    const directory = resolve(".tools/profile-review");
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: resolve(directory, `${locale}-${testInfo.project.name}-dashboard.png`), fullPage: true, scale: "css" });

    const navigation = main.getByRole("navigation").filter({ has: page.locator('a[href="#participation"]') });
    await expect(navigation).toHaveAccessibleName(/\S/);
    for (const target of ["profile", "participation", "my-bookings", "announcements"]) {
      const shortcut = navigation.locator(`a[href="#${target}"]`);
      await shortcut.press("Enter");
      await expect(page).toHaveURL(new RegExp(`#${target}$`));
      const destination = main.locator(`#${target}`);
      await expect(destination).toBeInViewport();
      await expect(destination).toBeFocused();
    }
    const edit = profileCard.getByRole("button", { name: copy.edit, exact: true });
    await edit.click();
    await expect(page.locator("#participant-profile-editor-title")).toBeFocused();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expectHeaderSettled(page);
    await page.screenshot({ path: resolve(directory, `${locale}-${testInfo.project.name}-editor-overview.png`), fullPage: true, scale: "css" });

    const cancelEditing = profileCard.getByRole("button", { name: copy.cancelEditing, exact: true });
    await expect(cancelEditing).toHaveAttribute("aria-expanded", "true");
    await cancelEditing.press("Enter");
    await expect(profileCard.locator("form")).toHaveCount(0);
    await expect(edit).toBeFocused();
    await expect(edit).toHaveAttribute("aria-expanded", "false");

    await edit.click();
    await profileCard.getByRole("button", { name: copy.cancel, exact: true }).click();
    await expect(edit).toBeFocused();

    account.email = `${"participant".repeat(12)}@example.invalid`;
    await page.reload();
    await expect(main.getByTestId("participant-profile-email")).toHaveText(account.email);
    await expect(profileCard.locator("progress")).toHaveAttribute("value", "0");
    await expect(inbox).toContainText(participantAnnouncementsCopy[locale].empty);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await accessible(page, "main");
  });

  test(`${locale} legacy profiles still save and load private avatars before the name migration`, async ({ page }) => {
    const mock = await fixture(page, undefined, { latinNameAvailable: false });
    await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    const progress = card.locator("progress");
    const edit = card.getByRole("button", { name: copy.edit, exact: true });
    const arabicName = card.getByRole("textbox", { name: copy.arabicName, exact: true });
    const latinName = card.getByRole("textbox", { name: copy.latinName, exact: true });
    await expect(progress).toHaveAttribute("max", "11");
    await edit.click();
    await expect(arabicName).toBeVisible();
    await expect(latinName).toHaveCount(0);

    const savedName = "دانا الحربي";
    await arabicName.fill(savedName);
    await page.locator("#profile-avatar").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: png });
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(progress).toHaveAttribute("value", "2");
    await expect(progress).toHaveAttribute("max", "11");
    expect(mock.saves()).toBe(1);
    const avatar = card.locator('.participant-profile-avatar img[src="/api/participant-accounts/profile/avatar?v=1"]');
    await expect(avatar).toHaveJSProperty("naturalWidth", 1);

    await edit.click();
    await expect(arabicName).toHaveValue(savedName);
    await expect(latinName).toHaveCount(0);
    await accessible(page);
  });

  test(`${locale} profile prefills the signup name by script and preserves saved spellings`, async ({ page }) => {
    const account = {
      name: locale === "en" ? "دانا عبد الرحمن" : "Élodie Smith-Jones",
      email: "synthetic@example.invalid",
    };
    const mock = await fixture(page, account);
    await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    const progress = card.locator("progress");
    const edit = card.getByRole("button", { name: copy.edit, exact: true });
    const save = card.getByRole("button", { name: copy.save, exact: true });
    const arabicName = card.getByRole("textbox", { name: copy.arabicName, exact: true });
    const latinName = card.getByRole("textbox", { name: copy.latinName, exact: true });

    await edit.click();
    await expect(arabicName).toHaveValue(locale === "en" ? account.name : "");
    await expect(latinName).toHaveValue(locale === "ar" ? account.name : "");
    await expect(locale === "en" ? arabicName : latinName).toHaveAccessibleDescription(copy.nameFromSignup);
    await expect(arabicName).toHaveAttribute("dir", "rtl");
    await expect(latinName).toHaveAttribute("dir", "ltr");
    await expect(progress).toHaveAttribute("value", "0");
    await expect(progress).toHaveAttribute("max", "12");
    expect(mock.saves()).toBe(0);

    const savedArabicName = "دانا الحربي";
    const savedLatinName = "Élodie Alharbi";
    await arabicName.fill(savedArabicName);
    await latinName.fill("Dana دانا");
    await save.click();
    await expect(latinName).toHaveAttribute("aria-invalid", "true");
    await expect(latinName).toHaveAccessibleDescription(copy.invalidLatinName);
    await expect(card.getByRole("alert")).toBeFocused();
    expect(mock.saves()).toBe(0);

    await latinName.fill(savedLatinName);
    await save.click();
    await expect(progress).toHaveAttribute("value", "2");
    expect(mock.saves()).toBe(1);

    await page.reload();
    await edit.click();
    await expect(arabicName).toHaveValue(savedArabicName);
    await expect(latinName).toHaveValue(savedLatinName);
    await expect(page.getByTestId("participant-profile-name")).toHaveText(account.name);
    await accessible(page);
  });

  test(`${locale} consultant and specialist statuses can be selected and saved`, async ({ page }) => {
    const mock = await fixture(page, undefined, { professionalStatusesAvailable: true });
    await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card");
    const edit = card.getByRole("button", { name: copy.edit, exact: true });
    const form = card.locator("form");
    const status = card.locator("#profile-status");
    const statuses = locale === "en"
      ? { consultant: "Consultant", specialist: "Specialist" }
      : { consultant: "استشاري", specialist: "أخصائي" };
    await edit.click();

    for (const [value, label] of Object.entries(statuses)) {
      await expect(status.locator(`option[value="${value}"]`)).toHaveText(label);
      await status.selectOption({ label });
      await expect(status).toHaveValue(value);
      await card.getByRole("button", { name: copy.save, exact: true }).click();
      await expect(form).toHaveCount(0);
      await expect(card.locator("progress")).toHaveAttribute("value", "2");

      await page.reload();
      await edit.click();
      await expect(status).toHaveValue(value);
    }
    expect(mock.saves()).toBe(2);
  });

  test(`${locale} university combobox searches both languages and supports keyboard selection`, async ({ page }) => {
    await fixture(page); await page.goto(`/${locale}/my-msrc`);
    const card = page.getByTestId("participant-profile-card"); await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await expect(card.locator('#profile-status option:is([value="consultant"], [value="specialist"])')).toHaveCount(0);
    const input = page.locator("#profile-institution"), university = SAUDI_UNIVERSITIES.find((item) => item.id === "king-abdulaziz")!;
    await input.fill(locale === "en" ? "عَبْدالعَزيز" : "ABDULAZIZ");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(card.getByRole("option", { name: university[locale === "ar" ? "nameAr" : "nameEn"], exact: true })).toBeVisible();
    await input.press("ArrowDown"); await expect(input).toBeFocused(); await input.press("Enter");
    await expect(input).toHaveValue(university[locale === "ar" ? "nameAr" : "nameEn"]); await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#profile-institutionOther")).toHaveCount(0);
    await card.getByRole("button", { name: copy.save, exact: true }).click(); await expect(card.locator("progress")).toHaveAttribute("value", "2");
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
    const phone = page.locator("#profile-phone");
    await expect(phone).toHaveAccessibleDescription("");
    await expect(card.locator("#profile-phone-hint")).toHaveCount(0);
    await phone.fill("+966500000000");

    const identityType = page.locator("#profile-identityType");
    const identityNumber = page.locator("#profile-identityNumber");
    const identityFormat = card.locator("#profile-identity-format");
    await expect(identityNumber).toHaveJSProperty("placeholder", "");
    await expect(identityFormat).toHaveCount(0);
    await identityType.focus();
    await page.keyboard.press("Tab");
    await expect(identityNumber).toBeFocused();
    for (const [type, example] of [["passport", "A1234567"], ["iqama", "2XXXXXXXXX"], ["national_id", "1XXXXXXXXX"]] as const) {
      await identityType.selectOption(type);
      await expect(identityNumber).toHaveAttribute("placeholder", example);
      await expect(identityNumber).toHaveAccessibleDescription(copy.identityFormats[type]);
    }
    await expect(identityFormat).toHaveClass(/\bsr-only\b/);
    await expect(card.locator("#profile-identityNumber-hint")).toHaveCount(0);
    await expect(identityNumber).toHaveAttribute("dir", "ltr");
    expect(await identityNumber.evaluate((input) => getComputedStyle(input, "::placeholder").color)).toBe("rgb(100, 91, 112)");
    await identityNumber.fill("100");
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator("#profile-identityNumber-error")).toContainText(copy.identityFormats.national_id);
    expect(mock.saves()).toBe(0);
    await identityNumber.fill("1000004321");
    for (const option of specialties.slice(0, 5)) await card.getByRole("button", { name: option.label, exact: true }).click();
    await expect(card.getByRole("button", { name: specialties[5].label, exact: true })).toBeDisabled();
    await page.locator("#profile-avatar").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: png });
    await expect(card.getByAltText(copy.preview)).toHaveAttribute("src", /^data:image\/png;base64,/);
    await accessible(page);
    if (testInfo.project.name === "profile-mobile") await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    await accessible(page);
    const directory = resolve(".tools/profile-review"); await mkdir(directory, { recursive: true });
    await card.screenshot({ path: resolve(directory, `${locale}-${testInfo.project.name}-editor.png`), scale: "css" });

    await page.locator("#profile-latinName").clear();
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator("progress")).toHaveAttribute("value", "11");
    await expect(card.getByText(copy.complete, { exact: true })).toHaveCount(0);
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await page.locator("#profile-latinName").fill("Synthetic Participant");
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    await expect(card.getByText(copy.complete, { exact: true })).toBeVisible();
    await expect(card.locator("progress")).toHaveAttribute("value", "12");
    await expect(card.locator("form")).toHaveCount(0);
    await expect(card.getByRole("button", { name: copy.edit, exact: true })).toBeFocused();
    await expect(page.getByTestId("header-primary-action").locator("img")).toHaveAttribute("src", /avatar\?v=1$/);
    await card.getByRole("button", { name: copy.edit, exact: true }).click();
    await card.getByRole("button", { name: copy.remove, exact: true }).click();
    await card.getByRole("button", { name: copy.clearInstitution, exact: true }).click(); await page.locator("#profile-status").selectOption("");
    for (const field of ["arabicName", "latinName", "dateOfBirth", "city", "phone"]) await page.locator("#profile-" + field).fill("");
    await page.locator("#profile-nationality").selectOption(""); await page.locator("#profile-gender").selectOption("");
    await expect(identityNumber).toHaveValue("");
    await expect(identityNumber).toHaveAccessibleDescription(/4321/);
    await card.getByRole("button", { name: copy.removeIdentity, exact: true }).click();
    for (const option of specialties.slice(0, 5)) await card.getByRole("button", { name: option.label, exact: true }).click();
    await card.getByRole("button", { name: copy.save, exact: true }).click();
    await expect(card.locator("progress")).toHaveAttribute("value", "0");
    await expect(page.getByTestId("header-primary-action").locator("img")).toHaveCount(0);
    await expect(page.getByTestId("header-primary-action").locator("bdi")).toHaveText("SP");
    await accessible(page);
    expect(mock.saves()).toBe(3);
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
    await expect(card.locator("form")).toHaveCount(0); await expect(card.locator("progress")).toHaveAttribute("value", "2"); expect(mock.saves()).toBe(2);
  });
}
