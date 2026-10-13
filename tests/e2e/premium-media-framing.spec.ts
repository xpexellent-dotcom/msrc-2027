import { expect, test } from "@playwright/test";

// Keep the selected subjects inside the actual visible bitmap, across RTL/LTR,
// and reserve real caption space beside the speaker action on narrow screens.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} selected photographs preserve their subjects and captions clear their action`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: testInfo.project.name === "chromium-mobile" ? 390 : 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const framing = [];
    for (const subject of [
      { pathway: "/hackathon", src: "build-on-an-idea.webp", left: .33, right: .56, top: .01, bottom: .40 },
      { pathway: "/3mt", src: "three-minute-talk.jpg", left: .18, right: .28, top: .30, bottom: .47 },
    ]) {
      const card = page.locator(`[data-pathway='${subject.pathway}']`);
      const photo = card.locator(".pathway-photo img");
      await expect(photo).toHaveAttribute("src", new RegExp(subject.src.replaceAll(".", "\\.")));
      await photo.scrollIntoViewIfNeeded();
      const crop = await photo.evaluate(async (element: HTMLImageElement) => {
        await element.decode();
        const bitmap = await createImageBitmap(await (await fetch(element.currentSrc)).blob());
        const aspect = bitmap.width / bitmap.height;
        bitmap.close();
        const image = element.getBoundingClientRect();
        const frame = element.parentElement!.getBoundingClientRect();
        const coveredWidth = Math.max(image.width, image.height * aspect);
        const coveredHeight = coveredWidth / aspect;
        const [x, y] = getComputedStyle(element).objectPosition.split(" ").map(parseFloat);
        const contentLeft = image.left + (image.width - coveredWidth) * x / 100;
        const contentTop = image.top + (image.height - coveredHeight) * y / 100;
        return {
          visibleSourceStart: (frame.left - contentLeft) / coveredWidth,
          visibleSourceEnd: (frame.right - contentLeft) / coveredWidth,
          visibleSourceTop: (frame.top - contentTop) / coveredHeight,
          visibleSourceBottom: (frame.bottom - contentTop) / coveredHeight,
          frameBottom: frame.bottom,
          contentTop,
          coveredHeight,
        };
      });
      // Source-coordinate bounds were checked against the original photographs.
      // They describe the two main discussion participants and the speaker's
      // face. A portrait cover necessarily crops the wide scene's outer edges.
      expect(crop.visibleSourceStart).toBeLessThan(subject.left);
      expect(crop.visibleSourceEnd).toBeGreaterThan(subject.right);
      expect(crop.visibleSourceTop).toBeLessThanOrEqual(subject.top);
      expect(crop.visibleSourceBottom).toBeGreaterThan(subject.bottom);
      await expect(card.locator(".home-photo-edition")).toHaveCount(0);
      const frame = await card.locator(".pathway-photo").boundingBox();
      const cardBounds = await card.boundingBox();
      const body = await card.locator(".pathway-card-body").boundingBox();
      expect(frame!.x).toBeCloseTo(cardBounds!.x, 0);
      expect(frame!.y).toBeCloseTo(cardBounds!.y, 0);
      expect(frame!.width).toBeCloseTo(cardBounds!.width, 0);
      expect(frame!.height).toBeCloseTo(cardBounds!.height, 0);
      expect(body!.y).toBeLessThan(crop.frameBottom);
      expect(body!.y + body!.height).toBeLessThanOrEqual(crop.frameBottom + 1);
      if (subject.pathway === "/3mt") {
        const heading = await card.locator("h3").boundingBox();
        expect(heading!.y, "the overlaid heading stays below the speaker's face").toBeGreaterThan(crop.contentTop + crop.coveredHeight * subject.bottom);
      }
      framing.push({ subject, crop });
    }
    const ratios = await page.locator(".pathway-card").evaluateAll((cards) => cards.map(card => {
      const bounds = card.getBoundingClientRect();
      return bounds.width / bounds.height;
    }));
    expect(ratios).toHaveLength(5);
    expect(Math.max(...ratios) - Math.min(...ratios), "all pathway photographs share one frame ratio").toBeLessThan(.002);

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
