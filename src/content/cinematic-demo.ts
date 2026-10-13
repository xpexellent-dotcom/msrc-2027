import type { Locale } from "@/lib/i18n";
import { editionPhotoFocus } from "@/content/edition-photo-framing";

// Organizer-approved public design (11 October 2026). Keep stable asset URLs from
// the review; provenance and original source boundaries remain in docs/media/.
const photo = (file: string) => `/media/msrc-demo/${file}`;

export const demoImages = {
  pathways: [photo("attend-audience.jpg"), photo("share-research-manar-2560.jpg"), photo("learn-doing-manar-2529.jpg"), "/media/editions/2026/build-on-an-idea.webp", photo("three-minute-talk.jpg")],
  programme: photo("programme-panel.jpg"),
  gallery: [
    { src: "/media/editions/2026/photo-9.webp", edition: 2026, width: 1663, height: 1111, objectPosition: editionPhotoFocus["2026-9"], alt: { en: "Four people holding an award and certificate on the MSRC 2026 stage.", ar: "أربعة أشخاص يحملون جائزة وشهادة على منصة مؤتمر ٢٠٢٦." }, caption: { en: "A moment to celebrate.", ar: "لحظة نحتفي بها." } },
    { src: "/media/editions/2026/photo-4.webp", edition: 2026, width: 1733, height: 1014, objectPosition: editionPhotoFocus["2026-4"], alt: { en: "A researcher discussing a digital poster with attendees at MSRC 2026.", ar: "باحث يناقش ملصقًا رقميًا مع الحضور في مؤتمر ٢٠٢٦." }, caption: { en: "Research, shared.", ar: "أبحاث نتشاركها." } },
    { src: "/media/editions/2026/photo-6.webp", edition: 2026, width: 1977, height: 1109, objectPosition: editionPhotoFocus["2026-6"], alt: { en: "Four speakers in a seated discussion on the MSRC 2026 stage.", ar: "أربعة متحدثين في نقاش على منصة مؤتمر ٢٠٢٦." }, caption: { en: "A community in conversation.", ar: "مجتمع يجمعه الحوار." } },
    { src: "/media/editions/2025/photo-3.webp", edition: 2025, width: 743, height: 582, objectPosition: editionPhotoFocus["2025-3"], alt: { en: "Three people discussing a digital research poster at MSRC 2025.", ar: "ثلاثة أشخاص يناقشون ملصقًا بحثيًا رقميًا في مؤتمر ٢٠٢٥." }, caption: { en: "Ideas become conversations.", ar: "أفكار تفتح باب الحوار." } },
    { src: "/media/editions/2024/photo-1.webp", edition: 2024, width: 1173, height: 1026, objectPosition: editionPhotoFocus["2024-1"], alt: { en: "A speaker presenting from a lectern at MSRC 2024.", ar: "متحدث يقدم عرضًا من المنصة في مؤتمر ٢٠٢٤." }, caption: { en: "New perspectives, shared.", ar: "وجهات نظر جديدة نتشاركها." } },
    { src: "/media/editions/2023/photo-2.webp", edition: 2023, width: 753, height: 633, objectPosition: editionPhotoFocus["2023-2"], alt: { en: "A researcher discussing a printed poster with an attendee at MSRC 2023.", ar: "باحثة تناقش ملصقًا مطبوعًا مع أحد الحضور في مؤتمر ٢٠٢٣." }, caption: { en: "Where the conversation began.", ar: "هنا بدأ الحوار." } },
  ],
  closing: { video: photo("jeddah-opening-cropped.mp4"), poster: photo("jeddah-opening-cropped-poster.jpg") },
} as const;

type CinematicCopy = {
  join: string; pathwaysLink: string; archiveNote: string; archiveCaption: string;
  threeMinute: { category: string; title: string; description: string; href: string };
  day1: string; day2: string; speakerDemoNote: string; speakerRail: string; demoSpeaker: string;
  speakerTitle: string; speakerPending: string; portraitProvenance: string; galleryRail: string;
  previousEditions: string; edition: string; partnersTitle: string; partnersLink: string; contact: string;
};

export const cinematicCopy: Record<Locale, CinematicCopy> = {
  en: {
    join: "Reserve your seat", pathwaysLink: "Explore participation",
    archiveNote: "Photography from the MSRC 2026 collection illustrates these pathways.", archiveCaption: "MSRC 2026 archive",
    threeMinute: { category: "Three Minute Thesis", title: "Make your research heard", description: "Communicate your postgraduate research in three minutes through the distinct 3MT pathway.", href: "/3mt" },
    day1: "Day 1 · 27 January", day2: "Day 2 · 28 January",
    speakerDemoNote: "Demo preview. These cards show the proposed layout with MSRC 2026 archive photographs. The 2027 speakers are not confirmed here.",
    speakerRail: "Speakers", demoSpeaker: "",
    speakerTitle: "A new perspective.", speakerPending: "Name and session to be announced.",
    portraitProvenance: "", galleryRail: "MSRC previous editions photograph gallery",
    previousEditions: "More from previous editions", edition: "MSRC 2026", partnersTitle: "Shared\npurpose.", partnersLink: "Explore partners & sponsors", contact: "Contact the conference",
  },
  ar: {
    join: "احجز مقعدك", pathwaysLink: "استكشف طرق المشاركة",
    archiveNote: "صور من مجموعة مؤتمر ٢٠٢٦ توضح أجواء هذه المسارات.", archiveCaption: "من أرشيف مؤتمر ٢٠٢٦",
    threeMinute: { category: "الأطروحة في ثلاث دقائق", title: "أوصل صوت بحثك", description: "قدّم بحثك في الدراسات العليا خلال ثلاث دقائق عبر مسار 3MT المستقل.", href: "/3mt" },
    day1: "اليوم الأول · ٢٧ يناير", day2: "اليوم الثاني · ٢٨ يناير",
    speakerDemoNote: "معاينة توضيحية. تعرض هذه البطاقات التصميم المقترح بصور من أرشيف مؤتمر ٢٠٢٦، ولا تمثل تأكيدًا لمتحدثي نسخة ٢٠٢٧.",
    speakerRail: "المتحدثون", demoSpeaker: "",
    speakerTitle: "وجهة نظر جديدة.", speakerPending: "سيُعلن الاسم والجلسة لاحقًا.",
    portraitProvenance: "", galleryRail: "معرض صور النسخ السابقة للمؤتمر",
    previousEditions: "المزيد من النسخ السابقة", edition: "مؤتمر ٢٠٢٦", partnersTitle: "هدف\nيجمعنا.", partnersLink: "استكشف الشركاء والرعاة", contact: "تواصل مع المؤتمر",
  },
};
