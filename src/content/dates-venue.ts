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
  addToCalendar: string;
  locationEyebrow: string;
  locationTitle: string;
  locationBody: string;
  roomPhotoAlt: string;
  city: string;
  cityValue: string;
  host: string;
  hostValue: string;
  venue: string;
  venuePending: string;
  address: string;
  directions: string;
  directionsLabel: string;
  scheduleEyebrow: string;
  scheduleTitle: string;
  scheduleBody: string;
  program: string;
  closed: string;
};

// SCP-02 / CFG-01 / TIM-01 / LOC-01 / ACC-01.
// Approved dates come from conferenceConfig, never from translated prose.
// ORG-031 confirms the venue; doors/session times and rooms remain unresolved.
export const datesVenueCopy: Record<Locale, DatesVenueCopy> = {
  en: {
    metadataTitle: "Dates & venue | MSRC 2027",
    metadataDescription:
      "The fifth Medical Students Research Conference takes place at King Faisal Conference Center, King Abdulaziz University, Jeddah.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Dates & venue",
    eyebrow: "Plan your visit",
    title: "Your way to MSRC.",
    lead: "Airport connections, directions and arrival essentials.",
    confirmed: "Dates confirmed",
    datesHeading: "Confirmed conference days",
    day1: "Day 1",
    day2: "Day 2",
    datesPending: "Conference dates awaiting confirmation",
    addToCalendar: "Add to calendar",
    locationEyebrow: "1 / The location",
    locationTitle: "Where we'll meet.",
    locationBody: "King Faisal Conference Center, King Abdulaziz University, Jeddah, Saudi Arabia.",
    roomPhotoAlt: "The auditorium at King Faisal Conference Center",
    city: "City",
    cityValue: "Jeddah, Saudi Arabia",
    host: "Host institution",
    hostValue: "King Abdulaziz University",
    venue: "Conference venue",
    venuePending: "Awaiting confirmation",
    address: "Address",
    directions: "Get directions",
    directionsLabel: "Get directions to King Faisal Conference Center in Google Maps (opens in a new tab)",
    scheduleEyebrow: "3 / The next details",
    scheduleTitle: "Plan your days.",
    scheduleBody: "Session times, doors and rooms will be announced.",
    program: "View the program",
    closed: "Registration not open yet",
  },
  ar: {
    metadataTitle: "المواعيد والمقر | MSRC 2027",
    metadataDescription:
      "يُقام المؤتمر الخامس لأبحاث طلاب الطب في مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز في جدة.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "المواعيد والمقر",
    eyebrow: "خطّط لحضور المؤتمر",
    title: "طريقك إلى المؤتمر.",
    lead: "وسائل النقل، والاتجاهات، وما تحتاجه عند الوصول.",
    confirmed: "المواعيد مؤكّدة",
    datesHeading: "يوما المؤتمر المؤكّدان",
    day1: "اليوم الأول",
    day2: "اليوم الثاني",
    datesPending: "مواعيد المؤتمر بانتظار التأكيد",
    addToCalendar: "أضف إلى التقويم",
    locationEyebrow: "١ / المكان",
    locationTitle: "حيث نلتقي.",
    locationBody: "مركز الملك فيصل للمؤتمرات، جامعة الملك عبدالعزيز، جدة، المملكة العربية السعودية.",
    roomPhotoAlt: "قاعة مركز الملك فيصل للمؤتمرات",
    city: "المدينة",
    cityValue: "جدة، المملكة العربية السعودية",
    host: "الجهة المستضيفة",
    hostValue: "جامعة الملك عبدالعزيز",
    venue: "مقر المؤتمر",
    venuePending: "بانتظار التأكيد",
    address: "العنوان",
    directions: "الاتجاهات",
    directionsLabel: "الاتجاهات إلى مركز الملك فيصل للمؤتمرات على خرائط Google (تُفتح في علامة تبويب جديدة)",
    scheduleEyebrow: "٣ / التفاصيل القادمة",
    scheduleTitle: "خطّط لحضورك.",
    scheduleBody: "ستُعلن مواعيد الجلسات وفتح الأبواب والقاعات لاحقًا.",
    program: "اعرض البرنامج",
    closed: "لم يُفتح التسجيل بعد",
  },
};
