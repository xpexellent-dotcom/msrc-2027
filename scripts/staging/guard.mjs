/** Offline, deny-by-default boundary shared by the staging seed and load runner. */
export const PRODUCTION_PROJECT_REF = "ecemjggwlzqpjcwmchrl";

export function stagingAllowPattern(origin) {
  return `^${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

export function assertStagingTarget({ url, confirm, allowPattern }) {
  if (confirm !== "yes") throw new Error("MSRC_STAGING_CONFIRM=yes is required.");
  try {
    const target = new URL(url);
    const host = target.hostname;
    const supabase = /^[a-z0-9]{20}\.supabase\.co$/.test(host);
    if (target.protocol !== "https:" || target.username || target.password || target.port
      || target.pathname !== "/" || /[?#]/.test(url)
      || host === "msrc2027.com" || host.endsWith(".msrc2027.com")
      || host.includes(PRODUCTION_PROJECT_REF)
      || (!supabase && !/(^|[.-])staging([.-]|$)/.test(host))
      || allowPattern !== stagingAllowPattern(target.origin)) throw new Error();
    return target.origin;
  } catch {
    // URL errors can contain credentials; never relay them or evaluate arbitrary regexes.
    throw new Error("An exact escaped HTTPS staging allow pattern and non-production target are required.");
  }
}
