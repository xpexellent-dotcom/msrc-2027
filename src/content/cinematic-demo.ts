import type { Locale } from "@/lib/i18n";

// Organizer-approved public design (11 October 2026). Keep stable asset URLs from
// the review; provenance and original source boundaries remain in docs/media/.
const photo = (file: string) => `/media/msrc-demo/${file}`;

export const demoImages = {
  pathways: [photo("attend-audience.jpg"), photo("share-research-manar-2560.jpg"), photo("learn-doing-manar-2529.jpg"), photo("build-idea-majed-9846.jpg"), photo("three-minute-talk.jpg")],
  programme: photo("programme-panel.jpg"),
  gallery: [
    { src: photo("archive-2023-posters.jpg"), alt: { en: "Research posters and conversations at the first MSRC edition.", ar: "ملصقات بحثية وحوارات في النسخة الأولى من المؤتمر." }, caption: { en: "Where the conversation began.", ar: "هنا بدأ الحوار." } },
    { src: photo("archive-2024-talk.jpg"), alt: { en: "A scientific presentation at MSRC 2024.", ar: "عرض علمي في مؤتمر ٢٠٢٤." }, caption: { en: "New perspectives, shared.", ar: "وجهات نظر جديدة نتشاركها." } },
    { src: photo("archive-2025-conversation.jpg"), alt: { en: "A research discussion at MSRC 2025.", ar: "نقاش بحثي في مؤتمر ٢٠٢٥." }, caption: { en: "Ideas become conversations.", ar: "أفكار تفتح باب الحوار." } },
    { src: photo("gallery-community.jpg"), alt: { en: "Four people standing together in the event foyer.", ar: "أربعة أشخاص يقفون معًا في بهو الفعالية." }, caption: { en: "A community in conversation.", ar: "مجتمع يجمعه الحوار." } },
    { src: photo("gallery-stage.jpg"), alt: { en: "Two presenters at the lectern on the MSRC 2026 stage.", ar: "متحدثان عند المنصة في مؤتمر ٢٠٢٦." }, caption: { en: "Ideas take the stage.", ar: "أفكار على المنصّة." } },
    { src: photo("gallery-presentation.jpg"), alt: { en: "A presenter speaking on the MSRC 2026 stage.", ar: "متحدثة تلقي عرضًا على منصة مؤتمر ٢٠٢٦." }, caption: { en: "Research, shared.", ar: "أبحاث نتشاركها." } },
    { src: photo("gallery-awards.jpg"), alt: { en: "An award presentation on the MSRC 2026 stage.", ar: "تسليم جائزة على منصة مؤتمر ٢٠٢٦." }, caption: { en: "A moment to celebrate.", ar: "لحظة نحتفي بها." } },
    { src: photo("gallery-msrc2026.jpg"), alt: { en: "MSRC 2026 lettering in front of the event photo backdrop.", ar: "حروف اسم المؤتمر أمام خلفية التصوير لنسخة ٢٠٢٦." }, caption: { en: "The previous chapter.", ar: "الفصل السابق." } },
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
