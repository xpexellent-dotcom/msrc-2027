import type { Locale } from "@/lib/i18n";

/** Public benefit language, not a session roster or an accreditation approval. */
export const conferenceExpectations = {
  en: {
    title: "Come with curiosity.\nLeave with possibility.",
    introduction: "Two days to share what you know, explore what comes next, and find the people who will help you get there.",
    link: "Explore the program",
    benefits: [
      { title: "Research, in the room.", body: "Present your work, hear new perspectives and take part in the conversations that move an idea forward." },
      { title: "Experience you can build on.", body: "Develop practical research and communication skills through workshops, discussions and hands-on learning." },
      { title: "A community to grow with.", body: "Meet students, researchers and clinicians. Exchange ideas across disciplines and start your next conversation." },
      { title: "Learning that goes further.", body: "Explore the scientific program. CME accreditation and the number of hours will be announced when confirmed." },
      { title: "Recognition for your commitment.", body: "Earn the full conference certificate by checking in on both days and completing the general survey. Workshops have their own completion requirements." },
      { title: "A platform for achievement.", body: "Share your research and take part in the conference competitions. Award categories and details will be announced." },
    ],
    venueTitle: "A place for\nnew perspectives.",
    venueName: "King Faisal Conference Center",
    venueBody: "At King Abdulaziz University in Jeddah, the conference brings our research community together in one place. Plan your arrival, explore the venue and make the most of your two days.",
    venueLink: "Explore the venue", venueLocation: "King Abdulaziz University · Jeddah", venueAlt: "Exterior of King Faisal Conference Center at King Abdulaziz University, showing its curved facade and entrance.",
    historyTitle: "A growing community.\nA shared ambition.",
    historyBody: "From the first conversations to a room full of new possibilities. Every edition adds another chapter to MSRC.",
    attendance: "Total visitors", lastEdition: "Visitors", research: "Research abstracts submitted", editions: "2023–2026", historyEdition: "MSRC 2026", legacyLink: "Explore previous editions",
  },
  ar: {
    title: "ابدأ بفضولك.\nواكتشف إمكاناتك.",
    introduction: "يومان لتشارك معرفتك، وتستكشف آفاقًا جديدة، وتلتقي بمن يشاركك رحلة البحث والاكتشاف.",
    link: "استكشف البرنامج",
    benefits: [
      { title: "بحثك في قلب الحوار.", body: "قدّم عملك، واستمع إلى وجهات نظر جديدة، وشارك في حوارات تساعد فكرتك على التطور." },
      { title: "خبرة تبني عليها.", body: "طوّر مهارات البحث والتواصل من خلال ورش العمل والنقاش والتعلّم العملي." },
      { title: "مجتمع تنمو معه.", body: "التقِ بالطلاب والباحثين والأطباء، وتبادل الأفكار بين التخصصات، وابدأ حوارك القادم." },
      { title: "تعلّم يفتح آفاقًا.", body: "استكشف البرنامج العلمي. سيُعلن اعتماد ساعات التعليم الطبي المستمر وعددها بعد تأكيدها." },
      { title: "تقدير لالتزامك.", body: "استحق شهادة المؤتمر الكاملة بتسجيل الحضور في اليومين وإكمال الاستبيان العام. ولورش العمل متطلبات إتمام مستقلة." },
      { title: "مساحة للإنجاز.", body: "شارك بأبحاثك وانضم إلى منافسات المؤتمر. ستُعلن فئات الجوائز وتفاصيلها لاحقًا." },
    ],
    venueTitle: "مكان يجمع\nوجهات نظر جديدة.",
    venueName: "مركز الملك فيصل للمؤتمرات",
    venueBody: "في جامعة الملك عبدالعزيز بجدة، يلتقي مجتمعنا البحثي في مكان واحد. خطّط لوصولك، وتعرّف إلى المقر، واستفد من يومَي المؤتمر.",
    venueLink: "استكشف المقر", venueLocation: "جامعة الملك عبدالعزيز · جدة", venueAlt: "واجهة مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز، وتظهر الواجهة المنحنية والمدخل.",
    historyTitle: "مجتمع ينمو.\nوطموح يجمعنا.",
    historyBody: "من الحوارات الأولى إلى آفاق جديدة تجمعنا. تضيف كل نسخة فصلًا جديدًا إلى رحلة المؤتمر.",
    attendance: "إجمالي الزوار", lastEdition: "زائرًا", research: "ملخصًا بحثيًا مقدمًا", editions: "٢٠٢٣–٢٠٢٦", historyEdition: "MSRC ٢٠٢٦", legacyLink: "استكشف النسخ السابقة",
  },
} satisfies Record<Locale, { title: string; introduction: string; link: string; benefits: { title: string; body: string }[]; venueTitle: string; venueName: string; venueBody: string; venueLink: string; venueLocation: string; venueAlt: string; historyTitle: string; historyBody: string; attendance: string; lastEdition: string; research: string; editions: string; historyEdition: string; legacyLink: string }>;

// Supplied MSRC27 draft PDF pp.5/7/9/11; summed attendances, not unique people.
export const editionHistory = [
  { year: 2023, attendance: 350, lowerBound: true },
  { year: 2024, attendance: 600, lowerBound: true },
  { year: 2025, attendance: 800, lowerBound: true },
  { year: 2026, attendance: 2257, lowerBound: false },
] as const;
export const totalHistoricalAttendance = editionHistory.reduce((sum, edition) => sum + edition.attendance, 0);
