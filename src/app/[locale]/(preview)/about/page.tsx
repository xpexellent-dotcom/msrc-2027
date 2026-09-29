import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { aboutCopy } from "@/content/about";
import { isLocale } from "@/lib/i18n";

type AboutPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = aboutCopy[locale];
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = aboutCopy[locale];

  return (
    <>
      <section id="about-introduction" tabIndex={-1} className="about-hero" aria-labelledby="about-page-title">
        <Container>
          <nav aria-label={copy.breadcrumbLabel} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.about}</span></li>
            </ol>
          </nav>
          <div className="about-hero-grid">
            <div className="about-hero-copy">
              <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{copy.eyebrow}</p>
              <h1 id="about-page-title">{copy.title}</h1>
              <p className="about-lead">{copy.lead}</p>
            </div>
            <dl className="about-identity">
              <div><dt>{copy.edition}</dt><dd>{copy.editionValue}</dd></div>
              <div><dt>{copy.host}</dt><dd>{copy.hostValue}</dd></div>
              <div><dt>{copy.organizer}</dt><dd>{copy.organizerValue}</dd></div>
            </dl>
          </div>
          <div className="about-draft"><StatusBadge tone="neutral">{copy.draft}</StatusBadge><p>{copy.draftNote}</p></div>
        </Container>
      </section>

      <section id="purpose" tabIndex={-1} className="about-purpose editorial-section" aria-labelledby="purpose-title">
        <Container>
          <div className="about-section-intro">
            <SectionHeading eyebrow={copy.purposeEyebrow} title={copy.purposeTitle} id="purpose-title" />
            <p>{copy.purposeBody}</p>
          </div>
          <div className="about-purpose-list">
            {copy.purposes.map((purpose, index) => (
              <article key={purpose.title} className="about-purpose-item">
                <span className="about-purpose-number" aria-hidden="true">{locale === "ar" ? ["٠١", "٠٢", "٠٣"][index] : `0${index + 1}`}</span>
                <h3>{purpose.title}</h3>
                <p>{purpose.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="community" tabIndex={-1} className="about-community editorial-section" aria-labelledby="community-title">
        <Container className="about-community-grid">
          <div>
            <SectionHeading eyebrow={copy.communityEyebrow} title={copy.communityTitle} id="community-title" inverse />
            <p className="about-community-body">{copy.communityBody}</p>
          </div>
          <div>
            <ul className="about-audiences">
              {copy.audiences.map((audience) => <li key={audience}><span aria-hidden="true">↗</span>{audience}</li>)}
            </ul>
            <p className="about-audience-note">{copy.audienceNote}</p>
          </div>
        </Container>
      </section>

      <section id="explore" tabIndex={-1} className="about-explore editorial-section" aria-labelledby="explore-title">
        <Container className="about-explore-grid">
          <SectionHeading eyebrow={copy.exploreEyebrow} title={copy.exploreTitle} id="explore-title" />
          <div>
            <p>{copy.exploreBody}</p>
            <div className="about-explore-actions">
              <ButtonLink href={`/${locale}/#participate`}>{copy.participation}</ButtonLink>
              <ButtonLink href={`/${locale}/#program`} variant="secondary">{copy.program}</ButtonLink>
            </div>
            <div className="about-closed-note"><StatusBadge tone="neutral">{copy.closed}</StatusBadge><p>{copy.closedNote}</p></div>
          </div>
        </Container>
      </section>
    </>
  );
}
