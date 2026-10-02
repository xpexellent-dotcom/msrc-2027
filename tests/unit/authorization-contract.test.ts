import { describe, expect, it, vi } from "vitest";
import {
  ROLES, PERMISSION_RULES, isOperation, type AuthorityReader, type CurrentAuthority,
  type CurrentGrant, type GrantScope, type Operation, type ResourceFacts, type ResourceKind,
  type CurrentAssignment, type Role, type Track, type VerifiedPrincipal,
} from "@/lib/permissions/contract";
import { authorize, PermissionError, requirePermission } from "@/lib/permissions/authorize.server";
import { permissionMessage } from "@/lib/permissions/messages";
import { WORKFLOWS } from "@/config/workflows";
import { assertWorkflowOpen, workflowFlags, WorkflowClosedError } from "@/lib/workflows.server";

const principal: VerifiedPrincipal = { userId: "synthetic-actor-a", sessionId: "synthetic-session-a" };

// Explicit policy expectations, maintained independently of PERMISSION_RULES.
// All identifiers below are references in technical fixtures, never production records.
const purposes: readonly {
  operation: Operation; kind: ResourceKind; roles: readonly Role[]; projection: string; audit: string | null;
}[] = [
  { operation: "participant.record.read", kind: "participantRecord", roles: ["participant"], projection: "ownPermittedFields", audit: null },
  { operation: "participant.record.update", kind: "participantRecord", roles: ["participant"], projection: "ownPermittedFields", audit: "record.change" },
  { operation: "participant.outcome.read", kind: "participantOutcome", roles: ["participant"], projection: "publishedOutcome", audit: null },
  { operation: "review.packet.read", kind: "reviewPacket", roles: ["abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer"], projection: "sanitizedReviewPacket", audit: null },
  { operation: "review.assessment.write", kind: "reviewAssessment", roles: ["abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer"], projection: "ownReview", audit: "review.change" },
  { operation: "review.conflict.declare", kind: "reviewAssignment", roles: ["abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer"], projection: "ownAssignment", audit: "assignment.conflict" },
  { operation: "science.validation.read", kind: "validationOutcome", roles: ["scientificAdministrator"], projection: "validationOutcome", audit: null },
  { operation: "science.assignment.manage", kind: "scientificAdministration", roles: ["scientificAdministrator"], projection: "scientificDuty", audit: "assignment.change" },
  { operation: "judging.readiness.manage", kind: "judgingReadiness", roles: ["judgingCommittee"], projection: "assignedJudgingCategory", audit: "judging.readiness" },
  { operation: "judging.material.read", kind: "eventMaterial", roles: ["facultyJudge"], projection: "assignedEventMaterial", audit: null },
  { operation: "judging.score.write", kind: "eventScore", roles: ["facultyJudge"], projection: "ownEventScore", audit: "judging.score" },
  { operation: "operations.registration.manage", kind: "registrationOperation", roles: ["registrationWorkshopAdministrator"], projection: "registrationMinimum", audit: "registration.change" },
  { operation: "finance.reconciliation.read", kind: "financeRecord", roles: ["finance"], projection: "financeMinimum", audit: null },
  { operation: "checkIn.entitlement.read", kind: "entryEntitlement", roles: ["checkInStaff"], projection: "entryMinimum", audit: null },
  { operation: "content.draft.manage", kind: "contentDraft", roles: ["contentMediaEditor"], projection: "assignedPublicDraft", audit: "content.draft" },
  { operation: "sponsorship.inquiry.manage", kind: "sponsorInquiry", roles: ["sponsorshipPr"], projection: "sponsorInquiry", audit: "sponsorship.change" },
  { operation: "security.grant.manage", kind: "securityAdministration", roles: ["superAdmin"], projection: "scopedSecurity", audit: "grant.change" },
  { operation: "security.audit.read", kind: "auditMetadata", roles: ["superAdmin"], projection: "auditMetadata", audit: "audit.access" },
  { operation: "privacy.export.prepare", kind: "exportRequest", roles: ["superAdmin"], projection: "approvedExportScope", audit: "personal.export" },
  { operation: "evidence.original.download", kind: "confidentialOriginal", roles: ["superAdmin"], projection: "confidentialOriginal", audit: "evidence.download" },
  { operation: "presentation.file.download", kind: "presentationFile", roles: ["facultyJudge"], projection: "assignedEventMaterial", audit: "presentation.download" },
];

