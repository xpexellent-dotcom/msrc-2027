import type { BenefitIcon } from "@/components/benefit-artwork";
import type { Locale } from "@/lib/i18n";

/** Public benefit language, not a session roster or an accreditation approval. Owner decision
 * (16 October 2026, ORG-052): the homepage speaks to attendees only; the organizing-team group
 * (15 October) is withdrawn. Organizing-team priority stays an internal registration setting
 * (ORG-051) with no public promise. The 7 CME figure is illustrative. */
export const conferenceExpectations = {
  en: {
    title: "Come with curiosity.\nLeave with possibility.",
    introduction: "Learn, present and connect to build skills and earn recognition.",
    link: "How to take part",
    benefits: [
      { icon: "cme", title: "CME hours.", body: "Earn continuing medical education hours. The accredited number will be announced once confirmed.", homepageBody: "Earn continuing medical education hours, with the accredited number to be confirmed." },
      { icon: "practice", title: "Hands-on workshops.", body: "Build practical skills in workshops alongside the main programme." },
      { icon: "network", title: "Network with experts.", body: "Meet researchers, clinicians and speakers across both days." },
      { icon: "research", title: "Research exposure.", body: "Submit your abstract to share research with peers, faculty and judges." },
      { icon: "award", title: "Awards and cash prizes.", body: "Compete for awards and cash prizes, with categories and details to be announced." },
      { icon: "certificate", title: "Certificates for every step.", body: "Earn your conference certificate with both day check-ins and the survey, plus separate workshop certificates on completion." },
    ],
    venueTitle: "A place for\nnew perspectives.",
    venueName: "King Faisal Conference Center",
    venueBody: "Join our research community at King Abdulaziz University in Jeddah, and plan your two-day visit.",
    venueLink: "Explore the venue", venueLocation: "King Abdulaziz University · Jeddah", venueAlt: "Exterior of King Faisal Conference Center at King Abdulaziz University, showing its curved facade and entrance.",
    historyTitle: "A growing community.\nA shared ambition.",
    historyBody: "Every edition brings new conversations and possibilities to MSRC.",
    attendance: "Total visitors", lastEdition: "Visitors", research: "Research abstracts submitted", editions: "2023–2026", historyEdition: "MSRC 2026", legacyLink: "Explore previous editions",
  },
  ar: {
    title: "ابدأ بفضولك.\nواكتشف إمكاناتك.",
    introduction: "تعلّم واعرض بحثك وتواصل لتنمّي مهاراتك وتحظى بالتقدير.",
    link: "كيف تشارك",
    benefits: [
      { icon: "cme", title: "ساعات تعليم طبي مستمر.", body: "احصل على ساعات تعليم طبي مستمر، ويُعلن عددها المعتمد فور تأكيده.", homepageBody: "احصل على ساعات تعليم طبي مستمر، ويُحدَّد عددها المعتمد لاحقًا." },
      { icon: "practice", title: "ورش عمل تطبيقية.", body: "طوّر مهاراتك العملية في ورش إلى جانب البرنامج الرئيسي." },
      { icon: "network", title: "تواصل مع الخبراء.", body: "التقِ بباحثين وأطباء ومتحدثين خلال اليومين." },
      { icon: "research", title: "منصة لبحثك.", body: "قدّم ملخصك لعرض بحثك أمام الزملاء والأساتذة والمحكّمين." },
      { icon: "award", title: "جوائز ومكافآت نقدية.", body: "نافس على جوائز ومكافآت نقدية، وتُعلن الفئات والتفاصيل لاحقًا." },
      { icon: "certificate", title: "شهادة لكل خطوة.", body: "احصل على شهادة المؤتمر بتسجيل حضور اليومين وإكمال الاستبيان، وشهادات منفصلة للورش عند إكمالها." },
    ],
    venueTitle: "مكان يجمع\nوجهات نظر جديدة.",
    venueName: "مركز الملك فيصل للمؤتمرات",
    venueBody: "انضم إلى مجتمعنا البحثي في جامعة الملك عبدالعزيز بجدة، وخطّط لزيارتك خلال اليومين.",
    venueLink: "استكشف المقر", venueLocation: "جامعة الملك عبدالعزيز · جدة", venueAlt: "واجهة مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز، وتظهر الواجهة المنحنية والمدخل.",
    historyTitle: "مجتمع ينمو.\nوطموح يجمعنا.",
    historyBody: "تضيف كل نسخة حوارات وآفاقًا جديدة إلى المؤتمر.",
    attendance: "إجمالي الزوار", lastEdition: "زائرًا", research: "ملخصًا بحثيًا مقدمًا", editions: "٢٠٢٣–٢٠٢٦", historyEdition: "MSRC ٢٠٢٦", legacyLink: "استكشف النسخ السابقة",
  },
} satisfies Record<Locale, { title: string; introduction: string; link: string; benefits: { icon: BenefitIcon; title: string; body: string; homepageBody?: string }[]; venueTitle: string; venueName: string; venueBody: string; venueLink: string; venueLocation: string; venueAlt: string; historyTitle: string; historyBody: string; attendance: string; lastEdition: string; research: string; editions: string; historyEdition: string; legacyLink: string }>;

// Supplied MSRC27 draft PDF pp.5/7/9/11; summed attendances, not unique people.
export const editionHistory = [
  { year: 2023, attendance: 350, lowerBound: true },
  { year: 2024, attendance: 600, lowerBound: true },
  { year: 2025, attendance: 800, lowerBound: true },
  { year: 2026, attendance: 2257, lowerBound: false },
] as const;
export const totalHistoricalAttendance = editionHistory.reduce((sum, edition) => sum + edition.attendance, 0);
