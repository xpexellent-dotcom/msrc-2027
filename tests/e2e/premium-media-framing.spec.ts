import { expect, test } from "@playwright/test";

// The short homepage introduction keeps its text and catalogue action distinct in both directions.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} speaker overview copy clears its catalogue action`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: testInfo.project.name === "chromium-mobile" ? 390 : 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(".home-speaker-overview");
    await card.scrollIntoViewIfNeeded();
    const collisions = await card.evaluate((element) => {
      const action = element.querySelector("a")!.getBoundingClientRect();
      const caption = element.querySelector(".home-speaker-copy")!;
      const walker = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      const overlaps: string[] = [];
      while ((node = walker.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(node);
        if ([...range.getClientRects()].some(rect => rect.left < action.right && rect.right > action.left && rect.top < action.bottom && rect.bottom > action.top)) {
          overlaps.push(node.textContent || "");
        }
      }
      return overlaps;
    });
    expect(collisions, "overview text must not overlap the action").toEqual([]);
    expect((await card.getByRole("link").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await testInfo.attach("speaker-caption-evidence", { body: JSON.stringify({ locale, collisions }, null, 2), contentType: "application/json" });
  });
}
