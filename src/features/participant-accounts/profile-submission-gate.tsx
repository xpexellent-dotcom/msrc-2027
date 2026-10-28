import { ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

/** ORG-067: submission eligibility only; registration and bookings remain separate. */
export function ProfileSubmissionGate({ locale }: { locale: Locale }) {
  return <aside className="participant-account-card" data-testid="profile-submission-gate">
    <p role="status">{locale === "ar" ? "أكمل ملفك الشخصي أولاً قبل إرسال ملخص بحثي أو مشاركة في الهاكاثون أو مسابقة الأطروحة في ثلاث دقائق." : "Complete your profile first before submitting an abstract, hackathon or 3MT entry."}</p>
    <ButtonLink href={`/${locale}/my-msrc#profile`}>{locale === "ar" ? "أكمل ملفك الشخصي" : "Complete your profile"}</ButtonLink>
  </aside>;
}
