import { describe, expect, it } from "vitest";
import { socialHosts, socialLinks, type SocialLink } from "@/content/social-links";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroSocialRow } from "@/components/home/hero-social-row";

describe("homepage social identity publication", () => {
  it("configures the organizer-supplied X account and keeps the other accounts pending", () => {
    expect(socialLinks).toEqual([
      { network: "x", url: "https://x.com/Research__PC" },
      { network: "linkedin", url: null },
      { network: "instagram", url: null },
      { network: "tiktok", url: null },
    ]);
  });

  it("allows only HTTPS URLs on the network's official hosts", () => {
    for (const link of socialLinks) if (link.url) {
      const url = new URL(link.url);
      expect(url.protocol).toBe("https:");
      expect(socialHosts[link.network]).toContain(url.hostname);
    }
    expect(socialHosts.x).toEqual(expect.arrayContaining(["www.x.com", "www.twitter.com"]));
  });

  it("renders nothing when no social networks are configured", () => {
    expect(renderToStaticMarkup(createElement(HeroSocialRow, { locale: "en", links: [] }))).toBe("");
  });

  it.each([
    ["en", "Soon"],
    ["ar", "قريبًا"],
  ] as const)("renders pending %s statuses and preserves the order of configured networks", (locale, soon) => {
    const links: readonly SocialLink[] = [
      { network: "linkedin", url: null },
      { network: "x", url: "https://www.x.com/synthetic-test" },
      { network: "instagram", url: null },
    ];
    const html = renderToStaticMarkup(createElement(HeroSocialRow, { locale, links }));

    expect(html).toMatch(/<ul\b[^>]*class="hero-social"/);
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain('href="https://www.x.com/synthetic-test"');
    expect(html.match(/<span class="social-item social-item--placeholder"/g)).toHaveLength(2);
    expect(html).toContain(`class="sr-only">LinkedIn — ${soon}</span>`);
    expect(html).toContain(`class="sr-only">Instagram — ${soon}</span>`);
    expect(html.indexOf("LinkedIn")).toBeLessThan(html.indexOf("synthetic-test"));
    expect(html.indexOf("synthetic-test")).toBeLessThan(html.indexOf("Instagram"));
  });
});
