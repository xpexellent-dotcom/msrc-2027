import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { contactConfig } from "@/config/contact";
import { contactCopy } from "@/features/contact/contact-copy";
import { ContactForm } from "@/features/contact/contact-form";
import { getContactDeliveryConfig } from "@/features/contact/delivery-config.server";
import { getContactPageDelivery } from "@/features/contact/security.server";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";

type ContactPageProps = { params: Promise<{ locale: string }> };

// A form token must be issued for this request, never at build or shared-cache time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = contactCopy[locale];
  const description = getContactDeliveryConfig().state === "ready" ? copy.enabledMetadataDescription : copy.metadataDescription;
  return {
    ...localizedPageMetadata(locale, "/contact", copy.metadataTitle, description),
    title: copy.metadataTitle,
    description,
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = contactCopy[locale];
  const delivery = getContactPageDelivery(locale, (await headers()).get("host"));

  return (
    <>
      <section className="contact-hero" aria-labelledby="contact-page-title">
        <Container>
          <nav aria-label={copy.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.page}</span></li>
            </ol>
          </nav>
          <div className="contact-hero-grid">
            <div>
              <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{copy.eyebrow}</p>
              <h1 id="contact-page-title">{copy.title}</h1>
              <p className="contact-lead">{copy.lead}</p>
            </div>
            <aside className="contact-email" aria-labelledby="contact-email-title">
              <h2 id="contact-email-title">{copy.emailHeading}</h2>
              <p>{copy.emailBody}</p>
              <a className="text-link contact-email-link" href={`mailto:${contactConfig.recipient}`} dir="ltr" lang="en">{contactConfig.recipient}</a>
            </aside>
          </div>
        </Container>
      </section>
      <section id="contact-form" tabIndex={-1} className="editorial-section contact-form-section" aria-labelledby="contact-form-title">
        <Container narrow>
          <SectionHeading title={copy.formHeading} id="contact-form-title" />
          <ContactForm locale={locale} delivery={delivery} />
        </Container>
      </section>
    </>
  );
}
