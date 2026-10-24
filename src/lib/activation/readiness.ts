import "server-only";
import { getRegistrationTicketSecret } from "@/features/registration/ticket-crypto.server";

type Environment = Readonly<Record<string, string | undefined>>;
export interface ActivationEnvironmentCheck { name: string; present: boolean; valid: boolean; enabled?: boolean }
const projectUrl = "https://ecemjggwlzqpjcwmchrl.supabase.co";
const hex = /^[a-f0-9]{64}$/i;
const bearer = /^[A-Za-z0-9_-]{32,256}$/;
const edition = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const budget = /^[1-9]\d{0,6}$/;
const productionKey = (prefix: string) => (value: string) => new RegExp(`^${prefix}[A-Za-z0-9_-]+$`).test(value) && !value.includes("mock_only");
const integer = (minimum: number, maximum: number) => (value: string) => /^\d+$/.test(value)
  && Number.isSafeInteger(Number(value)) && Number(value) >= minimum && Number(value) <= maximum;

/** Production launch diagnostics only. Never return a value, credential, or parser error. */
export function evaluateActivationEnvironment(env: Environment): ActivationEnvironmentCheck[] {
  const checks: ActivationEnvironmentCheck[] = [];
  function check(name: string, validate: (value: string) => boolean, fallback?: string) {
    const raw = env[name];
    checks.push({ name, present: raw !== undefined && raw.length > 0, valid: validate(raw ?? fallback ?? "") });
  }
  function flag(name: string) {
    check(name, (value) => value === "true" || value === "false");
    checks[checks.length - 1].enabled = env[name] === "true";
  }
  check("VERCEL", (value) => value === "1");
  check("VERCEL_ENV", (value) => value === "production");
  for (const boundary of ["STAFF", "PARTICIPANT"] as const) {
    flag(boundary === "STAFF" ? "STAFF_PORTAL_ENABLED" : "PARTICIPANT_ACCOUNTS_ENABLED");
    check(`${boundary}_AUTH_SECURITY_SECRET`, (value) => hex.test(value));
    check(`${boundary}_SUPABASE_URL`, (value) => value === projectUrl);
    check(`${boundary}_SUPABASE_PUBLISHABLE_KEY`, productionKey("sb_publishable_"));
    check(`${boundary}_SUPABASE_SECRET_KEY`, productionKey("sb_secret_"));
    check(`${boundary}_AUTH_EMAIL_DAILY_LIMIT`, (value) => budget.test(value));
    check(`${boundary}_EDITION_KEY`, (value) => edition.test(value) && env.STAFF_EDITION_KEY === env.PARTICIPANT_EDITION_KEY);
  }
  flag("STAFF_PASSWORD_CHANGE_ENABLED");
  check("RESEND_API_KEY", productionKey("re_"));
  flag("REGISTRATION_ENABLED");
  check("REGISTRATION_TICKET_SECRET", () => getRegistrationTicketSecret(env) !== null);
  flag("OUTBOX_ENABLED");
  flag("OUTBOX_RESEND_ENABLED");
  check("OUTBOX_SENDER", (value) => value === "resend");
  check("OUTBOX_DAILY_CAP", integer(0, 100_000));
  checks[checks.length - 1].enabled = Number(env.OUTBOX_DAILY_CAP) > 0 && checks[checks.length - 1].valid;
  check("OUTBOX_BATCH_SIZE", integer(1, 10), "10");
  check("OUTBOX_TIME_BUDGET_MS", integer(15_000, 20_000), "20000");
  for (const boundary of ["OUTBOX", "HEALTH"] as const) {
    check(`${boundary}_SUPABASE_URL`, (value) => value === projectUrl);
    check(`${boundary}_SUPABASE_SECRET_KEY`, productionKey("sb_secret_"));
  }
  check("CRON_SECRET", (value) => bearer.test(value) && value !== env.OUTBOX_MONITOR_SECRET);
  check("OUTBOX_MONITOR_SECRET", (value) => bearer.test(value) && value !== env.CRON_SECRET);
  // Production must never inherit a local synthetic transport override.
  for (const name of ["STAFF_PORTAL_TEST_MODE", "PARTICIPANT_ACCOUNTS_TEST_MODE", "CONTACT_TEST_MODE"]) {
    check(name, (value) => value === "" || value === "false");
  }
  return checks;
}
