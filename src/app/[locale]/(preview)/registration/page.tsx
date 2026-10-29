import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JourneyExperience } from "@/components/conference-experiences";
import { experienceCopy } from "@/content/conference-experiences";
import { isLocale } from "@/lib/i18n";
import { conferenceDescription, localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { Container } from "@/components/ui/container";
import { MyRegistration } from "@/features/registration/my-registration";
import { myRegistrationCopy } from "@/features/registration/my-registration-copy";
import { readMyRegistrationPageState } from "@/features/registration/my-registration-page-state.server";
import { readRegistrationPageState } from "@/features/registration/page-state.server";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = experienceCopy[locale].pages.registration;
  const description = conferenceDescription(locale, copy.lead);
  return {
    ...localizedPageMetadata(locale, "/registration", siteTitle(copy.label), description),
    title: siteTitle(copy.label),
    description,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  let state = await readMyRegistrationPageState(locale);
  if (state.state !== "closed") {
    const form = state.state === "ready" && !state.registration && state.window.eligible
      && ["early-access", "open"].includes(state.window.state) ? await readRegistrationPageState(locale) : null;
    // Another tab may submit between the two authorized reads. Render its current
    // request instead of pairing a not-requested heading with a submitted form.
    if (form?.state === "submitted") state = await readMyRegistrationPageState(locale);
    const copy = myRegistrationCopy[locale];
    return <Container className="participant-account-page" narrow>
      <header className="participant-account-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
      <MyRegistration locale={locale} initial={state} initialForm={form} />
    </Container>;
  }
  return <JourneyExperience locale={locale} journey="registration" />;
}
