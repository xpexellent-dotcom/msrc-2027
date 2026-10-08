import { describe, expect, it } from "vitest";
import { assertBootstrapOperatorIdentity, bootstrapOperatorStatement, bootstrapSqlEnvironment, bootstrapSslSettings,
  STAFF_BOOTSTRAP_SESSION_POOLER_HOST, validateBootstrapTarget } from "../../scripts/bootstrap-staff-validation";

const approvedRef = "abcdefghijklmnopqrst";
const input = { approvedRef, authUrl: `https://${approvedRef}.supabase.co`, secretKey: "sb_secret_synthetic_only",
  databaseUrl: `postgresql://postgres:synthetic%40password@db.${approvedRef}.supabase.co:5432/postgres` };
const session = `postgresql://postgres.${approvedRef}:synthetic%40password@${STAFF_BOOTSTRAP_SESSION_POOLER_HOST}:5432/postgres`;

describe("native first-staff bootstrap target (BL-AUTH-01/05/06)", () => {
  it("retains the matching direct target and privately decodes the password", () => {
    expect(validateBootstrapTarget(input)).toEqual({ authOrigin: input.authUrl, databaseHost: `db.${approvedRef}.supabase.co`,
      databasePort: "5432", databaseName: "postgres", databaseUser: "postgres", databasePassword: "synthetic@password", transport: "direct" });
    expect(validateBootstrapTarget({ ...input, databaseUrl: input.databaseUrl.replace(":5432/", "/") }).transport).toBe("direct");
  });
  it("accepts only the approved project username on the confirmed session pooler", () => {
    expect(validateBootstrapTarget({ ...input, databaseUrl: session })).toMatchObject({
      databaseHost: STAFF_BOOTSTRAP_SESSION_POOLER_HOST, databasePort: "5432", databaseName: "postgres",
      databaseUser: `postgres.${approvedRef}`, transport: "session-pooler" });
  });
  it.each([
    session.replace(":5432/", ":6543/"), session.replace(":5432/", "/"),
    session.replace("aws-0-", "aws-1-"), session.replace("ap-northeast-1", "ap-southeast-1"),
    session.replace(".pooler.supabase.com", ".pooler.supabase.com.example.invalid"),
    session.replace(`postgres.${approvedRef}:`, "postgres.aaaaaaaaaaaaaaaaaaaa:"),
    session.replace(`postgres.${approvedRef}:`, `operator.${approvedRef}:`), session.replace(`postgres.${approvedRef}:`, "postgres:"),
    session.replace("/postgres", "/other"), session + "?sslmode=disable", session + "#unapproved", session + "?", session + "#",
    input.databaseUrl.replace(":5432/", ":6543/"), input.databaseUrl.replace("db.", "unapproved."),
    input.databaseUrl.replace("postgres:synthetic%40password", "postgres:"), "not a database URI",
  ])("rejects an unapproved native transport without disclosing its input", (databaseUrl) => {
    expect(() => validateBootstrapTarget({ ...input, databaseUrl })).toThrow("approved matching Auth and native database targets");
  });
  it.each([
    { approvedRef: "aaaaaaaaaaaaaaaaaaaa" }, { approvedRef: "invalid" },
    { authUrl: input.authUrl.replace("https:", "http:") }, { authUrl: input.authUrl + "/auth/v1" },
    { authUrl: input.authUrl + "?unapproved" }, { authUrl: input.authUrl + "#unapproved" },
    { authUrl: input.authUrl.replace("https://", "https://operator:synthetic@") },
    { secretKey: "sb_publishable_synthetic_only" }, { secretKey: "sb_secret_synthetic\ninvalid" },
  ])("rejects mismatched Auth scope, decorated origin and non-secret credentials", (changed) => {
    expect(() => validateBootstrapTarget({ ...input, ...changed })).toThrow();
  });
  it("never echoes a credential-bearing URI when URL parsing fails", () => {
    const secret = "SYNTHETIC_DO_NOT_EMIT";
    try { validateBootstrapTarget({ ...input, databaseUrl: `invalid://${secret}@invalid host` }); expect.fail("Must reject"); }
    catch (error) { expect(String(error)).not.toContain(secret); }
  });
});

