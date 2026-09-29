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
  { id: "about", path: "/about", label: { en: "About", ar: "عن المؤتمر" }, previewHref: "/#about" },
  { id: "dates", path: "/dates-venue", label: { en: "Dates & venue", ar: "المواعيد والمقر" }, previewHref: "/#event-details" },
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
  heroPoster: "/brand/hero-poster.svg",
  heroVideo: null,
  finalLogo: null,
  sponsors: [],
  gallery: [],
} as const;

type Pathway = { title: string; description: string; category: string };
type ProgramRow = { title: string; description: string; format: string };
type HomepageCopy = {
  kicker: string; title: readonly [string, string]; lead: string; explore: string;
  programLink: string; posterCaption: string; institution: string; city: string;
  aboutEyebrow: string; aboutTitle: string; aboutBody: string; aboutNote: string;
  pathwaysEyebrow: string; pathwaysTitle: string; pathwaysBody: string; closed: string;
  pathways: readonly Pathway[]; programEyebrow: string; programTitle: string;
  programBody: string; illustrative: string; programRows: readonly ProgramRow[];
  legacyEyebrow: string; legacyTitle: string; legacyBody: string; legacyNote: string;
  legacyArtLabel: string; endingTitle: string; endingBody: string; backToTop: string;
  dateLabel: string; venueLabel: string; pending: string; editionLabel: string;
};

