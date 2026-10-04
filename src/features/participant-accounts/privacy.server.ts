import "server-only";
import type { Locale } from "@/lib/i18n";
import type { ApprovedNotice } from "./contracts";

/** PRV-01/02: currentPolicyVersion is a draft. Only an explicit approved record may open sign-up. */
export const approvedParticipantPrivacy: Readonly<Record<Locale, ApprovedNotice>> | null = null;

export function participantNotice(locale: Locale, testMode: boolean): ApprovedNotice | null {
  if (!testMode) return approvedParticipantPrivacy?.[locale] ?? null;
  // Caller must first validate the fixed loopback-only config. This is never a legal approval.
  return { version: "synthetic-privacy-ci-v1", url: `/${locale}/privacy`, summary: locale === "ar"
    ? "إشعار اختبار اصطناعي. لا تُدخل بيانات حقيقية." : "Synthetic test notice. Do not enter real personal data." };
}