function trackFor(role: Role): Track {
  return role === "hackathonReviewer" ? "hackathon" : role === "threeMinuteThesisReviewer" ? "threeMinuteThesis" : "research";
}

function fixture(operation: Operation = "review.packet.read", role: Role = "abstractReviewer"): CurrentAuthority {
  const purpose = purposes.find(item => item.operation === operation)!;
  const track = trackFor(role);
  const assignmentKind = ["judging.material.read", "judging.score.write", "presentation.file.download"].includes(operation)
    ? "eventJudge" as const : "review" as const;
  const resource: ResourceFacts = {
    id: "synthetic-resource-a", editionId: "synthetic-edition-a", kind: purpose.kind,
    ownerId: ["reviewPacket", "eventMaterial", "presentationFile"].includes(purpose.kind)
      ? "synthetic-scientific-owner" : principal.userId,
    subjectOwnerId: "synthetic-scientific-owner",
    associatedActorIds: ["synthetic-other-coauthor"], track, trackId: `synthetic-${track}-track-a`,
    functionId: "synthetic-duty-a", published: true, editable: true, approved: true,
  };
  return {
    actor: {
      id: principal.userId, state: "active", emailVerified: true, phoneVerified: true, individuallyIdentified: true,
      session: { id: principal.sessionId, active: true, assurance: "aal2", factor: "sms", passwordVerified: true },
    },
    resource,
    grants: [{ actorId: principal.userId, editionId: resource.editionId, role, state: "active", scope: { kind: "resource", resourceId: resource.id } }],
    assignments: [{
      id: "synthetic-assignment-a", actorId: principal.userId, editionId: resource.editionId,
      resourceId: resource.id, kind: assignmentKind, track, trackId: resource.trackId!, state: "active", conflicted: false,
    }],
  };
}

function resourcePatch(authority: CurrentAuthority, patch: Partial<ResourceFacts>): CurrentAuthority {
  return { ...authority, resource: { ...authority.resource!, ...patch } };
}

function scoped(authority: CurrentAuthority, scope: GrantScope): CurrentAuthority {
  return { ...authority, grants: authority.grants.map(grant => ({ ...grant, scope })) };
}

function readerFor(authority: CurrentAuthority | null) {
  return { load: vi.fn(async () => authority) } satisfies AuthorityReader;
}

async function decision(authority: CurrentAuthority, operation: Operation = "review.packet.read") {
  return authorize(principal, { operation, resourceId: authority.resource!.id }, readerFor(authority));
}

function expectDenied(value: Awaited<ReturnType<typeof authorize>>) {
  expect(value).toMatchObject({ allowed: false, code: "NOT_AUTHORIZED", status: 403 });
}

describe("BL-SEC-01: independent purpose/role access matrix (ROL-01..12)", () => {
  for (const purpose of purposes) {
    describe(purpose.operation, () => {
      it.each(ROLES)("checks an explicit %s grant and provides only the authorized projection", async (role) => {
        const authority = fixture(purpose.operation, role);
        const result = await decision(authority, purpose.operation);
        if (purpose.roles.includes(role)) {
          expect(result).toEqual({ allowed: true, operation: purpose.operation, projection: purpose.projection, auditRequirement: purpose.audit });
        } else {
          expectDenied(result);
        }
      });
    });
  }

  it("has a policy expectation for every example operation and at least one permitted duty for every role", () => {
    expect(purposes.map(item => item.operation).sort()).toEqual(Object.keys(PERMISSION_RULES).sort());
    expect([...new Set(purposes.flatMap(item => [...item.roles]))].sort()).toEqual([...ROLES].sort());
  });

  it.each(purposes)("denies login without an explicit grant for $operation", async ({ operation, roles }) => {
    expectDenied(await decision({ ...fixture(operation, roles[0]), grants: [] }, operation));
  });
});

