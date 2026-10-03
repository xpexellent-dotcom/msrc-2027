import { afterEach, describe, expect, it, vi } from "vitest";

// ORG-013: only the production deployment is indexed and redirects Vercel's own addresses.
async function load(environment: string | undefined) {
  vi.resetModules();
  vi.stubEnv("VERCEL_ENV", environment as string);
  const [{ default: robots }, { default: sitemap }, { localizedPageMetadata }, { default: config }] = await Promise.all([
    import("@/app/robots"), import("@/app/sitemap"), import("@/lib/metadata"), import("../../next.config"),
  ]);
  return { robots, sitemap, localizedPageMetadata, config };
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("public indexing", () => {
  it("opens production to search engines with a sitemap of both languages", async () => {
    const { robots, sitemap, localizedPageMetadata, config } = await load("production");
    const rules = robots();
    expect(rules.sitemap).toBe("https://www.msrc2027.com/sitemap.xml");
    expect(rules.rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect((rules.rules as { disallow: string[] }).disallow).toEqual(expect.arrayContaining(["/api/", "/*/admin", "/*/hero-preview"]));
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://www.msrc2027.com/en");
    expect(urls).toContain("https://www.msrc2027.com/ar/program");
    expect(urls.some((url) => /registration|submissions|admin/.test(url))).toBe(false);
    expect(sitemap().find((entry) => entry.url.endsWith("/ar/about"))?.alternates?.languages).toEqual({
      en: "https://www.msrc2027.com/en/about", ar: "https://www.msrc2027.com/ar/about", "x-default": "https://www.msrc2027.com/en/about",
    });
    expect(localizedPageMetadata("en", "/about", "About", "About MSRC").robots).toEqual({ index: true, follow: true });
    const headers = (await config.headers!())[0].headers.map((header) => header.key);
    expect(headers).not.toContain("X-Robots-Tag");
    const redirects = await config.redirects!();
    for (const host of ["msrc-2027.vercel.app", "msrc-2027-msrc2027.vercel.app", "msrc-2027-git-main-msrc2027.vercel.app"]) {
      expect(redirects).toContainEqual({ source: "/:path*", has: [{ type: "host", value: host }], destination: "https://www.msrc2027.com/:path*", permanent: true });
    }
  });

  it.each(["preview", "development", undefined])("keeps %s deployments out of search", async (environment) => {
    const { robots, localizedPageMetadata, config } = await load(environment);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(localizedPageMetadata("ar", "", "MSRC", "MSRC").robots).toEqual({ index: false, follow: false });
    expect((await config.headers!())[0].headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" });
    expect((await config.redirects!()).some((rule) => rule.has?.some((condition) => condition.type === "host"))).toBe(false);
  });

  // The root opens Arabic only for browsers whose first language is Arabic. Next anchors `has` values.
  it.each([
    ["ar", "/ar"], ["ar-SA", "/ar"], ["ar-SA,ar;q=0.9,en-US;q=0.8", "/ar"], ["ar;q=1", "/ar"],
    ["en-US,en;q=0.9,ar;q=0.8", "/en"], ["fr-FR", "/en"], ["arn-CL", "/en"], [undefined, "/en"],
  ])("sends Accept-Language %s at the root to %s", async (language, destination) => {
    const { config } = await load("production");
    const rule = (await config.redirects!()).find((candidate) => candidate.source === "/" && (!candidate.has || candidate.has.every((condition) =>
      condition.type === "header" && language !== undefined && new RegExp(`^${condition.value}$`).test(language))));
    expect(rule).toMatchObject({ destination, permanent: false });
  });

  it.each([["programme", "program"], ["participation", "participate"]])("redirects /:locale/%s permanently to /:locale/%s", async (alias, page) => {
    const { config } = await load("preview");
    expect(await config.redirects!()).toContainEqual({ source: `/:locale(en|ar)/${alias}`, destination: `/:locale/${page}`, permanent: true });
  });
});

// BL-PUB-06/08: unapproved Contact, Privacy and Terms drafts stay out of search on production too.
describe("draft legal pages", () => {
  it("are noindex and absent from the production sitemap", async () => {
    const { sitemap } = await load("production");
    const { draftPageMetadata } = await import("@/components/legal-page");
    expect(draftPageMetadata("en", "/privacy", "Privacy", "Draft").robots).toEqual({ index: false, follow: true });
    expect(sitemap().some((entry) => /\/(contact|privacy|terms)$/.test(entry.url))).toBe(false);
  });
});
