import "server-only";

export interface StaffConfig {
  testMode: boolean; securitySecret: string; supabaseUrl: string; publishableKey: string;
  secretKey: string; resendKey: string; resendUrl: string; editionKey: string;
  emailDailyLimit: number; origins: readonly string[];
}
export type StaffReadiness = { state: "closed" | "unavailable" } | { state: "ready"; config: StaffConfig };

/** Independent server gate. Test credentials and URLs are fixed, synthetic and loopback only. */
export function resolveStaffConfig(env: Readonly<Record<string, string | undefined>>): StaffReadiness {
  if (env.STAFF_PORTAL_ENABLED !== "true") return { state: "closed" };
  const testMode = env.STAFF_PORTAL_TEST_MODE === "true";
  if (testMode ? Boolean(env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL || env.VERCEL_TARGET_ENV)
    : env.VERCEL !== "1" || env.VERCEL_ENV !== "production") return { state: "unavailable" };
  const { STAFF_AUTH_SECURITY_SECRET: securitySecret, STAFF_SUPABASE_URL: supabaseUrl,
    STAFF_SUPABASE_PUBLISHABLE_KEY: publishableKey, STAFF_SUPABASE_SECRET_KEY: secretKey,
    RESEND_API_KEY: resendKey, STAFF_EDITION_KEY: editionKey } = env;
  const limit = env.STAFF_AUTH_EMAIL_DAILY_LIMIT ?? "";
  if (!/^[a-f0-9]{64}$/i.test(securitySecret ?? "") || !/^[1-9]\d{0,6}$/.test(limit)
    || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(editionKey ?? "")) return { state: "unavailable" };
  if (testMode) {
    if (supabaseUrl !== "http://127.0.0.1:3220" || secretKey !== "sb_secret_staff_mock_only"
      || publishableKey !== "sb_publishable_staff_mock_only" || resendKey !== "re_staff_mock_only"
      || securitySecret !== "b".repeat(64) || editionKey !== "synthetic-staff-2027" || limit !== "40") return { state: "unavailable" };
  } else if (supabaseUrl !== "https://ecemjggwlzqpjcwmchrl.supabase.co"
    || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey ?? "") || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey ?? "")
    || !/^re_[A-Za-z0-9_-]+$/.test(resendKey ?? "") || [secretKey, publishableKey, resendKey].some((key) => key?.includes("mock_only"))) {
    return { state: "unavailable" };
  }
  return { state: "ready", config: Object.freeze({ testMode, securitySecret: securitySecret!, supabaseUrl: supabaseUrl!,
    publishableKey: publishableKey!, secretKey: secretKey!, resendKey: resendKey!, editionKey: editionKey!, emailDailyLimit: Number(limit),
    resendUrl: testMode ? "http://127.0.0.1:3220/emails" : "https://api.resend.com/emails",
    origins: Object.freeze(testMode ? ["http://127.0.0.1:3219"] : ["https://msrc2027.com", "https://www.msrc2027.com"]) }) };
}
export function getStaffConfig(): StaffReadiness { return resolveStaffConfig(process.env); }
