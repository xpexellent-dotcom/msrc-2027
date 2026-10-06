import type { Locale } from "@/lib/i18n";

/** Human-readable labels for the immutable staff, grant, session and email event enums. */
export const auditActions = {
  en: {
    bootstrap: "First Super Admin setup", invite: "Create invitation", invite_delivery: "Deliver invitation", invite_revoke: "Revoke invitation", invite_consume: "Use invitation link", invite_complete: "Complete invitation",
    sign_in: "Staff sign-in", set_roles: "Change roles", suspend: "Suspend account", reactivate: "Reactivate account", revoke_sessions: "Revoke all sessions", reset_authenticator: "Reset another Super Admin's authenticator", reset_account: "Reset another Super Admin's account", admin_complete: "Complete account recovery",
    people_read: "View staff members", audit_read: "View audit log", participants_read: "View participants", identity_reveal: "Reveal identity document", totp_enroll: "Enroll authenticator", totp_challenge: "Start authenticator check", totp_verify: "Verify authenticator code",
    "grant.created": "Create role grant", "grant.revoked": "Revoke role grant", "session.observed": "Check session", "session.revoked": "Revoke session", "actor.sessions.revoked": "Revoke account sessions",
    "challenge.reserved": "Prepare staff email code", "challenge.sent": "Send staff email code", "challenge.failed": "Staff email code delivery failed", "challenge.superseded": "Replace staff email code", "challenge.denied": "Deny staff email check", "challenge.expired": "Staff email code expired", "challenge.locked": "Lock staff email check", "challenge.verified": "Verify staff email code", "receipt.created": "Record session email verification",
  },
  ar: {
    bootstrap: "إعداد المشرف الأعلى الأول", invite: "إنشاء دعوة", invite_delivery: "تسليم الدعوة", invite_revoke: "إلغاء الدعوة", invite_consume: "استخدام رابط الدعوة", invite_complete: "إكمال الدعوة",
    sign_in: "تسجيل دخول الفريق", set_roles: "تغيير الأدوار", suspend: "تعليق الحساب", reactivate: "إعادة تفعيل الحساب", revoke_sessions: "إلغاء جميع الجلسات", reset_authenticator: "إعادة ضبط تطبيق مصادقة مشرف أعلى آخر", reset_account: "إعادة ضبط حساب مشرف أعلى آخر", admin_complete: "إكمال استعادة الحساب",
    people_read: "عرض أعضاء الفريق", audit_read: "عرض سجل التدقيق", participants_read: "عرض المشاركين", identity_reveal: "إظهار وثيقة الهوية", totp_enroll: "إعداد تطبيق المصادقة", totp_challenge: "بدء تحقق تطبيق المصادقة", totp_verify: "التحقق من رمز تطبيق المصادقة",
    "grant.created": "إنشاء صلاحية دور", "grant.revoked": "إلغاء صلاحية دور", "session.observed": "التحقق من الجلسة", "session.revoked": "إلغاء الجلسة", "actor.sessions.revoked": "إلغاء جلسات الحساب",
    "challenge.reserved": "تجهيز رمز بريد الفريق", "challenge.sent": "إرسال رمز بريد الفريق", "challenge.failed": "فشل تسليم رمز بريد الفريق", "challenge.superseded": "استبدال رمز بريد الفريق", "challenge.denied": "رفض تحقق بريد الفريق", "challenge.expired": "انتهاء صلاحية رمز بريد الفريق", "challenge.locked": "حظر تحقق بريد الفريق", "challenge.verified": "التحقق من رمز بريد الفريق", "receipt.created": "تسجيل تحقق بريد الجلسة",
  },
} satisfies Record<Locale, Record<string, string>>;
export const auditResults = {
  en: { allowed: "Allowed", denied: "Denied", reserved: "Pending completion", completed: "Completed", failed: "Failed", unavailable: "Unavailable" },
  ar: { allowed: "مسموح", denied: "مرفوض", reserved: "بانتظار الإكمال", completed: "مكتمل", failed: "فشل", unavailable: "غير متاح" },
} satisfies Record<Locale, Record<string, string>>;

function label(value: string, locale: Locale, dictionary: Record<Locale, Record<string, string>>) {
  if (Object.hasOwn(dictionary[locale], value)) return dictionary[locale][value];
  // Unknown future enum codes stay identifiable. Arbitrary text cannot become a fallback value.
  return /^[a-z][a-z0-9_.-]{0,79}$/.test(value) ? value : locale === "ar" ? "قيمة غير معروفة" : "Unknown value";
}
export function auditActionLabel(value: string, locale: Locale) { return label(value, locale, auditActions); }
export function auditResultLabel(value: string, locale: Locale) { return label(value, locale, auditResults); }
