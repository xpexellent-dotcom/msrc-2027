import type { VenueTravelMode, VenueVisitorInfoKey } from "@/config/conference";
import type { Locale } from "@/lib/i18n";
import type { VenueMapProvider } from "@/lib/venue-travel";

type VenueTravelCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  mapLinksLabel: string;
  providers: Record<VenueMapProvider, string>;
  openMap: string;
  inProvider: string;
  newTab: string;
  airportTitle: string;
  modes: Record<VenueTravelMode, { title: string; body: string }>;
  travelTime: string;
  atVenueTitle: string;
  venueDetails: Record<VenueVisitorInfoKey, string>;
  contactForm: string;
  internationalTitle: string;
  internationalNote: string;
  visaResponsibility: string;
};

// ORG-034/035 / SCP-02, LOC-01, ACC-01: organizer-supplied arrival guidance.
export const venueTravelCopy: Record<Locale, VenueTravelCopy> = {
  en: {
    eyebrow: "2 / Your arrival",
    title: "Getting there.",
    intro: "Arriving in Jeddah? Find the conference at King Abdulaziz University.",
    mapLinksLabel: "Open the venue in your preferred map app",
    providers: { google: "Google Maps", apple: "Apple Maps", waze: "Waze" },
    openMap: "Open", inProvider: "in", newTab: "opens in a new tab",
    airportTitle: "From the airport",
    modes: {
      taxi: { title: "Taxi or ride-hailing", body: "Take a taxi, Uber or Careem from King Abdulaziz International Airport directly to King Faisal Conference Center." },
      train: { title: "Haramain high-speed train", body: "Travel from Airport station to Jeddah Al-Sulaymaniyah station, then take a taxi to the venue." },
      rental: { title: "Car rental", body: "Rent a car at the airport and follow directions to King Faisal Conference Center." },
    },
    travelTime: "Travel time",
    atVenueTitle: "At the venue",
    venueDetails: { entryGate: "Entry gate", ticket: "Your ticket", parking: "Parking", accessibility: "Accessibility support", onSite: "On site", wifi: "Wi-Fi" },
    contactForm: "contact form",
    internationalTitle: "International attendees",
    internationalNote: "Conference times use Saudi local time",
    visaResponsibility: "Attendees travelling from abroad are responsible for their own visa. MSRC is unable to provide visa invitation letters.",
  },
  ar: {
    eyebrow: "٢ / الوصول",
    title: "الوصول إلى المؤتمر.",
    intro: "قادم إلى جدة؟ نلتقي في جامعة الملك عبدالعزيز.",
    mapLinksLabel: "افتح موقع المؤتمر في تطبيق الخرائط الذي تفضله",
    providers: { google: "خرائط Google", apple: "خرائط Apple", waze: "Waze" },
    openMap: "اعرض", inProvider: "على", newTab: "تُفتح في علامة تبويب جديدة",
    airportTitle: "من المطار",
    modes: {
      taxi: { title: "سيارة أجرة أو تطبيقات النقل", body: "انتقل من مطار الملك عبدالعزيز الدولي مباشرةً إلى مركز الملك فيصل للمؤتمرات بسيارة أجرة أو عبر أوبر أو كريم." },
      train: { title: "قطار الحرمين السريع", body: "انتقل من محطة المطار إلى محطة جدة السليمانية، ثم استقل سيارة أجرة إلى مقر المؤتمر." },
      rental: { title: "استئجار سيارة", body: "استأجر سيارة من المطار واتبع الاتجاهات إلى مركز الملك فيصل للمؤتمرات." },
    },
    travelTime: "مدة الرحلة",
    atVenueTitle: "في مقر المؤتمر",
    venueDetails: { entryGate: "بوابة الدخول", ticket: "تذكرتك", parking: "مواقف السيارات", accessibility: "المساعدة في الوصول", onSite: "في الموقع", wifi: "شبكة Wi-Fi" },
    contactForm: "نموذج التواصل",
    internationalTitle: "للقادمين من خارج المملكة",
    internationalNote: "مواعيد المؤتمر بالتوقيت المحلي للمملكة العربية السعودية",
    visaResponsibility: "يتحمّل المشاركون القادمون من خارج المملكة مسؤولية الحصول على التأشيرة. لا يستطيع المؤتمر إصدار خطابات دعوة للتأشيرة.",
  },
};