describe("current identity, assurance and revocation (ROL-12, SEC-01/02)", () => {
  it.each(purposes.filter(item => item.roles[0] !== "participant"))("requires staff AAL2 and TOTP for $operation", async ({ operation, roles }) => {
    const authority = fixture(operation, roles[0]);
    for (const session of [
      { ...authority.actor!.session, assurance: "aal1" as const },
      { ...authority.actor!.session, factor: null },
    ]) {
      expectDenied(await decision({ ...authority, actor: { ...authority.actor!, session } }, operation));
    }
    expectDenied(await decision({ ...authority, actor: { ...authority.actor!, individuallyIdentified: false } }, operation));
  });

  it("allows an email-verified participant's own record at AAL1 without imposing staff MFA", async () => {
    const operation = "participant.record.read";
    const authority = fixture(operation, "participant");
    expect(await decision({ ...authority, actor: {
      ...authority.actor!, individuallyIdentified: false,
      session: { ...authority.actor!.session, assurance: "aal1", factor: null },
    } }, operation)).toMatchObject({ allowed: true, projection: "ownPermittedFields" });
  });

  it("ignores user metadata and cached JWT role names without current grants", async () => {
    const spoofed = {
      ...principal,
      user_metadata: { role: "superAdmin", individuallyIdentified: true, assurance: "aal2" },
      app_metadata: { roles: ["superAdmin"] },
      roles: ["superAdmin"],
    };
    const authority = { ...fixture("security.grant.manage", "superAdmin"), grants: [] };
    expectDenied(await authorize(spoofed, { operation: "security.grant.manage", resourceId: authority.resource!.id }, readerFor(authority)));
  });

  it("reloads authority on every request and rejects a revoked grant despite the same principal", async () => {
    const active = fixture();
    let current = active;
    const reader = { load: vi.fn(async () => current) };
    const request = { operation: "review.packet.read", resourceId: active.resource!.id };
    expect(await authorize(principal, request, reader)).toMatchObject({ allowed: true });
    current = { ...active, grants: active.grants.map(grant => ({ ...grant, state: "revoked" as const })) };
    expectDenied(await authorize(principal, request, reader));
    expect(reader.load).toHaveBeenCalledTimes(2);
    expect(reader.load).toHaveBeenNthCalledWith(2, principal, active.resource!.id);
  });

  it.each(["suspended", "sessionRevoked", "emailUnverified"] as const)("rejects fresh %s authority", async (state) => {
    const current = fixture();
    const actor = current.actor!;
    const changed = state === "suspended" ? { ...actor, state: "suspended" as const }
      : state === "sessionRevoked" ? { ...actor, session: { ...actor.session, active: false } }
        : { ...actor, emailVerified: false };
    expectDenied(await decision({ ...current, actor: changed }));
  });

  it("requires participant phone verification while keeping participant MFA optional", async () => {
    const current = fixture("participant.record.read", "participant");
    expectDenied(await decision({ ...current, actor: { ...current.actor!, phoneVerified: false } }, "participant.record.read"));
    expectDenied(await decision({ ...current, actor: { ...current.actor!, session: { ...current.actor!.session,
      passwordVerified: false } } }, "participant.record.read"));
    expect(await decision({ ...current, actor: { ...current.actor!, session: { ...current.actor!.session,
      assurance: "aal1", factor: null } } }, "participant.record.read")).toMatchObject({ allowed: true });
  });

  it("rejects a grant belonging to another actor or edition", async () => {
    const current = fixture();
    for (const patch of [{ actorId: "synthetic-actor-b" }, { editionId: "synthetic-edition-b" }]) {
      expectDenied(await decision({ ...current, grants: current.grants.map(grant => ({ ...grant, ...patch })) }));
    }
  });
});

