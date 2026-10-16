import type { NextConfig } from "next";

// ORG-013: production is public and indexable; previews, local runs and CI stay noindex.
const production = process.env.VERCEL_ENV === "production";
// Vercel's own addresses for the production deployment send visitors to the real domain.
const vercelHosts = ["msrc-2027.vercel.app", "msrc-2027-msrc2027.vercel.app", "msrc-2027-git-main-msrc2027.vercel.app"];

// Matched against the whole Accept-Language value: "ar", "ar-SA,ar;q=0.9,en;q=0.8", "ar;q=1".
const arabicFirst = "ar([-;,].*)?";

const nextConfig: NextConfig = {
  // Preserve the handoff's existing project instructions unchanged.
  agentRules: false,
  poweredByHeader: false,
  // English is the default locale (LOC-01). A config redirect is answered at the CDN edge;
  // the previous route handler made every root visit wait on a function in iad1.
  // A browser whose first language is Arabic opens the Arabic site; everyone else gets English.
  async redirects() {
    return [
      ...(production ? vercelHosts.map((value) => ({ source: "/:path*", has: [{ type: "host" as const, value }], destination: "https://www.msrc2027.com/:path*", permanent: true })) : []),
      { source: "/", has: [{ type: "header" as const, key: "accept-language", value: arabicFirst }], destination: "/ar", permanent: false },
      { source: "/", destination: "/en", permanent: false },
      // ORG-037: the published short policy URLs follow the same locale preference.
      ...["privacy", "terms"].flatMap((kind) => ["", "/v1.0"].flatMap((suffix) => [
        { source: `/${kind}${suffix}`, has: [{ type: "header" as const, key: "accept-language", value: arabicFirst }], destination: `/ar/${kind}${suffix}`, permanent: false },
        { source: `/${kind}${suffix}`, destination: `/en/${kind}${suffix}`, permanent: false },
      ])),
      // British-spelling and long-form aliases are permanent, answered at the edge, and keep the query.
      { source: "/:locale(en|ar)/programme", destination: "/:locale/program", permanent: true },
      { source: "/:locale(en|ar)/participation", destination: "/:locale/participate", permanent: true },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        ...(production ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]),
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        // Structural directives only; script/style sources stay unrestricted until nonce-based CSP is designed.
        { key: "Content-Security-Policy", value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    }, {
      // ORG-008: the approved film and posters are versioned by file name (hero-desktop-v1.mp4),
      // so browsers keep them for 30 days instead of revalidating 2.8 MB on every visit. A
      // replacement ships under a new name (-v2), never over an existing file.
      source: "/media/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
    }];
  },
};

export default nextConfig;
