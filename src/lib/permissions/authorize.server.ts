import "server-only";
import { PERMISSION_RULES, isOperation, type AuthorityReader, type CurrentAssignment, type CurrentGrant, type Operation, type ResourceFacts, type Role, type VerifiedPrincipal } from "./contract";

type DenialReason = "invalidRequest" | "noSession" | "inactiveActor" | "inactiveSession" | "unverifiedActor" | "notAuthorized" | "unavailable";
export type AuthorizationDecision =
  | { readonly allowed: true; readonly operation: Operation; readonly projection: (typeof PERMISSION_RULES)[Operation]["projection"]; readonly auditRequirement: string | null }
  | { readonly allowed: false; readonly code: "NOT_AUTHORIZED" | "AUTHORIZATION_UNAVAILABLE"; readonly status: 403 | 503; readonly reason: DenialReason };

const denied = (reason: DenialReason): AuthorizationDecision => ({
  allowed: false,
  code: reason === "unavailable" ? "AUTHORIZATION_UNAVAILABLE" : "NOT_AUTHORIZED",
  status: reason === "unavailable" ? 503 : 403,
  reason,
});
const validId = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 256;

function assignmentMatches(assignment: CurrentAssignment, principal: VerifiedPrincipal, resource: ResourceFacts): boolean {
  return ["review", "eventJudge"].includes(assignment.kind) &&
    ["research", "hackathon", "threeMinuteThesis"].includes(assignment.track) &&
    validId(assignment.id) && assignment.actorId === principal.userId && assignment.resourceId === resource.id &&
    assignment.editionId === resource.editionId &&
    assignment.track === resource.track && validId(assignment.trackId) && assignment.trackId === resource.trackId;
}

function scopeMatches(grant: CurrentGrant, resource: ResourceFacts, assignments: readonly CurrentAssignment[]): boolean {
  const scope = grant.scope;
  switch (scope.kind) {
    case "edition": return true;
    case "track": return ["research", "hackathon", "threeMinuteThesis"].includes(scope.track) &&
      validId(scope.trackId) && scope.track === resource.track && scope.trackId === resource.trackId;
    case "function": return validId(scope.functionId) && scope.functionId === resource.functionId;
    case "resource": return validId(scope.resourceId) && scope.resourceId === resource.id;
    case "assignment": return validId(scope.assignmentId) && assignments.some(assignment => assignment.id === scope.assignmentId);
    default: return false;
  }
}

function reviewerTrackMatches(role: Role, resource: ResourceFacts): boolean {
  return (role === "abstractReviewer" && resource.track === "research") ||
    (role === "hackathonReviewer" && resource.track === "hackathon") ||
    (role === "threeMinuteThesisReviewer" && resource.track === "threeMinuteThesis");
}

