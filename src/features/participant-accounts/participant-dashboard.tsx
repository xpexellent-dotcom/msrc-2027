import Image from "next/image";
import { BrandIcon, type BrandIconName } from "@/components/brand/brand-icon";
import { FlowLines } from "@/components/brand/flow-lines";
import { Arrow } from "@/components/ui/arrow";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { brandLogo } from "@/content/brand-identity";
import { ParticipantInbox } from "@/features/announcements/participant-inbox";
import type { ParticipantAnnouncementsResponse } from "@/features/announcements/participant-contracts";
import { participantAnnouncementsCopy } from "@/features/announcements/participant-copy";
import { myRegistrationCopy } from "@/features/registration/my-registration-copy";
import { ResearchParticipantWorkspace } from "@/features/research-judging/participant-workspace";
import { abstractCopy } from "@/features/submissions/copy";
import { MyWorkshopBookings } from "@/features/workshops/my-bookings";
import type { WorkshopParticipantResponse } from "@/features/workshops/participant-contracts";
import { workshopParticipantCopy } from "@/features/workshops/participant-copy";
import type { Locale } from "@/lib/i18n";
import type { ParticipantProfile } from "./contracts";
import { DashboardIcon } from "./dashboard-icon";
import { participantCopy } from "./participant-copy";
import { ParticipantProfileCard } from "./profile-card";

type ParticipationAvailability = {
  registrationAvailable: boolean;
  abstractsAvailable: boolean;
  workshopsAvailable: boolean;
  competitionsAvailable: boolean;
};

type DashboardProps = ParticipationAvailability & {
  locale: Locale;
  profile: ParticipantProfile;
  profileEnabled: boolean;
  certificatesAvailable: boolean;
  researchJudgingAvailable: boolean;
  announcements?: ParticipantAnnouncementsResponse;
  workshopBookings?: WorkshopParticipantResponse;
  pending: boolean;
  signOutDisabled: boolean;
  onSignOut: () => void;
};

const pathIcons = {
  attend: "27-tickets",
  abstract: "01-research",
  workshops: "19-workshops",
  hackathon: "20-hackathon",
  "three-minute-thesis": "21-3mt",
} as const satisfies Record<keyof typeof participantCopy.en.steps, BrandIconName>;

function MemberSince({ value, locale }: { value: string; locale: Locale }) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const display = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "long", calendar: "gregory", timeZone: "Asia/Riyadh",
  }).format(parsed);
  return <time dateTime={value}>{display}</time>;
}

