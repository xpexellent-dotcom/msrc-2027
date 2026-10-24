import { describe, expect, it } from "vitest";
import { emptyHackathonDocument, emptyThesisDocument, HACKATHON_TRACK_LABELS } from "@/features/competitions/contracts";
import { competitionEntryProjection, competitionSettingsProjection, validateHackathonProfileInput } from "@/features/competitions/validation";

const id = "dc000000-0000-4000-8000-000000000001";
const profile = { university: "Synthetic university", fieldOfStudy: "Synthetic field", phone: "+966500000000", enrolledInSaudiUniversity: true };
const entry = { id, kind: "hackathon", version: 1, status: "draft", document: { ...emptyHackathonDocument(), participationMode: "team" }, roster: [{ id, email: "synthetic@example.invalid", isLead: true, confirmed: false }], files: [], outcome: null };
describe("ORG-065 participant framework contracts", () => {
  it("validates required contact fields independently from the anonymized document", () => {
    expect(validateHackathonProfileInput(profile)).toEqual(profile);
    expect(validateHackathonProfileInput({ ...profile, university: "  Synthetic university  " })?.university).toBe("Synthetic university");
    for (const change of [{ university: " " }, { fieldOfStudy: "" }, { phone: "" }, { phone: "not a telephone" }, { phone: "1".repeat(41) }, { proofFileId: id }, { actorId: id }]) expect(validateHackathonProfileInput({ ...profile, ...change })).toBeNull();
  });
  it("accepts explicit lead and invitation projections without overreturned identities", () => {
    expect(competitionEntryProjection({ ...entry, isLead: false, invitationAccepted: false })).not.toBeNull();
    expect(competitionEntryProjection({ ...entry, isLead: "yes" })).toBeNull();
    expect(competitionEntryProjection({ ...entry, invitationAccepted: "yes" })).toBeNull();
    expect(competitionEntryProjection({ ...entry, phone: profile.phone })).toBeNull();
    expect(competitionEntryProjection({ ...entry, roster: [{ ...entry.roster[0], profile }] })).toBeNull();
  });
  it("retains 3MT when new hackathon display settings are null", () => {
    const settings = { stageStates: { entry: "closed", selection: "not_ready", judging: "not_ready", final_material: "not_ready", membership: "not_ready" }, pitchPrompt: null, finalistCapPerTrack: null, filesReady: false, trackLabels: null, trackDescriptions: null, applicationDeadline: null };
    expect(competitionSettingsProjection(settings)).toEqual(settings);
    expect(competitionEntryProjection({ ...entry, kind: "three_minute_thesis", document: emptyThesisDocument() })).not.toBeNull();
  });
  it("uses bilingual labels while retaining stable storage keys", () => {
    expect(HACKATHON_TRACK_LABELS.translating_research).toEqual({ en: "Evidence to Impact", ar: "من الدليل إلى الأثر" });
    expect(HACKATHON_TRACK_LABELS.advancing_research).toEqual({ en: "Research Reimagined", ar: "البحث برؤية جديدة" });
  });
});
