import { Container } from "@/components/ui/container";
import { registrationOpeningCopy } from "@/content/registration-opening";
import type { Locale } from "@/lib/i18n";

export function RegistrationOpeningNotice({ locale }: { locale: Locale }) {
  const copy = registrationOpeningCopy[locale];
  return (
    <section id="registration-opening" className="registration-opening" aria-labelledby="registration-opening-title" data-testid="registration-opening-notice">
      <Container>
        <div className="registration-opening-content">
          <header className="registration-opening-heading"><h2 id="registration-opening-title">{copy.title}</h2></header>
          <dl className="registration-opening-dates">
            <div><dt>{copy.opening}</dt><dd>{copy.pending}</dd></div>
            <div><dt>{copy.closing}</dt><dd>{copy.pending}</dd></div>
          </dl>
          <p className="registration-opening-attendance">{copy.attendance}</p>
        </div>
      </Container>
    </section>
  );
}
