import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftPageMetadata } from "@/components/legal-page";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { contactCopy } from "@/content/legal";
import { isLocale } from "@/lib/i18n";

type ContactPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = contactCopy[locale];
  return draftPageMetadata(locale, "/contact", copy.metadataTitle, copy.metadataDescription);
}

// BL-PUB-06: a closed scaffold. The SUP-02 form, its routing and delivery open behind their own gate.
export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = contactCopy[locale];

  return (
    <>
      <section className="legal-hero" aria-labelledby="contact-page-title">
        <Container>
          <nav aria-label={copy.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.page}</span></li>
            </ol>
          </nav>
          <div className="legal-hero-copy">
            <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{copy.eyebrow}</p>
            <h1 id="contact-page-title">{copy.title}</h1>
            <p className="legal-lead">{copy.lead}</p>
            <div className="legal-status" role="note">
              <StatusBadge tone="neutral">{copy.status}</StatusBadge>
              <p>{copy.statusBody}</p>
            </div>
          </div>
        </Container>
      </section>

      <section id="categories" tabIndex={-1} className="editorial-section legal-body" aria-labelledby="categories-title">
        <Container>
          <h2 id="categories-title" className="contact-heading">{copy.categoriesTitle}</h2>
          <ul className="contact-categories">
            {copy.categories.map((category) => (
              <li key={category.id}>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </li>
            ))}
          </ul>
          <div className="contact-notes">
            <section id="before-you-write" aria-labelledby="before-title">
              <h2 id="before-title">{copy.beforeTitle}</h2>
              <p>{copy.beforeBody}</p>
            </section>
            <section id="privacy" aria-labelledby="contact-privacy-title">
              <h2 id="contact-privacy-title">{copy.privacyTitle}</h2>
              <p>{copy.privacyBody}</p>
              <Link href={`/${locale}/privacy`} className="text-link">{copy.privacyLink}</Link>
            </section>
          </div>
        </Container>
      </section>
    </>
  );
}
