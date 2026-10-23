import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateActivationEnvironment } from "@/lib/activation/readiness";
import { getIdentityCryptoConfig } from "@/features/registration/identity-crypto.server";
import { getRegistrationTicketSecret } from "@/features/registration/ticket-crypto.server";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { resolveStaffConfig } from "@/features/staff-portal/config.server";
import { resolveOutboxRunConfig, validOutboxSecret } from "@/lib/jobs/outbox-route.server";

const url = "https://ecemjggwlzqpjcwmchrl.supabase.co";
const environment: Record<string, string> = {
  VERCEL: "1", VERCEL_ENV: "production", RESEND_API_KEY: "re_synthetic_format_test",
  STAFF_PORTAL_ENABLED: "true", STAFF_PASSWORD_CHANGE_ENABLED: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: url, STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_format_test", STAFF_SUPABASE_SECRET_KEY: "sb_secret_synthetic_format_test",
  STAFF_AUTH_EMAIL_DAILY_LIMIT: "40", STAFF_EDITION_KEY: "synthetic-2027",
  PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: url, PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_format_test", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_synthetic_format_test",
  PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40", PARTICIPANT_EDITION_KEY: "synthetic-2027",
  REGISTRATION_ENABLED: "true", REGISTRATION_TICKET_SECRET: "c".repeat(64),
  REGISTRATION_IDENTITY_ENCRYPTION_KEYS: JSON.stringify({ v1: "d".repeat(64) }), REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION: "v1", REGISTRATION_IDENTITY_HMAC_SECRET: "e".repeat(64),
  OUTBOX_ENABLED: "true", OUTBOX_RESEND_ENABLED: "true", OUTBOX_SENDER: "resend", OUTBOX_DAILY_CAP: "500", OUTBOX_BATCH_SIZE: "10", OUTBOX_TIME_BUDGET_MS: "20000",
  OUTBOX_SUPABASE_URL: url, OUTBOX_SUPABASE_SECRET_KEY: "sb_secret_synthetic_format_test", HEALTH_SUPABASE_URL: url, HEALTH_SUPABASE_SECRET_KEY: "sb_secret_synthetic_format_test",
  CRON_SECRET: "f".repeat(64), OUTBOX_MONITOR_SECRET: "1".repeat(64),
};
const evaluate = (name: string, value: string | undefined) => evaluateActivationEnvironment({ ...environment, [name]: value }).find((row) => row.name === name)!;

describe("activation environment projection", () => {
  it("accepts a complete production-shaped matrix and matches runtime readers without making requests", () => {
    expect(evaluateActivationEnvironment(environment).every((row) => row.valid && row.enabled !== false)).toBe(true);
    expect(resolveStaffConfig(environment).state).toBe("ready");
    expect(resolveParticipantConfig(environment).state).toBe("ready");
    expect(resolveOutboxRunConfig(environment) !== null).toBe(true);
  });
  for (const name of Object.keys(environment)) {
    it(`${name}: detects omission, empty and malformed formats`, () => {
      const optional = ["OUTBOX_BATCH_SIZE", "OUTBOX_TIME_BUDGET_MS"].includes(name);
      expect(evaluate(name, undefined).present).toBe(false);
      expect(evaluate(name, undefined).valid).toBe(optional);
      expect(evaluate(name, "").valid).toBe(false);
      expect(evaluate(name, " invalid value ").valid).toBe(false);
    });
  }
  for (const name of ["STAFF_PORTAL_ENABLED", "STAFF_PASSWORD_CHANGE_ENABLED", "PARTICIPANT_ACCOUNTS_ENABLED", "REGISTRATION_ENABLED", "OUTBOX_ENABLED", "OUTBOX_RESEND_ENABLED"]) {
    it(`${name}: closed is valid configuration but not enabled`, () => {
      expect(evaluate(name, "false")).toEqual({ name, present: true, valid: true, enabled: false });
      expect(evaluate(name, "TRUE").valid).toBe(false);
      expect(evaluate(name, "1").valid).toBe(false);
    });
  }
  it.each([
    ["OUTBOX_DAILY_CAP", "0", true], ["OUTBOX_DAILY_CAP", "100000", true], ["OUTBOX_DAILY_CAP", "100001", false],
    ["OUTBOX_BATCH_SIZE", "1", true], ["OUTBOX_BATCH_SIZE", "0", false], ["OUTBOX_BATCH_SIZE", "11", false],
    ["OUTBOX_TIME_BUDGET_MS", "15000", true], ["OUTBOX_TIME_BUDGET_MS", "14999", false], ["OUTBOX_TIME_BUDGET_MS", "20001", false],
    ["PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT", "0", false], ["PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT", "01", false],
    ["PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT", "9999999", true], ["PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT", "10000000", false],
    ["CRON_SECRET", "x".repeat(31), false], ["CRON_SECRET", "x".repeat(32), true], ["CRON_SECRET", "x".repeat(256), true], ["CRON_SECRET", "x".repeat(257), false],
    ["OUTBOX_MONITOR_SECRET", "has spaces".repeat(8), false], ["OUTBOX_SENDER", "console", false],
    ["HEALTH_SUPABASE_URL", "http://127.0.0.1:1234", false], ["PARTICIPANT_SUPABASE_URL", url + "/", false],
    ["RESEND_API_KEY", "re_participant_mock_only", false], ["OUTBOX_SUPABASE_SECRET_KEY", "sb_secret_mock_only", false],
  ])("%s format boundary", (name, value, valid) => { expect(evaluate(name as string, value as string).valid).toBe(valid); });
  it("rejects mismatched editions and independently reused cron/monitor credentials", () => {
    expect(evaluate("PARTICIPANT_EDITION_KEY", "other-edition").valid).toBe(false);
    expect(evaluate("CRON_SECRET", environment.OUTBOX_MONITOR_SECRET).valid).toBe(false);
    expect(evaluate("OUTBOX_MONITOR_SECRET", environment.CRON_SECRET).valid).toBe(false);
    expect(evaluate("OUTBOX_DAILY_CAP", "0").enabled).toBe(false);
  });
  it.each(["STAFF_PORTAL_TEST_MODE", "PARTICIPANT_ACCOUNTS_TEST_MODE", "CONTACT_TEST_MODE"])("rejects production test override %s", (name) => {
    expect(evaluate(name, "true").valid).toBe(false);
    expect(evaluate(name, undefined).valid).toBe(true);
  });
  it.each([
    ["REGISTRATION_IDENTITY_ENCRYPTION_KEYS", "[]"], ["REGISTRATION_IDENTITY_ENCRYPTION_KEYS", "not-json"],
    ["REGISTRATION_IDENTITY_ENCRYPTION_KEYS", JSON.stringify({ v1: "e".repeat(64) })],
    ["REGISTRATION_IDENTITY_ENCRYPTION_KEYS", JSON.stringify({ constructor: "d".repeat(64) })],
    ["REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION", "absent"], ["REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION", "bad version"],
    ["REGISTRATION_TICKET_SECRET", "a".repeat(64)], ["REGISTRATION_TICKET_SECRET", "b".repeat(64)],
    ["REGISTRATION_TICKET_SECRET", "d".repeat(64)], ["REGISTRATION_TICKET_SECRET", "e".repeat(64)],
  ])("uses the real crypto validator for %s", (name, value) => { expect(evaluate(name, value).valid).toBe(false); });
  it("returns only static names and booleans even when inputs contain private material", () => {
    const rows = evaluateActivationEnvironment(environment);
    expect(rows.every((row) => Object.entries(row).every(([key, value]) => key === "name" ? /^[A-Z_]+$/.test(String(value)) : typeof value === "boolean"))).toBe(true);
    expect(JSON.stringify(rows).includes(environment.REGISTRATION_TICKET_SECRET)).toBe(false);
  });
});

