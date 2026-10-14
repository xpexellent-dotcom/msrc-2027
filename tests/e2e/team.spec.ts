import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { languageLink } from "./helpers/header-navigation";

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

async function assertCommitteeView(page: Page, view: "both" | "scientific" | "organization") {
  const team = page.locator(".msrc-team-page");
  await expect(team).toHaveAttribute("data-view", view);
  await expect(team.locator(`.msrc-team-filter[data-view-choice="${view}"]`)).toHaveAttribute("aria-pressed", "true");
  for (const committee of ["scientific", "organization"] as const) {
    const section = team.locator(`.msrc-team-committee[data-committee="${committee}"]`);
    if (view === "both" || view === committee) await expect(section).toBeVisible();
    else await expect(section).toBeHidden();
  }
}

async function addStressMembers(list: Locator, locale: "en" | "ar") {
  await list.evaluate((element, lang) => {
    const sample = element.querySelector("li")!;
    for (let index = 0; index < 80; index++) {
      const member = sample.cloneNode(true) as HTMLElement;
      member.textContent = lang === "ar" ? `عضو تجريبي ${index} ${"اسمطويل".repeat(20)}` : `Synthetic member ${index} ${"LongName".repeat(20)}`;
      element.append(member);
    }
  }, locale);
  await expect(list.locator(".msrc-team-dialog-member")).toHaveCount(83);
}