describe("bounded edition, track, duty, resource and assignment grants", () => {
  const scopes: readonly { name: string; matching: GrantScope; unrelated: GrantScope }[] = [
    { name: "track", matching: { kind: "track", track: "research", trackId: "synthetic-research-track-a" }, unrelated: { kind: "track", track: "research", trackId: "synthetic-research-track-b" } },
    { name: "function", matching: { kind: "function", functionId: "synthetic-duty-a" }, unrelated: { kind: "function", functionId: "synthetic-duty-b" } },
    { name: "resource", matching: { kind: "resource", resourceId: "synthetic-resource-a" }, unrelated: { kind: "resource", resourceId: "synthetic-resource-b" } },
    { name: "assignment", matching: { kind: "assignment", assignmentId: "synthetic-assignment-a" }, unrelated: { kind: "assignment", assignmentId: "synthetic-assignment-b" } },
  ];

  it.each(scopes)("limits a $name grant to its matching authority facts", async ({ matching, unrelated }) => {
    expect(await decision(scoped(fixture(), matching))).toMatchObject({ allowed: true });
    expectDenied(await decision(scoped(fixture(), unrelated)));
  });

  it("keeps an edition-wide grant bounded to the edition", async () => {
    const authority = scoped(fixture("security.grant.manage", "superAdmin"), { kind: "edition" });
    expect(await decision(authority, "security.grant.manage")).toMatchObject({ allowed: true });
    expectDenied(await decision(resourcePatch(authority, { editionId: "synthetic-edition-b" }), "security.grant.manage"));
  });

  it("does not treat a matching track ID in another track as the same scope", async () => {
    const authority = scoped(fixture("science.validation.read", "scientificAdministrator"), {
      kind: "track", track: "hackathon", trackId: "synthetic-research-track-a",
    });
    expectDenied(await decision(authority, "science.validation.read"));
  });

  it.each([
    ["checkIn.entitlement.read", "checkInStaff"],
    ["judging.readiness.manage", "judgingCommittee"],
    ["content.draft.manage", "contentMediaEditor"],
  ] as const)("requires a specific function/resource scope for %s", async (operation, role) => {
    const current = fixture(operation, role);
    expect(await decision(current, operation)).toMatchObject({ allowed: true });
    expect(await decision(scoped(current, { kind: "function", functionId: "synthetic-duty-a" }), operation)).toMatchObject({ allowed: true });
    for (const scope of [
      { kind: "edition" },
      { kind: "track", track: "research", trackId: "synthetic-research-track-a" },
      { kind: "assignment", assignmentId: "synthetic-assignment-a" },
    ] as const) {
      expectDenied(await decision(scoped(current, scope), operation));
    }
  });

  it.each([
    { kind: "track", track: "research", trackId: "" },
    { kind: "track", track: "research", trackId: null },
    { kind: "function", functionId: "" },
    { kind: "function", functionId: null },
    { kind: "resource", resourceId: "" },
    { kind: "assignment", assignmentId: "" },
  ])("rejects missing/empty grant scope references %j", async (scope) => {
    const current = fixture("science.validation.read", "scientificAdministrator");
    const authority = resourcePatch(current, { functionId: null, trackId: null });
    expectDenied(await decision(scoped(authority, scope as unknown as GrantScope), "science.validation.read"));
  });

  it.each([
    { actorId: "synthetic-actor-b" }, { editionId: "synthetic-edition-b" },
    { resourceId: "synthetic-resource-b" }, { track: "hackathon" as const },
    { trackId: "synthetic-research-track-b" }, { state: "withdrawn" as const },
  ])("rejects an assignment with mismatched or withdrawn facts %j", async (patch) => {
    const authority = fixture();
    expectDenied(await decision({ ...authority, assignments: authority.assignments.map(assignment => ({ ...assignment, ...patch })) }));
  });

  it("does not let a resource or edition grant replace a reviewer assignment", async () => {
    for (const scope of [{ kind: "resource", resourceId: "synthetic-resource-a" }, { kind: "edition" }] as const) {
      expectDenied(await decision({ ...scoped(fixture(), scope), assignments: [] }));
    }
  });

  it.each([
    ["abstractReviewer", "hackathon"], ["abstractReviewer", "threeMinuteThesis"],
    ["hackathonReviewer", "research"], ["hackathonReviewer", "threeMinuteThesis"],
    ["threeMinuteThesisReviewer", "research"], ["threeMinuteThesisReviewer", "hackathon"],
  ] as const)("does not let %s assess %s even with a matching assignment", async (role, track) => {
    const current = fixture("review.packet.read", role);
    const authority = resourcePatch(current, { track, trackId: `synthetic-${track}-track-a` });
    expectDenied(await decision({ ...authority, assignments: authority.assignments.map(assignment => ({ ...assignment, track, trackId: authority.resource!.trackId! })) }));
  });
});

