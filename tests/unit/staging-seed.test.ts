import { describe, expect, it, vi } from "vitest";
import { buildSeedPlan, runSeed, seedSql, validateSeedInputs, validateSeedSettings } from "../../scripts/staging/seed";
import { assertStagingTarget, stagingAllowPattern } from "../../scripts/staging/guard.mjs";

const app = "https://msrc-staging.vercel.app";
const ref = "abcdefghijklmnopqrst";
const supabase = `https://${ref}.supabase.co`;
const env = { MSRC_STAGING_CONFIRM: "yes", MSRC_STAGING_APP_URL: app, MSRC_STAGING_APP_ALLOW_PATTERN: stagingAllowPattern(app),
  MSRC_STAGING_SUPABASE_URL: supabase, MSRC_STAGING_SUPABASE_ALLOW_PATTERN: stagingAllowPattern(supabase),
  MSRC_STAGING_PROJECT_REF: ref, MSRC_STAGING_SECRET_KEY: "sb_secret_SYNTHETIC_NEVER_PRINT",
  MSRC_STAGING_PARTICIPANT_PASSWORD: "Synthetic-private-password",
  MSRC_STAGING_DATABASE_URL: `postgresql://postgres:synthetic%40private@db.${ref}.supabase.co:5432/postgres` };
const options = { participants: 3, earlyAccess: 2, approvers: 1, runId: "rehearsal" };
const settings = { termsVersion: "v1.0", privacyVersion: "v1.0", earlyOpeningAt: "2026-10-20T12:00:00+03:00",
  generalOpeningAt: "2026-10-20T13:00:00+03:00", closingAt: "2026-10-21T13:00:00+03:00",
  capacity: 2000, placesRemainingThreshold: 50, confirmSeatLeadDays: 1, confirmSeatResponseHours: 24 };

describe("ENG-056 shared staging boundary", () => {
  it("accepts only an exact escaped origin allow pattern", () => {
    expect(stagingAllowPattern(app)).toBe("^https://msrc-staging\\.vercel\\.app$");
    expect(assertStagingTarget({ url: app, confirm: "yes", allowPattern: stagingAllowPattern(app) })).toBe(app);
  });
  it.each([undefined, "", "true", "YES", " yes", "yes "])("refuses confirmation %s", (confirm) => {
    expect(() => assertStagingTarget({ url: app, confirm, allowPattern: stagingAllowPattern(app) })).toThrow("MSRC_STAGING_CONFIRM=yes");
  });
  it.each(["https://msrc2027.com", "https://www.msrc2027.com", "https://staging.msrc2027.com",
    "https://ecemjggwlzqpjcwmchrl.supabase.co", "https://msrc.vercel.app", "http://msrc-staging.vercel.app",
    `${app}/api`, `${app}?`, `${app}#`, "https://owner:password@msrc-staging.vercel.app", `${app}:444`,
    "https://msrc-staging.vercel.app.msrc2027.com", "not a valid target"])("refuses unsafe target %s even if allowlisted", (url) => {
    expect(() => assertStagingTarget({ url, confirm: "yes", allowPattern: stagingAllowPattern(url) })).toThrow();
  });
  it.each([undefined, ".*", "^https://.*$", `^${app}$`, stagingAllowPattern("https://other-staging.vercel.app")])("refuses broad or wrong pattern %s", (allowPattern) => {
    expect(() => assertStagingTarget({ url: app, confirm: "yes", allowPattern })).toThrow();
  });
  it("never exposes URL credentials in a rejection", () => {
    expect(() => assertStagingTarget({ url: "https://PRIVATE_PASSWORD@invalid host", confirm: "yes" })).toThrow(/^An exact/);
  });
});

