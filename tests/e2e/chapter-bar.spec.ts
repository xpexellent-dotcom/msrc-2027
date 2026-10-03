import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// From 1100px the chapter index is a bar that sticks under the floating header. Below that it
// is not shown (ORG-010): phones announce each chapter with its title (chapter-titles.spec.ts).
for (const locale of ["en", "ar"] as const) {
  test(`${locale} chapter bar follows the reader and jumps in one click`, async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones have no chapter bar.");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before", { timeout: 15_000 });
    const bar = page.locator(".section-journey");
    const current = () => page.evaluate(() => document.querySelector('.section-journey-links a[aria-current="location"]')?.getAttribute("href") ?? null);

    await page.evaluate(() => document.getElementById("participate")!.scrollIntoView({ block: "start" }));
    await expect(bar).toBeInViewport();
    await expect.poll(current).toBe("#participate");
    expect((await new AxeBuilder({ page }).include(".section-journey").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);

    // One click; the underline goes straight to the destination, not through each chapter between.
    await page.evaluate(() => {
      const readCurrent = () => document.querySelector('.section-journey-links a[aria-current="location"]')?.getAttribute("href") ?? "";
      // Capture the actual starting state before a fast click can beat the first interval tick.
      const seen: string[] = [readCurrent()];
      Object.assign(window, { chapterTrail: seen });
      const timer = setInterval(() => seen.push(readCurrent()), 25);
      setTimeout(() => clearInterval(timer), 1500);
    });
    await bar.locator('a[href="#legacy"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}#legacy$`));
    await expect(page.locator("#legacy")).toBeFocused();
    await page.waitForTimeout(1600);
    expect(await page.evaluate(() => [...new Set((window as unknown as { chapterTrail: string[] }).chapterTrail)])).toEqual(["#participate", "#legacy"]);
    await expect(bar).toBeInViewport();
    expect(await current()).toBe("#legacy");

    // Tablets have neither the bar nor the phone title transition.
    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(bar).toBeHidden();
  });
}

// Every chapter's number matches its section's eyebrow: before the Partners chapter, "Plan your
// visit" was 06 in the bar but "07 / Plan your visit" on the page.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} chapter numbers match the section eyebrows`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const pairs = await page.locator(".section-journey-links > a").evaluateAll((links) => links.map((link) => {
      const id = link.getAttribute("href")!.slice(1);
      return { id, chip: link.querySelector(".chapter-number")!.textContent, eyebrow: (document.querySelector(`#${id} .eyebrow`)?.textContent ?? "").split("/")[0].trim() };
    }));
    expect(pairs.map((pair) => pair.id)).toEqual(["about", "participate", "program", "speakers", "legacy", "partners", "faq"]);
    for (const pair of pairs) expect(pair.chip, pair.id).toBe(pair.eyebrow);
  });
}
