// SEC-01/06, ENG-045. Only the media document can upload to scoped Storage URLs.
export function privateContentSecurityPolicy(nonce: string, development: boolean, storageOrigin?: string): string {
  const uploadOrigin = ["http://127.0.0.1:3220", "http://127.0.0.1:3218"].includes(storageOrigin ?? "") || /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(storageOrigin ?? "") ? storageOrigin : undefined;
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // React/next/image use style attributes (sizing, positioning, Arabic text layout).
    "style-src-attr 'unsafe-inline'",
    `connect-src 'self'${uploadOrigin ? ` ${uploadOrigin}` : ""}`,
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
  return /^\/(en|ar)\/(staff|reviewer|judge|entries|sign-in|sign-up|verify-email|forgot-password|reset-password|my-msrc|registration|abstracts|staff-security-preview)(?:\/|$)/.test(decodedPagePath(pathname));
}

export function isCompetitionEntryPage(pathname: string): boolean { return /^\/(en|ar)\/entries\/?$/.test(decodedPagePath(pathname)); }
export function competitionUploadOrigin(env: Readonly<Record<string, string | undefined>>): string | undefined {
  if (env.COMPETITIONS_ENABLED !== "true" || env.PARTICIPANT_ACCOUNTS_ENABLED !== "true") return undefined;
  if (env.PARTICIPANT_ACCOUNTS_TEST_MODE === "true") return !env.VERCEL && !env.VERCEL_ENV && env.PARTICIPANT_SUPABASE_URL === "http://127.0.0.1:3218" ? env.PARTICIPANT_SUPABASE_URL : undefined;
  return env.VERCEL === "1" && env.VERCEL_ENV === "production" && env.PARTICIPANT_SUPABASE_URL === "https://ecemjggwlzqpjcwmchrl.supabase.co" ? env.PARTICIPANT_SUPABASE_URL : undefined;
}

/** Camera policy is document-scoped, so scanner transitions must install a fresh document. */
export function isCheckInPage(pathname: string): boolean {
  return /^\/(en|ar)\/staff\/check-in\/?$/.test(decodedPagePath(pathname));
}

/** Storage access is document-scoped; other staff and participant pages stay same-origin. */
export function isMediaPage(pathname: string): boolean {
  return /^\/(en|ar)\/staff\/content\/?$/.test(decodedPagePath(pathname));
}

/** Match the staff deployment boundary without importing server-only credentials into shared code. */
export function mediaUploadOrigin(env: Readonly<Record<string, string | undefined>>): string | undefined {
  if (env.STAFF_PORTAL_ENABLED !== "true") return undefined;
  if (env.STAFF_PORTAL_TEST_MODE === "true") {
    return !env.VERCEL && !env.VERCEL_ENV && !env.VERCEL_URL && !env.VERCEL_TARGET_ENV
      && env.STAFF_SUPABASE_URL === "http://127.0.0.1:3220" ? env.STAFF_SUPABASE_URL : undefined;
  }
  return env.VERCEL === "1" && env.VERCEL_ENV === "production"
    && env.STAFF_SUPABASE_URL === "https://ecemjggwlzqpjcwmchrl.supabase.co" ? env.STAFF_SUPABASE_URL : undefined;
}
