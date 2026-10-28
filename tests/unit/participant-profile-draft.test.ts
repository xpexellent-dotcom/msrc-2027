import { afterEach, describe, expect, it, vi } from "vitest";
import { clearProfileEditorDraft, readProfileEditorDraft, saveProfileEditorDraft } from "@/features/participant-accounts/profile-editor-draft";
import { setParticipantHint } from "@/features/participant-accounts/participant-client";
afterEach(() => { clearProfileEditorDraft(); vi.unstubAllGlobals(); });
const value = { owner: "synthetic@example.invalid", version: 7, institutionId: null, institutionOther: "Synthetic Institution", status: "internship" as const, interests: ["synthetic"], avatar: null, removeAvatar: false };
describe("LOC-01 / ENG-087 private profile edit draft", () => {
  it("keeps ordinary edits only in browser memory, scoped to account/version", () => {
    saveProfileEditorDraft(value); expect(readProfileEditorDraft(value.owner)).toBeNull(); vi.stubGlobal("window", {}); saveProfileEditorDraft(value);
    expect(readProfileEditorDraft(value.owner)).toEqual(value); expect(readProfileEditorDraft("other@example.invalid")).toBeNull(); clearProfileEditorDraft("other@example.invalid"); expect(readProfileEditorDraft(value.owner)?.version).toBe(7);
  });
  it("never carries identity numbers, contact or birth data into the retained draft", () => {
    vi.stubGlobal("window", {}); saveProfileEditorDraft({ ...value, identityNumber: "1000000000", dateOfBirth: "2000-01-01", phone: "+966500000000" } as typeof value);
    expect(readProfileEditorDraft(value.owner)).toEqual(value);
  });
  it("clears private edits when the signed-in hint is lost", () => {
    vi.stubGlobal("window", { location: { protocol: "http:" }, dispatchEvent: vi.fn() }); vi.stubGlobal("document", { cookie: "msrc-signed-in=1" }); saveProfileEditorDraft(value); setParticipantHint(false); expect(readProfileEditorDraft(value.owner)).toBeNull();
  });
  it("does not recursively notify the header when its status read confirms the same hint", () => {
    const dispatchEvent = vi.fn(); vi.stubGlobal("window", { location: { protocol: "http:" }, dispatchEvent }); vi.stubGlobal("document", { cookie: "" });
    setParticipantHint(true); setParticipantHint(true); expect(dispatchEvent).toHaveBeenCalledTimes(1); setParticipantHint(false); setParticipantHint(false); expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });
});
