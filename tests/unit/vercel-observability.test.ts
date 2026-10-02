import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countedSections, isCountedPage, pageAddress, prepareObservabilityEvent } from "@/lib/vercel-observability";

// ORG-008 / PRV-03: analytics and Speed Insights never receive query strings or fragments.
describe("pageAddress", () => {
  it.each([
    ["https://www.msrc2027.com/en/program?track=research&email=a%40b.c#day-2", "https://www.msrc2027.com/en/program"],
    ["https://www.msrc2027.com/ar?code=abc123", "https://www.msrc2027.com/ar"],
    ["https://www.msrc2027.com/en/dates-venue#essentials", "https://www.msrc2027.com/en/dates-venue"],
    ["https://www.msrc2027.com/en/speakers/opening-keynote", "https://www.msrc2027.com/en/speakers/opening-keynote"],
  ])("%s → %s", (url, expected) => {
    expect(pageAddress(url)).toBe(expected);
  });
});

// Only public information pages are counted; anything else, including future private areas, is not.
describe("isCountedPage", () => {
  it.each(["/en", "/ar/", "/en/about", "/ar/dates-venue", "/en/media", "/ar/program/opening-keynote", "/en/speakers/a-speaker"])("counts %s", (path) => {
    expect(isCountedPage(path)).toBe(true);
  });

  it.each(["/", "/fr/about", "/en/design-system", "/en/hero-preview", "/en/account", "/ar/review/123", "/en/organizer", "/api/health", "/en/about/extra", "/en/media/clip", "/en/program/a/b"])("skips %s", (path) => {
    expect(isCountedPage(path)).toBe(false);
  });

  it("covers every public page folder, so a new public page is counted only on purpose", () => {
    const folders = readdirSync("src/app/[locale]/(preview)", { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const missing = folders.filter((folder) => !(countedSections as readonly string[]).includes(folder));
    expect(missing, "New public page: add it to countedSections in src/lib/vercel-observability.ts if it may be counted").toEqual([]);
  });
});

describe("prepareObservabilityEvent", () => {
  it("keeps the event and its route, without the query string", () => {
    expect(prepareObservabilityEvent({ type: "vital", url: "https://www.msrc2027.com/ar/media?filter=video", route: "/[locale]/media" }, false))
      .toEqual({ type: "vital", url: "https://www.msrc2027.com/ar/media", route: "/[locale]/media" });
  });

  it("drops events from automated browsers", () => {
    expect(prepareObservabilityEvent({ type: "pageview", url: "https://www.msrc2027.com/en" }, true)).toBeNull();
  });

  it("drops events from pages outside the public information routes", () => {
    expect(prepareObservabilityEvent({ type: "pageview", url: "https://www.msrc2027.com/en/account/registrations?id=7" }, false)).toBeNull();
  });
});
