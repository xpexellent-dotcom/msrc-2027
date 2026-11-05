import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public font loading roles (ENG-094)", () => {
  const source = readFileSync("src/lib/fonts.ts", "utf8");
  const declaration = (name: string) => /localFont\(\{([\s\S]*?)\}\);/.exec(source.slice(source.indexOf(`export const ${name} =`)))?.[1] ?? "";
  it("keeps equal literal Arabic-only ranges for text and display", () => {
    const range = (name: string) => /prop: "unicode-range", value: "([^"]+)"/.exec(declaration(name))?.[1];
    expect(range("arabicFont")).toBeTruthy();
    expect(range("arabicDisplayFont")).toBe(range("arabicFont"));
  });
  it("preloads only the two public English faces", () => {
    for (const name of ["displayFont", "textFont"]) expect(declaration(name)).not.toContain("preload: false");
    for (const name of ["staffFont", "staffDisplayFont", "arabicFont", "arabicDisplayFont"]) expect(declaration(name)).toContain("preload: false");
  });
});
