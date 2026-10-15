import { existsSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/[locale]/(preview)/page";
import DesignSystemPage from "@/app/[locale]/design-system/page";
import HeroPreviewPage from "@/app/[locale]/hero-preview/page";
import { cinematicCopy, demoImages } from "@/content/cinematic-demo";
import { homepageAssets, homepageCopy } from "@/content/public-site";
import { hasApprovedVideo } from "@/lib/media-policy";
import { conferenceEventJsonLd } from "@/lib/structured-data";

describe("approved design publication without preview authorization (DSN-01/02, MED-01/04, REL-01)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DESIGN_PREVIEW_ENABLED", "");
    vi.stubEnv("LOCAL_MEDIA_PREVIEW_ENABLED", "");
  });

  it.each(["en", "ar"] as const)("renders the complete approved %s homepage with preview flags absent", async (locale) => {
    const html = renderToStaticMarkup(await HomePage({ params: Promise.resolve({ locale }) }));
    expect(html).toContain(homepageCopy[locale].title[0]);
    expect(html).toContain(cinematicCopy[locale].speakerPending);
    expect(html).toContain('id="participate"');
    expect(html).toContain('id="legacy"');
    expect(html).toContain('class="pathway-track-nav"');
    expect(html).toContain("community-majed-9804.jpg");
    expect(html).toContain("jeddah-opening-cropped-poster.jpg");
    expect(html).toContain(locale === "en" ? "Illustrative" : "مثال بصري");
    expect(html).toContain(`href="/${locale}/team"`);
    expect(html).not.toContain("/api/preview-media/");
    expect(html).not.toContain("/design-system");
    // Illustration approval does not become an accreditation claim in structured data.
    expect(JSON.stringify(conferenceEventJsonLd(locale))).not.toMatch(/cme|credit|accreditation|اعتماد/i);
  });

  it.each(["en", "ar"] as const)("keeps the %s component workshop and unpublished film closed even with preview flags", async (locale) => {
    vi.stubEnv("DESIGN_PREVIEW_ENABLED", "true");
    vi.stubEnv("LOCAL_MEDIA_PREVIEW_ENABLED", "true");
    await expect(DesignSystemPage({ params: Promise.resolve({ locale }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(HeroPreviewPage({ params: Promise.resolve({ locale }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("ships approved local derivatives without requiring private montage sources", () => {
    expect(hasApprovedVideo(homepageAssets.heroVideo)).toBe(true);
    const assets = [
      homepageAssets.heroPoster,
      ...[homepageAssets.heroVideo.src, homepageAssets.heroVideo.mobileSrc, homepageAssets.heroVideo.mobilePoster],
      ...demoImages.pathways, ...demoImages.gallery.map(({ src }) => src),
      demoImages.closing.video, demoImages.closing.poster,
      "/media/msrc-demo/community-majed-9804.jpg", "/media/msrc-demo/attend-majed-9744.jpg",
      "/media/msrc-demo/speakers-rania-9801.jpg", "/media/msrc-demo/king-faisal-venue.jpg",
    ];
    for (const asset of assets) {
      expect(asset).toMatch(/^\/media\/[a-zA-Z0-9/_.-]+$/);
      expect(existsSync(path.join(process.cwd(), "public", asset))).toBe(true);
    }
  });
});
