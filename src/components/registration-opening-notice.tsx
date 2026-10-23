import { Container } from "@/components/ui/container";
import {
  formatRegistrationOpeningDate, formatRegistrationOpeningTime,
  registrationOpeningCopy, registrationOpeningDates,
} from "@/content/registration-opening";
import type { Locale } from "@/lib/i18n";

export function RegistrationOpeningNotice({ locale }: { locale: Locale }) {
  const copy = registrationOpeningCopy[locale];
  return <section id="registration-opening" className="registration-opening" aria-labelledby="registration-opening-title" data-testid="registration-opening-notice">
    <Container><div className="registration-opening-content">
      <header className="registration-opening-heading"><h2 id="registration-opening-title">{copy.title}</h2><p>{copy.timezone}</p></header>
      <dl className="registration-opening-dates">
        {([
          { label: copy.earlyAccess, instant: registrationOpeningDates.earlyAccess, eligibility: copy.earlyAccessEligibility },
          { label: copy.general, instant: registrationOpeningDates.general },
        ]).map(({ label, instant, eligibility }) => <div key={instant}>
          <dt>{label}</dt>
          <dd><time dateTime={instant}><span>{formatRegistrationOpeningDate(instant, locale)}</span>{" "}<span className="registration-opening-clock">{formatRegistrationOpeningTime(instant, locale)}</span></time>{eligibility ? <p>{eligibility}</p> : null}</dd>
        </div>)}
      </dl>
      <div className="registration-opening-details">
        <p className="registration-opening-attendance">{copy.attendance}</p>
        <p>{copy.closing}{" "}<time dateTime={registrationOpeningDates.closing}>{formatRegistrationOpeningDate(registrationOpeningDates.closing, locale)}{" · "}{formatRegistrationOpeningTime(registrationOpeningDates.closing, locale)}</time></p>
      </div>
    </div></Container>
  </section>;
}

export function RegistrationOpeningSummary({ locale }: { locale: Locale }) {
  const copy = registrationOpeningCopy[locale];
  return <p className="hero-registration-opening" data-testid="registration-opening-summary">
    {copy.summary}{" "}<time dateTime={registrationOpeningDates.general}>{formatRegistrationOpeningDate(registrationOpeningDates.general, locale, false)}{" · "}{formatRegistrationOpeningTime(registrationOpeningDates.general, locale)}</time>{" · "}{copy.summarySuffix}
  </p>;
}
