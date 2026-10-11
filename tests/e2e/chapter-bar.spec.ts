import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareHeroCue } from "./helpers/hero-navigation";

// The Axiom demo replaces the chapter bar with the shared masthead and a native hero cue.
// Keep the destination, focus, history and readable section hierarchy covered on every device.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} the hero cue reaches practical details while ordinary scrolling stays native`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await expect(page.locator(".section-journey")).toHaveCount(0);
    const cue = await prepareHeroCue(page);
    await expect(cue).toBeVisible();
    expect((await cue.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await cue.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}#essentials$`));
    const details = page.locator("#essentials");
    await expect(details).toBeFocused();
    await expect(details).toBeInViewport();
    await expect(details.locator("dt")).toHaveCount(2);
    await expect(details.locator("dd").first()).toHaveText(/2027|٢٠٢٧/);
    expect((await new AxeBuilder({ page }).include("#essentials")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
    const position = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(position);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    await expect(page.locator("#hero-title")).toBeVisible();

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(page.locator(".section-journey")).toHaveCount(0);
  });

  test(`${locale} homepage sections retain ordered headings and five distinct participation destinations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const ids = ["participate", "program", "speakers", "legacy", "venue", "faq"];
    await expect(page.locator(".section-journey, .homepage-journey .chapter-number")).toHaveCount(0);
    const sections = page.locator(ids.map((id) => `section#${id}`).join(", "));
    expect(await sections.evaluateAll((elements) => elements.map((element) => element.id))).toEqual(ids);
    for (const id of ids) {
      const section = page.locator(`section#${id}`);
      const heading = section.getByRole("heading", { level: 2 });
      await expect(heading).toHaveCount(1);
      await expect(heading).toBeVisible();
      await expect(heading).toHaveAccessibleName(/\S+/);
      await expect(heading).toHaveAttribute("id", /\S+/);
      await expect(section).toHaveAttribute("aria-labelledby", (await heading.getAttribute("id"))!);
    }
    const pathways = page.locator(".pathway-card .pathway-action");
    await expect(pathways).toHaveCount(5);
    expect(await pathways.evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
      .toEqual(["registration", "submissions", "workshops", "hackathon", "3mt"].map((path) => `/${locale}/${path}`));
    await expect(page.locator(".pathways-archive-note")).toHaveCount(0);
    await expect(page.locator(".hero-countdown [data-countdown]")).toHaveCount(1);
    await expect(page.locator("#essentials [data-countdown]")).toHaveCount(0);
  });
}
