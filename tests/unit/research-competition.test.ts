import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { abstractDates } from "@/content/abstract-dates";
import { researchCompetitionCopy } from "@/features/research-competition/copy";
import { researchCtaState } from "@/features/research-competition/cta-state";
import { AbstractSubmissionCta } from "@/features/research-competition/submission-cta";
import { AbstractRoadmap } from "@/features/research-competition/abstract-roadmap";
import { abstractSettings, abstractSubmission } from "../fixtures/abstracts";

const ready = { state: "ready" as const, settings: abstractSettings, submissions: [], profileComplete: true, formToken: "synthetic" };
describe("ORG-068 public research competition", () => {
  it.each(["en", "ar"] as const)("retains all %s journey details and receipt semantics with decorative locale numerals", (locale) => {
    const html = renderToStaticMarkup(createElement(AbstractRoadmap, { locale, currentStep: 4 }));
    const copy = researchCompetitionCopy[locale];
    expect(html.match(/tabindex="0"/g)).toHaveLength(6);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain(copy.current);
    expect(html).toContain(copy.steps[4]);
    for (const detail of copy.stepDetails) expect(html).toContain(detail);
    expect(html).toContain(`<text x="${locale === "ar" ? "140" : "0"}" y="80" text-anchor="${locale === "ar" ? "end" : "start"}" font-size="100">${locale === "en" ? "01" : "١"}</text>`);
    expect(copy.evaluationIntro.endsWith(".")).toBe(true);
  });
  it("defaults to the signed-out label without reading a server session or clock", () => {
    expect(researchCtaState({ signedIn: false })).toBe("signIn");
  });
  it.each(["en", "ar"] as const)("keeps the static %s render free of review state and ships every acknowledgement item", (locale) => {
    const copy = researchCompetitionCopy[locale];
    // Review mode opts in from the query after hydration, so the static page never bakes it in.
    const html = renderToStaticMarkup(createElement(AbstractSubmissionCta, { locale, reviewAllowed: true }));
    expect(html).toContain(`href="/${locale}/sign-in"`);
    expect(html).not.toContain("?review=1");
    expect(html.match(/type="checkbox"/g)).toHaveLength(copy.checklist.length);
    expect(html).toContain('disabled=""');
    expect(html).toContain(copy.continueToForm);
    expect(html).toContain(copy.cancel);
    expect(html).not.toContain("<dialog open");
  });
  it("retains the normal signed-out destination outside review mode", () => {
    const html = renderToStaticMarkup(createElement(AbstractSubmissionCta, { locale: "en" }));
    expect(html).toContain('href="/en/sign-in"');
    expect(html).not.toContain('href="/en/abstracts/submit?review=1"');
  });
  it("uses the saved operational window independently of the public calendar", () => {
    expect(abstractDates[0].date).toBe("2026-11-23");
    expect(researchCtaState({ signedIn: true, response: ready, window: { state: "opening", opensAt: "2026-11-22T21:00:00Z", closesAt: "2026-12-13T20:59:00Z" } })).toBe("opening");
    expect(researchCtaState({ signedIn: false, window: { state: "open", opensAt: "2026-11-22T21:00:00Z", closesAt: "2026-12-13T20:59:00Z" } })).toBe("signIn");
  });
  it("offers sign-in, profile completion, draft continuation and a new submission", () => {
    expect(researchCtaState({ signedIn: false, response: ready })).toBe("signIn");
    expect(researchCtaState({ signedIn: true, response: { ...ready, profileComplete: false } })).toBe("profile");
    expect(researchCtaState({ signedIn: true, response: { state: "profile_incomplete" } })).toBe("profile");
    expect(researchCtaState({ signedIn: true, response: { ...ready, submissions: [abstractSubmission] } })).toBe("draft");
    expect(researchCtaState({ signedIn: true, response: ready })).toBe("submit");
  });
  it.each(["submitted", "rejected", "withdrawn"] as const)("retains the one-chance view for %s abstracts", (status) => {
    expect(researchCtaState({ signedIn: true, response: { ...ready, submissions: [{ ...abstractSubmission, status, finalizedAt: "2026-11-24T10:00:00Z" }] } })).toBe("finalized");
  });
  it("does not consume a chance for surplus legacy drafts closed without finalization", () => {
    expect(researchCtaState({ signedIn: true, response: { ...ready, submissions: [{ ...abstractSubmission, status: "withdrawn", finalizedAt: null }] } })).toBe("submit");
  });
  it("keeps bilingual section, evaluation and rule parity without publishing rubric weights", () => {
    for (const locale of ["en", "ar"] as const) {
      const copy = researchCompetitionCopy[locale];
      expect(copy.steps).toHaveLength(6); expect(copy.sections).toHaveLength(6); expect(copy.criteria).toHaveLength(7); expect(copy.rules).toHaveLength(9);
      expect(copy.formats).toHaveLength(2); expect(copy.checklist).toHaveLength(8);
      expect(JSON.stringify(copy.criteria)).not.toMatch(/%|threshold|weight/i);
    }
    expect(researchCompetitionCopy.en.sections.map(([title]) => title)).toEqual(["Background", "Objectives", "Methods", "Results", "Limitations", "Conclusion"]);
    expect(researchCompetitionCopy.en.intro).not.toContain("MSRC’26");
  });
});
