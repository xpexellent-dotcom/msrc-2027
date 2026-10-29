import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { RegistrationTicketCard } from "@/features/registration/ticket-card";
import { registrationTicketCopy } from "@/features/registration/ticket-copy";
import { readRegistrationTicketPageState } from "@/features/registration/ticket-page-state.server";
import { isLocale } from "@/lib/i18n";
import { siteTitle } from "@/lib/metadata";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: siteTitle(registrationTicketCopy[locale].title), robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const state = await readRegistrationTicketPageState(locale);
  const copy = registrationTicketCopy[locale];
  return <Container className="participant-account-page" narrow>
    <header className="participant-account-intro"><h1>{copy.title}</h1><p>{copy.lead}</p></header>
    <RegistrationTicketCard locale={locale} initial={state} />
  </Container>;
}
