import { expect, test } from "@playwright/test";

// ENG-024: preserve the explicitly requested physical crop across RTL and LTR,
// and reserve real caption space beside the speaker action on narrow screens.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} selected photograph stays left-framed and speaker captions clear their action`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: testInfo.project.name === "chromium-mobile" ? 390 : 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const photo = page.locator("[data-pathway='/hackathon'] .pathway-photo img");
    await photo.scrollIntoViewIfNeeded();
    const framing = await photo.evaluate(async (element: HTMLImageElement) => {
      await element.decode();
      const bitmap = await createImageBitmap(await (await fetch(element.currentSrc)).blob());
      const bitmapWidth = bitmap.width;
      const aspect = bitmap.width / bitmap.height;
      bitmap.close();
      const image = element.getBoundingClientRect();
      const frame = element.parentElement!.getBoundingClientRect();
      const coveredWidth = Math.max(image.width, image.height * aspect);
      const position = parseFloat(getComputedStyle(element).objectPosition) || 0;
      const contentLeft = image.left + (image.width - coveredWidth) * position / 100;
      return {
        bitmapWidth,
        imageLeft: image.left,
        frameLeft: frame.left,
        visibleSourceStart: (frame.left - contentLeft) / coveredWidth,
        visibleSourceEnd: (frame.right - contentLeft) / coveredWidth,
      };
    });
    expect(framing.bitmapWidth, "request a bitmap suited to the tall cover crop").toBeGreaterThanOrEqual(960);
    expect(framing.imageLeft).toBeCloseTo(framing.frameLeft, 0);
    expect(framing.visibleSourceStart).toBeLessThan(.15);
    // The specifically excluded standing attendee begins around 78% of source.
    expect(framing.visibleSourceEnd).toBeLessThan(.71);

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
    await testInfo.attach("framing-and-caption-evidence", { body: JSON.stringify({ locale, framing, collisions }, null, 2), contentType: "application/json" });
  });
}