describe("native operator identity and TLS", () => {
  const identity = { currentUser: "postgres", sessionUser: "postgres", databaseName: "postgres" };
  it("accepts the actual native postgres identity", () => {
    expect(() => assertBootstrapOperatorIdentity(identity)).not.toThrow();
  });
  it.each([null, [], {}, { ...identity, currentUser: "service_role" }, { ...identity, sessionUser: "operator" },
    { ...identity, databaseName: "other" }, { ...identity, role: "postgres" }])("denies missing, spoofed or wrong-database identity", (value) => {
    expect(() => assertBootstrapOperatorIdentity(value)).toThrow("Native postgres operator identity is required");
  });
  it("puts a server-side stop guard before the reservation on that same SQL connection", () => {
    const sql = bootstrapOperatorStatement("begin; select msrc_staff.bootstrap_reserve(null,null); commit;");
    const reservation = sql.indexOf("msrc_staff.bootstrap_reserve");
    for (const predicate of ["current_user <> 'postgres'", "session_user <> 'postgres'", "current_database() <> 'postgres'", "errcode='42501'"]) {
      expect(sql.indexOf(predicate)).toBeGreaterThanOrEqual(0); expect(sql.indexOf(predicate)).toBeLessThan(reservation);
    }
  });
  it("requires encryption and strengthens verification when the operator supplies a root certificate", () => {
    expect(bootstrapSslSettings()).toEqual({ PGSSLMODE: "require" });
    expect(bootstrapSslSettings("/private/operator-root.crt")).toEqual({ PGSSLMODE: "verify-full", PGSSLROOTCERT: "/private/operator-root.crt" });
    expect(() => bootstrapSslSettings("")).toThrow(); expect(() => bootstrapSslSettings("invalid\0certificate")).toThrow();
  });
  it("drops poisoned ambient libpq routing, role and application secrets while retaining the validated session target", () => {
    const target = validateBootstrapTarget({ ...input, databaseUrl: session });
    const poisoned = { PATH: "/trusted/bin", PGHOST: "unapproved.example.invalid", PGHOSTADDR: "192.0.2.1",
      PGPORT: "6543", PGDATABASE: "other", PGUSER: "operator", PGPASSWORD: "synthetic-unapproved-password",
      PGSSLMODE: "disable", PGSSLROOTCERT: "/unapproved/root.crt", PGSERVICE: "unapproved", PGSERVICEFILE: "/unapproved/service.conf",
      PGOPTIONS: "-c role=postgres", PGPASSFILE: "/unapproved/passwords", SUPABASE_SECRET_KEY: "synthetic-server-secret",
      STAFF_BOOTSTRAP_PASSWORD: "synthetic-account-password", STAFF_BOOTSTRAP_DATABASE_URL: "synthetic-private-url",
      RESEND_API_KEY: "synthetic-delivery-secret", HOME: "/unapproved/home" };
    const environment = bootstrapSqlEnvironment(target, poisoned);
    expect(environment).toEqual({ PATH: "/trusted/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8",
      PGHOST: STAFF_BOOTSTRAP_SESSION_POOLER_HOST, PGPORT: "5432", PGDATABASE: "postgres", PGUSER: `postgres.${approvedRef}`,
      PGPASSWORD: "synthetic@password", PGSSLMODE: "require", PGCONNECT_TIMEOUT: "10", PGCLIENTENCODING: "UTF8" });
    expect(JSON.stringify(environment)).not.toMatch(/unapproved|synthetic-(server|account|private|delivery)/);
  });
  it("retains only required Windows execution variables and explicitly supplied TLS roots", () => {
    const environment = bootstrapSqlEnvironment(validateBootstrapTarget(input), { Path: "C:/trusted/bin", SystemRoot: "C:/Windows",
      WINDIR: "C:/Windows", TEMP: "C:/temporary", TMP: "C:/temporary", PGSSLROOTCERT: "C:/unapproved.crt", PGSSLMODE: "disable",
      USERPROFILE: "C:/unapproved-user", STAFF_BOOTSTRAP_EMAIL: "synthetic@example.invalid" }, "C:/private/approved-root.crt");
    expect(environment).toMatchObject({ PATH: "C:/trusted/bin", SystemRoot: "C:/Windows", WINDIR: "C:/Windows", TEMP: "C:/temporary",
      TMP: "C:/temporary", PGSSLMODE: "verify-full", PGSSLROOTCERT: "C:/private/approved-root.crt" });
    expect(environment).not.toHaveProperty("Path"); expect(environment).not.toHaveProperty("USERPROFILE");
    expect(environment).not.toHaveProperty("STAFF_BOOTSTRAP_EMAIL");
  });
});
