import type { Locale } from "@/lib/i18n";

type Bilingual = Readonly<Record<Locale, string>>;
export type PublicPage = Readonly<{
  id: string;
  path: string;
  label: Bilingual;
  /** Only existing preview destinations are links. null means unpublished. */
  previewHref: string | null;
}>;

/** S1 SCP-02: full future public sitemap; it does not claim empty pages exist. */
export const publicSitemap = [
  { id: "home", path: "/", label: { en: "Home", ar: "الرئيسية" }, previewHref: "/" },
  { id: "about", path: "/about", label: { en: "About", ar: "عن المؤتمر" }, previewHref: "/about" },
  { id: "dates", path: "/dates-venue", label: { en: "Dates & venue", ar: "المواعيد والمقر" }, previewHref: "/dates-venue" },
  { id: "program", path: "/program", label: { en: "Program", ar: "البرنامج" }, previewHref: "/#program" },
  { id: "speakers", path: "/speakers", label: { en: "Speakers", ar: "المتحدثون" }, previewHref: null },
  { id: "workshops", path: "/workshops", label: { en: "Workshops", ar: "ورش العمل" }, previewHref: "/#participate" },
  { id: "participation", path: "/participation", label: { en: "Participation & submission guidelines", ar: "المشاركة وإرشادات التقديم" }, previewHref: "/#participate" },
  { id: "teams", path: "/teams", label: { en: "Teams, committees & board", ar: "الفرق واللجان والمجلس" }, previewHref: null },
  { id: "sponsors", path: "/sponsors", label: { en: "Sponsors & sponsorship", ar: "الرعاة والرعاية" }, previewHref: null },
  { id: "gallery", path: "/past-editions", label: { en: "Gallery & past editions", ar: "المعرض والنسخ السابقة" }, previewHref: "/#legacy" },
  { id: "announcements", path: "/announcements", label: { en: "Announcements", ar: "الإعلانات" }, previewHref: null },
  { id: "faq", path: "/faq", label: { en: "FAQ", ar: "الأسئلة الشائعة" }, previewHref: null },
  { id: "contact", path: "/contact", label: { en: "Contact", ar: "التواصل" }, previewHref: null },
  { id: "privacy", path: "/privacy", label: { en: "Privacy", ar: "الخصوصية" }, previewHref: null },
  { id: "terms", path: "/terms", label: { en: "Terms", ar: "الشروط" }, previewHref: null },
] as const satisfies readonly PublicPage[];

export const homepageAssets = {
  // User-approved 18.7s previous-edition cut; source original stays private.
  heroPoster: "/media/msrc2026/poster-desktop-v1.jpg",
  heroVideo: {
    approval: "approved",
    src: "/media/msrc2026/hero-desktop-v1.mp4",
    mobileSrc: "/media/msrc2026/hero-mobile-v1.mp4",
    poster: "/media/msrc2026/poster-desktop-v1.jpg",
    mobilePoster: "/media/msrc2026/poster-mobile-v1.jpg",
  },
  finalLogo: null,
  sponsors: [],
  gallery: [],
} as const;

type Pathway = { title: string; description: string; category: string };
type ProgramRow = { title: string; description: string; format: string };
type HomepageCopy = {
  kicker: string; title: readonly [string, string]; lead: string; explore: string;
  programLink: string; posterCaption: string; institution: string; city: string;
  aboutEyebrow: string; aboutTitle: string; aboutBody: string; aboutLink: string;
  participationLabel: string; participationStatus: string;
  pathwaysEyebrow: string; pathwaysTitle: string; pathwaysBody: string; closed: string;
  pathways: readonly Pathway[]; programEyebrow: string; programTitle: string;
  programBody: string; programRows: readonly ProgramRow[];
  legacyEyebrow: string; legacyTitle: string; legacyBody: string;
  legacyArtLabel: string; endingTitle: string; backToTop: string;
  dateLabel: string; venueLabel: string; pending: string; editionLabel: string;
};

