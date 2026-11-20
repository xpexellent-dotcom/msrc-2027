import { describe, expect, it } from "vitest";
import { socialHosts, socialLinks, socialRowModel, type SocialLink } from "@/content/social-links";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroSocialRow } from "@/components/home/hero-social-row";

describe("social identity publication boundary (ORG-072)", () => {
  it("keeps all official URLs pending today", () => expect(socialLinks.every((link) => link.url === null)).toBe(true));
  it("allows only HTTPS URLs on the network's official hosts", () => {
    for (const link of socialLinks) if (link.url) {
      const url = new URL(link.url);
      expect(url.protocol).toBe("https:");
      expect(socialHosts[link.network]).toContain(url.hostname);
    }
    expect(socialHosts.x).toEqual(expect.arrayContaining(["www.x.com", "www.twitter.com"]));
  });
  it("renders nothing when every account is pending in production", () => expect(socialRowModel(socialLinks, false)).toBeNull());
  it("exposes only pending glyphs in preview today", () => expect(socialRowModel(socialLinks, true)).toEqual({ live: [], pending: ["x", "linkedin", "instagram", "tiktok"] }));
  it("keeps only live identities in production", () => {
    const links: SocialLink[] = [{ network: "x", url: "https://www.x.com/synthetic-test" }, { network: "linkedin", url: null }];
    expect(socialRowModel(links, false)).toEqual({ live: [links[0]], pending: [] });
    expect(socialRowModel(links, true)).toEqual({ live: [links[0]], pending: ["linkedin"] });
  });
  it("hides each pending item from assistive technology while keeping a mixed row's live link", () => {
    const html = renderToStaticMarkup(createElement(HeroSocialRow, { locale: "en", placeholders: true, links: [
      { network: "x", url: "https://www.x.com/synthetic-test" }, { network: "linkedin", url: null },
    ] }));
    expect(html).toContain('<ul class="hero-social">');
    expect(html).toMatch(/<li><a class="social-item"[^>]+href="https:\/\/www.x.com\/synthetic-test"/);
    expect(html).toContain('<li aria-hidden="true"><span class="social-item social-item--placeholder">');
    expect(html).toContain('<li class="social-soon" aria-hidden="true">');
  });
});
