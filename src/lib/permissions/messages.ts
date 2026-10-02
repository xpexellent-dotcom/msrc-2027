import type { Locale } from "@/lib/i18n";

const messages = {
  NOT_AUTHORIZED: {
    en: "This action is not available to this account.",
    ar: "هذا الإجراء غير متاح لهذا الحساب.",
  },
  AUTHORIZATION_UNAVAILABLE: {
    en: "Access could not be verified. Please try again.",
    ar: "تعذّر التحقق من صلاحية الوصول. يُرجى المحاولة مرة أخرى.",
  },
} as const;

/** Assessment screens stay English; ordinary staff/participant surfaces follow locale. */
export function permissionMessage(code: keyof typeof messages, locale: Locale, audience: "general" | "assessment" = "general"): string {
  return messages[code][audience === "assessment" ? "en" : locale];
}
