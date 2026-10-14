"use client";

import Image from "next/image";
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Dialog } from "@/components/feedback/dialog";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { Reveal } from "@/components/ui/reveal";
import { teamCommittees, teamCopy, type TeamPerson } from "@/content/team";
import { teamQuoteFont } from "@/features/team/quote-font";
import { formatIndex, type Locale } from "@/lib/i18n";

type CommitteeView = "both" | "scientific" | "organization";

function ProfileLink({ person, locale }: { person: TeamPerson; locale: Locale }) {
  if (!person.profile) return null;
  return (
    <a
      className="msrc-team-profile"
      href={person.profile}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${teamCopy[locale].profileLabel}: ${person.name}`}
    >
      <span>{teamCopy[locale].profileLabel}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function Portrait({ person, locale, conferenceLeader }: { person: TeamPerson; locale: Locale; conferenceLeader: boolean }) {
  const portrait = person.portrait;
  const portraitStyle = portrait ? {
    "--msrc-team-image-zoom": portrait.zoom ?? 1,
    objectPosition: portrait.position ?? "50% 38%",
    transformOrigin: portrait.position ?? "50% 38%",
  } as CSSProperties : undefined;
  return (
    <Reveal className={`msrc-team-portrait${portrait ? "" : " msrc-team-portrait--pending"}`}>
      {portrait ? (
        <Image
          src={portrait.src}
          alt={person.name}
          fill
          sizes={conferenceLeader
            ? "(max-width: 570px) 45vw, 240px"
            : "(max-width: 570px) 45vw, (max-width: 849px) 30vw, 25vw"}
          style={portraitStyle}
        />
      ) : (
        <>
          <span className="msrc-team-initials" aria-hidden="true">
            {person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
          </span>
          <span className="msrc-team-portrait-label">{teamCopy[locale].portraitPending}</span>
        </>
      )}
    </Reveal>
  );
}

function PersonCard({ person, locale, conferenceLeader = false, memberDialogOpen, onViewMembers }: {
  person: TeamPerson;
  locale: Locale;
  conferenceLeader?: boolean;
  memberDialogOpen: boolean;
  onViewMembers: (person: TeamPerson, instant: boolean) => void;
}) {
  const copy = teamCopy[locale];
  const titleId = useId();
  return (
    <article
      className={`msrc-team-person ${conferenceLeader ? "msrc-team-conference-leader" : "msrc-team-lead"}`}
      data-person-id={person.id}
      aria-labelledby={titleId}
    >
      <Portrait person={person} locale={locale} conferenceLeader={conferenceLeader} />
      <div className="msrc-team-person-copy">
        <h3 id={titleId} lang="en" dir="ltr">{person.name}</h3>
        <p className="msrc-team-role">
          {person.role[locale]}
          {person.headRole ? <span className="msrc-team-head-role">{person.headRole[locale]}</span> : null}
        </p>
        {person.coLeaders?.length ? (
          <div className="msrc-team-co-leaders">
            <p className="msrc-team-subgroup-label">{copy.coLeader}</p>
            <ul>{person.coLeaders.map((coLeader) => <li key={coLeader.name} lang="en" dir="ltr">{coLeader.name}</li>)}</ul>
          </div>
        ) : null}
        {person.description ? <p className="msrc-team-description" lang="en" dir="ltr"><em>{`"${person.description}"`}</em></p> : null}
        <ProfileLink person={person} locale={locale} />
        {person.members?.length ? (
          <button
            type="button"
            className="msrc-team-view-members"
            aria-haspopup="dialog"
            aria-expanded={memberDialogOpen}
            onClick={(event) => onViewMembers(person, event.detail === 0)}
          >
            <span>{copy.viewTeam}</span>
            <span className="msrc-team-member-count">({formatIndex(person.members.length, locale)})</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function scrollMemberList(event: KeyboardEvent<HTMLUListElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const list = event.currentTarget;
  if (list.scrollHeight <= list.clientHeight) return;
  const movement = event.key === "ArrowDown" ? 40
    : event.key === "ArrowUp" ? -40
    : event.key === "PageDown" || event.key === " " ? list.clientHeight * .8
    : event.key === "PageUp" ? -list.clientHeight * .8
    : null;
  if (movement !== null) {
    event.preventDefault();
    list.scrollTop += movement;
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    list.scrollTop = event.key === "Home" ? 0 : list.scrollHeight;
  }
}

/** CMS-03, LOC-01/03, ACC-01: supplied public roster; private contact fields stay absent. */
export function TeamPage({ locale }: { locale: Locale }) {
  const copy = teamCopy[locale];
  const [view, setView] = useState<CommitteeView>("both");
  const [memberLeader, setMemberLeader] = useState<TeamPerson | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [dialogInstant, setDialogInstant] = useState(false);
  const titleLines = copy.title.split("\n");
  const memberTitle = memberLeader
    ? locale === "ar"
      ? `${copy.teamTitle} ${memberLeader.role.ar.replace(/^رئيس(?:ة)? قسم\s+/u, "")}`
      : `${memberLeader.role.en.replace(/ Lead$/u, "")} ${copy.teamTitle}`
    : copy.teamTitle;
  function openMembers(person: TeamPerson, instant: boolean) {
    setDialogInstant(instant);
    setMemberLeader(person);
    setMembersOpen(true);
  }
  const filters: { id: CommitteeView; label: string }[] = [
    { id: "both", label: copy.both },
    { id: "scientific", label: copy.scientific },
    { id: "organization", label: copy.organization },
  ];

  return (
    <div
      className={`msrc-team-page ${teamQuoteFont.variable}`}
      data-view={view}
      data-dialog-instant={dialogInstant ? "true" : undefined}
      onKeyDownCapture={() => { if (membersOpen) setDialogInstant(true); }}
    >
      <section className="msrc-team-intro experience-intro premium-photo-hero fluid-journey-hero" aria-labelledby="msrc-team-title">
        <div className="premium-hero-image" aria-hidden="true"><Image src="/media/team/team-header.webp" alt="" fill sizes="100vw" priority /></div>
        <Container>
          <nav className="experience-breadcrumb" aria-label={copy.breadcrumb}>
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.label}</span></li>
            </ol>
          </nav>
          <div className="msrc-team-hero">
            <h1 id="msrc-team-title">{titleLines.map((line, index) => <span key={line} className={index === titleLines.length - 1 ? "premium-title-accent" : undefined}>{index > 0 ? <br /> : null}{line}</span>)}</h1>
            <p className="experience-lead">{copy.lead}</p>
          </div>
        </Container>
      </section>
      <section className="msrc-team-roster" aria-label={copy.label}>
        <Container>
          <div className="msrc-team-filters" role="group" aria-label={copy.committeeView}>
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="msrc-team-filter"
                data-view-choice={filter.id}
                aria-pressed={view === filter.id}
                aria-controls={filter.id === "both" ? "msrc-team-scientific msrc-team-organization" : `msrc-team-${filter.id}`}
                onClick={() => { setView(filter.id); setMembersOpen(false); }}
              >{filter.label}</button>
            ))}
          </div>
          <div className="msrc-team-split">
            {teamCommittees.map((committee) => (
              <section
                key={committee.id}
                id={`msrc-team-${committee.id}`}
                className="msrc-team-committee"
                data-committee={committee.id}
                aria-labelledby={`msrc-team-${committee.id}-title`}
                hidden={view !== "both" && view !== committee.id}
              >
                <h2 className="msrc-team-committee-title" id={`msrc-team-${committee.id}-title`}>
                  {committee.id === "scientific" ? copy.scientificTitle : copy.organizationTitle}
                </h2>
                <PersonCard person={committee.leader} locale={locale} conferenceLeader memberDialogOpen={membersOpen && memberLeader?.id === committee.leader.id} onViewMembers={openMembers} />
                <div className="msrc-team-leads">
                  {committee.leads.map((person) => (
                    <PersonCard key={person.id} person={person} locale={locale} memberDialogOpen={membersOpen && memberLeader?.id === person.id} onViewMembers={openMembers} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="sr-only" aria-live="polite">{filters.find((filter) => filter.id === view)?.label}</p>
        </Container>
      </section>
      <Dialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={memberTitle}
        description={memberLeader ? <>{copy.ledBy} <bdi lang="en">{memberLeader.name}</bdi></> : undefined}
        closeLabel={copy.close}
        className="msrc-team-dialog"
      >
        <p className="msrc-team-dialog-label">{copy.members}</p>
        <ul className="msrc-team-dialog-members" aria-label={copy.members} tabIndex={0} onKeyDown={scrollMemberList}>
          {memberLeader?.members?.map((member) => (
            <li
              className="msrc-team-dialog-member"
              key={member.name}
              lang={locale === "ar" && member.arName ? "ar" : "en"}
              dir={locale === "ar" && member.arName ? "rtl" : "ltr"}
            >{locale === "ar" && member.arName ? member.arName : member.name}</li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