describe("participant ownership and published outcome boundaries", () => {
  it.each(["participant.record.read", "participant.record.update", "participant.outcome.read"] as const)("denies another participant's %s even with an edition grant", async (operation) => {
    const current = scoped(fixture(operation, "participant"), { kind: "edition" });
    expectDenied(await decision(resourcePatch(current, { ownerId: "synthetic-actor-b" }), operation));
  });

  it("cannot update a locked own record", async () => {
    expectDenied(await decision(resourcePatch(fixture("participant.record.update", "participant"), { editable: false }), "participant.record.update"));
  });

  it("cannot read an unpublished own outcome", async () => {
    expectDenied(await decision(resourcePatch(fixture("participant.outcome.read", "participant"), { published: false }), "participant.outcome.read"));
  });

  it("permits only scoped Super Admin access to stage-one confidential originals", async () => {
    const operation = "evidence.original.download";
    const current = fixture(operation, "superAdmin");
    expect(await decision(current, operation)).toEqual({ allowed: true, operation, projection: "confidentialOriginal", auditRequirement: "evidence.download" });
    expectDenied(await decision(scoped(current, { kind: "resource", resourceId: "synthetic-resource-b" }), operation));
    expectDenied(await decision(resourcePatch(current, { approved: false }), operation));
    // Ownership, PI status, reviewer assignment and science administrator duty do not grant access.
    for (const role of ["participant", "abstractReviewer", "scientificAdministrator", "facultyJudge"] as const) {
      expectDenied(await decision(fixture(operation, role), operation));
    }
  });
});

describe("review and event judging assignment stages stay distinct for mixed-role actors", () => {
  const stageDuties = [
    ["review.packet.read", "abstractReviewer", "review", "eventJudge"],
    ["review.assessment.write", "abstractReviewer", "review", "eventJudge"],
    ["review.conflict.declare", "abstractReviewer", "review", "eventJudge"],
    ["judging.material.read", "facultyJudge", "eventJudge", "review"],
    ["judging.score.write", "facultyJudge", "eventJudge", "review"],
    ["presentation.file.download", "facultyJudge", "eventJudge", "review"],
  ] as const;

  function mixedRoleFixture(operation: Operation, role: "abstractReviewer" | "facultyJudge") {
    const current = fixture(operation, role);
    const otherRole = role === "abstractReviewer" ? "facultyJudge" : "abstractReviewer";
    return { ...current, grants: [...current.grants, { ...current.grants[0], role: otherRole as Role }] };
  }

  it.each(stageDuties)("%s requires its own %s assignment purpose", async (operation, role, requiredKind, wrongKind) => {
    const current = mixedRoleFixture(operation, role);
    expect(await decision(current, operation)).toMatchObject({ allowed: true });
    expect(current.assignments[0].kind).toBe(requiredKind);
    expectDenied(await decision({ ...current, assignments: current.assignments.map(assignment => ({ ...assignment, kind: wrongKind })) }, operation));
  });

  it.each(stageDuties)("%s does not use a grant bound to another stage's assignment", async (operation, role, requiredKind, wrongKind) => {
    const current = mixedRoleFixture(operation, role);
    const wrongStageAssignment = { ...current.assignments[0], id: "synthetic-other-stage-assignment", kind: wrongKind };
    const authority = { ...current, assignments: [...current.assignments, wrongStageAssignment] };
    // A separate permitted-purpose assignment cannot widen the scope of the other-stage grant.
    expectDenied(await decision(scoped(authority, { kind: "assignment", assignmentId: wrongStageAssignment.id }), operation));
    expect(await decision(scoped(authority, { kind: "assignment", assignmentId: current.assignments[0].id }), operation)).toMatchObject({ allowed: true });
    expect(current.assignments[0].kind).toBe(requiredKind);
  });

  for (const [operation, role] of stageDuties) {
    it.each([undefined, "unknown-stage"])(`${operation} rejects a missing or unknown assignment purpose %j`, async (kind) => {
      const current = mixedRoleFixture(operation, role);
      const authority = {
        ...current,
        assignments: current.assignments.map(assignment => ({ ...assignment, kind: kind as unknown as CurrentAssignment["kind"] })),
      };
      expectDenied(await decision(authority, operation));
    });
  }

  it.each(stageDuties.filter(([operation]) => operation !== "review.conflict.declare"))("%s retains a known conflict recorded in the other stage", async (operation, role, _requiredKind, wrongKind) => {
    const current = mixedRoleFixture(operation, role);
    const otherStageConflict = {
      ...current.assignments[0], id: "synthetic-other-stage-conflict", kind: wrongKind,
      state: "withdrawn" as const, conflicted: true,
    };
    expectDenied(await decision({ ...current, assignments: [...current.assignments, otherStageConflict] }, operation));
  });
});

