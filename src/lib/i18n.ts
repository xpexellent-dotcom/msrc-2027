export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";

/** Two-digit sequence labels (01 / ٠١) matching the digits used in each language's copy. */
export function formatIndex(value: number, locale: Locale): string {
  const padded = String(value).padStart(2, "0");
  return locale === "ar" ? padded.replace(/\d/g, (digit) => arabicIndicDigits[Number(digit)]) : padded;
}

export function localizePathname(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1] ?? "")) {
    segments[1] = locale;
    return segments.join("/");
  }
  return `/${locale}`;
}

type Dictionary = {
  skip: string;
  siteStatus: string;
  preview: string;
  edition: string;
  institution: string;
  location: string;
  title: string;
  introduction: string;
  date: string;
  venue: string;
  pending: string;
  participation: string;
  closed: string;
  closedDescription: string;
  footer: string;
  loading: string;
  notFoundTitle: string;
  notFoundDescription: string;
  errorTitle: string;
  errorDescription: string;
  retry: string;
  home: string;
  languageSwitch: string;
};

// LOC-01/03, CMS-04: draft interface translations, pending editorial approval.
export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    skip: "Skip to content",
    siteStatus: "Site status",
    preview: "Development preview",
    edition: "The fifth edition",
    institution: "King Abdulaziz University",
    location: "Jeddah, Saudi Arabia",
    title: "Medical Students Research Conference",
    introduction:
      "The next chapter of MSRC is taking shape. Approved conference details will be shared here as preparations progress.",
    date: "Conference dates",
    venue: "Conference venue",
    pending: "Awaiting confirmation",
    participation: "Participation",
    closed: "Not open yet",
    closedDescription:
      "Registration and applications are not available in this preview.",
    footer: "An early website preview. Content and visual identity are subject to approval.",
    loading: "Loading the page…",
    notFoundTitle: "This page is not available.",
    notFoundDescription: "The address may be incorrect, or this page has not been added to the preview.",
    errorTitle: "We could not load this page.",
    errorDescription: "Please try again or return to the preview home page.",
    retry: "Try again",
    home: "Return to the preview",
    languageSwitch: "View this page in Arabic",
  },
  ar: {
    skip: "انتقل إلى المحتوى الرئيسي",
    siteStatus: "حالة الموقع",
    preview: "معاينة قيد التطوير",
    edition: "النسخة الخامسة",
    institution: "جامعة الملك عبدالعزيز",
    location: "جدة، المملكة العربية السعودية",
    title: "مؤتمر أبحاث طلاب الطب",
    introduction:
      "نعمل على إعداد النسخة القادمة من المؤتمر. ستُنشر تفاصيل المؤتمر المعتمدة هنا مع تقدّم الاستعدادات.",
    date: "مواعيد المؤتمر",
    venue: "مقر انعقاد المؤتمر",
    pending: "بانتظار التأكيد",
    participation: "المشاركة",
    closed: "لم تُفتح بعد",
    closedDescription: "التسجيل وتقديم الطلبات غير متاحين في هذه المعاينة.",
    footer: "معاينة أولية للموقع. المحتوى والهوية البصرية بانتظار الاعتماد.",
    loading: "جارٍ تحميل الصفحة…",
    notFoundTitle: "هذه الصفحة غير متاحة.",
    notFoundDescription: "قد يكون العنوان غير صحيح، أو لم تُضَف هذه الصفحة إلى المعاينة بعد.",
    errorTitle: "تعذّر تحميل هذه الصفحة.",
    errorDescription: "يرجى المحاولة مجددًا أو العودة إلى الصفحة الرئيسية للمعاينة.",
    retry: "أعد المحاولة",
    home: "العودة إلى المعاينة",
    languageSwitch: "View this page in English",
  },
};
