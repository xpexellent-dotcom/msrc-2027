import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApprovedSponsorBelt } from "@/components/home/approved-sponsor-belt";
import type { HomepageSponsor } from "@/content/sponsor-belt";

const sponsors = [
  {
    id: "synthetic-sponsor",
    name: { en: "Synthetic Sponsor", ar: "راعٍ تجريبي" },
    logo: { src: "/media/test/sponsor.webp", width: 240, height: 120 },
  },
] as const satisfies readonly HomepageSponsor[];

describe("homepage sponsor belt (SPN-01, CFG-12)", () => {
  it.each(["en", "ar"] as const)("renders one named %s sponsor in a keyboard-scrollable list", (locale) => {
    const html = renderToStaticMarkup(createElement(ApprovedSponsorBelt, { locale, sponsors }));
    expect(html).toContain(`id="home-sponsors-title" class="belt-caption">${locale === "en" ? "Sponsors" : "الرعاة"}<`);
    expect(html).toContain('role="region" aria-labelledby="home-sponsors-title" tabindex="0"');
    expect(html).toContain('<ul class="approved-belt-list" role="list">');
    expect(html).toContain(`<bdi>${sponsors[0].name[locale]}</bdi>`);
    expect(html.match(/<li\b/g)).toHaveLength(1);
    expect(html).toMatch(/<img[^>]+alt=""[^>]+width="240"[^>]+height="120"/);
    expect(html).not.toMatch(/belt-track|aria-hidden|Illustrative logos|شعارات توضيحية/);
  });
});
