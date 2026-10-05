import type { Metadata } from "next";
import { Link } from "@/components/ui/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/ui/reveal";
import { ResearchVisual } from "@/components/research-visual";
import { aboutCopy } from "@/content/about";
import { conferenceConfig } from "@/config/conference";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { formatIndex, isLocale } from "@/lib/i18n";
import { conferenceDescription, localizedPageMetadata } from "@/lib/metadata";

type AboutPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = aboutCopy[locale];
  const description = conferenceDescription(locale, copy.metadataDescription);
  return {
    ...localizedPageMetadata(locale, "/about", copy.metadataTitle, description),
    title: copy.metadataTitle,
    description,
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
              {conferenceConfig.dates && <div><dt>{copy.dates}</dt><dd><Link className="about-date-link" href={`/${locale}/dates-venue`}>{formatConferenceDateRange(conferenceConfig.dates, locale)}</Link></dd></div>}
              <div><dt>{copy.host}</dt><dd>{copy.hostValue}</dd></div>
              <div><dt>{copy.organizer}</dt><dd>{copy.organizerValue}</dd></div>
            </dl>
          </div>
        </Container>
      </section>

      <section id="purpose" tabIndex={-1} className="about-purpose editorial-section" aria-labelledby="purpose-title">
        <Container>
          <Reveal className="about-section-intro" stagger>
            <SectionHeading eyebrow={copy.purposeEyebrow} title={copy.purposeTitle} id="purpose-title" />
            <p>{copy.purposeBody}</p>
          </Reveal>
          <Reveal className="about-purpose-list" stagger>
            {copy.purposes.map((purpose, index) => (
              <article key={purpose.title} className="about-purpose-item">
                <ResearchVisual variant={index} className="about-purpose-visual" />
                <h3>{purpose.title}</h3>
                <p>{purpose.body}</p>
              </article>
            ))}
          </Reveal>
        </Container>
      </section>

      <section id="community" tabIndex={-1} className="about-community editorial-section" aria-labelledby="community-title">
        <Container><Reveal className="about-community-grid" stagger>
          <div>
            <SectionHeading eyebrow={copy.communityEyebrow} title={copy.communityTitle} id="community-title" inverse />
            <p className="about-community-body">{copy.communityBody}</p>
          </div>
          <div>
            <ul className="about-audiences">
              {copy.audiences.map((audience, index) => <li key={audience}><span aria-hidden="true">{formatIndex(index + 1, locale)}</span>{audience}</li>)}
            </ul>
          </div>
        </Reveal></Container>
      </section>

      <section id="explore" tabIndex={-1} className="about-explore editorial-section" aria-labelledby="explore-title">
        <Container><Reveal className="about-explore-grid" stagger>
          <SectionHeading eyebrow={copy.exploreEyebrow} title={copy.exploreTitle} id="explore-title" />
          <div>
            <p>{copy.exploreBody}</p>
            <div className="about-explore-actions">
              <ButtonLink href={`/${locale}/#participate`}>{copy.participation}</ButtonLink>
              <ButtonLink href={`/${locale}/#program`} variant="secondary">{copy.program}</ButtonLink>
            </div>
            <StatusBadge tone="neutral">{copy.closed}</StatusBadge>
          </div>
        </Reveal></Container>
      </section>
    </>
  );
}
