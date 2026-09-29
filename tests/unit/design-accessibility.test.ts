import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/design-system/route";

const tokens = Object.fromEntries([...readFileSync("src/styles/tokens.css", "utf8").matchAll(/--(color-[\w-]+):\s*(#[\da-f]{6});/gi)].map((match) => [match[1], match[2]]));
function luminance(hex: string) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(first: string, second: string) {
  const values = [luminance(tokens[`color-${first}`]), luminance(tokens[`color-${second}`])].sort((a,b) => b-a);
  return (values[0] + .05) / (values[1] + .05);
}

describe("M2 semantic colour contracts (ACC-01)", () => {
  it.each([
    ["ink", "ivory"], ["muted", "ivory"], ["purple", "ivory"], ["ink", "gold"],
    ["ivory", "purple-hover"], ["ink", "gold-hover"], ["lilac", "ink"],
    ["disabled", "disabled-surface"], ["success", "success-surface"],
    ["error", "error-surface"], ["warning", "warning-surface"], ["info", "info-surface"],
  ])("%s text on %s meets normal-text AA", (foreground, background) => {
    expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
  it.each([["line-strong", "white"], ["line-strong", "ivory"], ["purple", "white"], ["gold", "ink"]])("%s control/focus on %s meets 3:1", (foreground,background) => {
    expect(ratio(foreground,background)).toBeGreaterThanOrEqual(3);
  });
});

describe("M2 unlocalized alias release gate", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("denies production even with the staging flag enabled", () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("DESIGN_PREVIEW_ENABLED", "true");
    const response = GET(new Request("https://example.test/design-system"));
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("redirects explicitly enabled staging to English without cache/index permission", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("DESIGN_PREVIEW_ENABLED", "true");
    const response = GET(new Request("https://example.test/design-system"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.test/en/design-system");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});
