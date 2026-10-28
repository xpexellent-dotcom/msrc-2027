import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { profileCompletion, profileComplete, EMPTY_PARTICIPANT_PROFILE, type OptionalParticipantProfile } from "@/features/participant-accounts/profile-contract";
import { profileInitials, ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { ParticipantAccountForm } from "@/features/participant-accounts/participant-form";
const empty = EMPTY_PARTICIPANT_PROFILE;
const complete: OptionalParticipantProfile = { ...empty, institutionOther: "Synthetic", institution: "Synthetic", status: "faculty", arabicName: "مشارك تجريبي", nationality: "SA", gender: "male", dateOfBirth: "2000-01-01", city: "Jeddah", phone: "+966500000000", identityType: "national_id", identityLast4: "0000", avatarUrl: "/api/participant-accounts/profile/avatar?v=1", version: 1 };
describe("ENG-087 complete private profile presentation", () => {
  it("requires all ten baseline items and adds specialty only when configured", () => {
    expect(profileCompletion(empty)).toBe(0); expect(profileComplete(empty)).toBe(false);
    expect(profileCompletion(complete)).toBe(10); expect(profileComplete(complete)).toBe(true);
    const specialties = [{ id: "synthetic", label: "Synthetic" }];
    expect(profileComplete(complete, specialties)).toBe(false);
    expect(profileCompletion({ ...complete, interests: ["removed"] }, specialties)).toBe(10);
    expect(profileComplete({ ...complete, interests: ["synthetic"] }, specialties)).toBe(true);
    for (const field of ["avatarUrl", "institutionOther", "status", "arabicName", "nationality", "gender", "dateOfBirth", "city", "phone", "identityLast4"] as const) expect(profileComplete({ ...complete, [field]: null })).toBe(false);
  });
  it("does not count a future or underage date, invalid phone or non-Arabic name", () => {
    expect(profileCompletion({ ...complete, dateOfBirth: "2030-01-01", phone: "0500000000", arabicName: "Synthetic" })).toBe(7);
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
