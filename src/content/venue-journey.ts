import type { Locale } from "@/lib/i18n";

export const venueJourneySteps = ["airport", "city", "arrival"] as const;
export const venueJourneyIds = ["journey-airport", "journey-city", "journey-arrival"] as const;

type VenueJourneyCopy = {
  label: string;
  navigation: string;
  steps: readonly [string, string, string];
  airportTitle: readonly [string, string];
  airportName: string;
  airportBody: string;
  airportNote: string;
  continue: string;
  cityTitle: readonly [string, string];
  cityBody: string;
  arrivalTitle: readonly [string, string];
  arrivalBody: string;
  orientationTitle: string;
  orientationBody: string;
  airportPin: string;
  venuePin: string;
  pointAction: string;
  mapNote: string;
  north: string;
};

/** Arrival sequence, not a surveyed driving route or terminal pickup instruction. */
export const venueJourneyCopy: Record<Locale, VenueJourneyCopy> = {
  en: {
    label: "Your journey to MSRC",
    navigation: "Arrival journey chapters",
    steps: ["At the airport", "Through Jeddah", "At the conference"],
    airportTitle: ["Touch down in", "Jeddah."],
    airportName: "King Abdulaziz International Airport",
    airportBody: "Arriving by air? Start here, then choose your connection to King Faisal Conference Center.",
    airportNote: "Follow your airline and the airport’s information for terminal and pickup details.",
    continue: "Choose your connection",
    cityTitle: ["Find your way", "through Jeddah."],
    cityBody: "Choose the connection that works for you. Your map app can guide the final part of your journey.",
    arrivalTitle: ["Your next stop:", "MSRC."],
    arrivalBody: "Find the conference, save your ticket and arrive ready for the conversation.",
    orientationTitle: "Find the conference.",
    orientationBody: "Explore the campus streets, then open your preferred map app for current directions.",
    airportPin: "Airport",
    venuePin: "MSRC",
    pointAction: "View arrival information",
    mapNote: "Geographic arrival overview. Use your map app for current directions.",
    north: "North",
  },
  ar: {
    label: "رحلتك إلى المؤتمر",
    navigation: "مراحل الوصول إلى المؤتمر",
    steps: ["في المطار", "عبر جدة", "في المؤتمر"],
    airportTitle: ["بداية رحلتك،", "في جدة."],
    airportName: "مطار الملك عبدالعزيز الدولي",
    airportBody: "قادم بالطائرة؟ ابدأ من هنا، ثم اختر وسيلة الوصول إلى مركز الملك فيصل للمؤتمرات.",
    airportNote: "تابع معلومات شركة الطيران والمطار لمعرفة تفاصيل الصالة ومكان الركوب.",
    continue: "اختر وسيلة الوصول",
    cityTitle: ["اختر طريقك", "عبر جدة."],
    cityBody: "اختر وسيلة النقل المناسبة لك. يمكن لتطبيق الخرائط إرشادك في الجزء الأخير من رحلتك.",
    arrivalTitle: ["محطتك التالية:", "المؤتمر."],
    arrivalBody: "اعرف موقع المؤتمر، واحفظ تذكرتك، واستعد للحوار.",
    orientationTitle: "اعرف موقع المؤتمر.",
    orientationBody: "تعرّف إلى الشوارع المحيطة بالمؤتمر، ثم افتح تطبيق الخرائط الذي تفضله للحصول على الاتجاهات الحالية.",
    airportPin: "المطار",
    venuePin: "المؤتمر",
    pointAction: "اعرض معلومات الوصول",
    mapNote: "نظرة جغرافية عامة للوصول. استخدم تطبيق الخرائط للحصول على الاتجاهات الحالية.",
    north: "الشمال",
  },
};