function Participation({ locale, registrationAvailable, abstractsAvailable, workshopsAvailable, competitionsAvailable }: ParticipationAvailability & { locale: Locale }) {
  const copy = participantCopy[locale];
  const items = [
    { key: "attend", open: registrationAvailable, action: myRegistrationCopy[locale].title, href: "/registration", info: "/registration" },
    { key: "abstract", open: abstractsAvailable, action: abstractCopy[locale].title, href: "/abstracts/submit", info: "/abstracts" },
    { key: "workshops", open: workshopsAvailable, action: copy.stepActions.workshops, href: "/workshops", info: "/workshops" },
    { key: "hackathon", open: competitionsAvailable, action: copy.stepActions.hackathon, href: "/entries", info: "/hackathon" },
    { key: "three-minute-thesis", open: competitionsAvailable, action: copy.stepActions.threeMinuteThesis, href: "/entries?kind=three_minute_thesis", info: "/3mt" },
  ] as const;

  return (
    <section id="participation" tabIndex={-1} className="participant-dashboard-surface" aria-labelledby="participant-next-steps-title" data-testid="participant-next-steps">
      <header className="participant-dashboard-panel-heading">
        <h2 id="participant-next-steps-title">{copy.nextSteps}</h2>
        <p>{copy.nextStepsLead}</p>
      </header>
      <ul className="participant-dashboard-paths" role="list">
        {items.map((item) => {
          const step = copy.steps[item.key];
          const closed = item.key === "attend" ? copy.registrationClosed : copy.notOpen;
          return (
            <li key={item.key} data-step={item.key} data-open={item.open}>
              <BrandIcon name={pathIcons[item.key]} size={44} />
              <div className="participant-dashboard-path-copy">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <div className="participant-dashboard-path-action">
                {!item.open ? <span className="participant-dashboard-closed" data-testid={item.key === "attend" ? "participant-registration-closed" : undefined}>{closed}</span> : null}
                <Link href={"/" + locale + (item.open ? item.href : item.info)} className="participant-dashboard-path-link">
                  {item.open ? item.action : <>{copy.learnMore}<span className="sr-only"> {copy.aboutStep} {step.title}</span></>}
                  <Arrow />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ParticipantDashboard({
  locale, profile, profileEnabled, registrationAvailable, abstractsAvailable, workshopsAvailable,
  competitionsAvailable, certificatesAvailable, researchJudgingAvailable, announcements,
  workshopBookings, pending, signOutDisabled, onSignOut,
}: DashboardProps) {
  const copy = participantCopy[locale];
  const inboxCopy = participantAnnouncementsCopy[locale];
  const bookingsCopy = workshopParticipantCopy[locale];

  return (
    <div className="participant-dashboard">
      <section className="participant-dashboard-identity" aria-label={copy.accountDetails}>
        <div className="participant-dashboard-cover">
          <FlowLines className="participant-dashboard-cover-lines" />
          <div className="participant-dashboard-cover-copy">
            <h2 data-testid="participant-profile-name"><bdi dir="auto">{profile.name}</bdi></h2>
            <p className="participant-dashboard-verified" data-testid="participant-account-state">
              <DashboardIcon name="verified" />{copy.verifiedState}
            </p>
          </div>
          <Image src={brandLogo.onPurple} alt="" width={brandLogo.width} height={brandLogo.height} unoptimized
            className="participant-dashboard-seal" />
        </div>
        <div className="participant-dashboard-account">
          <dl>
            {profile.email ? <div><dt>{copy.profileEmail}</dt><dd data-testid="participant-profile-email"><bdi dir="ltr">{profile.email}</bdi></dd></div> : null}
            {profile.createdAt ? <div><dt>{copy.memberSince}</dt><dd data-testid="participant-member-since"><MemberSince value={profile.createdAt} locale={locale} /></dd></div> : null}
          </dl>
          <Button variant="secondary" size="small" disabled={signOutDisabled} onClick={onSignOut}>
            <DashboardIcon name="signOut" />{copy.signOut}
          </Button>
        </div>
      </section>

      <nav className="participant-dashboard-shortcuts" aria-label={copy.dashboardNavigation}>
        <ul role="list">
          {profileEnabled && !pending ? <li><Link href="#profile"><DashboardIcon name="account" />{copy.myProfile}</Link></li> : null}
          <li><Link href="#participation"><DashboardIcon name="participation" />{copy.nextSteps}</Link></li>
          {!pending || !workshopsAvailable ? <li><Link href="#my-bookings"><DashboardIcon name="calendar" />{bookingsCopy.title}</Link></li> : null}
          {!pending ? <li><Link href="#announcements"><DashboardIcon name="bell" />{inboxCopy.title}</Link></li> : null}
        </ul>
      </nav>

      <div className="participant-dashboard-grid">
        <div className="participant-dashboard-main">
          {profileEnabled && !pending ? <ParticipantProfileCard locale={locale} name={profile.name} identity={profile.email ?? profile.name} /> : null}
          <Participation locale={locale} registrationAvailable={registrationAvailable} abstractsAvailable={abstractsAvailable}
            workshopsAvailable={workshopsAvailable} competitionsAvailable={competitionsAvailable} />
          {certificatesAvailable ? <ButtonLink href={"/" + locale + "/my-msrc/certificates"} variant="secondary">{copy.myCertificates}</ButtonLink> : null}
          {!pending && researchJudgingAvailable ? <ResearchParticipantWorkspace locale={locale} /> : null}
          {!pending && workshopsAvailable ? <div id="my-bookings" tabIndex={-1} className="participant-dashboard-surface participant-dashboard-bookings"><MyWorkshopBookings locale={locale} initialState={workshopBookings} /></div> : null}
        </div>
        <div className="participant-dashboard-side">
          {!workshopsAvailable ? (
            <section id="my-bookings" tabIndex={-1} className="participant-dashboard-surface participant-dashboard-activity" aria-labelledby="my-bookings-title">
              <h2 id="my-bookings-title">{bookingsCopy.title}</h2>
              <p>{copy.bookingsClosed}</p>
              <Link href={"/" + locale + "/workshops"} className="participant-dashboard-path-link">{copy.stepActions.workshops}<Arrow /></Link>
            </section>
          ) : null}
          {!pending ? <ParticipantInbox locale={locale} initialState={announcements} /> : null}
        </div>
      </div>
    </div>
  );
}
