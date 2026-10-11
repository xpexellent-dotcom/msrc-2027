import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SponsorTiers } from "@/components/sponsor-tiers";
import { PortraitPlaceholder } from "@/components/portrait-placeholder";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import type { Locale } from "@/lib/i18n";

function Arrow() {
  return <svg className="directional-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function PeoplePageIntro({ locale, page }: { locale: Locale; page: "team" | "sponsors" }) {
  const copy = peopleAndPartnersCopy[locale];
  const intro = copy[page];
  return (
    <section className={`people-page-intro people-page-intro--${page}`} aria-labelledby="people-page-title">
      <Container>
        <nav className="experience-breadcrumb" aria-label={copy.breadcrumb}><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li><span aria-hidden="true">/</span><span aria-current="page">{intro.label}</span></li></ol></nav>
        <div className="people-page-heading"><h1 id="people-page-title">{intro.title}</h1><div><p>{intro.lead}</p>{page === "sponsors" ? <ButtonLink className="sponsor-top-action" href={`/${locale}/contact`} variant="gold">{copy.sponsors.nextLink}<Arrow /></ButtonLink> : null}</div></div>
      </Container>
    </section>
  );
}

export function TeamExperience({ locale }: { locale: Locale }) {
  const copy = peopleAndPartnersCopy[locale].team;
  return <>
    <PeoplePageIntro locale={locale} page="team" />
    <section className="team-roster fluid-art-surface" aria-label={copy.label}>
      <AmbientArtwork variant="people" />
      <Container>
        <section className="team-group" aria-labelledby="team-group-title">
          <h2 id="team-group-title">{copy.groupTitle}</h2>
          <div className="team-grid">{Array.from({ length: 8 }, (_, index) => <article className="team-card" key={index}>
            <PortraitPlaceholder className="team-portrait" variant={index} />
            <div className="team-card-copy"><h3>{copy.person}</h3></div>
          </article>)}</div>
        </section>
      </Container>
    </section>
    <section className="people-next"><Container><h2>{copy.nextTitle}</h2><ButtonLink href={`/${locale}/participate`} variant="gold">{copy.nextLink}<Arrow /></ButtonLink></Container></section>
  </>;
}

export function SponsorsExperience({ locale }: { locale: Locale }) {
  const copy = peopleAndPartnersCopy[locale].sponsors;
  return <>
    <PeoplePageIntro locale={locale} page="sponsors" />
    <section className="sponsors-page" aria-label={copy.label}><Container><SponsorTiers locale={locale} /></Container></section>
    <section className="people-next sponsor-invitation"><Container><div><h2>{copy.nextTitle}</h2><p>{copy.nextBody}</p></div></Container></section>
  </>;
}
