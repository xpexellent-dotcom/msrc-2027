import { describe, expect, it } from "vitest";
import { experienceCopy } from "@/content/conference-experiences";
import { homepageNarrative } from "@/content/homepage-narrative";
import { homepageCopy } from "@/content/public-site";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import { locales } from "@/lib/i18n";

// 5 October 2026 organizer decision: registration and workshop enforcement stays
// private. This contract covers the public copy, not approval or discount logic.
const privateProcessWords = /approval|approve|discount|موافقة|خصم/i;

describe("public registration and workshop wording", () => {
  it.each(locales)("%s keeps back-office details out of public participation copy", (locale) => {
    const experience = experienceCopy[locale];
    const workshopFaq = homepageNarrative[locale].faq.find(({ question }) => /workshops|ورش العمل/i.test(question));
    expect(workshopFaq).toBeDefined();
    const publicCopy = {
      registration: experience.journeys.registration,
      workshops: experience.journeys.workshops,
      workshopsPending: experience.workshopsPending,
      workshopsPendingBody: experience.workshopsPendingBody,
      participate: experience.pages.participate,
      homepagePaths: homepageCopy[locale].pathways.filter(({ href }) => ["/registration", "/workshops"].includes(href)),
      workshopFaq,
      participantAccount: participantCopy[locale],
    };
    expect(JSON.stringify(publicCopy)).not.toMatch(privateProcessWords);
  });

  it.each(locales)("%s makes email confirmation the final registration and workshop step", (locale) => {
    const journeys = experienceCopy[locale].journeys;
    for (const journey of [journeys.registration, journeys.workshops]) {
      expect(journey.steps.at(-1)).toMatch(locale === "en" ? /confirmation email/ : /رسالة تأكيد/);
      expect(JSON.stringify(journey.details)).toMatch(locale === "en" ? /We'll email you to confirm/ : /سنرسل إليك رسالة لتأكيد/);
    }
    const registrationConfirmation = journeys.registration.details.find(({ body }) => body.includes(locale === "en" ? "Your place is confirmed" : "يتأكد مقعدك"));
    expect(registrationConfirmation?.body).toContain(locale === "en" ? "when you receive that email" : "عند استلام هذه الرسالة");
  });
});
