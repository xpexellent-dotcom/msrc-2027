import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n";
import type { VerificationResult } from "@/lib/certificates/contracts";
import { certificateCopy } from "./copy";
import "./certificates.css";

export function CertificateVerification({ locale, result }: { locale: Locale; result: VerificationResult }) {
  const copy = certificateCopy[locale], details = result.state === "ready" ? result.certificate : null;
  const type = details?.certificate_type === "conference" || details?.certificate_type === "Full Two-Day Conference Attendance" ? copy.conference : details?.certificate_type === "workshop" || details?.certificate_type === "Workshop Participation" ? copy.workshop : details?.certificate_type;
  return <Container className="certificate-area certificate-verification" narrow><header><p className="eyebrow">MSRC 2027</p><h1>{copy.verifyTitle}</h1><p>{copy.verifyLead}</p></header>
    <section className="certificate-card" data-testid="certificate-verification" aria-label={copy.verifyTitle}>
      {details ? <dl><div><dt>{copy.name}</dt><dd><bdi>{details.recipient_name}</bdi></dd></div><div><dt>{copy.type}</dt><dd>{type}</dd></div><div><dt>{copy.edition}</dt><dd>{details.edition}</dd></div><div><dt>{copy.activity}</dt><dd>{details.activity}</dd></div><div><dt>{copy.validityLabel}</dt><dd className="certificate-status" data-testid="certificate-validity">{copy.validity[details.validity]}</dd></div></dl> : <p role="status">{result.state === "limited" ? copy.verifyLimited : copy.verifyMissing}</p>}
      <p className="certificate-muted">{copy.publicPrivacy}</p>
    </section>
  </Container>;
}
