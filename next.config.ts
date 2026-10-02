import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the handoff's existing project instructions unchanged.
  agentRules: false,
  poweredByHeader: false,
  // English is the default locale (LOC-01). A config redirect is answered at the CDN edge;
  // the previous route handler made every root visit wait on a function in iad1.
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
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
    }, {
      // Font files carry their package version in the name, so they never change in place.
      source: "/fonts/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
};

export default nextConfig;
