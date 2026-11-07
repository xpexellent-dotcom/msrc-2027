import { expect, test } from "@playwright/test";

// ORG-072 replaces four pathway photos with brand icons. Retain the shared
// speaker-caption collision guard across RTL/LTR and narrow screens.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} speaker placeholder captions clear their pointer action`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: testInfo.project.name === "chromium-mobile" ? 390 : 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(".speaker-preview-card").first();
    await card.scrollIntoViewIfNeeded();
    const collisions = await card.evaluate((element) => {
      const action = element.querySelector(".speaker-preview-link")!.getBoundingClientRect();
      const caption = element.querySelector(".speaker-preview-content p")!;
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
    expect(collisions, "caption glyphs must not overlap the action").toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await testInfo.attach("speaker-caption-evidence", { body: JSON.stringify({ locale, collisions }, null, 2), contentType: "application/json" });
  });
}
