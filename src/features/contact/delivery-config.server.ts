import "server-only";

export type ContactDeliveryConfig = Readonly<{
  testMode: boolean;
  securitySecret: string;
  resendKey: string;
  resendEndpoint: string;
  counterEndpoint: string;
  counterKey: string;
  origins: readonly string[];
  minimumFillSeconds: number;
  ipHourLimit: number;
  ipDayLimit: number;
  emailHourLimit: number;
  emailDayLimit: number;
}>;

export type ContactDeliveryReadiness =
  | { state: "closed" | "unavailable" }
  | { state: "ready"; config: ContactDeliveryConfig };

// Engineering defaults are recorded separately from organizer-approved policy.
function positiveSetting(value: string | undefined, fallback: number, maximum: number): number | null {
  if (value === undefined || value === "") return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= maximum ? number : null;
}

export function resolveContactDeliveryConfig(env: Readonly<Record<string, string | undefined>>): ContactDeliveryReadiness {
  if (env.CONTACT_DELIVERY_ENABLED !== "true") return { state: "closed" };
  const testMode = env.CONTACT_TEST_MODE === "true";
  // Mock endpoints can never be used in any Vercel environment. Real delivery
  // exists only on Production, with fixed provider/project destinations.
  if (testMode ? Boolean(env.VERCEL || env.VERCEL_ENV) : env.VERCEL !== "1" || env.VERCEL_ENV !== "production") {
    return { state: "unavailable" };
  }
  if (!/^[a-f0-9]{64}$/i.test(env.CONTACT_SECURITY_SECRET ?? "")) return { state: "unavailable" };
  if (!env.RESEND_API_KEY || !env.CONTACT_SUPABASE_SECRET_KEY) return { state: "unavailable" };
  if (testMode) {
    if (env.RESEND_API_KEY !== "re_contact_mock_only" || env.CONTACT_SUPABASE_SECRET_KEY !== "sb_secret_contact_mock_only"
      || env.CONTACT_SUPABASE_URL !== "http://127.0.0.1:3214") return { state: "unavailable" };
  } else if (env.RESEND_API_KEY === "re_contact_mock_only" || env.CONTACT_SUPABASE_SECRET_KEY === "sb_secret_contact_mock_only"
    || !/^re_[A-Za-z0-9_-]+$/.test(env.RESEND_API_KEY)
    || !/^sb_secret_[A-Za-z0-9_-]+$/.test(env.CONTACT_SUPABASE_SECRET_KEY)
    || env.CONTACT_SUPABASE_URL !== "https://ecemjggwlzqpjcwmchrl.supabase.co") return { state: "unavailable" };

  const minimumFillSeconds = positiveSetting(env.CONTACT_MINIMUM_FILL_SECONDS, 3, 300);
  const ipHourLimit = positiveSetting(env.CONTACT_IP_HOUR_LIMIT, 3, 60);
  const ipDayLimit = positiveSetting(env.CONTACT_IP_DAY_LIMIT, 10, 60);
  const emailHourLimit = positiveSetting(env.CONTACT_EMAIL_HOUR_LIMIT, 3, 60);
  const emailDayLimit = positiveSetting(env.CONTACT_EMAIL_DAY_LIMIT, 10, 60);
  if (minimumFillSeconds === null || minimumFillSeconds < 3 || ipHourLimit === null || ipDayLimit === null
    || emailHourLimit === null || emailDayLimit === null || ipHourLimit > ipDayLimit || emailHourLimit > emailDayLimit) {
    return { state: "unavailable" };
  }
  return { state: "ready", config: Object.freeze({
    testMode, securitySecret: env.CONTACT_SECURITY_SECRET!, resendKey: env.RESEND_API_KEY,
    counterKey: env.CONTACT_SUPABASE_SECRET_KEY,
    resendEndpoint: testMode ? "http://127.0.0.1:3214/emails" : "https://api.resend.com/emails",
    counterEndpoint: env.CONTACT_SUPABASE_URL + "/rest/v1/rpc/msrc_contact_reserve_attempt",
    origins: Object.freeze(testMode ? ["http://127.0.0.1:3212"] : ["https://msrc2027.com", "https://www.msrc2027.com"]),
    minimumFillSeconds, ipHourLimit, ipDayLimit, emailHourLimit, emailDayLimit,
  }) };
}

export function getContactDeliveryConfig(): ContactDeliveryReadiness {
  return resolveContactDeliveryConfig(process.env);
}
