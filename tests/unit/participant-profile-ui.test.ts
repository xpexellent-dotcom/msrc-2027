import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { profileCompletion, profileComplete, profileNamesFromAccount, EMPTY_PARTICIPANT_PROFILE, type OptionalParticipantProfile } from "@/features/participant-accounts/profile-contract";
import { profileInitials, ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { ParticipantAccountForm } from "@/features/participant-accounts/participant-form";
const empty = EMPTY_PARTICIPANT_PROFILE;
const complete: OptionalParticipantProfile = { ...empty, institutionOther: "Synthetic", institution: "Synthetic", status: "faculty", arabicName: "مشارك تجريبي", latinName: "Synthetic Participant", nationality: "SA", gender: "male", dateOfBirth: "2000-01-01", city: "Jeddah", phone: "+966500000000", identityType: "national_id", identityLast4: "0000", avatarUrl: "/api/participant-accounts/profile/avatar?v=1", version: 1 };
describe("ENG-087 complete private profile presentation", () => {
  it("requires both name spellings among eleven baseline items and adds specialty only when configured", () => {
    expect(profileCompletion(empty)).toBe(0); expect(profileComplete(empty)).toBe(false);
    expect(profileCompletion(complete)).toBe(11); expect(profileComplete(complete)).toBe(true);
    const specialties = [{ id: "synthetic", label: "Synthetic" }];
    expect(profileComplete(complete, specialties)).toBe(false);
    expect(profileCompletion({ ...complete, interests: ["removed"] }, specialties)).toBe(11);
    const withSpecialty = { ...complete, interests: ["synthetic"] };
    expect(profileCompletion(withSpecialty, specialties)).toBe(12);
    expect(profileComplete(withSpecialty, specialties)).toBe(true);
    for (const field of ["avatarUrl", "institutionOther", "status", "arabicName", "latinName", "nationality", "gender", "dateOfBirth", "city", "phone", "identityLast4"] as const) expect(profileComplete({ ...complete, [field]: null })).toBe(false);
  });
  it.each([
    ["  مشارك تجريبي  ", "مشارك تجريبي", ""],
    ["  Élodie D’Arcy-Smith  ", "", "Élodie D’Arcy-Smith"],
    ["مشارك Synthetic", "", ""],
    ["مشارك Иванов", "", ""],
    ["姓名", "", ""],
  ])("prefills only the matching spelling for the account name %s", (name, arabicName, latinName) => {
    expect(profileNamesFromAccount(name)).toEqual({ arabicName, latinName });
  });
  it("does not count a future or underage date, invalid phone or an invalid name spelling", () => {
    expect(profileCompletion({ ...complete, dateOfBirth: "2030-01-01", phone: "0500000000", arabicName: "Synthetic" })).toBe(8);
    expect(profileCompletion({ ...complete, latinName: "Synthetic مشارك" })).toBe(10);
    expect(profileComplete({ ...complete, latinName: "Synthetic مشارك" })).toBe(false);
  });
  it("uses participant initials when a private picture is absent", () => {
    expect(profileInitials(" Synthetic Participant ")).toBe("SP"); expect(profileInitials("مشارك تجريبي")).toBe("مت");
    const html = renderToStaticMarkup(createElement(ProfileAvatar, { name: "Synthetic Participant", url: null })); expect(html).toContain("SP"); expect(html).not.toContain("<img");
  });
  it.each(["en", "ar"] as const)("%s hides the profile card unless the default-off flag is provided", (locale) => {
    const initialState = { enabled: true, notice: null, profile: { name: "Synthetic Participant", accountState: "verified" as const }, sessionState: "authenticated" as const };
    expect(renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen: "my-msrc", initialState }))).not.toContain('data-testid="participant-profile-card"');
    const enabled = renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen: "my-msrc", initialState, profileEnabled: true })); expect(enabled.indexOf('data-testid="participant-profile-card"')).toBeLessThan(enabled.indexOf('data-testid="participant-next-steps"'));
  });
});
