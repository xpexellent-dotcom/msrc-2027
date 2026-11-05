import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage v2 tokens and iOS material budget (ENG-094)", () => {
  it("keeps every colour and responsive-size literal in tokens", () => {
    const css = readFileSync("src/styles/home-v2.css", "utf8");
    expect(css).not.toMatch(/#[\da-f]{3,8}\b|\brgb\(|\bclamp\(/i);
  });
  it.each(["home-v2.css", "brand-system.css"])("%s avoids expensive materials and viewport stacks", (file) => {
    const css = readFileSync(`src/styles/${file}`, "utf8");
    expect(css).not.toMatch(/backdrop-filter|mix-blend-mode|will-change|\bblur\(|\bdrop-shadow\(|\blvh\b|\bdvh\b|animation-timeline/i);
  });
});
