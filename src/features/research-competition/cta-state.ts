import type { AbstractResponse } from "@/features/submissions/contracts";
import type { PublicSubmissionWindow } from "@/features/submissions/submission-window";

export type ResearchCtaState = "opening" | "closed" | "signIn" | "profile" | "draft" | "finalized" | "submit";
/** Saved server window controls availability; public calendar copy remains informational. */
export function researchCtaState({ signedIn, response, window }: { signedIn: boolean; response?: AbstractResponse; window?: PublicSubmissionWindow }): ResearchCtaState {
  if (window?.state === "opening" && window.opensAt) return "opening";
  if (window && window.state !== "open") return "closed";
  if (!signedIn) return "signIn";
  if (response?.state === "profile_incomplete" || response?.state === "ready" && response.profileComplete === false) return "profile";
  if (response?.state === "ready") {
    if (response.submissions.some((submission) => submission.finalizedAt !== null)) return "finalized";
    if (response.submissions.some((submission) => submission.status === "draft")) return "draft";
  }
  if (response && response.state !== "ready") return "closed";
  return "submit";
}
