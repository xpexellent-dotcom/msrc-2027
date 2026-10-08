import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ParticipantAccountForm } from "@/features/participant-accounts/participant-form";
import { participantCopy, participantScreens } from "@/features/participant-accounts/participant-copy";
import type { ParticipantPageState } from "@/features/participant-accounts/contracts";

const initialState: ParticipantPageState = { enabled: true, notice: { version: "synthetic-privacy-ci-v1", url: "/en/privacy", summary: "Synthetic test notice." }, profile: null, sessionState: "anonymous" };

describe("participant age declaration presentation (ORG-041, LOC-01/03, ACC-01)", () => {
  it.each(["en", "ar"] as const)("%s starts with an unchecked labelled required declaration, without collecting birth date", (locale) => {
    const html = renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen: "sign-up", initialState }));
    const input = html.match(/<input\b[^>]*id="participant-ageConfirmed"[^>]*>/)?.[0];
    expect(input).toBeDefined();
    expect(input).toContain('type="checkbox"');
    expect(input).toContain('required=""');
    expect(input).not.toContain('checked=""');
    expect(html).toContain('for="participant-ageConfirmed"');
    expect(html).toContain(participantCopy[locale].ageConfirmed);
    expect(html).not.toMatch(/type="(?:date|tel|number)"|name="(?:dob|dateOfBirth|age)"/);
  });
  it.each(participantScreens.filter((screen) => screen !== "sign-up"))("does not ask for age on %s", (screen) => {
    for (const locale of ["en", "ar"] as const) {
      const html = renderToStaticMarkup(createElement(ParticipantAccountForm, { locale, screen, initialState }));
      expect(html).not.toContain("participant-ageConfirmed");
      expect(html).not.toContain(participantCopy[locale].ageConfirmed);
    }
  });
});
