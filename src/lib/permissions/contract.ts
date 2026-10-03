/** BL-SEC-01 / ROL-01..12: engineering contract, not live grants or domain schemas. */
export const ROLES = [
  "participant", "abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer",
  "scientificAdministrator", "judgingCommittee", "facultyJudge",
  "registrationWorkshopAdministrator", "finance", "checkInStaff",
  "contentMediaEditor", "sponsorshipPr", "superAdmin",
] as const;
export type Role = (typeof ROLES)[number];
export type Track = "research" | "hackathon" | "threeMinuteThesis";

export type GrantScope =
  | { readonly kind: "edition" }
  | { readonly kind: "track"; readonly track: Track; readonly trackId: string }
  | { readonly kind: "assignment"; readonly assignmentId: string }
  | { readonly kind: "function"; readonly functionId: string }
  | { readonly kind: "resource"; readonly resourceId: string };

export type ResourceKind =
  | "participantRecord" | "participantOutcome" | "reviewPacket" | "reviewAssessment"
  | "reviewAssignment" | "validationOutcome" | "scientificAdministration"
  | "judgingReadiness" | "eventMaterial" | "eventScore" | "registrationOperation"
  | "financeRecord" | "entryEntitlement" | "contentDraft" | "sponsorInquiry"
  | "securityAdministration" | "auditMetadata" | "exportRequest"
  | "confidentialOriginal" | "presentationFile";

/** Only references/authorization facts. No identity-bearing packet or file contents. */
export interface ResourceFacts {
  readonly id: string;
  readonly editionId: string;
  readonly kind: ResourceKind;
  readonly ownerId: string | null;
  /** Original scientific work owner, distinct from the author of a review/score. */
  readonly subjectOwnerId: string | null;
  readonly associatedActorIds: readonly string[];
  readonly track: Track | null;
  readonly trackId: string | null;
  readonly functionId: string | null;
  readonly published: boolean;
  readonly editable: boolean;
  readonly approved: boolean;
}

export interface CurrentGrant {
  readonly actorId: string;
  readonly editionId: string;
  readonly role: Role;
  readonly state: "active" | "revoked";
  readonly scope: GrantScope;
}

export interface CurrentAssignment {
  readonly id: string;
  /** Pre-event assessment and event-day judging require separate assignments. */
  readonly kind: "review" | "eventJudge";
  readonly actorId: string;
  readonly editionId: string;
  readonly resourceId: string;
  readonly track: Track;
  readonly trackId: string;
  readonly state: "active" | "withdrawn";
  readonly conflicted: boolean;
}

/** M4 must construct this after managed identity verification, never from form/JWT roles. */
export interface VerifiedPrincipal {
  readonly userId: string;
  readonly sessionId: string;
}

export interface CurrentActor {
  readonly id: string;
  readonly state: "active" | "suspended";
  readonly emailVerified: boolean;
  readonly individuallyIdentified: boolean;
  readonly session: {
    readonly id: string;
    readonly active: boolean;
    readonly assurance: "aal1" | "aal2";
    readonly factor: "totp" | null;
    readonly passwordVerified: boolean;
    /** Strongest current tier across every edition, supplied by trusted DB evidence. */
    readonly authenticationTier: "participant" | "staff" | "super_admin";
    readonly staffEmailVerified: boolean;
  };
}

/** Read on every request; a JWT's stale role names are not an authority source. */
export interface CurrentAuthority {
  readonly actor: CurrentActor | null;
  readonly resource: ResourceFacts | null;
  readonly grants: readonly CurrentGrant[];
  readonly assignments: readonly CurrentAssignment[];
}
export interface AuthorityReader {
  load(principal: VerifiedPrincipal, resourceId: string): Promise<CurrentAuthority | null>;
}

type Projection =
  | "ownPermittedFields" | "publishedOutcome" | "sanitizedReviewPacket"
  | "ownReview" | "ownAssignment" | "validationOutcome" | "scientificDuty"
  | "assignedJudgingCategory" | "assignedEventMaterial" | "ownEventScore"
  | "registrationMinimum" | "financeMinimum" | "entryMinimum" | "assignedPublicDraft"
  | "sponsorInquiry" | "scopedSecurity" | "auditMetadata" | "approvedExportScope"
  | "confidentialOriginal";

interface Rule {
  readonly roles: readonly Role[];
  readonly kind: ResourceKind;
  readonly check: "owner" | "publishedOwner" | "review" | "reviewWrite" | "assignmentResponse" | "scoped" | "judge" | "judgeWrite";
  readonly projection: Projection;
  readonly audit: string | null;
  readonly sourceIds: readonly string[];
  readonly scopes?: readonly GrantScope["kind"][];
}

const rule = (value: Rule): Readonly<Rule> => Object.freeze({
  ...value,
  roles: Object.freeze([...value.roles]),
  sourceIds: Object.freeze([...value.sourceIds]),
  ...(value.scopes ? { scopes: Object.freeze([...value.scopes]) } : {}),
});
const reviewers: readonly Role[] = ["abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer"];

