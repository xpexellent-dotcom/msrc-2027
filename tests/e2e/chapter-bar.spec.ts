import { expect, test } from "@playwright/test";

// ORG-072 removes the hero cue and keeps native scrolling and the shared masthead.
// Keep readable section hierarchy and distinct participation destinations covered.
for (const locale of ["en", "ar"] as const) {
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
      .toEqual(["registration", "abstracts", "workshops", "hackathon", "3mt"].map((path) => `/${locale}/${path}`));
    await expect(page.locator(".pathways-archive-note")).toHaveCount(0);
    await expect(page.locator(".hero-countdown [data-countdown]")).toHaveCount(1);
    await expect(page.locator("#essentials")).toHaveCount(0);
  });
}