describe("review conflict, anonymity and own mutable assessment", () => {
  it.each(["review.packet.read", "judging.material.read", "presentation.file.download"] as const)("denies an original input owned by the assessor for %s", async (operation) => {
    const current = fixture(operation, operation === "review.packet.read" ? "abstractReviewer" : "facultyJudge");
    expectDenied(await decision(resourcePatch(current, { ownerId: principal.userId }), operation));
  });

  it.each(["review.packet.read", "review.assessment.write", "judging.material.read", "judging.score.write", "presentation.file.download"] as const)("denies an incomplete scientific ownership link for %s", async (operation) => {
    const current = fixture(operation, operation.startsWith("review.") ? "abstractReviewer" : "facultyJudge");
    expectDenied(await decision(resourcePatch(current, { subjectOwnerId: null }), operation));
  });

  it.each(["review.packet.read", "review.assessment.write"] as const)("denies self/coauthor %s even when another valid reviewer grant is additive", async (operation) => {
    const current = fixture(operation);
    const additive: CurrentGrant = { ...current.grants[0], role: "superAdmin", scope: { kind: "edition" } };
    for (const patch of [{ subjectOwnerId: principal.userId }, { associatedActorIds: [principal.userId] }]) {
      expectDenied(await decision({ ...resourcePatch(current, patch), grants: [...current.grants, additive] }, operation));
    }
  });

  it.each(["review.packet.read", "review.assessment.write", "judging.material.read", "judging.score.write", "presentation.file.download"] as const)("denies conflict for %s despite an unconflicted duplicate assignment", async (operation) => {
    const role = operation.startsWith("review.") ? "abstractReviewer" : "facultyJudge";
    const current = fixture(operation, role);
    const assignments = [
      ...current.assignments,
      { ...current.assignments[0], id: "synthetic-assignment-conflict", conflicted: true },
    ];
    expectDenied(await decision({ ...current, assignments }, operation));
  });

  it.each(["review.packet.read", "judging.material.read"] as const)("does not clear a known conflict by withdrawing its assignment and adding another for %s", async (operation) => {
    const current = fixture(operation, operation === "review.packet.read" ? "abstractReviewer" : "facultyJudge");
    const assignments = [
      ...current.assignments,
      { ...current.assignments[0], id: "synthetic-withdrawn-conflict", state: "withdrawn" as const, conflicted: true },
    ];
    expectDenied(await decision({ ...current, assignments }, operation));
  });

  it("allows a self/conflicted reviewer to declare a conflict without granting packet access", async () => {
    const current = resourcePatch(fixture("review.conflict.declare"), { subjectOwnerId: principal.userId });
    const authority = { ...current, assignments: current.assignments.map(assignment => ({ ...assignment, conflicted: true })) };
    expect(await decision(authority, "review.conflict.declare")).toEqual({ allowed: true, operation: "review.conflict.declare", projection: "ownAssignment", auditRequirement: "assignment.conflict" });
    expectDenied(await decision({ ...authority, resource: { ...authority.resource!, kind: "reviewPacket" } }));
  });

  it("requires a current editable own assignment to declare a conflict", async () => {
    const current = fixture("review.conflict.declare");
    expectDenied(await decision({ ...current, assignments: [] }, "review.conflict.declare"));
    expectDenied(await decision(resourcePatch(current, { editable: false }), "review.conflict.declare"));
    expectDenied(await decision({ ...current, assignments: current.assignments.map(assignment => ({ ...assignment, actorId: "synthetic-actor-b" })) }, "review.conflict.declare"));
  });

  it.each(["review.assessment.write", "judging.score.write"] as const)("requires an editable %s authored by the actor, independently of the scientific work owner", async (operation) => {
    const role = operation === "review.assessment.write" ? "abstractReviewer" : "facultyJudge";
    const current = fixture(operation, role);
    expect(current.resource!.ownerId).not.toBe(current.resource!.subjectOwnerId);
    expect(await decision(current, operation)).toMatchObject({ allowed: true });
    expectDenied(await decision(resourcePatch(current, { ownerId: "synthetic-other-assessor" }), operation));
    expectDenied(await decision(resourcePatch(current, { editable: false }), operation));
    expectDenied(await decision(resourcePatch(current, { subjectOwnerId: principal.userId }), operation));
  });

  it.each(["judging.material.read", "judging.score.write", "presentation.file.download"] as const)("requires approved, assigned and conflict-free event material for %s", async (operation) => {
    const current = fixture(operation, "facultyJudge");
    expectDenied(await decision(resourcePatch(current, { approved: false }), operation));
    expectDenied(await decision({ ...current, assignments: [] }, operation));
    expectDenied(await decision(resourcePatch(current, { associatedActorIds: [principal.userId] }), operation));
  });
});

