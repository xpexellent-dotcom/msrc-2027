/** Workflow identities only. Opening authority exists exclusively on the server. */
export const WORKFLOWS = [
  "auth", "cmsEditing", "abstracts", "review", "advisoryAssessment",
  "registration", "payments", "workshops", "hackathon", "threeMinuteThesis",
  "checkIn", "surveys", "certificates", "support", "sponsorshipInquiries",
] as const;

export type Workflow = (typeof WORKFLOWS)[number];
