import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

function components(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? components(file) : file.endsWith(".tsx") ? [file] : [];
  });
}

it("caps every component's image sizes at the viewport width (ENG-094 R2)", () => {
  const oversized = components("src/components").flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/\bsizes\s*=\s*(["'])(.*?)\1/g)].flatMap((attribute) =>
      [...attribute[2].matchAll(/(\d+(?:\.\d+)?)vw/g)].filter((value) => Number(value[1]) > 100)
        .map((value) => `${file}: ${value[0]}`)));
  expect(oversized).toEqual([]);
});
