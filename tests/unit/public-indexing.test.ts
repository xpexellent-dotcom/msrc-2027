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
    expect((await config.redirects!()).some((rule) => "has" in rule)).toBe(false);
  });
});
