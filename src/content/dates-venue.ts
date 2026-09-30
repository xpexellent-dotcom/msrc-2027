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
  dateNote: string;
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
  closedNote: string;
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
    lead: "The fifth Medical Students Research Conference is scheduled for two conference days. Here are the confirmed dates and the details still to come.",
    confirmed: "Dates confirmed",
    datesHeading: "Confirmed conference days",
    day1: "Day 1",
    day2: "Day 2",
    datesPending: "Conference dates awaiting confirmation",
    dateNote: "These are conference dates. Doors and session times have not been announced. Event times, when published, will use Asia/Riyadh (UTC+03:00).",
    locationEyebrow: "01 / The location",
    locationTitle: "Where we'll meet.",
    locationBody: "The conference is hosted by King Abdulaziz University in Jeddah. The exact venue will be shared once confirmed.",
    city: "City",
    cityValue: "Jeddah, Saudi Arabia",
    host: "Host institution",
    hostValue: "King Abdulaziz University",
    venue: "Conference venue",
    venuePending: "Awaiting confirmation",
    scheduleEyebrow: "02 / The next details",
    scheduleTitle: "Session times will follow.",
    scheduleBody: "The detailed program, room assignments and participation windows are still being prepared. The homepage currently provides an illustrative program overview.",
    program: "Explore the program overview",
    closed: "Registration not open yet",
    closedNote: "Confirmed conference dates do not open registration, payments, submissions or workshop bookings. Each pathway will have its own approved requirements and opening dates.",
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
    lead: "يُقام المؤتمر الخامس لأبحاث طلاب الطب على مدى يومين. إليك المواعيد المؤكّدة والتفاصيل التي سيُعلن عنها لاحقًا.",
    confirmed: "المواعيد مؤكّدة",
    datesHeading: "يوما المؤتمر المؤكّدان",
    day1: "اليوم الأول",
    day2: "اليوم الثاني",
    datesPending: "مواعيد المؤتمر بانتظار التأكيد",
    dateNote: "هذه تواريخ انعقاد المؤتمر. لم يُعلن بعد عن أوقات فتح الأبواب أو الجلسات. ستُعرض الأوقات عند نشرها بتوقيت الرياض (UTC+03:00).",
    locationEyebrow: "٠١ / المكان",
    locationTitle: "أين نلتقي.",
    locationBody: "تستضيف جامعة الملك عبدالعزيز المؤتمر في جدة. سيُعلن عن المقر المحدّد بعد تأكيده.",
    city: "المدينة",
    cityValue: "جدة، المملكة العربية السعودية",
    host: "الجهة المستضيفة",
    hostValue: "جامعة الملك عبدالعزيز",
    venue: "مقر المؤتمر",
    venuePending: "بانتظار التأكيد",
    scheduleEyebrow: "٠٢ / التفاصيل القادمة",
    scheduleTitle: "مواعيد الجلسات لاحقًا.",
    scheduleBody: "البرنامج التفصيلي وتوزيع القاعات وفترات المشاركة قيد الإعداد. تتضمّن الصفحة الرئيسية حاليًا تصوّرًا توضيحيًا للبرنامج.",
    program: "اطّلع على تصوّر البرنامج",
    closed: "لم يُفتح التسجيل بعد",
    closedNote: "تأكيد مواعيد المؤتمر لا يفتح التسجيل أو الدفع أو تقديم الطلبات أو حجز ورش العمل. ستُنشر متطلبات ومواعيد فتح مستقلّة ومعتمدة لكل مسار.",
  },
};
