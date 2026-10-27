import { afterEach, describe, expect, it, vi } from "vitest";
import { clearProfileEditorDraft, readProfileEditorDraft, saveProfileEditorDraft } from "@/features/participant-accounts/profile-editor-draft";
import { setParticipantHint } from "@/features/participant-accounts/participant-client";

afterEach(() => { clearProfileEditorDraft(); vi.unstubAllGlobals(); });
describe("LOC-01 / ENG-086 private profile edit draft", () => {
  it("keeps edits only in browser memory, scoped to the account and original version", () => {
    const value = { owner: "synthetic@example.invalid", version: 7, institution: "Synthetic Institution", status: "intern" as const, year: null, interests: ["synthetic"], avatar: null, removeAvatar: false };
    saveProfileEditorDraft(value); expect(readProfileEditorDraft(value.owner)).toBeNull();
    vi.stubGlobal("window", {});
    saveProfileEditorDraft(value);
    expect(readProfileEditorDraft(value.owner)).toEqual(value);
    expect(readProfileEditorDraft("someone-else@example.invalid")).toBeNull();
    clearProfileEditorDraft("someone-else@example.invalid"); expect(readProfileEditorDraft(value.owner)?.version).toBe(7);
  });
  it("clears all private edits when the signed-in hint is lost", () => {
    vi.stubGlobal("window", { location: { protocol: "http:" }, dispatchEvent: vi.fn() });
    vi.stubGlobal("document", { cookie: "msrc-signed-in=1" });
    saveProfileEditorDraft({ owner: "synthetic@example.invalid", version: 1, institution: "Synthetic", status: null, year: null, interests: [], avatar: null, removeAvatar: false });
    setParticipantHint(false);
    expect(readProfileEditorDraft("synthetic@example.invalid")).toBeNull();
  });
  it("does not recursively notify the header when its status read confirms the same hint", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { location: { protocol: "http:" }, dispatchEvent }); vi.stubGlobal("document", { cookie: "" });
    setParticipantHint(true); setParticipantHint(true);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    setParticipantHint(false); setParticipantHint(false);
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });
});