/** ORG-004: concise bilingual editorial copy; no session or eligibility claims. */
export const homepageCopy: Record<Locale, HomepageCopy> = {
  en: {
    kicker: "The 5th Medical Students Research Conference",
    title: ["Where curiosity", "becomes discovery."],
    lead: "Medical students. Shared ideas. New discoveries.",
    explore: "Explore the conference", programLink: "The experience", posterCaption: "MSRC2026",
    institution: "King Abdulaziz University", city: "Jeddah, Saudi Arabia",
    aboutEyebrow: "01 / The conference", aboutTitle: "A question.\nA connection.\nA new possibility.",
    aboutBody: "Meet a community of medical students exploring ideas, sharing research and learning together.",
    aboutLink: "Discover MSRC", participationLabel: "Participation", participationStatus: "Not open yet",
    pathwaysEyebrow: "02 / Find your path", pathwaysTitle: "Bring your curiosity.\nFind your direction.",
    pathwaysBody: "Research. Innovation. Communication. Hands-on learning.", closed: "Not open yet",
    pathways: [
      { category: "Research", title: "Share your research", description: "Student research, including work in progress." },
      { category: "Hackathon", title: "Build on an idea", description: "Research into practice. Ideas shaped together." },
      { category: "3MT", title: "Make your research heard", description: "Postgraduate research. Three minutes to connect." },
      { category: "Workshops", title: "Learn by doing", description: "A space for practical learning." },
    ],
    programEyebrow: "03 / The experience", programTitle: "Ideas take the stage.\nConversations go further.",
    programBody: "Explore the ways we share, discuss and develop research.",
    programRows: [
      { format: "Present", title: "Research in the spotlight", description: "Share a question. Open a conversation." },
      { format: "Discuss", title: "Perspectives that connect", description: "Learn through different points of view." },
      { format: "Practice", title: "Ideas into experience", description: "Discover through hands-on learning." },
    ],
    legacyEyebrow: "04 / The next chapter", legacyTitle: "The story continues.",
    legacyBody: "From MSRC2026 to our fifth edition in 2027. New questions. A shared curiosity.",
    legacyArtLabel: "The next chapter", endingTitle: "See you in Jeddah.",
    backToTop: "Back to the beginning", dateLabel: "Conference dates", venueLabel: "Conference venue", pending: "Awaiting confirmation", editionLabel: "Fifth edition / 2027",
  },
  ar: {
    kicker: "المؤتمر الخامس لأبحاث طلاب الطب",
    title: ["حيث يتحوّل الفضول", "إلى اكتشاف."],
    lead: "طلاب طب. أفكار نتشاركها. واكتشافات جديدة.",
    explore: "اكتشف المؤتمر", programLink: "تجربة المؤتمر", posterCaption: "نسخة ٢٠٢٦",
    institution: "جامعة الملك عبدالعزيز", city: "جدة، المملكة العربية السعودية",
    aboutEyebrow: "٠١ / عن المؤتمر", aboutTitle: "سؤال.\nتواصل.\nوإمكانات جديدة.",
    aboutBody: "مجتمع من طلاب الطب يجمعنا لاستكشاف الأفكار، ومشاركة الأبحاث، والتعلّم معًا.",
    aboutLink: "تعرّف إلى المؤتمر", participationLabel: "المشاركة", participationStatus: "لم تُفتح بعد",
    pathwaysEyebrow: "٠٢ / اختر مسارك", pathwaysTitle: "ابدأ بفضولك.\nواكتشف مسارك.",
    pathwaysBody: "بحث. ابتكار. تواصل. وتعلّم بالممارسة.", closed: "لم يُفتح بعد",
    pathways: [
      { category: "البحث العلمي", title: "شارك بحثك", description: "أبحاث طلابية، بما فيها الأبحاث الجارية." },
      { category: "الهاكاثون", title: "ابنِ على فكرتك", description: "من البحث إلى التطبيق. أفكار نطوّرها معًا." },
      { category: "الأطروحة في ثلاث دقائق", title: "اجعل بحثك مسموعًا", description: "أبحاث الدراسات العليا. ثلاث دقائق للتواصل." },
      { category: "ورش العمل", title: "تعلّم بالممارسة", description: "مساحة للتعلّم العملي." },
    ],
    programEyebrow: "٠٣ / تجربة المؤتمر", programTitle: "أفكار في دائرة الضوء.\nوحوارات تفتح آفاقًا.",
    programBody: "استكشف طرق عرض الأبحاث، ومناقشتها، وتطويرها.",
    programRows: [
      { format: "عرض", title: "البحث في دائرة الضوء", description: "شارك سؤالًا. وافتح باب الحوار." },
      { format: "نقاش", title: "وجهات نظر تجمعنا", description: "نتعلّم من اختلاف وجهات النظر." },
      { format: "تطبيق", title: "من الفكرة إلى التجربة", description: "اكتشف من خلال التعلّم العملي." },
    ],
    legacyEyebrow: "٠٤ / الفصل القادم", legacyTitle: "وتستمر الحكاية.",
    legacyBody: "من نسخة ٢٠٢٦ إلى نسختنا الخامسة في ٢٠٢٧. أسئلة جديدة، وفضول يجمعنا.",
    legacyArtLabel: "الفصل القادم", endingTitle: "نلتقي في جدة.",
    backToTop: "العودة إلى الأعلى", dateLabel: "موعد المؤتمر", venueLabel: "مكان انعقاد المؤتمر", pending: "بانتظار التأكيد", editionLabel: "النسخة الخامسة / ٢٠٢٧",
  },
};
