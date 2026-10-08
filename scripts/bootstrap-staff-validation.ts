/** Pure operator contracts. This module performs no network, SQL or environment reads. */
export const STAFF_BOOTSTRAP_SESSION_POOLER_HOST = "aws-0-ap-northeast-1.pooler.supabase.com";

export interface BootstrapTargetInput {
  approvedRef: string;
  authUrl: string;
  secretKey: string;
  databaseUrl: string;
}

export function validateBootstrapTarget(input: BootstrapTargetInput) {
  try {
    const auth = new URL(input.authUrl);
    const database = new URL(input.databaseUrl);
    const user = decodeURIComponent(database.username);
    const password = decodeURIComponent(database.password);
    const direct = database.hostname === `db.${input.approvedRef}.supabase.co`
      && user === "postgres" && (!database.port || database.port === "5432");
    const session = database.hostname === STAFF_BOOTSTRAP_SESSION_POOLER_HOST
      && database.port === "5432" && user === `postgres.${input.approvedRef}`;
    if (!/^[a-z0-9]{20}$/.test(input.approvedRef)
      || auth.origin !== `https://${input.approvedRef}.supabase.co` || auth.pathname !== "/"
      || auth.username || auth.password || /[?#]/.test(input.authUrl)
      || !/^sb_secret_[A-Za-z0-9_-]+$/.test(input.secretKey)
      || !["postgres:", "postgresql:"].includes(database.protocol)
      || (!direct && !session) || database.pathname !== "/postgres" || !password
      || /[?#]/.test(input.databaseUrl)) throw new Error("Invalid bootstrap target.");
    return Object.freeze({ authOrigin: auth.origin, databaseHost: database.hostname,
      databasePort: "5432", databaseName: "postgres", databaseUser: user, databasePassword: password,
      transport: session ? "session-pooler" as const : "direct" as const });
  } catch {
    // URL parsing errors can contain the original credential-bearing input.
    throw new Error("Bootstrap requires the approved matching Auth and native database targets.");
  }
}

export function bootstrapSslSettings(rootCertificate?: string) {
  if (rootCertificate === undefined) return { PGSSLMODE: "require" as const };
  if (!rootCertificate || rootCertificate.includes("\0")) throw new Error("Operator TLS certificate input is invalid.");
  return { PGSSLMODE: "verify-full" as const, PGSSLROOTCERT: rootCertificate };
}

/** Ambient libpq/service settings must never redirect the validated target. */
export function bootstrapSqlEnvironment(target: ReturnType<typeof validateBootstrapTarget>,
  ambient: Readonly<Record<string, string | undefined>>, rootCertificate?: string): Record<string, string | undefined> {
  const environment: Record<string, string> = {};
  const path = ambient.PATH ?? ambient.Path;
  if (path) environment.PATH = path;
  for (const name of ["SystemRoot", "WINDIR", "TEMP", "TMP"] as const) {
    if (ambient[name]) environment[name] = ambient[name];
  }
  return { ...environment, LANG: "C.UTF-8", LC_ALL: "C.UTF-8",
    PGHOST: target.databaseHost, PGPORT: target.databasePort, PGDATABASE: target.databaseName,
    PGUSER: target.databaseUser, PGPASSWORD: target.databasePassword,
    ...bootstrapSslSettings(rootCertificate), PGCONNECT_TIMEOUT: "10", PGCLIENTENCODING: "UTF8" };
}

export function assertBootstrapOperatorIdentity(value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Native postgres operator identity is required.");
  const identity = value as Record<string, unknown>;
  if (Object.keys(identity).sort().join(",") !== "currentUser,databaseName,sessionUser"
    || identity.currentUser !== "postgres" || identity.sessionUser !== "postgres" || identity.databaseName !== "postgres") {
    throw new Error("Native postgres operator identity is required.");
  }
}

/** Checks the actual connection before any reservation, with ON_ERROR_STOP enforced by psql. */
export function bootstrapOperatorStatement(statement: string): string {
  return `do $bootstrap_operator$
begin
  if current_user <> 'postgres' or session_user <> 'postgres' or current_database() <> 'postgres' then
    raise exception using errcode='42501',message='Native postgres operator identity is required.';
  end if;
end;
$bootstrap_operator$;
select jsonb_build_object('currentUser',current_user,'sessionUser',session_user,'databaseName',current_database())::text;
${statement}`;
}
