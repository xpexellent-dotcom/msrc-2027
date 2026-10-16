import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JourneyExperience } from "@/components/conference-experiences";
import { experienceCopy } from "@/content/conference-experiences";
import { isLocale } from "@/lib/i18n";
import { conferenceDescription, localizedPageMetadata, siteTitle } from "@/lib/metadata";
import { Container } from "@/components/ui/container";
import { RegistrationForm } from "@/features/registration/registration-form";
import { registrationCopy } from "@/features/registration/registration-copy";
import { readRegistrationPageState } from "@/features/registration/page-state.server";
import "@/styles/participant-accounts.css";

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
  const state = await readRegistrationPageState(locale);
  if (state) {
    const copy = registrationCopy[locale];
    return <Container className="participant-account-page" narrow>
      <header className="participant-account-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
      <RegistrationForm locale={locale} initial={state} />
    </Container>;
  }
  return <JourneyExperience locale={locale} journey="registration" />;
}
