import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dictionaries, locales } from "@/lib/i18n";

// ORG-013 made the site public. The 404/error pages and the share card must not call it a
// preview. The footer's approval note is kept on purpose and is not checked here.
describe("public launch wording", () => {
  it.each(locales)("%s 404 and error copy points visitors home, not to a preview", (locale) => {
    const { notFoundDescription, errorDescription, home } = dictionaries[locale];
    for (const text of [notFoundDescription, errorDescription, home]) expect(text).not.toMatch(/preview|معاينة/i);
  });

  it("the link-preview card carries the address instead of a preview badge", () => {
    const source = readFileSync("src/app/[locale]/opengraph-image.tsx", "utf8");
    expect(source).not.toMatch(/WEBSITE PREVIEW/);
    expect(source).toContain("msrc2027.com");
  });

  it("the Arabic link-preview card is a 1200x630 PNG small enough for messaging previews", () => {
    const card = readFileSync("public/og/msrc-2027-ar.png");
    expect(card.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect([card.readUInt32BE(16), card.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(card.length).toBeLessThan(300 * 1024);
  });
});