/** No production reader is supplied in BL-SEC-01. M4 must verify identity and load fresh DB state. */
export async function authorize(
  principal: VerifiedPrincipal | null,
  request: { readonly operation: unknown; readonly resourceId: unknown },
  reader: AuthorityReader,
): Promise<AuthorizationDecision> {
  if (!request || !isOperation(request.operation) || !validId(request.resourceId)) return denied("invalidRequest");
  if (!principal || !validId(principal.userId) || !validId(principal.sessionId)) return denied("noSession");
  const operation = request.operation;
  const rule = PERMISSION_RULES[operation];
  try {
    // Deliberately no JWT-role, user_metadata, process cache or client resource-facts path.
    const current = await reader.load(principal, request.resourceId);
    if (!current?.actor || current.actor.id !== principal.userId || current.actor.state !== "active") return denied("inactiveActor");
    const actor = current.actor;
    if (actor.session.id !== principal.sessionId || actor.session.active !== true) return denied("inactiveSession");
    if (actor.emailVerified !== true || actor.session.passwordVerified !== true) return denied("unverifiedActor");
    // Apply the account's strongest current requirement before any operation's
    // grant loop, including participant duties of staff or Super Admin identities.
    const tier = actor.session.authenticationTier;
    const activeRoles = current.grants.filter(grant => grant.actorId === actor.id && grant.state === "active");
    if (!["participant", "staff", "super_admin"].includes(tier)
      || (activeRoles.some(grant => grant.role === "superAdmin") && tier !== "super_admin")
      || (activeRoles.some(grant => grant.role !== "participant") && tier === "participant")) return denied("unverifiedActor");
    if (tier !== "participant" && actor.individuallyIdentified !== true) return denied("unverifiedActor");
    if (tier === "super_admin" && (actor.session.assurance !== "aal2" || actor.session.factor !== "sms")) return denied("unverifiedActor");
    if (tier === "staff" && actor.session.staffEmailVerified !== true) return denied("unverifiedActor");
    const resource = current.resource;
    if (!resource || resource.id !== request.resourceId || !validId(resource.editionId) || resource.kind !== rule.kind) return denied("notAuthorized");
    const relatedAssignments = current.assignments.filter(assignment => assignmentMatches(assignment, principal, resource));
    const assignmentKind = ["review", "reviewWrite", "assignmentResponse"].includes(rule.check) ? "review" :
      ["judge", "judgeWrite"].includes(rule.check) ? "eventJudge" : null;
    const assignments = relatedAssignments.filter(assignment => assignment.state === "active" &&
      (assignmentKind === null || assignment.kind === assignmentKind));
    const grants = current.grants.filter(grant => grant.actorId === actor.id && grant.state === "active" &&
      grant.editionId === resource.editionId && rule.roles.includes(grant.role) &&
      (!rule.scopes || rule.scopes.includes(grant.scope.kind)) && scopeMatches(grant, resource, assignments));

    for (const grant of grants) {
      if (grant.role === "participant" && actor.phoneVerified !== true) continue;
      if (grant.role === "superAdmin" && tier !== "super_admin") continue;
      if (grant.role !== "participant" && tier === "participant") continue;
      const own = resource.ownerId === actor.id;
      const originalInput = ["reviewPacket", "eventMaterial", "presentationFile"].includes(resource.kind);
      const selfReview = resource.subjectOwnerId === actor.id || resource.associatedActorIds.includes(actor.id) || (originalInput && own);
      const safeAssignment = assignments.some(assignment => assignment.conflicted === false);
      // A known conflict cannot be bypassed using another role/grant or duplicate assignment.
      const anyConflict = relatedAssignments.some(assignment => assignment.conflicted !== false);
      switch (rule.check) {
        case "owner":
          if (!own || (operation === "participant.record.update" && resource.editable !== true)) continue;
          break;
        case "publishedOwner": if (!own || resource.published !== true) continue; break;
        case "review":
        case "reviewWrite":
          if (!validId(resource.subjectOwnerId) || !reviewerTrackMatches(grant.role, resource) || !safeAssignment || anyConflict || selfReview) continue;
          if (rule.check === "reviewWrite" && (resource.ownerId !== actor.id || resource.editable !== true)) continue;
          break;
        case "assignmentResponse":
          // Declaring a conflict remains permitted without access to the scientific packet.
          if (!reviewerTrackMatches(grant.role, resource) || assignments.length === 0 || resource.editable !== true) continue;
          break;
        case "judge":
        case "judgeWrite":
          if (!validId(resource.subjectOwnerId) || !safeAssignment || anyConflict || selfReview || resource.approved !== true) continue;
          if (rule.check === "judgeWrite" && (resource.ownerId !== actor.id || resource.editable !== true)) continue;
          break;
        case "scoped":
          if (operation === "evidence.original.download" && resource.approved !== true) continue;
          if (rule.audit && !operation.endsWith(".read") && !operation.endsWith(".download") && resource.editable !== true) continue;
          break;
        default: {
          // A check kind added to the contract without a case here fails type-checking, and
          // denies at runtime instead of falling through to "allowed".
          const unhandled: never = rule.check;
          void unhandled;
          continue;
        }
      }
      return { allowed: true, operation, projection: rule.projection, auditRequirement: rule.audit };
    }
    return denied("notAuthorized");
  } catch {
    // The caller gets no loader errors, file references, personal facts or secret-bearing messages.
    return denied("unavailable");
  }
}

/** Generic transport failure: callers must not expose the internal decision reason. */
export class PermissionError extends Error {
  readonly name = "PermissionError";
  constructor(readonly code: "NOT_AUTHORIZED" | "AUTHORIZATION_UNAVAILABLE", readonly status: 403 | 503) {
    super(code === "NOT_AUTHORIZED" ? "This action is not available to this account." : "Access could not be verified. Please try again.");
  }
}

export async function requirePermission(principal: VerifiedPrincipal | null, request: { readonly operation: unknown; readonly resourceId: unknown }, reader: AuthorityReader) {
  const decision = await authorize(principal, request, reader);
  if (!decision.allowed) throw new PermissionError(decision.code, decision.status);
  return decision;
}
