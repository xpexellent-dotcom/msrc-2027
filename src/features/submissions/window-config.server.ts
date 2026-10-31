import "server-only";
import type { AbstractStatusConfig } from "./backend.server";

/** Read-only public calendar observation is independent of account activation.
 * This narrow config has no login, refresh, delivery or mutation capabilities. */
export function resolveWindowReader(env: Readonly<Record<string, string | undefined>>): AbstractStatusConfig | null {
  const { PARTICIPANT_SUPABASE_URL: supabaseUrl, PARTICIPANT_SUPABASE_SECRET_KEY: secretKey, PARTICIPANT_EDITION_KEY: editionKey } = env;
  if (!/^[a-z0-9][a-z0-9_-]{0,127}$/.test(editionKey ?? "")) return null;
  if (env.PARTICIPANT_ACCOUNTS_TEST_MODE === "true") {
    if (env.VERCEL || env.VERCEL_ENV || supabaseUrl !== "http://127.0.0.1:3218" || secretKey !== "sb_secret_participant_mock_only" || editionKey !== "synthetic-participants-2027") return null;
  } else if (env.VERCEL !== "1" || env.VERCEL_ENV !== "production" || supabaseUrl !== "https://ecemjggwlzqpjcwmchrl.supabase.co"
    || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey ?? "") || secretKey?.includes("mock_only")) return null;
  return { supabaseUrl: supabaseUrl!, secretKey: secretKey!, editionKey: editionKey! };
}
export const getWindowReader = () => resolveWindowReader(process.env);
