import { abstractDates } from "@/content/abstract-dates";
import { getRiyadhCalendarDate } from "@/lib/conference-dates";
import type { AbstractResponse } from "@/features/submissions/contracts";

export type ResearchCtaState = "opening" | "signIn" | "profile" | "draft" | "finalized" | "submit";
/** Calendar dates affect this informational label only; RPC settings control access. */
export function researchCtaState({ signedIn, response, now }: { signedIn: boolean; response?: AbstractResponse; now?: Date }): ResearchCtaState {
  if (now && getRiyadhCalendarDate(now) < abstractDates[0].date) return "opening";
  if (!signedIn) return "signIn";
  if (response?.state === "profile_incomplete" || response?.state === "ready" && response.profileComplete === false) return "profile";
  if (response?.state === "ready") {
    if (response.submissions.some((submission) => submission.finalizedAt !== null)) return "finalized";
    if (response.submissions.some((submission) => submission.status === "draft")) return "draft";
  }
  return "submit";
}