/** Purpose-sized examples; omitted operations (including media approval/refunds) deny. */
export const PERMISSION_RULES = Object.freeze({
  "participant.record.read": rule({ roles: ["participant"], kind: "participantRecord", check: "owner", projection: "ownPermittedFields", audit: null, sourceIds: ["ROL-02"] }),
  "participant.record.update": rule({ roles: ["participant"], kind: "participantRecord", check: "owner", projection: "ownPermittedFields", audit: "record.change", sourceIds: ["ROL-02"] }),
  "participant.outcome.read": rule({ roles: ["participant"], kind: "participantOutcome", check: "publishedOwner", projection: "publishedOutcome", audit: null, sourceIds: ["ROL-02"] }),
  "review.packet.read": rule({ roles: reviewers, kind: "reviewPacket", check: "review", projection: "sanitizedReviewPacket", audit: null, sourceIds: ["ROL-03", "ROL-04", "ROL-12"] }),
  "review.assessment.write": rule({ roles: reviewers, kind: "reviewAssessment", check: "reviewWrite", projection: "ownReview", audit: "review.change", sourceIds: ["ROL-03", "ROL-04", "ROL-12"] }),
  "review.conflict.declare": rule({ roles: reviewers, kind: "reviewAssignment", check: "assignmentResponse", projection: "ownAssignment", audit: "assignment.conflict", sourceIds: ["ROL-03", "ROL-04"] }),
  "science.validation.read": rule({ roles: ["scientificAdministrator"], kind: "validationOutcome", check: "scoped", projection: "validationOutcome", audit: null, sourceIds: ["ROL-05", "ROL-11"] }),
  "science.assignment.manage": rule({ roles: ["scientificAdministrator"], kind: "scientificAdministration", check: "scoped", projection: "scientificDuty", audit: "assignment.change", sourceIds: ["ROL-05"] }),
  "judging.readiness.manage": rule({ roles: ["judgingCommittee"], kind: "judgingReadiness", check: "scoped", projection: "assignedJudgingCategory", audit: "judging.readiness", sourceIds: ["ROL-06"], scopes: ["function", "resource"] }),
  "judging.material.read": rule({ roles: ["facultyJudge"], kind: "eventMaterial", check: "judge", projection: "assignedEventMaterial", audit: null, sourceIds: ["ROL-06", "REV-10"] }),
  "judging.score.write": rule({ roles: ["facultyJudge"], kind: "eventScore", check: "judgeWrite", projection: "ownEventScore", audit: "judging.score", sourceIds: ["ROL-06", "REV-10"] }),
  "operations.registration.manage": rule({ roles: ["registrationWorkshopAdministrator"], kind: "registrationOperation", check: "scoped", projection: "registrationMinimum", audit: "registration.change", sourceIds: ["ROL-07"] }),
  "finance.reconciliation.read": rule({ roles: ["finance"], kind: "financeRecord", check: "scoped", projection: "financeMinimum", audit: null, sourceIds: ["ROL-07"] }),
  "checkIn.entitlement.read": rule({ roles: ["checkInStaff"], kind: "entryEntitlement", check: "scoped", projection: "entryMinimum", audit: null, sourceIds: ["ROL-08"], scopes: ["function", "resource"] }),
  "content.draft.manage": rule({ roles: ["contentMediaEditor"], kind: "contentDraft", check: "scoped", projection: "assignedPublicDraft", audit: "content.draft", sourceIds: ["ROL-09"], scopes: ["function", "resource"] }),
  "sponsorship.inquiry.manage": rule({ roles: ["sponsorshipPr"], kind: "sponsorInquiry", check: "scoped", projection: "sponsorInquiry", audit: "sponsorship.change", sourceIds: ["ROL-09"] }),
  "security.grant.manage": rule({ roles: ["superAdmin"], kind: "securityAdministration", check: "scoped", projection: "scopedSecurity", audit: "grant.change", sourceIds: ["ROL-10", "ROL-12"] }),
  "security.audit.read": rule({ roles: ["superAdmin"], kind: "auditMetadata", check: "scoped", projection: "auditMetadata", audit: "audit.access", sourceIds: ["ROL-10"] }),
  "privacy.export.prepare": rule({ roles: ["superAdmin"], kind: "exportRequest", check: "scoped", projection: "approvedExportScope", audit: "personal.export", sourceIds: ["ROL-10", "ROL-12"] }),
  "evidence.original.download": rule({ roles: ["superAdmin"], kind: "confidentialOriginal", check: "scoped", projection: "confidentialOriginal", audit: "evidence.download", sourceIds: ["ROL-11", "ROL-12"] }),
  "presentation.file.download": rule({ roles: ["facultyJudge"], kind: "presentationFile", check: "judge", projection: "assignedEventMaterial", audit: "presentation.download", sourceIds: ["ROL-06", "ROL-11", "ROL-12", "REV-10"] }),
});
export type Operation = keyof typeof PERMISSION_RULES;
export function isOperation(value: unknown): value is Operation {
  return typeof value === "string" && Object.hasOwn(PERMISSION_RULES, value);
}
