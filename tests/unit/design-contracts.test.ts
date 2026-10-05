import { describe, expect, it, vi } from "vitest";
import { isDesignPreviewAllowed } from "@/lib/preview.server";
import { homepageAssets, homepageCopy, publicSitemap } from "@/content/public-site";
import { aboutCopy } from "@/content/about";
import { formatIndex } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";
import { hasApprovedVideo } from "@/lib/media-policy";

describe("localized link metadata (LOC-01, CMS-04)", () => {
  it("pairs each page with its other-language twin and a locale-specific preview image", () => {
    const metadata = localizedPageMetadata("ar", "/about", "عن المؤتمر", "وصف");
    expect(metadata.alternates).toEqual({
      canonical: "/ar/about",
      languages: { en: "/en/about", ar: "/ar/about", "x-default": "/en/about" },
    });
    expect(metadata.openGraph).toMatchObject({
      url: "/ar/about", locale: "ar_SA", alternateLocale: "en_US",
      images: [{ url: "/ar/opengraph-image", width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", images: ["/ar/opengraph-image"] });
  });
});

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("Arabic numerals (LOC-01/03)", () => {
  it("formats plain sequence labels in each language's digits", () => {
    expect([1, 4, 12].map((value) => formatIndex(value, "en"))).toEqual(["1", "4", "12"]);
    expect([1, 4, 12].map((value) => formatIndex(value, "ar"))).toEqual(["١", "٤", "١٢"]);
  });

  it("keeps Arabic editorial copy on Arabic-Indic digits so mixed digit styles do not return", () => {
    const arabic = [...strings(homepageCopy.ar), ...strings(aboutCopy.ar)]
      .map((text) => text.replace(/MSRC 2027/g, ""));
    expect(arabic.filter((text) => /[0-9]/.test(text))).toEqual([]);
  });
});

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
      const implemented = ["/", "/about", "/dates-venue", "/program", "/speakers", "/workshops", "/participate", "/media", "/contact", "/privacy", "/terms"];
      expect(page.previewHref === null || implemented.includes(page.previewHref) || page.previewHref.startsWith("/#")).toBe(true);
    }
    expect(hasApprovedVideo(homepageAssets.heroVideo)).toBe(true);
    expect(homepageAssets.heroVideo.src).toBe("/media/msrc2026/hero-desktop-v1.mp4");
    expect(homepageAssets.heroVideo.mobileSrc).toBe("/media/msrc2026/hero-mobile-v1.mp4");
    expect(homepageAssets).toMatchObject({ finalLogo: null, sponsors: [], gallery: [] });
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
