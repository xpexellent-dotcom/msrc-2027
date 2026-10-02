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
  { id: "program", path: "/program", label: { en: "Programme", ar: "البرنامج" }, previewHref: "/program" },
  { id: "speakers", path: "/speakers", label: { en: "Speakers", ar: "المتحدثون" }, previewHref: "/speakers" },
  { id: "workshops", path: "/workshops", label: { en: "Workshops", ar: "ورش العمل" }, previewHref: "/workshops" },
  { id: "participation", path: "/participation", label: { en: "Participation & submission guidelines", ar: "المشاركة وإرشادات التقديم" }, previewHref: "/participate" },
  { id: "teams", path: "/teams", label: { en: "Teams, committees & board", ar: "الفرق واللجان والمجلس" }, previewHref: null },
  { id: "sponsors", path: "/sponsors", label: { en: "Sponsors & sponsorship", ar: "الرعاة والرعاية" }, previewHref: null },
  { id: "gallery", path: "/past-editions", label: { en: "Media & past editions", ar: "الوسائط والنسخ السابقة" }, previewHref: "/media" },
  { id: "announcements", path: "/announcements", label: { en: "Announcements", ar: "الإعلانات" }, previewHref: null },
  { id: "faq", path: "/faq", label: { en: "FAQ", ar: "الأسئلة الشائعة" }, previewHref: "/#faq" },
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

type Pathway = { title: string; description: string; category: string; href: string };
type ProgramRow = { title: string; description: string; format: string };
type HomepageCopy = {
  kicker: string; title: readonly [string, string]; lead: string; explore: string;
  programLink: string; institution: string; city: string;
  aboutEyebrow: string; aboutTitle: string; aboutBody: string; aboutLink: string;
  participationLabel: string; participationStatus: string;
  pathwaysEyebrow: string; pathwaysTitle: string; pathwaysBody: string; closed: string;
  pathways: readonly Pathway[]; programEyebrow: string; programTitle: string;
  programBody: string; programRows: readonly ProgramRow[];
  legacyEyebrow: string; legacyTitle: string; legacyBody: string;
  legacyArtLabel: string; endingTitle: string; backToTop: string;
  dateLabel: string; venueLabel: string; pending: string; editionLabel: string;
};

