import { describe, expect, it, vi } from "vitest";
import { isDesignPreviewAllowed } from "@/lib/preview.server";
import { homepageAssets, publicSitemap } from "@/content/public-site";

describe("public content publication boundaries (SCP-02, CFG-12, MED-01)", () => {
  it("retains every required bilingual public destination without inventing assets", () => {
    expect(publicSitemap.map((page) => page.id).sort()).toEqual([
      "home", "about", "dates", "program", "speakers", "workshops", "participation", "teams",
      "sponsors", "gallery", "announcements", "faq", "contact", "privacy", "terms",
    ].sort());
    expect(new Set(publicSitemap.map((page) => page.path)).size).toBe(publicSitemap.length);
    for (const page of publicSitemap) {
      expect(page.label.en.trim().length).toBeGreaterThan(0);
      expect(page.label.ar).toMatch(/[\u0600-\u06ff]/);
      expect(page.previewHref === null || page.previewHref === "/" || page.previewHref === "/about" || page.previewHref.startsWith("/#")).toBe(true);
    }
    expect(homepageAssets).toMatchObject({ heroVideo: null, finalLogo: null, sponsors: [], gallery: [] });
  });
});

describe("private design preview release boundary (CMS-04, REL-01)", () => {
  it.each([
    { node: "development", vercel: "", enabled: "", expected: true },
    { node: "production", vercel: "", enabled: "", expected: false },
    { node: "production", vercel: "preview", enabled: "true", expected: true },
    { node: "production", vercel: "preview", enabled: "false", expected: false },
    { node: "production", vercel: "production", enabled: "true", expected: false },
    { node: "development", vercel: "production", enabled: "true", expected: false },
  ])("allows=$expected for NODE_ENV=$node / VERCEL_ENV=$vercel / explicit=$enabled", ({ node, vercel, enabled, expected }) => {
    vi.stubEnv("NODE_ENV", node);
    vi.stubEnv("VERCEL_ENV", vercel);
    vi.stubEnv("DESIGN_PREVIEW_ENABLED", enabled);
    expect(isDesignPreviewAllowed()).toBe(expected);
  });

  it("does not accept a browser-exposed flag as preview authorization", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DESIGN_PREVIEW_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_DESIGN_PREVIEW_ENABLED", "true");
    expect(isDesignPreviewAllowed()).toBe(false);
  });
});
