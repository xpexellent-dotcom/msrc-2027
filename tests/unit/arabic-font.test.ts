import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arabicFontFile } from "@/lib/arabic-font";

// The served Arabic face must stay the pinned package's file: a dependency bump without a new
// public copy (and name) would leave a stale font cached for a year as immutable.
describe("self-hosted Arabic font", () => {
  const packageDirectory = "node_modules/@fontsource-variable/noto-sans-arabic";
  const { version } = JSON.parse(readFileSync(`${packageDirectory}/package.json`, "utf8")) as { version: string };

  it("is named for the installed package version", () => {
    expect(arabicFontFile).toBe(`/fonts/noto-sans-arabic-arabic-wght-${version}.woff2`);
  });

  it("is byte-identical to the package's Arabic subset", () => {
    expect(readFileSync(`public${arabicFontFile}`).equals(readFileSync(`${packageDirectory}/files/noto-sans-arabic-arabic-wght-normal.woff2`))).toBe(true);
  });

  it("is declared in the stylesheet at the same address", () => {
    expect(readFileSync("src/styles/fonts.css", "utf8")).toContain(`url("${arabicFontFile}")`);
  });

  // The file has no "0": if it covered the space it would become the first available font and
  // turn 1ch into 0.5em once loaded, narrowing every ch measure after first paint.
  it("does not draw the space, so 1ch keeps one width before and after it loads", () => {
    const css = readFileSync("src/styles/fonts.css", "utf8");
    const face = css.slice(css.indexOf('font-family: "MSRC Noto Sans Arabic";'));
    const ranges = face.slice(face.indexOf("unicode-range:") + 14, face.indexOf(";", face.indexOf("unicode-range:"))).split(",").map((range) => {
      const [start, end = start] = range.trim().replace(/^U\+/i, "").split("-");
      return [parseInt(start, 16), parseInt(end, 16)];
    });
    expect(ranges.length).toBeGreaterThan(5);
    expect(ranges.filter(([start, end]) => start <= 0x20 && 0x20 <= end)).toEqual([]);
    expect(ranges.some(([start, end]) => start <= 0x0627 && 0x0627 <= end)).toBe(true);
  });
});
