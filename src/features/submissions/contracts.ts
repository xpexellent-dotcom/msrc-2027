export const ABSTRACT_BODY_KEYS = ["background", "aim", "methods", "results", "conclusion"] as const;
export type AbstractBodyKey = typeof ABSTRACT_BODY_KEYS[number];
export type AbstractAuthor = { id: string; name: string; email: string; affiliations: string[] };
export type AbstractDocument = {
  title: string; specialtyId: string; studyTypeId: string; completionStatus: "completed" | "ongoing";
  body: Record<AbstractBodyKey, string>; keywords: string[]; authors: AbstractAuthor[];
  piAuthorId: string; correspondingAuthorId: string; presentingAuthorId: string | null;
  ethicsStatus: "approval_required" | "exempt" | "not_required"; ethicsExplanation: string;
  conflictOfInterest: string; fundingDeclaration: string; authorityConfirmed: boolean;
};
export type AbstractSettings = {
  specialties: { id: string; label: string }[];
  studyTypes: { id: string; label: string; template: "research" | "case_report" }[];
  keywordCount: number | null; windowState: "open" | "closed" | "not_ready";
  opensAt: string | null; closesAt: string | null; correspondingAuthorPolicy: string | null;
};
export type AbstractStatus = "draft" | "submitted" | "administrative_review" | "scientific_review" | "revision_requested"
  | "conditionally_accepted" | "accepted" | "rejected" | "withdrawn" | "revision_expired" | "final_material_received";
export type AbstractSubmission = {
  id: string; reference: string | null; status: AbstractStatus; version: number; document: AbstractDocument;
  wordCount: number; finalizedAt: string | null;
  decision: null | { outcome: "accept" | "reject" | "revise"; instructions: string; revisionDeadline: string | null; permittedFields: string[] };
};
export type AbstractOutcome = "saved" | "finalized" | "conflict" | "pi_limit" | "evidence_gate" | "invalid";
export type AbstractResponse = { state: "ready"; profileComplete?: boolean; settings: AbstractSettings; submissions: AbstractSubmission[]; formToken: string;
  outcome?: AbstractOutcome; submissionId?: string } | {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" | "profile_incomplete";
};
