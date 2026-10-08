import { beforeEach, describe, expect, it, vi } from "vitest";

// Observe the existing external-store snapshot without a browser or effects.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useSyncExternalStore: <T>(_subscribe: unknown, snapshot: () => T) => snapshot(),
}));
import { beginParticipantAction, clearParticipantCredentials, clearParticipantDraft, finishParticipantAction, updateParticipantDraft, useParticipantDraft } from "@/features/participant-accounts/participant-draft";

describe("transient participant eligibility declaration", () => {
  beforeEach(() => clearParticipantDraft());
  it("starts unconfirmed and retains the declaration while ordinary draft fields change", () => {
    expect(useParticipantDraft().ageConfirmed).toBe(false);
    updateParticipantDraft({ ageConfirmed: true, name: "Synthetic Participant" });
    updateParticipantDraft({ email: "synthetic@example.invalid" });
    expect(useParticipantDraft()).toMatchObject({ ageConfirmed: true, name: "Synthetic Participant", email: "synthetic@example.invalid" });
  });
  it("clears the declaration with credentials while keeping the entered name", () => {
    updateParticipantDraft({ ageConfirmed: true, name: "Synthetic Participant", password: "synthetic-password", code: "123456" });
    clearParticipantCredentials();
    expect(useParticipantDraft()).toMatchObject({ ageConfirmed: false, name: "Synthetic Participant", password: "", code: "" });
  });
  it("a document exit invalidates late completion rather than restoring a prior declaration", () => {
    updateParticipantDraft({ ageConfirmed: true });
    const action = beginParticipantAction();
    expect(action).not.toBeNull();
    clearParticipantDraft();
    expect(finishParticipantAction(action!, { ageConfirmed: true, outcome: "accepted" })).toBe(false);
    expect(useParticipantDraft()).toMatchObject({ ageConfirmed: false, pending: false, outcome: null });
  });
  it("a recoverable failure retains the declaration and blocks a concurrent submit", () => {
    updateParticipantDraft({ ageConfirmed: true });
    const action = beginParticipantAction();
    expect(beginParticipantAction()).toBeNull();
    expect(finishParticipantAction(action!, { outcome: "unavailable" })).toBe(true);
    expect(useParticipantDraft()).toMatchObject({ ageConfirmed: true, pending: false, outcome: "unavailable" });
  });
});