describe("seed inputs before side effects", () => {
  it("binds direct SQL and managed Auth to one exact non-production project", () => {
    expect(validateSeedInputs(env, options).target).toMatchObject({ databaseHost: `db.${ref}.supabase.co`, databaseUser: "postgres", databasePassword: "synthetic@private" });
  });
  it("requires an explicitly copied Tokyo session-pooler host", () => {
    const pooler = "aws-1-ap-northeast-1.pooler.supabase.com";
    const config = { ...env, MSRC_STAGING_POOLER_HOST: pooler,
      MSRC_STAGING_DATABASE_URL: `postgresql://postgres.${ref}:synthetic@${pooler}:5432/postgres` };
    expect(validateSeedInputs(config, options).target.transport).toBe("session-pooler");
    expect(() => validateSeedInputs({ ...config, MSRC_STAGING_POOLER_HOST: "" }, options)).toThrow();
  });
  it.each([
    { MSRC_STAGING_CONFIRM: "" }, { MSRC_STAGING_PROJECT_REF: "ecemjggwlzqpjcwmchrl" },
    { MSRC_STAGING_APP_URL: "https://msrc2027.com" }, { MSRC_STAGING_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co" },
    { MSRC_STAGING_SUPABASE_ALLOW_PATTERN: ".*" }, { MSRC_STAGING_SECRET_KEY: "sb_publishable_not_secret" },
    { MSRC_STAGING_PARTICIPANT_PASSWORD: "too-short" }, { MSRC_STAGING_PARTICIPANT_PASSWORD: "x".repeat(73) },
    { MSRC_STAGING_DATABASE_URL: "postgresql://postgres:private@db.ecemjggwlzqpjcwmchrl.supabase.co:5432/postgres" },
    { MSRC_STAGING_DATABASE_URL: env.MSRC_STAGING_DATABASE_URL + "?host=production" },
    { MSRC_STAGING_DATABASE_URL: env.MSRC_STAGING_DATABASE_URL.replace(":5432", ":6543") },
    { MSRC_STAGING_DATABASE_URL: env.MSRC_STAGING_DATABASE_URL.replace("/postgres", "/other") },
    { MSRC_STAGING_DATABASE_URL: env.MSRC_STAGING_DATABASE_URL.replace("postgres:", "other:") },
  ])("refuses unsafe input %j", (change) => expect(() => validateSeedInputs({ ...env, ...change }, options)).toThrow());
  it.each([{ participants: 0 }, { participants: 5001 }, { participants: 1.5 }, { earlyAccess: 4 }, { earlyAccess: -1 },
    { approvers: 0 }, { approvers: 11 }, { runId: "../escape" }, { runId: "bad'input" }])("bounds fixture size and filenames %j", (change) => {
    expect(() => validateSeedInputs(env, { ...options, ...change })).toThrow();
  });
  it("refuses missing confirmation and production before network or writes", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Must not fetch"));
    await expect(runSeed({ ...env, MSRC_STAGING_CONFIRM: "" }, options, settings)).rejects.toThrow();
    await expect(runSeed({ ...env, MSRC_STAGING_APP_URL: "https://msrc2027.com" }, options, settings)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("synthetic closed seed plan", () => {
  it("requires complete explicit settings without guessing missing numbers or instants", () => {
    expect(validateSeedSettings(settings)).toEqual(settings);
    for (const key of Object.keys(settings)) {
      const missing = { ...settings } as Record<string, unknown>;
      delete missing[key];
      expect(() => validateSeedSettings(missing)).toThrow();
    }
  });
  it.each([{ enabled: true }, { termsVersion: "unknown" }, { capacity: 0 }, { confirmSeatLeadDays: -1 },
    { earlyOpeningAt: "now" }, { earlyOpeningAt: "2026-02-30T12:00:00+03:00" },
    { generalOpeningAt: settings.earlyOpeningAt }, { closingAt: settings.earlyOpeningAt }])("rejects unsafe or unordered settings %j", (change) => {
    expect(() => validateSeedSettings({ ...settings, ...change })).toThrow();
  });
  it("isolates manifest fields, synthetic identities, email eligibility and least-privilege roles", () => {
    const input = validateSeedInputs(env, options);
    const plan = buildSeedPlan(options, settings, input);
    expect(plan).toMatchObject({ state: "prepared", appOrigin: app, supabaseUrl: supabase, editionKey: "staging-rehearsal" });
    expect(plan.participants).toHaveLength(3);
    expect(plan.participants.filter((person) => person.earlyAccess)).toHaveLength(2);
    expect(plan.staff.map((person) => person.role)).toEqual(["superAdmin", "superAdmin", "registrationWorkshopAdministrator"]);
    expect(new Set([...plan.participants, ...plan.staff].map((person) => person.actorId)).size).toBe(6);
    expect([...plan.participants, ...plan.staff].every((person) => person.email.endsWith("@example.invalid"))).toBe(true);
    expect(plan.participants.every((person) => /^SYN[A-Z0-9]{1,17}$/.test(person.documentNumber))).toBe(true);
    const rendered = JSON.stringify(plan);
    for (const secret of [input.password, input.secretKey, input.target.databasePassword]) expect(rendered).not.toContain(secret);
  });
  it("uses native closed guards, explicit casts and fresh-project checks without weakening triggers", () => {
    const plan = buildSeedPlan(options, settings, validateSeedInputs(env, options));
    const native = seedSql(plan, "native"), profiles = seedSql(plan, "profiles");
    for (const sql of [native, profiles]) {
      expect(sql).toContain("session_user<>'postgres'");
      expect(sql).toContain("delivery_enabled or sweeps_enabled or daily_cap<>0");
      expect(sql).toContain("pg_advisory_xact_lock");
      expect(sql).not.toMatch(/disable trigger|session_replication_role|enabled\s*=\s*true/i);
      expect(sql).not.toContain(env.MSRC_STAGING_PARTICIPANT_PASSWORD);
      expect(sql).not.toContain(env.MSRC_STAGING_SECRET_KEY);
    }
    expect(native).toContain("Fresh empty staging project required");
    expect(native).toContain("'{}'::jsonb");
    expect(profiles).toContain("Untouched synthetic managed-password fixtures required");
    expect(profiles).toContain("values(edition,false,config->>'termsVersion',false");
    expect(profiles).toContain("::timestamptz,24,24");
    expect(profiles).toContain("msrc_registration.settings_complete(edition)");
    expect(profiles).toContain("msrc_participant.age_proven(p.actor_id)");
  });
});
