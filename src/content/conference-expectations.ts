import type { BenefitIcon } from "@/components/benefit-artwork";
import type { Locale } from "@/lib/i18n";

/** Public benefit language, not a session roster or an accreditation approval. Owner decision
 * (16 October 2026, ORG-052): the homepage speaks to attendees only; the organizing-team group
 * (15 October) is withdrawn. Organizing-team priority stays an internal registration setting
 * (ORG-051) with no public promise. The 7 CME figure is illustrative. */
export const conferenceExpectations = {
  en: {
    title: "Come with curiosity.\nLeave with possibility.",
    introduction: "Come to learn, present and connect. Leave with skills, recognition and connections that last.",
    link: "How to take part",
    benefits: [
      { icon: "cme", title: "CME hours.", body: "Earn continuing medical education hours. The accredited number will be announced once confirmed." },
      { icon: "practice", title: "Hands-on workshops.", body: "Build practical skills in focused, hands-on workshops alongside the main programme." },
      { icon: "network", title: "Network with experts.", body: "Meet researchers, clinicians and speakers over two days." },
      { icon: "research", title: "Research exposure.", body: "Submit your abstract and present your work to peers, faculty and judges." },
      { icon: "award", title: "Awards and cash prizes.", body: "Compete in the conference competitions for awards and cash prizes. Categories and details will be announced." },
      { icon: "certificate", title: "Certificates for every step.", body: "Attend both days and complete the survey for your conference certificate. Each workshop you complete earns its own." },
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
    introduction: "تعالَ لتتعلّم وتعرض أبحاثك وتتواصل، واخرج بمهارات وتقدير وعلاقات تدوم.",
    link: "كيف تشارك",
    benefits: [
      { icon: "cme", title: "ساعات تعليم طبي مستمر.", body: "احصل على ساعات تعليم طبي مستمر، ويُعلن عددها المعتمد فور تأكيده." },
      { icon: "practice", title: "ورش عمل تطبيقية.", body: "طوّر مهاراتك العملية في ورش عمل تطبيقية مركّزة إلى جانب البرنامج الرئيسي." },
      { icon: "network", title: "تواصل مع الخبراء.", body: "تعرّف إلى باحثين وأطباء ومتحدثين على مدى يومين." },
      { icon: "research", title: "منصة لبحثك.", body: "قدّم ملخصك البحثي واعرض عملك أمام الزملاء وأعضاء هيئة التدريس والمحكّمين." },
      { icon: "award", title: "جوائز ومكافآت نقدية.", body: "نافس في مسابقات المؤتمر على جوائز ومكافآت نقدية. تُعلن الفئات والتفاصيل لاحقًا." },
      { icon: "certificate", title: "شهادة لكل خطوة.", body: "احضر اليومين وأكمل الاستبيان لتحصل على شهادة المؤتمر، ولكل ورشة تُكملها شهادتها الخاصة." },
    ],
    venueTitle: "مكان يجمع\nوجهات نظر جديدة.",
    venueName: "مركز الملك فيصل للمؤتمرات",
    venueBody: "في جامعة الملك عبدالعزيز بجدة، يلتقي مجتمعنا البحثي في مكان واحد. خطّط لوصولك، وتعرّف إلى المقر، واستفد من يومَي المؤتمر.",
    venueLink: "استكشف المقر", venueLocation: "جامعة الملك عبدالعزيز · جدة", venueAlt: "واجهة مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز، وتظهر الواجهة المنحنية والمدخل.",
    historyTitle: "مجتمع ينمو.\nوطموح يجمعنا.",
    historyBody: "من الحوارات الأولى إلى آفاق جديدة تجمعنا. تضيف كل نسخة فصلًا جديدًا إلى رحلة المؤتمر.",
    attendance: "إجمالي الزوار", lastEdition: "زائرًا", research: "ملخصًا بحثيًا مقدمًا", editions: "٢٠٢٣–٢٠٢٦", historyEdition: "MSRC ٢٠٢٦", legacyLink: "استكشف النسخ السابقة",
  },
} satisfies Record<Locale, { title: string; introduction: string; link: string; benefits: { icon: BenefitIcon; title: string; body: string }[]; venueTitle: string; venueName: string; venueBody: string; venueLink: string; venueLocation: string; venueAlt: string; historyTitle: string; historyBody: string; attendance: string; lastEdition: string; research: string; editions: string; historyEdition: string; legacyLink: string }>;

// Supplied MSRC27 draft PDF pp.5/7/9/11; summed attendances, not unique people.
export const editionHistory = [
  { year: 2023, attendance: 350, lowerBound: true },
  { year: 2024, attendance: 600, lowerBound: true },
  { year: 2025, attendance: 800, lowerBound: true },
  { year: 2026, attendance: 2257, lowerBound: false },
] as const;
export const totalHistoricalAttendance = editionHistory.reduce((sum, edition) => sum + edition.attendance, 0);
