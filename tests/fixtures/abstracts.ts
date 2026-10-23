import type { AbstractDocument, AbstractSettings, AbstractSubmission } from "../../src/features/submissions/contracts";
export const abstractAuthorId = "dc000000-0000-4000-8000-000000000001";
export const abstractDocument: AbstractDocument = {
  title: "Synthetic ongoing research", specialtyId: "synthetic-specialty", studyTypeId: "synthetic-study", completionStatus: "ongoing",
  body: { background: "Synthetic background", aim: "Synthetic aim", methods: "Synthetic methods", results: "Recruitment ongoing", conclusion: "Results are not yet available" },
  authors: [{ id: abstractAuthorId, name: "Synthetic Author", email: "synthetic-author@example.invalid", affiliations: ["Synthetic Institution"] }],
  piAuthorId: abstractAuthorId, correspondingAuthorId: abstractAuthorId, presentingAuthorId: null, keywords: ["synthetic"],
  ethicsStatus: "exempt", ethicsExplanation: "Synthetic exemption for testing", conflictOfInterest: "Synthetic declaration", fundingDeclaration: "Synthetic funding declaration", authorityConfirmed: true,
};
export const abstractSettings: AbstractSettings = { specialties: [{ id: "synthetic-specialty", label: "Synthetic specialty" }],
  studyTypes: [{ id: "synthetic-study", label: "Synthetic study", template: "research" }], keywordCount: 1, windowState: "open",
  opensAt: "2026-01-01T00:00:00Z", closesAt: "2028-01-01T00:00:00Z", correspondingAuthorPolicy: "Synthetic policy for local tests only" };
export const abstractSubmission: AbstractSubmission = { id: "de000000-0000-4000-8000-000000000001", reference: null, status: "draft", version: 1,
  document: abstractDocument, wordCount: 13, finalizedAt: null, decision: null };