async function imageSlot(image: Locator) {
  return image.evaluate((element: HTMLImageElement) => {
    const sizes = element.getAttribute("sizes") ?? "";
    let depth = 0;
    let start = 0;
    const parts: string[] = [];
    for (let index = 0; index < sizes.length; index++) {
      if (sizes[index] === "(") depth++;
      else if (sizes[index] === ")") depth--;
      else if (sizes[index] === "," && depth === 0) {
        parts.push(sizes.slice(start, index).trim());
        start = index + 1;
      }
    }
    parts.push(sizes.slice(start).trim());
    const chosen = parts.find((part) => {
      // Native lazy-image auto sizing uses the actual rendered slot. Resolve
      // its explicit fallback separately for browsers that do not support auto.
      if (part === "auto") return false;
      const conditional = part.match(/^(\([^)]*\)(?:\s+and\s+\([^)]*\))*)\s+(.+)$/);
      return conditional ? matchMedia(conditional[1]).matches : true;
    }) ?? "";
    const conditional = chosen.match(/^(\([^)]*\)(?:\s+and\s+\([^)]*\))*)\s+(.+)$/);
    const length = conditional?.[2] ?? chosen;
    if (!CSS.supports("width", length)) throw new Error(`Unusable image slot declaration: ${sizes}`);
    const probe = document.createElement("div");
    probe.style.cssText = "all:initial;position:fixed;visibility:hidden;height:1px;";
    probe.style.width = length;
    document.body.append(probe);
    const slot = probe.getBoundingClientRect().width;
    probe.remove();
    const frame = element.closest(".msrc-team-portrait")!.getBoundingClientRect().width;
    return { sizes, slot, frame };
  });
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
    // Owner design pass: quotes are upright, never italic.
    expect(await quote.evaluate((element) => getComputedStyle(element).fontStyle)).toBe("normal");
    for (const photoLink of await team.locator(".msrc-team-portrait-link").all()) await expect(photoLink).toHaveAttribute("tabindex", "-1");
    await expect(akram.locator(".msrc-team-profile")).toHaveAttribute("href", "https://www.linkedin.com/in/akram-awan-233a7b2bb/");
    for (const profile of await team.locator(".msrc-team-profile").all()) {
      const url = new URL((await profile.getAttribute("href"))!);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("www.linkedin.com");
      await expect(profile).toHaveAttribute("rel", /noopener/);
    }
    const laura = team.locator('[data-person-id="laura-hamadi"]');
    await expect(laura.locator(".msrc-team-co-leaders")).toContainText("Mohammed Almohmadi");
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
    await page.emulateMedia({ media: "print" });
    const printedAccent = page.locator("#msrc-team-title > span").nth(1);
    await expect(printedAccent).toBeVisible();
    expect(await printedAccent.evaluate((element) => getComputedStyle(element).getPropertyValue("-webkit-text-fill-color").trim())).toMatch(/\S/);
    expect(await printedAccent.evaluate((element) => {
      const fill = getComputedStyle(element).getPropertyValue("-webkit-text-fill-color").trim();
      return fill === "transparent" || /^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(fill);
    }), "The second title line has a visible text fill when its screen gradient is removed for print").toBe(false);
    await page.emulateMedia({ media: "screen" });
  });

  test(`${locale} local portraits decode in a consistent four-to-five frame and absent photos stay honest`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, locale);
    const team = page.locator(".msrc-team-page");
    const images = team.locator(".msrc-team-portrait img");
    await expect(images).toHaveCount(12);
    const coLeaderPhoto = team.locator(".msrc-team-co-leader-photo img");
    await expect(coLeaderPhoto).toHaveCount(1);
    await coLeaderPhoto.scrollIntoViewIfNeeded();
    await expect.poll(() => coLeaderPhoto.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
    await expect(coLeaderPhoto).toHaveAttribute("alt", "");
    await expect(team.locator(".msrc-team-co-leader-photo")).toHaveAttribute("aria-hidden", "true");
    await expect(team.locator(".msrc-team-portrait img, .msrc-team-co-leader-photo img")).toHaveCount(13);
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
    const backdropPoint = await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.top > 4
        ? { x: window.innerWidth / 2, y: bounds.top / 2 }
        : { x: bounds.left / 2, y: window.innerHeight / 2 };
    });
    await page.mouse.move(backdropPoint.x, backdropPoint.y);
    await page.mouse.wheel(0, 320);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await page.evaluate(() => window.scrollY), "Backdrop wheel input cannot scroll the document beneath the popup").toBe(scrollBefore);
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

    await page.mouse.move((page.viewportSize()?.width ?? 320) / 2, 8);
    await page.mouse.wheel(0, -180);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(scrollBefore - 20);
    await trigger.scrollIntoViewIfNeeded();

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
    await addStressMembers(list, locale);
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

  test(`${locale} committee selection survives sharing, reload, language navigation and browser history`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/team?ref=team-regression&committee=organization#msrc-team-organization`);
    await assertCommitteeView(page, "organization");
    await activate(page.locator('.msrc-team-filter[data-view-choice="scientific"]'), isMobile);
    await assertCommitteeView(page, "scientific");
    await expect.poll(() => new URL(page.url()).searchParams.get("committee")).toBe("scientific");
    expect(new URL(page.url()).searchParams.get("ref")).toBe("team-regression");
    expect(new URL(page.url()).hash).toBe("#msrc-team-organization");
    await page.reload();
    await assertCommitteeView(page, "scientific");

    const otherLocale = locale === "en" ? "ar" : "en";
    const language = await languageLink(page, locale === "en" ? "View this page in Arabic" : "View this page in English");
    const destination = new URL(page.url());
    destination.pathname = `/${otherLocale}/team`;
    await expect(language).toHaveAttribute("href", `${destination.pathname}${destination.search}${destination.hash}`);
    await language.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(destination.href);
    await expect(page.locator("html")).toHaveAttribute("dir", otherLocale === "ar" ? "rtl" : "ltr");
    await assertCommitteeView(page, "scientific");
    await activate(page.locator('.msrc-team-filter[data-view-choice="organization"]'), isMobile);
    await assertCommitteeView(page, "organization");
    await expect.poll(() => new URL(page.url()).searchParams.get("committee")).toBe("organization");

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}/team\\?`));
    await assertCommitteeView(page, "scientific");
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/${otherLocale}/team\\?`));
    await assertCommitteeView(page, "organization");
    expect(new URL(page.url()).searchParams.get("ref")).toBe("team-regression");
    expect(new URL(page.url()).hash).toBe("#msrc-team-organization");

    await activate(page.locator('.msrc-team-filter[data-view-choice="both"]'), isMobile);
    await assertCommitteeView(page, "both");
    expect([null, "both"]).toContain(new URL(page.url()).searchParams.get("committee"));
    await page.reload();
    await assertCommitteeView(page, "both");
    for (const value of ["invalid", "SCIENTIFIC", "organization%2Fprivate"]) {
      await page.goto(`/${locale}/team?ref=team-regression&committee=${value}#msrc-team-scientific`);
      await assertCommitteeView(page, "both");
      expect(new URL(page.url()).searchParams.get("ref")).toBe("team-regression");
    }
  });

  test(`${locale} a short viewport keeps the member heading and Close visible while the list scrolls`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const viewport of [{ width: 320, height: 480 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await ready(page, locale);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const trigger = page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
      await activate(trigger, isMobile);
      const dialog = page.locator("dialog.msrc-team-dialog");
      await expect(dialog).toBeVisible();
      const heading = dialog.getByRole("heading", { level: 2 });
      const close = dialog.locator(".feedback-dialog-heading button");
      const list = dialog.locator(".msrc-team-dialog-members");
      await addStressMembers(list, locale);
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(-1);
      expect(bounds.y).toBeGreaterThanOrEqual(-1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
      await expect(heading).toBeInViewport({ ratio: 1 });
      await expect(close).toBeInViewport({ ratio: 1 });
      const headingBefore = (await heading.boundingBox())!;
      const closeBefore = (await close.boundingBox())!;
      for (const control of [headingBefore, closeBefore]) {
        expect(control.x).toBeGreaterThanOrEqual(bounds.x - 1);
        expect(control.y).toBeGreaterThanOrEqual(bounds.y - 1);
        expect(control.x + control.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        expect(control.y + control.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
      }
      expect(await list.evaluate((element) => element.clientHeight)).toBeGreaterThan(0);
      expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
      await list.focus();
      await page.keyboard.press("End");
      await expect.poll(() => list.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThan(2);
      await expect(heading).toBeInViewport({ ratio: 1 });
      await expect(close).toBeInViewport({ ratio: 1 });
      expect(Math.abs((await heading.boundingBox())!.y - headingBefore.y)).toBeLessThan(2);
      expect(Math.abs((await close.boundingBox())!.y - closeBefore.y)).toBeLessThan(2);
      expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0);
      await assertContained(page, ".msrc-team-dialog h2, .msrc-team-dialog button");
      await close.focus();
      await page.keyboard.press("Enter");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  });

  test(`${locale} portrait download sizes follow the visible cards across wide and narrow committee views`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, locale);
    const image = page.locator('[data-person-id="akram-awan"] .msrc-team-portrait img');
    for (const width of [320, 791, 1280, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const view of ["both", "scientific"] as const) {
        await page.locator(`.msrc-team-filter[data-view-choice="${view}"]`).click();
        await assertCommitteeView(page, view);
        const { sizes, slot, frame } = await imageSlot(image);
        expect(sizes).toMatch(/^auto\s*,\s*\S/);
        await expect(image).toHaveAttribute("loading", "lazy");
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
        const selectedSource = await image.evaluate((element: HTMLImageElement) => element.currentSrc);
        expect(selectedSource).toMatch(/^https?:\/\//);
        expect(new URL(selectedSource).origin).toBe(new URL(page.url()).origin);
        expect(slot, `${width}px ${view}: source slot covers the rendered portrait`).toBeGreaterThanOrEqual(frame * .85);
        expect(slot, `${width}px ${view}: source slot avoids an oversized download`).toBeLessThanOrEqual(frame * 1.3);
      }
    }
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

test("pointer dialog dismissal retains the member content during its 160ms exit", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page, "en");
  const trigger = page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
  const dialog = page.locator("dialog.msrc-team-dialog");
  await activate(trigger, isMobile);
  await expect(dialog).toBeVisible();
  await dialog.evaluate((element) => {
    const probeWindow = window as typeof window & {
      teamExitProbe?: Promise<{ durations: number[]; content: string; count: number; opacity: number }>;
    };
    probeWindow.teamExitProbe = new Promise((resolve) => {
      element.addEventListener("close", () => {
        requestAnimationFrame(() => {
          const durations = element.getAnimations().filter((animation) => animation instanceof CSSTransition && ["opacity", "transform"].includes(animation.transitionProperty))
            .map((animation) => Number(animation.effect?.getTiming().duration));
          resolve({ durations, content: element.textContent ?? "", count: element.querySelectorAll(".msrc-team-dialog-member").length, opacity: Number(getComputedStyle(element).opacity) });
        });
      }, { once: true });
    });
  });
  await activate(dialog.locator(".feedback-dialog-heading button"), isMobile);
  const exit = await page.evaluate(async () => {
    const probeWindow = window as typeof window & {
      teamExitProbe?: Promise<{ durations: number[]; content: string; count: number; opacity: number }>;
    };
    return probeWindow.teamExitProbe!;
  });
  expect(exit.durations.length, "Native close keeps the visual exit animation active").toBeGreaterThan(0);
  for (const duration of exit.durations) expect(duration).toBe(160);
  expect(exit.opacity).toBeGreaterThan(0);
  expect(exit.count).toBe(3);
  expect(exit.content).toContain("Media & Design team");
  expect(exit.content).toContain("Fatima Alshuqayfi");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("changing reduced-motion preference stops optional team effects while the popup remains usable", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page, "en");
  const team = page.locator(".msrc-team-page");
  const trigger = team.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.hover();
  await activate(trigger, isMobile);
  const dialog = page.locator("dialog.msrc-team-dialog");
  await expect(dialog).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveCSS("transform", "none");
  expect(await dialog.evaluate((element) => getComputedStyle(element).transitionDuration.split(",").every((duration) => Number.parseFloat(duration) === 0))).toBe(true);
  expect(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").transitionDuration.split(",").every((duration) => Number.parseFloat(duration) === 0))).toBe(true);
  await expect(team.locator(".team-backdrop, .team-orb, .team-spot")).toHaveCount(0);
  expect(await team.locator(".msrc-team-roster").evaluate((element) => element.getAnimations({ subtree: true }).some((animation) => animation.playState === "running" || animation.pending))).toBe(false);
  await dialog.locator(".feedback-dialog-heading button").focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("member dismissal restores the initiating button when pointer activation does not focus it", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "en");
  const trigger = page.locator('[data-person-id="hanadi-orayf"] .msrc-team-view-members');
  await trigger.scrollIntoViewIfNeeded();
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  // Safari does not focus clicked buttons. Suppress Chromium's default focus
  // without suppressing activation to cover that same browser behavior.
  await trigger.evaluate((element) => element.addEventListener("mousedown", (event) => event.preventDefault(), { once: true }));
  await activate(trigger, isMobile);
  const dialog = page.locator("dialog.msrc-team-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".feedback-dialog-heading button")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
