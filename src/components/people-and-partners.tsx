import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SponsorTiers } from "@/components/sponsor-tiers";
import Image from "next/image";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { TeamSpotlight } from "@/components/team-spotlight";
import { Reveal } from "@/components/ui/reveal";
import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import { initials, teamCommittees, teamCopy, teamFounders, type TeamPerson } from "@/content/team";
import { formatIndex, type Locale } from "@/lib/i18n";

function Arrow() {
  return <svg className="directional-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function PeoplePageIntro({ locale, page }: { locale: Locale; page: "sponsors" }) {
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

/** Same header anatomy as the Program page (ExperienceIntro): photo hero, two-line title, lead and a glass side panel with the founders. */
function TeamIntro({ locale }: { locale: Locale }) {
  const copy = peopleAndPartnersCopy[locale];
  const team = teamCopy[locale];
  const lines = copy.team.title.split("\n");
  return (
    <section className="experience-intro experience-intro--team premium-photo-hero fluid-journey-hero" aria-labelledby="experience-title">
      <div className="premium-hero-image" aria-hidden="true"><Image src="/media/team/team-header-v1.jpg" alt="" fill sizes="100vw" priority /></div>
      <Container>
        <nav aria-label={copy.breadcrumb} className="experience-breadcrumb"><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li><span aria-hidden="true">/</span><span aria-current="page">{copy.team.label}</span></li></ol></nav>
        <div className="experience-intro-grid">
          <div><h1 id="experience-title">{lines.map((line, index) => <span key={line} className={index === lines.length - 1 ? "premium-title-accent" : undefined}>{index > 0 ? <><br />{" "}</> : null}{line}</span>)}</h1><p className="experience-lead">{copy.team.lead}</p></div>
          <div className="experience-intro-art">
            <section className="program-date-panel team-founders" aria-labelledby="team-founders-title">
              <h2 id="team-founders-title" className="team-founders-title">{team.founders}</h2>
              {teamFounders.length ? <ul className="team-founder-list">{teamFounders.map((founder) => <li key={founder.slug} className="team-founder">
                <span className="team-founder-photo" aria-hidden="true">{founder.photo ? <Image src={founder.photo} alt="" fill sizes="56px" /> : <span className="team-founder-initials" lang="en" dir="ltr">{initials(founder.name.en)}</span>}</span>
                <span className="team-founder-text"><span className="team-founder-name">{founder.name[locale]}</span>{founder.role ? <span className="team-founder-role">{founder.role[locale]}</span> : null}{founder.profile ? <a className="team-profile" href={founder.profile} target="_blank" rel="noopener noreferrer">{team.profile}<span className="sr-only">: {founder.name[locale]}</span></a> : null}</span>
              </li>)}</ul> : <p className="team-founders-pending">{team.foundersPending}</p>}
            </section>
          </div>
        </div>
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
    <TeamIntro locale={locale} />
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
          <ol className="team-rows">{[...committee.leads].sort((first, second) => first.name[locale].localeCompare(second.name[locale], locale)).map((person) => <li key={person.slug}><Reveal className={`team-row${person.noMembers ? " team-row--wide" : ""}`}>
            <div className={`team-row-lead${person.coLeads?.length ? " team-row-lead--shared" : ""}`}>
              {[person, ...[...(person.coLeads ?? [])].sort((first, second) => first.name[locale].localeCompare(second.name[locale], locale))].map((member) => <div className="team-person" key={member.slug}>
                <TeamPortrait person={member} size="lead" />
                <TeamIdentity person={member} locale={locale} heading="h3" />
              </div>)}
            </div>
            {person.noMembers ? null : <div className="team-members" aria-label={`${team.members}: ${person.role[locale]}`}>
              <p className="team-members-label">{team.members}</p>
              {person.members?.length ? <ul>{person.members.map((member) => <li key={member.en}>{member[locale]}</li>)}</ul> : <p className="team-members-pending">{team.membersPending}</p>}
            </div>}
          </Reveal></li>)}</ol>
        </section>)}
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
