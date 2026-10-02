import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// ORG-009: below 1100px the chapter index is one swipeable row that sticks under the floating
// header, as the desktop bar does. A highlight glides to the current chapter; one tap jumps.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} chapter bar follows the reader and jumps in one tap`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    // The live countdown marks hydration; the highlight is placed by the client.
    await expect(page.locator("[data-countdown]")).toHaveAttribute("data-countdown", "before");
    const bar = page.locator(".section-journey");
    const geometry = () => page.evaluate(() => {
      const row = document.querySelector(".section-journey-links")!;
      const box = document.querySelector(".section-journey")!.getBoundingClientRect();
      const active = row.querySelector('a[aria-current="location"]');
      const activeBox = active?.getBoundingClientRect();
      const highlight = document.querySelector(".section-journey-indicator")!.getBoundingClientRect();
      return {
        top: box.top, bottom: box.bottom, headerBottom: document.querySelector(".site-header")!.getBoundingClientRect().bottom,
        rows: new Set([...row.querySelectorAll(":scope > a")].map((link) => Math.round(link.getBoundingClientRect().top))).size,
        active: active?.getAttribute("href") ?? null,
        highlighted: activeBox ? Math.abs(highlight.left - activeBox.left) < 2 && Math.abs(highlight.width - activeBox.width) < 2 : false,
        inView: activeBox ? activeBox.left >= box.left - 1 && activeBox.right <= box.right + 1 : false,
      };
    });

    if ((page.viewportSize()?.width ?? 0) >= 1100) {
      await expect(page.locator(".section-journey-indicator")).toBeHidden();
      await page.evaluate(() => document.getElementById("participate")!.scrollIntoView({ block: "start" }));
      await expect(bar).toBeInViewport();
      return;
    }

    expect((await geometry()).rows).toBe(1);
    await page.evaluate(() => document.getElementById("participate")!.scrollIntoView({ block: "start" }));
    await expect(bar).toHaveAttribute("data-stuck", "true");
    await expect.poll(async () => {
      const now = await geometry();
      return now.active === "#participate" && now.highlighted && now.inView && now.top >= now.headerBottom && now.top - now.headerBottom < 20;
    }).toBe(true);
    expect((await new AxeBuilder({ page }).include(".section-journey").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);

    // One tap; the highlight goes straight to the destination, not through each chapter between.
    await page.evaluate(() => {
      const seen: string[] = [];
      Object.assign(window, { chapterTrail: seen });
      const timer = setInterval(() => seen.push(document.querySelector('.section-journey-links a[aria-current="location"]')?.getAttribute("href") ?? ""), 25);
      setTimeout(() => clearInterval(timer), 1500);
    });
    await bar.locator('a[href="#legacy"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}#legacy$`));
    await expect(page.locator("#legacy")).toBeFocused();
    await page.waitForTimeout(1600);
    expect(await page.evaluate(() => [...new Set((window as unknown as { chapterTrail: string[] }).chapterTrail)])).toEqual(["#participate", "#legacy"]);
    const arrived = await geometry();
    expect(arrived.active).toBe("#legacy");
    expect(arrived.highlighted && arrived.inView).toBe(true);
    // The chapter's opening line lands below the bar, not under it.
    expect(await page.evaluate(() => document.querySelector("#legacy .eyebrow")!.getBoundingClientRect().top
      - document.querySelector(".section-journey")!.getBoundingClientRect().bottom)).toBeGreaterThan(8);
  });
}

// Every chip's number matches its section's eyebrow: before the Partners chip, "Plan your
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
