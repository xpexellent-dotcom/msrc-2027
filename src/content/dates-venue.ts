import type { Locale } from "@/lib/i18n";

type DatesVenueCopy = {
  metadataTitle: string;
  metadataDescription: string;
  breadcrumb: string;
  home: string;
  page: string;
  eyebrow: string;
  title: string;
  lead: string;
  confirmed: string;
  datesHeading: string;
  day1: string;
  day2: string;
  datesPending: string;
  locationEyebrow: string;
  locationTitle: string;
  locationBody: string;
  city: string;
  cityValue: string;
  host: string;
  hostValue: string;
  venue: string;
  venuePending: string;
  scheduleEyebrow: string;
  scheduleTitle: string;
  scheduleBody: string;
  program: string;
  closed: string;
};

// SCP-02 / CFG-01 / TIM-01 / LOC-01 / ACC-01.
// Approved dates come from conferenceConfig, never from translated prose.
// Venue and doors/session times are separate unresolved values.
export const datesVenueCopy: Record<Locale, DatesVenueCopy> = {
  en: {
    metadataTitle: "Dates & venue | MSRC 2027",
    metadataDescription:
      "The fifth Medical Students Research Conference takes place in Jeddah. The venue and session times will be announced after confirmation.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Dates & venue",
    eyebrow: "Plan your visit",
    title: "Two days in Jeddah.",
    lead: "Two days of research, ideas and connection at MSRC 2027.",
    confirmed: "Dates confirmed",
    datesHeading: "Confirmed conference days",
    day1: "Day 1",
    day2: "Day 2",
    datesPending: "Conference dates awaiting confirmation",
    locationEyebrow: "01 / The location",
    locationTitle: "Where we'll meet.",
    locationBody: "King Abdulaziz University. Jeddah, Saudi Arabia.",
    city: "City",
    cityValue: "Jeddah, Saudi Arabia",
    host: "Host institution",
    hostValue: "King Abdulaziz University",
    venue: "Conference venue",
    venuePending: "Awaiting confirmation",
    scheduleEyebrow: "02 / The next details",
    scheduleTitle: "Session times will follow.",
    scheduleBody: "Explore the conference experience.",
    program: "Explore the programme overview",
    closed: "Registration not open yet",
  },
  ar: {
    metadataTitle: "المواعيد والمقر | MSRC 2027",
    metadataDescription:
      "يُقام المؤتمر الخامس لأبحاث طلاب الطب في جدة. سيُعلن عن المقر ومواعيد الجلسات بعد تأكيدها.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "المواعيد والمقر",
    eyebrow: "خطّط لحضور المؤتمر",
    title: "يومان في جدة.",
    lead: "يومان للبحث والأفكار والتواصل في مؤتمر أبحاث طلاب الطب ٢٠٢٧.",
    confirmed: "المواعيد مؤكّدة",
    datesHeading: "يوما المؤتمر المؤكّدان",
    day1: "اليوم الأول",
    day2: "اليوم الثاني",
    datesPending: "مواعيد المؤتمر بانتظار التأكيد",
    locationEyebrow: "٠١ / المكان",
    locationTitle: "حيث نلتقي.",
    locationBody: "جامعة الملك عبدالعزيز. جدة، المملكة العربية السعودية.",
    city: "المدينة",
    cityValue: "جدة، المملكة العربية السعودية",
    host: "الجهة المستضيفة",
    hostValue: "جامعة الملك عبدالعزيز",
    venue: "مقر المؤتمر",
    venuePending: "بانتظار التأكيد",
    scheduleEyebrow: "٠٢ / التفاصيل القادمة",
    scheduleTitle: "مواعيد الجلسات تُعلَن لاحقًا.",
    // Distinct from the button below it, which already reads «اكتشف تجربة المؤتمر».
    scheduleBody: "تعرّف إلى ما ينتظرك في المؤتمر.",
    program: "اكتشف تجربة المؤتمر",
    closed: "لم يُفتح التسجيل بعد",
  },
};
