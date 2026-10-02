import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// next/font only runs inside Next's compiler, so the declaration is read as source text.
// The Arabic subset has no "0": if its face covered the space, it would become the first
// available font once loaded and turn 1ch into 0.5em, narrowing every ch measure after first paint.
describe("Arabic webfont range", () => {
  const source = readFileSync("src/lib/fonts.ts", "utf8");
  const declaration = source.slice(source.indexOf("export const arabicFont"));
  const value = /prop: "unicode-range", value: "([^"]+)"/.exec(declaration)?.[1] ?? "";
  const ranges = value.split(",").map((range) => {
    const [start, end = start] = range.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(start, 16), parseInt(end, 16)] as const;
  });
  const covers = (codePoint: number) => ranges.some(([start, end]) => start <= codePoint && codePoint <= end);

  it("is declared on the Arabic face", () => {
    expect(ranges.length).toBeGreaterThan(5);
  });

  it("covers Arabic letters, Arabic-Indic digits and the Arabic comma", () => {
    for (const character of ["ا", "ي", "٠", "٩", "،", "؟"]) expect(covers(character.codePointAt(0)!), character).toBe(true);
  });

  it("leaves the space and Latin digits to the fallback, so 1ch never changes", () => {
    for (const character of [" ", "0", "a", "."]) expect(covers(character.codePointAt(0)!), JSON.stringify(character)).toBe(false);
  });
});
