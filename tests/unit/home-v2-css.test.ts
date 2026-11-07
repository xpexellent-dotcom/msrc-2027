import { readFileSync, readdirSync } from "node:fs";
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

it("allows exactly the header glass to blur, with no other site backdrop blur (ENG-095)", () => {
  const files = readdirSync("src/styles").filter(file => file.endsWith(".css"));
  const blurs = files.flatMap(file => [...readFileSync(`src/styles/${file}`, "utf8").matchAll(/([^{}]+)\{([^{}]*backdrop-filter:\s*blur\([^{}]*)\}/g)].map(match => ({ file, selector: match[1].trim(), css: match[2] })));
  expect(blurs).toHaveLength(1);
  expect(blurs[0].file).toBe("axiom-navigation.css");
  expect(blurs[0].selector).toBe(".axiom-header .header-glass");
  expect(blurs[0].css.match(/blur\(14px\)/g)).toHaveLength(2);
});
