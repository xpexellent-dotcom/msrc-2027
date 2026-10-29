import "server-only";
import type { AbstractResponse } from "./contracts";

type ReviewSearchParams = { review?: string | string[] };
type ReviewEnvironment = { VERCEL_ENV?: string; NODE_ENV?: string };

/** TEMPORARY owner review surface. Remove before release; production always vetoes it. */
export function isAbstractReviewMode(searchParams: ReviewSearchParams, env: ReviewEnvironment = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return searchParams.review === "1" && (env.VERCEL_ENV === "preview" || env.NODE_ENV === "development");
}

/** Static public pages cannot read the query on the server; they only need the production veto. The form page re-checks fully. */
export function abstractReviewCtaAllowed(env: ReviewEnvironment = process.env): boolean {
  return env.VERCEL_ENV !== "production";
}

/** Synthetic state only: no account, database lookup, operational window or submission. */
export function createAbstractReviewState(): Extract<AbstractResponse, { state: "ready" }> {
  return {
    state: "ready", profileComplete: true, presenterEligible: true,
    presenter: { id: "ab000000-0000-4000-8000-000000000001", name: "Review Presenter", email: "reviewer@example.test", institution: "Synthetic Review Institution", status: "year_6" },
    settings: { specialties: [], studyTypes: [], keywordCount: null, windowState: "open", opensAt: null, closesAt: null, correspondingAuthorPolicy: null },
    submissions: [], formToken: "review-only-local",
  };
}
