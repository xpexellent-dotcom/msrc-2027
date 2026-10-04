import "server-only";
import { participantNotice } from "./privacy.server";

export interface ParticipantConfig {
  testMode: boolean;
  securitySecret: string;
  supabaseUrl: string;
  publishableKey: string;
  secretKey: string;
  resendKey: string;
  resendUrl: string;
  editionKey: string;
  emailDailyLimit: number;
  origins: readonly string[];
}
export type ParticipantReadiness = { state: "closed" | "unavailable" } | { state: "ready"; config: ParticipantConfig };

export function resolveParticipantConfig(env: Readonly<Record<string, string | undefined>>): ParticipantReadiness {
  if (env.PARTICIPANT_ACCOUNTS_ENABLED !== "true") return { state: "closed" };
  const testMode = env.PARTICIPANT_ACCOUNTS_TEST_MODE === "true";
  if (testMode ? Boolean(env.VERCEL || env.VERCEL_ENV) : env.VERCEL !== "1" || env.VERCEL_ENV !== "production") {
    return { state: "unavailable" };
  }
  if (!participantNotice("en", testMode) || !participantNotice("ar", testMode)) return { state: "closed" };
  const { PARTICIPANT_AUTH_SECURITY_SECRET: securitySecret, PARTICIPANT_SUPABASE_URL: supabaseUrl,
    PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: publishableKey, PARTICIPANT_SUPABASE_SECRET_KEY: secretKey,
    RESEND_API_KEY: resendKey, PARTICIPANT_EDITION_KEY: editionKey } = env;
  const limit = env.PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT ?? "";
  if (!/^[a-f0-9]{64}$/i.test(securitySecret ?? "") || !/^[1-9]\d{0,6}$/.test(limit)
    || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(editionKey ?? "")) return { state: "unavailable" };
  if (testMode) {
    if (supabaseUrl !== "http://127.0.0.1:3218" || secretKey !== "sb_secret_participant_mock_only"
      || publishableKey !== "sb_publishable_participant_mock_only" || resendKey !== "re_participant_mock_only"
      || securitySecret !== "a".repeat(64) || editionKey !== "synthetic-participants-2027" || limit !== "40") return { state: "unavailable" };
  } else if (supabaseUrl !== "https://ecemjggwlzqpjcwmchrl.supabase.co"
    || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey ?? "") || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey ?? "")
    || !/^re_[A-Za-z0-9_-]+$/.test(resendKey ?? "") || [secretKey, publishableKey, resendKey].some((key) => key?.includes("mock_only"))) {
    return { state: "unavailable" };
  }
  return { state: "ready", config: Object.freeze({ testMode, securitySecret: securitySecret!, supabaseUrl: supabaseUrl!,
    publishableKey: publishableKey!, secretKey: secretKey!, resendKey: resendKey!, editionKey: editionKey!, emailDailyLimit: Number(limit),
    resendUrl: testMode ? "http://127.0.0.1:3218/emails" : "https://api.resend.com/emails",
    origins: Object.freeze(testMode ? ["http://127.0.0.1:3216"] : ["https://msrc2027.com", "https://www.msrc2027.com"]) }) };
}
export function getParticipantConfig(): ParticipantReadiness { return resolveParticipantConfig(process.env); }
