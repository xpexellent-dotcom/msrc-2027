export const ABSTRACT_BODY_KEYS = ["background", "objectives", "methods", "results", "limitations", "conclusion"] as const;
export type AbstractBodyKey = typeof ABSTRACT_BODY_KEYS[number];
export type AbstractAuthor = { id: string; name: string; email: string; affiliations: string[] };
export type AbstractPresenter = { id: string; name: string; email: string; institution: string; status: string | null };
export type AbstractDocument = {
  title: string; specialtyId: string; studyTypeId: string; studyTypeOther: string; analysisComplete: boolean;
  body: Record<AbstractBodyKey, string>; authors: AbstractAuthor[]; presentingAuthorId: string | null;
  supervisor: { fullName: string; email: string; phone: string };
  ethics: { status: "approved" | "exempt" | "not_required"; committee: string; reference: string; explanation: string };
  registration: { status: "registered" | "not_applicable"; registry: string; number: string };
  conflictOfInterest: string; fundingDeclaration: string; authorityConfirmed: boolean;
  englishConfirmed: boolean; integrityConfirmed: boolean; singlePresenterConfirmed: boolean; oneSubmissionConfirmed: boolean;
};
/** Retained for staff settings and profile interests; abstract v2 uses the owner taxonomy. */
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
export type AbstractOutcome = "saved" | "finalized" | "conflict" | "evidence_gate" | "invalid";
export type AbstractResponse = { state: "ready"; profileComplete?: boolean; presenterEligible?: boolean; presenter?: AbstractPresenter;
  settings: AbstractSettings; submissions: AbstractSubmission[]; formToken: string; outcome?: AbstractOutcome; submissionId?: string } | {
  state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" | "profile_incomplete" | "presenter_ineligible" | "submission_used";
};