/** Concise bilingual public copy; no session or eligibility claims. */
export const homepageCopy: Record<Locale, HomepageCopy> = {
  en: {
    kicker: "The 5th Medical Students Research Conference",
    title: ["Where curiosity", "becomes discovery."],
    lead: "Medical students. Shared ideas. New discoveries.",
    explore: "Explore the conference", programLink: "The experience",
    institution: "King Abdulaziz University", city: "Jeddah, Saudi Arabia",
    aboutEyebrow: "01 / The conference", aboutTitle: "Research brings\nus together.",
    aboutBody: "Meet a community of medical students exploring ideas, sharing research and learning together.",
    aboutLink: "Discover MSRC", participationLabel: "Participation", participationStatus: "Not open yet",
    pathwaysEyebrow: "02 / Find your path", pathwaysTitle: "Find your place\nat MSRC.",
    pathwaysBody: "Research. Innovation. Communication. Hands-on learning.", closed: "Not open yet",
    pathways: [
      { category: "Attend", title: "Be part of the conversation", description: "Meet the people asking the next questions in medicine.", href: "/registration" },
      { category: "Research", title: "Share your research", description: "Present your findings, including work in progress, and open a scientific conversation.", href: "/submissions" },
      { category: "Workshops", title: "Learn by doing", description: "Build practical skills through focused, hands-on learning.", href: "/workshops" },
      { category: "Hackathon", title: "Build on an idea", description: "Turn research into practice, or advance the way medical students do research.", href: "/hackathon" },
    ],
    programEyebrow: "03 / The experience", programTitle: "Ideas take\nthe stage.",
    programBody: "Research presentations, scientific conversations, and practical learning. The full schedule will follow when confirmed.",
    programRows: [
      { format: "Present", title: "Research presentations", description: "Student questions, findings and work in progress." },
      { format: "Discuss", title: "Scientific exchange", description: "Different perspectives on evidence and practice." },
      { format: "Practice", title: "Practical learning", description: "Focused skills, explored together." },
    ],
    legacyEyebrow: "05 / The previous edition", legacyTitle: "You had to\nbe there.",
    legacyBody: "From MSRC2026 to our fifth edition in 2027. New questions. A shared curiosity.",
    legacyArtLabel: "The next chapter", endingTitle: "See you in Jeddah.",
    backToTop: "Back to the beginning", dateLabel: "Conference dates", venueLabel: "Conference venue", pending: "To be announced", editionLabel: "Fifth edition / 2027",
  },
  ar: {
    kicker: "المؤتمر الخامس لأبحاث طلاب الطب",
    title: ["حيث يتحوّل الفضول", "إلى اكتشاف."],
    lead: "طلاب طب. أفكار نتشاركها. واكتشافات جديدة.",
    explore: "اكتشف المؤتمر", programLink: "تجربة المؤتمر",
    institution: "جامعة الملك عبدالعزيز", city: "جدة، المملكة العربية السعودية",
    aboutEyebrow: "٠١ / عن المؤتمر", aboutTitle: "البحث\nيجمعنا.",
    aboutBody: "مجتمع من طلاب الطب يجمعنا لاستكشاف الأفكار، ومشاركة الأبحاث، والتعلّم معًا.",
    aboutLink: "تعرّف إلى المؤتمر", participationLabel: "المشاركة", participationStatus: "لم تُفتح بعد",
    pathwaysEyebrow: "٠٢ / اختر مسارك", pathwaysTitle: "اكتشف مكانك\nفي المؤتمر.",
    pathwaysBody: "بحث. ابتكار. تواصل. وتعلّم بالممارسة.", closed: "لم يُفتح بعد",
    pathways: [
      { category: "الحضور", title: "كن جزءًا من الحوار", description: "التقِ بمن يطرحون أسئلة الطب القادمة.", href: "/registration" },
      { category: "البحث العلمي", title: "شارك بحثك", description: "اعرض نتائجك، بما فيها الأبحاث الجارية، وافتح باب النقاش العلمي.", href: "/submissions" },
      { category: "ورش العمل", title: "تعلّم بالممارسة", description: "طوّر مهارات عملية من خلال تعلّم مركّز وتطبيقي.", href: "/workshops" },
      { category: "الهاكاثون", title: "ابنِ على فكرتك", description: "حوّل البحث إلى تطبيق، أو طوّر طريقة إجراء طلاب الطب لأبحاثهم.", href: "/hackathon" },
    ],
    programEyebrow: "٠٣ / تجربة المؤتمر", programTitle: "أفكار\nفي دائرة الضوء.",
    programBody: "عروض أبحاث، وحوارات علمية، وتعلّم عملي. سنعلن الجدول الكامل بعد تأكيده.",
    programRows: [
      { format: "عرض", title: "عروض الأبحاث", description: "أسئلة طلابية، ونتائج، وأبحاث لا تزال جارية." },
      { format: "نقاش", title: "تبادل المعرفة العلمية", description: "وجهات نظر مختلفة حول الأدلة والممارسة." },
      { format: "تطبيق", title: "تعلّم عملي", description: "مهارات نكتشفها ونطوّرها معًا." },
    ],
    legacyEyebrow: "٠٥ / النسخة السابقة", legacyTitle: "لحظات\nتستحق الحضور.",
    legacyBody: "من نسخة ٢٠٢٦ إلى نسختنا الخامسة في ٢٠٢٧. أسئلة جديدة، وفضول يجمعنا.",
    legacyArtLabel: "الفصل القادم", endingTitle: "نلتقي في جدة.",
    backToTop: "العودة إلى الأعلى", dateLabel: "موعد المؤتمر", venueLabel: "مقر المؤتمر", pending: "سيُعلن لاحقًا", editionLabel: "النسخة الخامسة / ٢٠٢٧",
  },
};
