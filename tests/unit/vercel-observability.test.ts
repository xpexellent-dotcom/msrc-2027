import { describe, expect, it } from "vitest";
import { pageAddress, prepareObservabilityEvent } from "@/lib/vercel-observability";

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

describe("prepareObservabilityEvent", () => {
  it("keeps the event and its route, without the query string", () => {
    expect(prepareObservabilityEvent({ type: "vital", url: "https://www.msrc2027.com/ar/media?filter=video", route: "/[locale]/media" }, false))
      .toEqual({ type: "vital", url: "https://www.msrc2027.com/ar/media", route: "/[locale]/media" });
  });

  it("drops events from automated browsers", () => {
    expect(prepareObservabilityEvent({ type: "pageview", url: "https://www.msrc2027.com/en" }, true)).toBeNull();
  });
});
