// SEC-01/06, ENG-045. Browser traffic is same-origin; Supabase/Resend are server-only.
export function privateContentSecurityPolicy(nonce: string, development: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // React/next/image use style attributes (sizing, positioning, Arabic text layout).
    "style-src-attr 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "media-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join('; ');
}

export function decodedPagePath(pathname: string): string {
  // App Router decodes dynamic locale params. Match that behavior so /%65n/sign-in
  // cannot serve the real English account page under the public policy.
  return pathname.split("/").map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  }).join("/");
}

export function isPrivatePage(pathname: string): boolean {
  return /^\/(en|ar)\/(staff|sign-in|sign-up|verify-email|forgot-password|reset-password|my-msrc|registration|staff-security-preview)(?:\/|$)/.test(decodedPagePath(pathname));
}
