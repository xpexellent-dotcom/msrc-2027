import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n";
import type { ParticipantPageState } from "./contracts";
import { ParticipantAccountForm } from "./participant-form";
import { participantCopy, type ParticipantScreen } from "./participant-copy";
import "@/styles/participant-accounts.css";

export function ParticipantAccountPage({ locale, screen, state }: { locale: Locale; screen: ParticipantScreen; state: ParticipantPageState }) {
  const copy = participantCopy[locale];
  if (!state.enabled) return <Container className="participant-account-page" narrow>
    <header className="participant-account-intro">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.comingSoon}</h1>
      <p>{copy.closed}</p>
    </header>
    <section className="participant-account-card" aria-labelledby="participant-closed-heading" data-testid="participant-accounts-closed">
      <h2 id="participant-closed-heading">{copy.registrationClosed}</h2>
      <ButtonLink href={`/${locale}/participate`}>{copy.explore}</ButtonLink>
    </section>
  </Container>;
  return <Container className="participant-account-page" narrow>
    <header className="participant-account-intro">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.titles[screen]}</h1>
      <p>{copy.leads[screen]}</p>
    </header>
    <ParticipantAccountForm locale={locale} screen={screen} initialState={state} />
  </Container>;
}
