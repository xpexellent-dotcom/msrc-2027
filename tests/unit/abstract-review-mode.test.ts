import { afterEach, describe, expect, it, vi } from "vitest";
import { createAbstractReviewState, isAbstractReviewMode } from "@/features/submissions/review-mode.server";
import { readAbstractPageState } from "@/features/submissions/page-state.server";

const readHeaders = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: readHeaders }));
afterEach(() => vi.unstubAllEnvs());

describe("TEMPORARY abstract owner review mode", () => {
  it.each([
    [{ VERCEL_ENV: "preview", NODE_ENV: "production" }, "1", true],
    [{ NODE_ENV: "development" }, "1", true],
    [{ VERCEL_ENV: "development", NODE_ENV: "development" }, "1", true],
    [{ VERCEL_ENV: "production", NODE_ENV: "production" }, "1", false],
    [{ VERCEL_ENV: "production", NODE_ENV: "development" }, "1", false],
    [{ NODE_ENV: "production" }, "1", false],
    [{ NODE_ENV: "test" }, "1", false],
    [{ VERCEL_ENV: "preview" }, undefined, false],
    [{ NODE_ENV: "development" }, "true", false],
    [{ VERCEL_ENV: "preview" }, ["1", "1"], false],
  ] as const)("gates environment %j with query %j", (env, review, expected) => {
    expect(isAbstractReviewMode({ review: Array.isArray(review) ? [...review] : review as string | undefined }, env)).toBe(expected);
  });

  it("returns an empty synthetic ready state without operational dates or credentials", () => {
    const state = createAbstractReviewState();
    expect(state).toMatchObject({ state: "ready", profileComplete: true, presenterEligible: true, submissions: [], presenter: { name: "Review Presenter", email: "reviewer@example.test", institution: "Synthetic Review Institution" }, settings: { windowState: "open", opensAt: null, closesAt: null }, formToken: "review-only-local" });
    state.presenter!.name = "Changed review label";
    expect(createAbstractReviewState().presenter?.name).toBe("Review Presenter");
  });

  it("allows preview review without configuration, a session or hosted reads", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "false");
    await expect(readAbstractPageState("en", { review: "1" })).resolves.toEqual(createAbstractReviewState());
    expect(readHeaders).not.toHaveBeenCalled();
  });

  it("production ignores review=1 and retains the closed server state even with NODE_ENV development", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "false");
    await expect(readAbstractPageState("en", { review: "1" })).resolves.toEqual({ state: "closed" });
    expect(readHeaders).not.toHaveBeenCalled();
  });

  it("preview without review=1 retains the closed server state", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "false");
    await expect(readAbstractPageState("ar")).resolves.toEqual({ state: "closed" });
    expect(readHeaders).not.toHaveBeenCalled();
  });
});
