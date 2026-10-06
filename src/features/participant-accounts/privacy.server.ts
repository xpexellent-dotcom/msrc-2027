import "server-only";
import { currentPolicyVersion } from "@/content/policies";
import type { Locale } from "@/lib/i18n";
import type { ApprovedNotice } from "./contracts";

/** ORG-037 / PRV-01/02: notice approval does not enable accounts or database readiness. */
export const approvedParticipantPrivacy: Readonly<Record<Locale, ApprovedNotice>> = {
  en: {
    version: currentPolicyVersion,
    url: `/en/privacy/${currentPolicyVersion}`,
    summary: "Privacy Policy v1.0 explains how the Faculty of Medicine, KAU, uses your information for the conference, who processes it, how long it is kept and your rights as a data subject.",
  },
  ar: {
    version: currentPolicyVersion,
    url: `/ar/privacy/${currentPolicyVersion}`,
    summary: "توضح سياسة الخصوصية، الإصدار ١.٠، كيفية استخدام كلية الطب بجامعة الملك عبدالعزيز لبياناتك لأغراض المؤتمر، والجهات التي تعالجها، ومدد الاحتفاظ بها، وحقوقك بصفتك صاحب البيانات.",
  },
};

export function participantNotice(locale: Locale, testMode: boolean): ApprovedNotice | null {
  if (!testMode) return approvedParticipantPrivacy?.[locale] ?? null;
  // Caller must first validate the fixed loopback-only config. This is never a legal approval.
  return { version: "synthetic-privacy-ci-v1", url: `/${locale}/privacy`, summary: locale === "ar"
    ? "إشعار اختبار اصطناعي. لا تُدخل بيانات حقيقية." : "Synthetic test notice. Do not enter real personal data." };
}
