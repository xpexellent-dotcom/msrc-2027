import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// SCP-02, CMS-04, LOC-01/03, ACC-01, MED-01/04: approved roster content,
// usable committee controls and an accessible member dialog on every breakpoint.
const scientificOrder = ["aishah-baothman", "akram-awan", "amal-sayqal", "heba-mousa", "laura-hamadi", "mohammad-alsayegh", "omar-alsaggaf", "reem-albeladi", "toleen-alhindi"];
const organizationOrder = ["areen-youssef", "esraa-metwalli", "hanadi-orayf", "lara-qawas", "majed-aljabri", "noor-faisal-alquait", "ola-altaib", "sara-qadi", "sarah-tayeb", "sulaf-alghamdi"];

async function ready(page: Page, locale: "en" | "ar") {
  const response = await page.goto(`/${locale}/team`);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".msrc-team-page")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function assertContained(page: Page, selector: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  const clipped = await page.locator(selector).evaluateAll((elements) => elements.some((element) => {
    if (element.getClientRects().length === 0) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    return Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
  }));
  expect(clipped, "Names, quotes and controls remain inside the viewport").toBe(false);
}

async function activate(control: Locator, isMobile: boolean) {
  if (isMobile) await control.tap();
  else await control.click();
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale} team preserves its two committees, alphabetical leads and supplied profile content`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, locale);
    const team = page.locator(".msrc-team-page");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(team.locator(".msrc-team-person")).toHaveCount(21);
    await expect(team.locator(".msrc-team-conference-leader")).toHaveCount(2);
    await expect(team.locator(".msrc-team-lead")).toHaveCount(19);
    for (const [committee, order] of [["scientific", scientificOrder], ["organization", organizationOrder]] as const) {
      const section = team.locator(`.msrc-team-committee[data-committee="${committee}"]`);
      await expect(section).toBeVisible();
      expect(await section.locator(".msrc-team-lead").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-person-id"))))
        .toEqual(order);
      await expect(section.locator(".msrc-team-conference-leader")).toHaveCount(1);
    }
    const scientificBounds = (await team.locator('[data-committee="scientific"]').boundingBox())!;
    const organizationBounds = (await team.locator('[data-committee="organization"]').boundingBox())!;
    expect(Math.abs(scientificBounds.width - organizationBounds.width), "Both committees receive equal space").toBeLessThan(2);
    if ((page.viewportSize()?.width ?? 0) >= 850) {
      expect(Math.abs(scientificBounds.y - organizationBounds.y)).toBeLessThan(2);
      expect(locale === "ar" ? scientificBounds.x > organizationBounds.x : scientificBounds.x < organizationBounds.x).toBe(true);
    } else {
      expect(organizationBounds.y).toBeGreaterThanOrEqual(scientificBounds.y + scientificBounds.height - 1);
    }
    for (const id of ["hanadi-orayf", "areen-youssef", "lara-qawas"]) {
      await expect(team.locator(`.msrc-team-committee[data-committee="organization"] [data-person-id="${id}"]`)).toHaveCount(1);
      await expect(team.locator(`.msrc-team-committee[data-committee="scientific"] [data-person-id="${id}"]`)).toHaveCount(0);
    }
    const akram = team.locator('[data-person-id="akram-awan"]');
    await expect(akram.locator(".msrc-team-description")).toContainText("The numbers are being difficult");
    const quote = akram.locator(".msrc-team-description");
    await expect(quote).toHaveText('"The numbers are being difficult"');
    await expect(quote).toHaveAttribute("lang", "en");
    await expect(quote).toHaveAttribute("dir", "ltr");
    expect(await quote.evaluate((element) => getComputedStyle(element.matches("em") ? element : element.querySelector("em") ?? element).fontStyle)).toBe("italic");
    await expect(akram.locator(".msrc-team-profile")).toHaveAttribute("href", "https://www.linkedin.com/in/akram-awan-233a7b2bb/");
    for (const profile of await team.locator(".msrc-team-profile").all()) {
      const url = new URL((await profile.getAttribute("href"))!);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("www.linkedin.com");
      await expect(profile).toHaveAttribute("rel", /noopener/);
    }
    const laura = team.locator('[data-person-id="laura-hamadi"]');
    await expect(laura.locator(".msrc-team-co-leaders")).toContainText("Mohammad Almehmadi");
    await expect(team.locator(".msrc-team-description")).not.toHaveCount(0);
    for (const description of await team.locator(".msrc-team-description").all()) {
      await expect(description).toHaveAttribute("lang", "en");
      await expect(description).toHaveAttribute("dir", "ltr");
    }

    const scientific = team.locator('.msrc-team-filter[data-view-choice="scientific"]');
    const organization = team.locator('.msrc-team-filter[data-view-choice="organization"]');
    const both = team.locator('.msrc-team-filter[data-view-choice="both"]');
    await scientific.focus();
    await page.keyboard.press("Enter");
    await expect(scientific).toHaveAttribute("aria-pressed", "true");
    await expect(team.locator('[data-committee="scientific"]')).toBeVisible();
    await expect(team.locator('[data-committee="organization"]')).toBeHidden();
    await activate(organization, isMobile);
    await expect(organization).toHaveAttribute("aria-pressed", "true");
    await expect(team.locator('[data-committee="scientific"]')).toBeHidden();
    await expect(team.locator('[data-committee="organization"]')).toBeVisible();
    await both.focus();
    await page.keyboard.press("Space");
    await expect(both).toHaveAttribute("aria-pressed", "true");
    await expect(team.locator('[data-committee="scientific"]')).toBeVisible();
    await expect(team.locator('[data-committee="organization"]')).toBeVisible();
    await assertContained(page, ".msrc-team-page h1, .msrc-team-page h2, .msrc-team-page h3, .msrc-team-description, .msrc-team-filter");
  });

  test(`${locale} local portraits decode in a consistent four-to-five frame and absent photos stay honest`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, locale);
    const team = page.locator(".msrc-team-page");
    const images = team.locator(".msrc-team-portrait img");
    await expect(images).toHaveCount(12);
    await expect(team.locator(".msrc-team-portrait--pending")).toHaveCount(9);
    await expect(team.locator(".msrc-team-portrait--pending img")).toHaveCount(0);
    for (const image of await images.all()) {
      // Lazy-loaded lower rows must first enter the viewport before decoding.
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
      await expect(image).toHaveAttribute("alt", /\S/);
      expect(await image.evaluate((element: HTMLImageElement) => new URL(element.currentSrc).origin)).toBe(new URL(page.url()).origin);
    }
    for (const frame of await team.locator(".msrc-team-portrait").all()) {
      const bounds = (await frame.boundingBox())!;
      expect(bounds.width / bounds.height).toBeCloseTo(4 / 5, 2);
    }
  });

  test(`${locale} member dialog supports touch, keyboard containment, Escape and deliberate backdrop dismissal`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, locale);
    const trigger = page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.locator("dialog.msrc-team-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("open");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const close = dialog.locator(".feedback-dialog-heading button");
    await expect(close).toBeFocused();
    await expect(dialog.locator(".msrc-team-dialog-member")).toHaveCount(3);
    await expect(dialog).toContainText(locale === "en" ? "Fatima Alshuqayfi" : "فاطمه الشقيفي");
    await expect(dialog).toContainText(locale === "en" ? "Rama Alghamdi" : "رامه الغامدي");
    await expect(dialog).toContainText(locale === "en" ? "Tamara Alsindi" : "تمارا السندي");
    for (const key of ["Shift+Tab", "Tab", "Tab", "Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    await dialog.getByRole("heading", { level: 2 }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollBefore)).toBeLessThan(2);

    await activate(trigger, isMobile);
    await expect(dialog).toBeVisible();
    const point = await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top > 4) return { x: window.innerWidth / 2, y: bounds.top / 2 };
      if (bounds.left > 4) return { x: bounds.left / 2, y: window.innerHeight / 2 };
      return { x: window.innerWidth / 2, y: (bounds.bottom + window.innerHeight) / 2 };
    });
    if (isMobile) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test(`${locale} team and long member lists reflow at 320 pixels and double text size`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 850 });
    await ready(page, locale);
    for (const size of ["", "200%"]) {
      await page.evaluate((fontSize) => { document.documentElement.style.fontSize = fontSize; }, size);
      await assertContained(page, ".msrc-team-page h1, .msrc-team-page h2, .msrc-team-page h3, .msrc-team-description, .msrc-team-filter, .msrc-team-view-members");
    }
    const trigger = page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.locator("dialog.msrc-team-dialog");
    await expect(dialog).toBeVisible();
    const list = dialog.locator(".msrc-team-dialog-members");
    // Temporary DOM-only stress data tests the public layout without publishing
    // synthetic people or adding a fixture route to the application.
    await list.evaluate((element, lang) => {
      const sample = element.querySelector("li")!;
      for (let index = 0; index < 80; index++) {
        const member = sample.cloneNode(true) as HTMLElement;
        member.textContent = lang === "ar" ? `عضو تجريبي ${index} ${"اسمطويل".repeat(20)}` : `Synthetic member ${index} ${"LongName".repeat(20)}`;
        element.append(member);
      }
    }, locale);
    await expect(list.locator(".msrc-team-dialog-member")).toHaveCount(83);
    const dialogBounds = (await dialog.boundingBox())!;
    expect(dialogBounds.x).toBeGreaterThanOrEqual(-1);
    expect(dialogBounds.y).toBeGreaterThanOrEqual(-1);
    expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(321);
    expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(851);
    expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await list.focus();
    await page.keyboard.press("End");
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(dialog.locator(".feedback-dialog-heading button")).toBeVisible();
    await assertContained(page, ".msrc-team-dialog h2, .msrc-team-dialog-member, .msrc-team-dialog button");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test(`${locale} team has no automated accessibility violations with the member dialog closed or open`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, locale);
    for (const state of ["closed", "open"] as const) {
      if (state === "open") {
        await page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members').click();
        await expect(page.locator("dialog.msrc-team-dialog")).toBeVisible();
      }
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      await testInfo.attach(`${locale}-team-${state}-accessibility`, {
        body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2),
        contentType: "application/json",
      });
      expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    }
  });
}

test("team member dialog survives interrupted motion and changes to reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page, "en");
  const trigger = page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
  const dialog = page.locator("dialog.msrc-team-dialog");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveAttribute("open");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dialog.locator(".feedback-dialog-heading button").click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