/** Draft bilingual editorial copy: no dates, people, prices, sponsors or metrics invented. */
export const homepageCopy: Record<Locale, HomepageCopy> = {
  en: {
    kicker: "The 5th Medical Students Research Conference",
    title: ["Where curiosity", "becomes discovery."],
    lead: "A place for questions that matter. A meeting point for the next generation of medical research.",
    explore: "Explore the conference", programLink: "Inside the preview", posterCaption: "Original concept artwork · Conference film forthcoming",
    institution: "King Abdulaziz University", city: "Jeddah, Saudi Arabia",
    aboutEyebrow: "01 / The conference", aboutTitle: "Good research starts\nwith a better question.",
    aboutBody: "MSRC brings medical students into a shared conversation about research: how we ask, how we investigate, and how an idea can make a difference.",
    aboutNote: "The fifth edition takes shape at King Abdulaziz University in Jeddah. This is an early look at the experience we are building for 2027.",
    pathwaysEyebrow: "02 / Find your path", pathwaysTitle: "More than one way\nto move an idea forward.",
    pathwaysBody: "Discover the participation pathways. Applications and bookings remain closed while details are finalized.",
    closed: "Not open yet",
    pathways: [
      { category: "Research", title: "Share your research", description: "A pathway for medical student research, including ongoing work. Submission guidelines will be published before applications open." },
      { category: "Hackathon", title: "Build on an idea", description: "Explore translating research into practice or advancing medical student research, through solo or preformed team entries." },
      { category: "3MT", title: "Make your research heard", description: "A separate postgraduate Three Minute Thesis pathway. Eligibility, presentation rules and application details are forthcoming." },
      { category: "Workshops", title: "Learn by doing", description: "Practical learning alongside the conference. The workshop catalog, prerequisites and booking details are not yet published." },
    ],
    programEyebrow: "03 / The program", programTitle: "Room for discovery.\nSpace for exchange.",
    programBody: "An illustrative look at the program format. Sessions, speakers and times will appear here after approval.",
    illustrative: "Illustrative format · Not a schedule",
    programRows: [
      { format: "Present", title: "Research in the spotlight", description: "Space for research presentations and the questions they inspire." },
      { format: "Discuss", title: "A conversation that continues", description: "Perspectives and discussion across the research community." },
      { format: "Practice", title: "Ideas into experience", description: "A preview of hands-on learning and exchange." },
    ],
    legacyEyebrow: "04 / Building on what came before", legacyTitle: "One edition ends.\nThe curiosity continues.",
    legacyBody: "The 2027 conference is the fifth chapter of MSRC. A selected look back at the 2026 edition will be shared here once the archive and media permissions are reviewed.",
    legacyNote: "Past-edition photography and films are being considered for this space. No archive media is published in this preview.",
    legacyArtLabel: "Past editions · Archive in preparation",
    endingTitle: "The next chapter\nis taking shape.",
    endingBody: "Approved dates, venue and participation information will be added as preparations progress. Registration and applications are not open.",
    backToTop: "Back to the beginning", dateLabel: "Conference dates", venueLabel: "Conference venue", pending: "Awaiting confirmation", editionLabel: "Fifth edition / 2027",
  },
  ar: {
    kicker: "مؤتمر أبحاث طلاب الطب الخامس",
    title: ["هنا يبدأ الفضول،", "وتتشكّل الاكتشافات."],
    lead: "مساحة للأسئلة التي تصنع فرقًا، وملتقى للجيل القادم من الباحثين في الطب.",
    explore: "اكتشف المؤتمر", programLink: "استكشف المعاينة", posterCaption: "تصميم تصوّري أصلي · فيلم المؤتمر قريبًا",
    institution: "جامعة الملك عبدالعزيز", city: "جدة، المملكة العربية السعودية",
    aboutEyebrow: "٠١ / عن المؤتمر", aboutTitle: "البحث الجيد يبدأ\nبسؤال أفضل.",
    aboutBody: "يجمع المؤتمر طلاب الطب في حوار حول البحث العلمي: كيف نطرح الأسئلة، وكيف نستقصي، وكيف يمكن لفكرة أن تُحدث فرقًا.",
    aboutNote: "تتشكّل النسخة الخامسة في جامعة الملك عبدالعزيز بجدة. هذه نظرة أولية على التجربة التي نعدّها لعام ٢٠٢٧.",
    pathwaysEyebrow: "٠٢ / اختر مسارك", pathwaysTitle: "أكثر من طريق\nلتطوير فكرتك.",
    pathwaysBody: "تعرّف على مسارات المشاركة. يبقى التقديم والحجز مغلقين حتى استكمال التفاصيل.",
    closed: "لم تُفتح بعد",
    pathways: [
      { category: "البحث العلمي", title: "شارك بحثك", description: "مسار لأبحاث طلاب الطب، يشمل الأعمال البحثية الجارية. ستُنشر إرشادات التقديم قبل فتح الطلبات." },
      { category: "الهاكاثون", title: "طوّر فكرتك", description: "استكشف تحويل البحث إلى ممارسة أو تطوير البحث لدى طلاب الطب، بمشاركة فردية أو ضمن فريق مُشكّل مسبقًا." },
      { category: "الأطروحة في ثلاث دقائق", title: "أوصل صوت بحثك", description: "مسار مستقل لطلاب الدراسات العليا. ستُعلن شروط الأهلية وقواعد العرض وتفاصيل التقديم لاحقًا." },
      { category: "ورش العمل", title: "تعلّم بالممارسة", description: "تعلّم عملي ضمن تجربة المؤتمر. لم تُنشر بعد قائمة الورش ومتطلباتها وتفاصيل الحجز." },
    ],
    programEyebrow: "٠٣ / البرنامج", programTitle: "مساحة للاكتشاف،\nوفرصة لتبادل المعرفة.",
    programBody: "تصوّر توضيحي لشكل البرنامج. ستُنشر الجلسات وأسماء المتحدثين والمواعيد بعد اعتمادها.",
    illustrative: "تصوّر توضيحي · ليس جدولًا معتمدًا",
    programRows: [
      { format: "اعرض", title: "البحث تحت الضوء", description: "مساحة للعروض البحثية وما تثيره من أسئلة." },
      { format: "ناقش", title: "حوار يستمر", description: "وجهات نظر ونقاشات تجمع مجتمع البحث العلمي." },
      { format: "جرّب", title: "من الفكرة إلى التجربة", description: "لمحة عن التعلّم العملي وتبادل الخبرات." },
    ],
    legacyEyebrow: "٠٤ / امتداد لما سبق", legacyTitle: "تنتهي نسخة،\nويستمر الفضول.",
    legacyBody: "يمثّل مؤتمر ٢٠٢٧ الفصل الخامس في مسيرة المؤتمر. ستُعرض هنا مختارات من نسخة ٢٠٢٦ بعد مراجعة الأرشيف وأذونات استخدام المواد الإعلامية.",
    legacyNote: "تجري دراسة صور وأفلام من النسخ السابقة لهذا القسم. لا تُعرض أي مواد أرشيفية في هذه المعاينة.",
    legacyArtLabel: "النسخ السابقة · الأرشيف قيد الإعداد",
    endingTitle: "الفصل القادم\nقيد الإعداد.",
    endingBody: "ستُضاف المواعيد والمقر ومعلومات المشاركة المعتمدة مع تقدّم الاستعدادات. لم يُفتح التسجيل أو التقديم بعد.",
    backToTop: "العودة إلى البداية", dateLabel: "مواعيد المؤتمر", venueLabel: "مقر انعقاد المؤتمر", pending: "بانتظار التأكيد", editionLabel: "النسخة الخامسة / ٢٠٢٧",
  },
};
