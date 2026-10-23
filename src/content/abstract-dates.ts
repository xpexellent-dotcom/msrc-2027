/** ORG-058: public calendar dates only, never operational settings or instants. */
export const abstractDates = [
  { date: "2026-11-23", en: "Abstract submission opens", ar: "فتح باب استقبال الملخصات" },
  { date: "2026-12-13", en: "Submission closes", ar: "إغلاق باب التقديم" },
  { date: "2026-12-18", en: "Initial screening completed", ar: "انتهاء الفرز الأولي" },
  { date: "2026-12-19", en: "Eligible abstracts sent to reviewers", ar: "إرسال الملخصات المؤهلة إلى المحكّمين" },
  { date: "2027-01-02", en: "Review completed", ar: "انتهاء التحكيم" },
  { date: "2027-01-07", en: "Final acceptance and oral/poster allocation", ar: "تأكيد القبول النهائي وتحديد العروض الشفهية والملصقات" },
  { date: "2027-01-10", en: "Participant instructions sent", ar: "إرسال التعليمات للمشاركين" },
] as const;
