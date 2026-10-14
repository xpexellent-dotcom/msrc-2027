import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SponsorTiers } from "@/components/sponsor-tiers";
import Image from "next/image";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { TeamSpotlight } from "@/components/team-spotlight";
import { Reveal } from "@/components/ui/reveal";
import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import { initials, teamCommittees, teamCopy, type TeamPerson } from "@/content/team";
import { formatIndex, type Locale } from "@/lib/i18n";

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
        <div className="people-page-heading"><h1 id="people-page-title">{page === "team" ? intro.title.split("\n").map((line, index) => <span key={line} className={index ? "team-title-accent" : undefined}>{line}</span>) : intro.title}</h1><div><p>{intro.lead}</p>{page === "sponsors" ? <ButtonLink className="sponsor-top-action" href={`/${locale}/contact`} variant="gold">{copy.sponsors.nextLink}<Arrow /></ButtonLink> : null}</div></div>
      </Container>
    </section>
  );
}

function TeamPortrait({ person, size }: { person: TeamPerson; size: "leader" | "lead" }) {
  const sizes = size === "leader" ? "(max-width: 700px) 40vw, 240px" : "(max-width: 700px) 30vw, 160px";
  const portrait = person.photo ? <Image src={person.photo} alt="" fill sizes={sizes} /> : <span className="team-initials" aria-hidden="true" lang="en" dir="ltr">{initials(person.name.en)}</span>;
  // Pointer shortcut only: the visible LinkedIn text link beside it is the keyboard and screen-reader route.
  return person.profile
    ? <a className={`team-photo team-photo--${size} team-photo--linked`} href={person.profile} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">{portrait}</a>
    : <div className={`team-photo team-photo--${size}`}>{portrait}</div>;
}

function TeamIdentity({ person, locale, heading: Heading }: { person: TeamPerson; locale: Locale; heading: "h3" | "h4" }) {
  const copy = teamCopy[locale];
  return <div className="team-identity">
    <p className="team-role">{person.role[locale]}</p>
    <Heading className="team-name">{person.name[locale]}</Heading>
    {person.description ? <p className="team-description">{person.description[locale]}</p> : null}
    {person.profile ? <a className="team-profile" href={person.profile} target="_blank" rel="noopener noreferrer">{copy.profile}<span className="sr-only">: {person.name[locale]}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.6" /></svg></a> : null}
  </div>;
}

export function TeamExperience({ locale }: { locale: Locale }) {
  const copy = peopleAndPartnersCopy[locale].team;
  const team = teamCopy[locale];
  return <>
    <PeoplePageIntro locale={locale} page="team" />
    <section className="team-roster fluid-art-surface" aria-label={copy.label}>
      <TeamSpotlight />
      <AmbientArtwork variant="people" />
      <Container>
        <section className="team-leaders" aria-labelledby="team-leaders-title">
          <h2 id="team-leaders-title" className="team-section-title">{team.leadersTitle}</h2>
          <Reveal className="team-leader-grid" stagger>{teamCommittees.map((committee) => <article className={`team-leader team-leader--${committee.id}`} key={committee.id}>
            <TeamPortrait person={committee.lead} size="leader" />
            <TeamIdentity person={committee.lead} locale={locale} heading="h3" />
          </article>)}</Reveal>
        </section>
        {teamCommittees.map((committee) => <section className={`team-committee team-committee--${committee.id}`} key={committee.id} aria-labelledby={`team-${committee.id}-title`}>
          <div className="team-committee-heading">
            <h2 id={`team-${committee.id}-title`} className="team-section-title">{committee.title[locale]}</h2>
            <p>{formatIndex(committee.leads.length, locale)} {team.leadsLabel}</p>
          </div>
          <ol className="team-rows">{committee.leads.map((person) => <li key={person.slug}><Reveal className="team-row">
            <div className={`team-row-lead${person.coLeads?.length ? " team-row-lead--shared" : ""}`}>
              {[person, ...(person.coLeads ?? [])].map((member) => <div className="team-person" key={member.slug}>
                <TeamPortrait person={member} size="lead" />
                <TeamIdentity person={member} locale={locale} heading="h3" />
              </div>)}
            </div>
            <div className="team-members" aria-label={`${team.members}: ${person.role[locale]}`}>
              <p className="team-members-label">{team.members}</p>
              {person.members?.length ? <ul>{person.members.map((member) => <li key={member.en}>{member[locale]}</li>)}</ul> : <p className="team-members-pending">{team.membersPending}</p>}
            </div>
          </Reveal></li>)}</ol>
        </section>)}
        <p className="team-removal">{team.removal} <Link href={`/${locale}/contact`}>{team.removalLink}</Link></p>
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
