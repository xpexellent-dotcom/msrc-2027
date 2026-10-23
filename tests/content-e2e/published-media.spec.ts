import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { editionMedia } from "../../src/content/edition-media";

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: library and built-in fallback preserve the current complete media archive`, async ({ page }, testInfo) => {
    const populated = testInfo.project.metadata.state === "published";
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${locale}/media`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const cards = page.locator(".conference-media-card");
    await expect(cards).toHaveCount(30);
    expect(await cards.evaluateAll((elements) => elements.map((item) => item.getAttribute("data-media-slug")))).toEqual(editionMedia.map((item) => item.slug));
    await expect(cards.locator("h3")).toHaveText(editionMedia.map((item) => locale === "ar" ? item.titleAr! : item.title));
    expect(await page.locator(".conference-media-edition").evaluateAll((elements) => elements.map((item) => item.getAttribute("data-edition")))).toEqual(["2026", "2025", "2024", "2023"]);
    for (const [year, count] of [["2026", 22], ["2025", 4], ["2024", 2], ["2023", 2]] as const) await expect(page.locator(`[data-edition="${year}"] .conference-media-card`)).toHaveCount(count);
    const photos = page.locator(".conference-media-player--photo img");
    await expect(photos).toHaveCount(26);
    for (const image of await photos.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((item: HTMLImageElement) => item.complete && item.naturalWidth > 0)).toBe(true);
      const slug = await image.locator("xpath=ancestor::article").getAttribute("data-media-slug");
      const original = editionMedia.find((item) => item.slug === slug)!;
      await expect(image).toHaveCSS("object-position", original.objectPosition!);
      if (populated) {
        await expect(image).toHaveAttribute("src", /\/storage\/v1\/object\/public\/msrc-published-media\//);
        await expect(image).toHaveAttribute("srcset", /\.640\.webp/);
        await expect(image).toHaveAttribute("alt", locale === "ar" ? original.titleAr! : original.title);
      } else await expect(image).toHaveAttribute("src", /\/media\/editions\/|%2Fmedia%2Feditions%2F/);
      const ratio = await image.evaluate((item) => { const box = item.getBoundingClientRect(); return box.width / box.height; });
      expect(ratio).toBeCloseTo(16 / 9, 2);
    }
    const videos = cards.locator("video");
    await expect(videos).toHaveCount(4);
    for (const [index, video] of (await videos.all()).entries()) {
      await expect(video).toHaveAttribute("src", `/media/editions/2026/video-${index + 1}-silent-v2.mp4`);
      await expect(video).toHaveAttribute("controls", ""); await expect(video).toHaveAttribute("preload", "none"); await expect(video).not.toHaveAttribute("autoplay");
      if (populated) await expect(video).toHaveAttribute("poster", /\/storage\/v1\/object\/public\/msrc-published-media\//);
    }
    await page.getByTestId("media-edition").selectOption("2026"); await expect(cards).toHaveCount(22);
    await page.getByTestId("media-kind").selectOption("photograph"); await expect(cards).toHaveCount(18);
    await page.getByTestId("media-kind").selectOption("highlight"); await expect(cards).toHaveCount(4);
    await page.getByTestId("media-clear").click(); await expect(cards).toHaveCount(30);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
