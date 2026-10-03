import "server-only";

/** Local synthetic lab only. Deployment environments cannot enable this route. */
export function isAuthPreviewAllowed(requestHeaders?: Headers): boolean {
  if (process.env.MSRC_AUTH_PREVIEW !== "synthetic" || process.env.VERCEL_ENV) return false;
  if (!requestHeaders) return true;
  const host = requestHeaders.get("host");
  if (!host || !/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(host)) return false;
  // Proxied remote requests do not become local by supplying a loopback Host.
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  return (!forwardedHost || forwardedHost === host) &&
    (!forwardedFor || ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(forwardedFor));
}
