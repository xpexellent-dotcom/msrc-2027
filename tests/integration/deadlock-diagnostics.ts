// PostgreSQL diagnostics may include SQL, passwords and tokens. Only these fixed
// lock-graph fields may leave test-process memory, never the original stderr.
export type DeadlockEdge = {
  process: number;
  mode: string;
  kind: "relation" | "transaction" | "object";
  resource: number;
  blockedBy: number;
  database?: number;
  class?: number;
};

const modes = "(?:AccessShare|RowShare|RowExclusive|ShareUpdateExclusive|Share|ShareRowExclusive|Exclusive|AccessExclusive)Lock";
const identifier = "([0-9]{1,10})";
const edge = new RegExp(`^(?:DETAIL:\\s+)?Process ${identifier} waits for (${modes}) on (relation|transaction|object) ${identifier}(?: of class ${identifier})?(?: of database ${identifier})?; blocked by process ${identifier}\\.$`);

export function readDeadlockEdges(diagnostics: string): DeadlockEdge[] {
  return diagnostics.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(edge);
    if (!match) return [];
    return [{ process: Number(match[1]), mode: match[2], kind: match[3] as DeadlockEdge["kind"],
      resource: Number(match[4]), blockedBy: Number(match[7]),
      ...(match[5] ? { class: Number(match[5]) } : {}),
      ...(match[6] ? { database: Number(match[6]) } : {}) }];
  });
}

const applicationRelations = new Set([
  "auth.users", "auth.identities", "auth.sessions", "auth.mfa_factors", "auth.mfa_challenges", "auth.mfa_amr_claims",
  "msrc_authorization.edition_config", "msrc_authorization.account_access", "msrc_authorization.role_grants", "msrc_authorization.grant_audit",
  "msrc_sessions.policy", "msrc_sessions.session_state", "msrc_sessions.actor_revocations", "msrc_sessions.security_audit",
  "msrc_staff_email.identity_revision", "msrc_staff_email.challenges", "msrc_staff_email.receipts", "msrc_staff_email.audit",
  "msrc_contact.attempt_buckets", "public.foundation_samples", "public.msrc_ci_staff_cookie_resource",
]);

export function readDeadlockRelations(metadata: string): { oid: number; relation: string }[] {
  return metadata.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(/^([0-9]{1,10})\|([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)$/);
    if (!match || (!applicationRelations.has(match[2]) && !/^pg_catalog\.pg_[a-z_]+$/.test(match[2]))) return [];
    return [{ oid: Number(match[1]), relation: match[2] }];
  });
}
