import type { AbstractDocument, AbstractSettings, AbstractSubmission } from "../../src/features/submissions/contracts";
export const abstractAuthorId = "dc000000-0000-4000-8000-000000000001";
export const abstractDocument: AbstractDocument = {
  title: "Synthetic completed research", specialtyId: "internal_medicine", studyTypeId: "retrospective_cohort", studyTypeOther: "", analysisComplete: true,
  body: { background: "Synthetic background", objectives: "Synthetic objective", methods: "Synthetic methods", results: "Synthetic results reported", limitations: "Synthetic limitation", conclusion: "Synthetic conclusion" },
  authors: [{ id: abstractAuthorId, name: "Synthetic Author", email: "synthetic-author@example.invalid", affiliations: ["Synthetic Institution"] }],
  presentingAuthorId: abstractAuthorId,
  supervisor: { fullName: "Synthetic Supervisor", email: "synthetic-supervisor@example.invalid", phone: "+966551234567" },
  ethics: { status: "exempt", committee: "", reference: "", explanation: "Synthetic exemption for testing" },
  registration: { status: "not_applicable", registry: "", number: "" },
  conflictOfInterest: "Synthetic declaration", fundingDeclaration: "Synthetic funding declaration", authorityConfirmed: true,
  englishConfirmed: true, integrityConfirmed: true, singlePresenterConfirmed: true, oneSubmissionConfirmed: true,
};
export const abstractSettings: AbstractSettings = { specialties: [{ id: "synthetic-specialty", label: "Synthetic specialty" }],
  studyTypes: [{ id: "synthetic-study", label: "Synthetic study", template: "research" }], keywordCount: 1, windowState: "open",
  opensAt: "2026-01-01T00:00:00Z", closesAt: "2028-01-01T00:00:00Z", correspondingAuthorPolicy: "Synthetic policy for local tests only" };
export const abstractSubmission: AbstractSubmission = { id: "de000000-0000-4000-8000-000000000001", reference: null, status: "draft", version: 1,
  document: abstractDocument, wordCount: 19, finalizedAt: null, decision: null };
