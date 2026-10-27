import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { profileCompletion } from "@/features/participant-accounts/profile-card";
import { profileInitials, ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { ParticipantAccountForm } from "@/features/participant-accounts/participant-form";
import type { OptionalParticipantProfile } from "@/features/participant-accounts/profile-contract";

const empty: OptionalParticipantProfile = { institution: null, status: null, year: null, interests: [], avatarUrl: null, version: 0 };
describe("ENG-086 optional profile presentation", () => {
  it("counts each optional item once and treats medical student status/year as one item", () => {
    expect(profileCompletion(empty)).toBe(0);
    expect(profileCompletion({ ...empty, status: "medical_student" })).toBe(0);
    expect(profileCompletion({ ...empty, status: "medical_student", year: 1 })).toBe(1);
    expect(profileCompletion({ ...empty, institution: "   ", status: "intern", interests: ["synthetic-a", "synthetic-b"] })).toBe(2);
    expect(profileCompletion({ institution: "Synthetic", status: "faculty", year: null, interests: ["synthetic-a"], avatarUrl: "/api/participant-accounts/profile/avatar?v=1", version: 1 })).toBe(4);
  });
  it("uses participant initials when a private picture is absent", () => {
    expect(profileInitials(" Synthetic Participant ")).toBe("SP");
    expect(profileInitials("مشارك تجريبي")).toBe("مت");
    const html = renderToStaticMarkup(createElement(ProfileAvatar, { name: "Synthetic Participant", url: null }));
    expect(html).toContain("SP"); expect(html).not.toContain("<img");
  });
  it.each(["en", "ar"] as const)("%s hides the profile card unless the default-off flag is provided", (locale) => {
    const initialState = { enabled: true, notice: null, profile: { name: "Synthetic Participant", accountState: "verified" as const }, sessionState: "authenticated" as const };
    const closed = renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen: "my-msrc", initialState }));
    expect(closed).not.toContain('data-testid="participant-profile-card"');
    const enabled = renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen: "my-msrc", initialState, profileEnabled: true }));
    expect(enabled.indexOf('data-testid="participant-profile-card"')).toBeLessThan(enabled.indexOf('data-testid="participant-next-steps"'));
  });
});