describe("owner-only key generator", () => {
  const directories: string[] = [];
  const script = resolve("scripts/activation/generate-keys.mjs");
  function temporary() { const path = mkdtempSync(join(tmpdir(), "msrc-activation-test-")); directories.push(path); return path; }
  function run(args: string[] = [], cwd = temporary()) {
    return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  }
  function rejected(args: string[]) {
    try { run(args); return false; } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return failure.status === 1 && failure.stdout === "" && !String(failure.stderr).includes("= ");
    }
  }
  afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
  it("writes nothing by default, emits exactly one NAME=value per line, with validator-compatible independent keys", () => {
    const cwd = temporary();
    const before = readdirSync(cwd);
    const output = run([], cwd);
    const generated = Object.fromEntries(output.trimEnd().split("\n").map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
    expect(readdirSync(cwd)).toEqual(before);
    expect(Object.keys(generated).sort()).toEqual(["CRON_SECRET", "OUTBOX_MONITOR_SECRET", "PARTICIPANT_AUTH_SECURITY_SECRET", "REGISTRATION_TICKET_SECRET", "REGISTRATION_IDENTITY_ENCRYPTION_KEYS", "REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION", "REGISTRATION_IDENTITY_HMAC_SECRET"].sort());
    const merged = { ...environment, ...generated };
    expect(getIdentityCryptoConfig(merged) !== null).toBe(true);
    expect(getRegistrationTicketSecret(merged) !== null).toBe(true);
    expect(resolveParticipantConfig(merged).state).toBe("ready");
    expect(validOutboxSecret("Bearer " + generated.CRON_SECRET, generated.CRON_SECRET)).toBe(true);
    expect(validOutboxSecret("Bearer " + generated.OUTBOX_MONITOR_SECRET, generated.OUTBOX_MONITOR_SECRET)).toBe(true);
    expect(evaluateActivationEnvironment(merged).every((row) => row.valid)).toBe(true);
    const secrets = Object.entries(generated).filter(([name]) => name !== "REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION").map(([, value]) => value);
    expect(new Set(secrets).size).toBe(secrets.length);
  });
  it("generates optional initial-install secrets without changing installed values", () => {
    const output = run(["--include-existing"]);
    expect(output.split("\n").filter((line) => /^(STAFF_AUTH_SECURITY_SECRET|CONTACT_SECURITY_SECRET)=[a-f0-9]{64}$/.test(line)).length).toBe(2);
  });
  it("creates only an explicitly requested external file and refuses overwrite", () => {
    const cwd = temporary(), destination = join(cwd, "private.env");
    const output = run(["--out", destination], cwd);
    expect(readFileSync(destination, "utf8") === output).toBe(true);
    expect(readdirSync(cwd)).toEqual(["private.env"]);
    expect(rejected(["--out", destination])).toBe(true);
    expect(readFileSync(destination, "utf8") === output).toBe(true);
  });
  it("refuses repository output, traversal into it and junction aliases", () => {
    expect(rejected(["--out", resolve("activation-test-do-not-create.env")])).toBe(true);
    expect(rejected(["--out", resolve("scripts/../activation-test-do-not-create.env")])).toBe(true);
    const directory = temporary(), alias = join(directory, "repository-alias");
    symlinkSync(process.cwd(), alias, process.platform === "win32" ? "junction" : "dir");
    expect(rejected(["--out", join(alias, "activation-test-do-not-create.env")])).toBe(true);
  });
  it("refuses invalid arguments before generating output", () => {
    expect(rejected(["--out"])).toBe(true);
    expect(rejected(["--unknown"])).toBe(true);
    expect(rejected(["--include-existing", "--include-existing"])).toBe(true);
  });
});
