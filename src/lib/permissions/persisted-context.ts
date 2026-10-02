import { ROLES, type CurrentActor, type CurrentGrant, type GrantScope, type VerifiedPrincipal } from "./contract";

/** Own security metadata only; this deliberately cannot supply operational authority. */
export interface PersistedAccessContext {
  readonly schemaVersion: 1;
  readonly editionId: string;
  readonly principal: VerifiedPrincipal;
  readonly actor: CurrentActor & { readonly session: CurrentActor["session"] & { readonly active: false } };
  readonly grants: readonly CurrentGrant[];
  readonly operationalAccessReady: false;
  readonly privilegedAccessReady: false;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseScope(value: unknown): GrantScope | null {
  if (!record(value)) return null;
  switch (value.kind) {
    case "edition": return exact(value, ["kind"]) ? Object.freeze({ kind: "edition" }) : null;
    case "track":
      return exact(value, ["kind", "track", "trackId"]) &&
        typeof value.track === "string" && ["research", "hackathon", "threeMinuteThesis"].includes(value.track) && identifier(value.trackId)
        ? Object.freeze({ kind: "track", track: value.track as "research" | "hackathon" | "threeMinuteThesis", trackId: value.trackId }) : null;
    case "assignment":
      return exact(value, ["kind", "assignmentId"]) && identifier(value.assignmentId)
        ? Object.freeze({ kind: "assignment", assignmentId: value.assignmentId }) : null;
    case "function":
      return exact(value, ["kind", "functionId"]) && identifier(value.functionId)
        ? Object.freeze({ kind: "function", functionId: value.functionId }) : null;
    case "resource":
      return exact(value, ["kind", "resourceId"]) && identifier(value.resourceId)
        ? Object.freeze({ kind: "resource", resourceId: value.resourceId }) : null;
    default: return null;
  }
}

/** Revalidate the database boundary; malformed or future active contexts fail closed. */
export function parsePersistedAccessContext(value: unknown, userId: string, editionId: string): PersistedAccessContext | null {
  if (!exact(value, ["schemaVersion", "editionId", "principal", "actor", "grants", "operationalAccessReady", "privilegedAccessReady"]) ||
    value.schemaVersion !== 1 || value.editionId !== editionId ||
    value.operationalAccessReady !== false || value.privilegedAccessReady !== false ||
    !identifier(userId) || !uuid.test(userId) || !identifier(editionId) ||
    !exact(value.principal, ["userId", "sessionId"]) || value.principal.userId !== userId ||
    !identifier(value.principal.sessionId) || !uuid.test(value.principal.sessionId)) return null;

  const sessionId = value.principal.sessionId;
  const { actor } = value;
  if (!exact(actor, ["id", "state", "emailVerified", "individuallyIdentified", "session"]) ||
    actor.id !== userId || typeof actor.state !== "string" || !["active", "suspended"].includes(actor.state) ||
    actor.emailVerified !== true || typeof actor.individuallyIdentified !== "boolean" ||
    !exact(actor.session, ["id", "active", "assurance", "factor"]) ||
    actor.session.id !== sessionId || actor.session.active !== false ||
    typeof actor.session.assurance !== "string" || !["aal1", "aal2"].includes(actor.session.assurance) ||
    (actor.session.factor !== null && actor.session.factor !== "totp") ||
    (actor.session.assurance === "aal2") !== (actor.session.factor === "totp") ||
    !Array.isArray(value.grants) || value.grants.length > 1000 ||
    (actor.state !== "active" && value.grants.length !== 0)) return null;

  const grants: CurrentGrant[] = [];
  for (const grant of value.grants) {
    if (!exact(grant, ["actorId", "editionId", "role", "state", "scope"]) ||
      grant.actorId !== userId || grant.editionId !== editionId || grant.state !== "active" ||
      typeof grant.role !== "string" || !ROLES.some((role) => role === grant.role)) return null;
    const scope = parseScope(grant.scope);
    if (!scope) return null;
    grants.push(Object.freeze({ actorId: userId, editionId, role: grant.role as CurrentGrant["role"], state: "active", scope }));
  }

  return Object.freeze({
    schemaVersion: 1,
    editionId,
    principal: Object.freeze({ userId, sessionId }),
    actor: Object.freeze({
      id: userId, state: actor.state as CurrentActor["state"], emailVerified: true,
      individuallyIdentified: actor.individuallyIdentified,
      session: Object.freeze({
        id: sessionId, active: false,
        assurance: actor.session.assurance as "aal1" | "aal2", factor: actor.session.factor as "totp" | null,
      }),
    }),
    grants: Object.freeze(grants), operationalAccessReady: false, privilegedAccessReady: false,
  });
}