describe("fail-closed readers and non-disclosing decisions", () => {
  it.each([null, { userId: "", sessionId: principal.sessionId }, { ...principal, sessionId: "" }, { ...principal, userId: "a".repeat(257) }])("does not load authority without a valid verified principal %j", async (value) => {
    const reader = readerFor(fixture());
    expectDenied(await authorize(value, { operation: "review.packet.read", resourceId: "synthetic-resource-a" }, reader));
    expect(reader.load).not.toHaveBeenCalled();
  });

  it.each(["refund.approve", "media.approve", "__proto__", "constructor", "toString", "hasOwnProperty", "", 7, null])("rejects unknown or prototype operation %j without loading", async (operation) => {
    const reader = readerFor(fixture());
    expect(isOperation(operation)).toBe(false);
    expectDenied(await authorize(principal, { operation, resourceId: "synthetic-resource-a" }, reader));
    expect(reader.load).not.toHaveBeenCalled();
  });

  it.each([null, "", " ", "a".repeat(257), 42])("rejects malformed resource reference %j without loading", async (resourceId) => {
    const reader = readerFor(fixture());
    expectDenied(await authorize(principal, { operation: "review.packet.read", resourceId }, reader));
    expect(reader.load).not.toHaveBeenCalled();
  });

  it.each(["missingActor", "differentActor", "differentSession", "missingResource", "differentResource", "differentKind", "invalidEdition"] as const)("fails closed for reader result %s", async (fault) => {
    const current = fixture();
    const actor = current.actor!;
    const resource = current.resource!;
    const authority: CurrentAuthority = fault === "missingActor" ? { ...current, actor: null }
      : fault === "differentActor" ? { ...current, actor: { ...actor, id: "synthetic-actor-b" } }
        : fault === "differentSession" ? { ...current, actor: { ...actor, session: { ...actor.session, id: "synthetic-session-b" } } }
          : fault === "missingResource" ? { ...current, resource: null }
            : fault === "differentResource" ? { ...current, resource: { ...resource, id: "synthetic-resource-b" } }
              : fault === "differentKind" ? { ...current, resource: { ...resource, kind: "confidentialOriginal" } }
                : { ...current, resource: { ...resource, editionId: "" } };
    expectDenied(await authorize(principal, { operation: "review.packet.read", resourceId: resource.id }, readerFor(authority)));
  });

  it("fails closed when the authority reader returns no record", async () => {
    expectDenied(await authorize(principal, { operation: "review.packet.read", resourceId: "synthetic-resource-a" }, readerFor(null)));
  });

  it("turns loader failures into a generic unavailable result without secrets or resource facts", async () => {
    const secretError = "db password=sensitive-fixture; confidential/file/path; synthetic-owner-email@example.invalid";
    const reader = { load: vi.fn(async () => { throw new Error(secretError); }) };
    const request = { operation: "review.packet.read", resourceId: "synthetic-resource-a" };
    const result = await authorize(principal, request, reader);
    expect(result).toEqual({ allowed: false, code: "AUTHORIZATION_UNAVAILABLE", status: 503, reason: "unavailable" });
    expect(JSON.stringify(result)).not.toContain(secretError);
    await expect(requirePermission(principal, request, reader)).rejects.toMatchObject({
      name: "PermissionError", code: "AUTHORIZATION_UNAVAILABLE", status: 503,
      message: "Access could not be verified. Please try again.",
    });
  });

  it("throws the same safe transport error for different forbidden authority scenarios", async () => {
    const current = fixture();
    const request = { operation: "review.packet.read", resourceId: current.resource!.id };
    const cases = [
      { ...current, grants: [] },
      { ...current, assignments: [] },
      resourcePatch(current, { subjectOwnerId: principal.userId }),
    ];
    for (const authority of cases) {
      await expect(requirePermission(principal, request, readerFor(authority))).rejects.toMatchObject({
        name: "PermissionError", code: "NOT_AUTHORIZED", status: 403,
        message: "This action is not available to this account.",
      });
    }
    expect(new PermissionError("NOT_AUTHORIZED", 403).message).not.toContain("owner");
  });

  it("returns no identity facts, original file references or submission contents on an allowed decision", async () => {
    const current = fixture();
    const result = await decision(current);
    expect(Object.keys(result).sort()).toEqual(["allowed", "auditRequirement", "operation", "projection"]);
    const serialized = JSON.stringify(result);
    for (const fact of [principal.userId, principal.sessionId, current.resource!.id, current.resource!.subjectOwnerId!, ...current.resource!.associatedActorIds]) {
      expect(serialized).not.toContain(fact);
    }
  });

  it("freezes permission rules and their nested role/source lists against runtime mutation", () => {
    expect(Object.isFrozen(PERMISSION_RULES)).toBe(true);
    const rule = PERMISSION_RULES["evidence.original.download"];
    expect(Object.isFrozen(rule)).toBe(true);
    expect(Object.isFrozen(rule.roles)).toBe(true);
    expect(Object.isFrozen(rule.sourceIds)).toBe(true);
    expect(() => Reflect.set(rule, "projection", "sanitizedReviewPacket")).not.toThrow();
    expect(Reflect.set(rule, "projection", "sanitizedReviewPacket")).toBe(false);
    expect(rule.projection).toBe("confidentialOriginal");
  });
});

describe("language and release boundaries (LOC-01/03, REL-01)", () => {
  it.each(["NOT_AUTHORIZED", "AUTHORIZATION_UNAVAILABLE"] as const)("provides distinct English/Arabic safe messages for %s", (code) => {
    const english = permissionMessage(code, "en");
    const arabic = permissionMessage(code, "ar");
    expect(english).toMatch(/[A-Za-z]/);
    expect(arabic).toMatch(/[\u0600-\u06ff]/);
    expect(arabic).not.toBe(english);
    expect(permissionMessage(code, "ar", "assessment")).toBe(english);
    expect(permissionMessage(code, "en", "assessment")).toBe(english);
  });

  it("an authorized synthetic permission never opens any of the 15 operational workflow gates", async () => {
    const permission = await decision(fixture("security.grant.manage", "superAdmin"), "security.grant.manage");
    expect(permission.allowed).toBe(true);
    expect(WORKFLOWS).toHaveLength(15);
    expect(Object.isFrozen(workflowFlags)).toBe(true);
    for (const workflow of WORKFLOWS) {
      expect(workflowFlags[workflow]).toBe(false);
      expect(() => assertWorkflowOpen(workflow)).toThrow(WorkflowClosedError);
    }
  });
});
