import type { BenefitIcon } from "@/components/benefit-artwork";
import type { Locale } from "@/lib/i18n";

/** Public benefit language, not a session roster or an accreditation approval. Two groups (owner
 * decision, 15 October 2026): participants (CME, certificates, awards and cash prizes, research
 * exposure) and the organizing team (organizing experience, a certificate from the Dean, networking,
 * priority access = early registration and first pick of workshop seats). The 7 CME figure is illustrative. */
export const conferenceExpectations = {
  en: {
    title: "Come with curiosity.\nLeave with possibility.",
    introduction: "Whether you come to learn or to lead, leave with experience, recognition and connections that last.",
    link: "Meet the team",
    benefitGroups: [
      { label: "For participants", benefits: [
        { icon: "cme", title: "CME hours.", body: "Earn continuing medical education hours. The accredited number will be announced once confirmed." },
        { icon: "certificate", title: "Certificates for every step.", body: "Attend both days and complete the survey for your conference certificate. Each workshop you complete earns its own." },
        { icon: "award", title: "Awards and cash prizes.", body: "Compete in the conference competitions for awards and cash prizes. Categories and details will be announced." },
        { icon: "research", title: "Research exposure.", body: "Submit your abstract and present your work to peers, faculty and judges." },
      ] },
      { label: "For the organizing team", benefits: [
        { icon: "practice", title: "Hands-on organizing experience.", body: "Plan, coordinate and deliver a two-day medical conference with a driven team." },
        { icon: "certificate", title: "A certificate from the Dean.", body: "Your contribution, formally recognized by the Dean of the Faculty of Medicine." },
        { icon: "network", title: "Network with experts.", body: "Work side by side with researchers, clinicians and speakers." },
        { icon: "priority", title: "Priority access.", body: "Register early and get first pick of workshop seats." },
      ] },
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
    introduction: "سواء جئت لتتعلّم أو لتقود، اخرج بخبرة وتقدير وعلاقات تدوم.",
    link: "تعرّف على الفريق",
    benefitGroups: [
      { label: "للمشاركين", benefits: [
        { icon: "cme", title: "ساعات تعليم طبي مستمر.", body: "احصل على ساعات تعليم طبي مستمر، ويُعلن عددها المعتمد فور تأكيده." },
        { icon: "certificate", title: "شهادة لكل خطوة.", body: "احضر اليومين وأكمل الاستبيان لتحصل على شهادة المؤتمر، ولكل ورشة تُكملها شهادتها الخاصة." },
        { icon: "award", title: "جوائز ومكافآت نقدية.", body: "نافس في مسابقات المؤتمر على جوائز ومكافآت نقدية. تُعلن الفئات والتفاصيل لاحقًا." },
        { icon: "research", title: "منصة لبحثك.", body: "قدّم ملخصك البحثي واعرض عملك أمام الزملاء وأعضاء هيئة التدريس والمحكّمين." },
      ] },
      { label: "لفريق التنظيم", benefits: [
        { icon: "practice", title: "خبرة تنظيمية عملية.", body: "خطّط ونسّق ونفّذ مؤتمرًا طبيًا على مدى يومين مع فريق طموح." },
        { icon: "certificate", title: "شهادة من العميد.", body: "تقدير رسمي لإسهامك من عميد كلية الطب." },
        { icon: "network", title: "تواصل مع الخبراء.", body: "اعمل جنبًا إلى جنب مع باحثين وأطباء ومتحدثين." },
        { icon: "priority", title: "أولوية الوصول.", body: "سجّل مبكرًا واحصل على أولوية اختيار مقاعد ورش العمل." },
      ] },
    ],
    venueTitle: "مكان يجمع\nوجهات نظر جديدة.",
    venueName: "مركز الملك فيصل للمؤتمرات",
    venueBody: "في جامعة الملك عبدالعزيز بجدة، يلتقي مجتمعنا البحثي في مكان واحد. خطّط لوصولك، وتعرّف إلى المقر، واستفد من يومَي المؤتمر.",
    venueLink: "استكشف المقر", venueLocation: "جامعة الملك عبدالعزيز · جدة", venueAlt: "واجهة مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز، وتظهر الواجهة المنحنية والمدخل.",
    historyTitle: "مجتمع ينمو.\nوطموح يجمعنا.",
    historyBody: "من الحوارات الأولى إلى آفاق جديدة تجمعنا. تضيف كل نسخة فصلًا جديدًا إلى رحلة المؤتمر.",
    attendance: "إجمالي الزوار", lastEdition: "زائرًا", research: "ملخصًا بحثيًا مقدمًا", editions: "٢٠٢٣–٢٠٢٦", historyEdition: "MSRC ٢٠٢٦", legacyLink: "استكشف النسخ السابقة",
  },
} satisfies Record<Locale, { title: string; introduction: string; link: string; benefitGroups: { label: string; benefits: { icon: BenefitIcon; title: string; body: string }[] }[]; venueTitle: string; venueName: string; venueBody: string; venueLink: string; venueLocation: string; venueAlt: string; historyTitle: string; historyBody: string; attendance: string; lastEdition: string; research: string; editions: string; historyEdition: string; legacyLink: string }>;

// Supplied MSRC27 draft PDF pp.5/7/9/11; summed attendances, not unique people.
export const editionHistory = [
  { year: 2023, attendance: 350, lowerBound: true },
  { year: 2024, attendance: 600, lowerBound: true },
  { year: 2025, attendance: 800, lowerBound: true },
  { year: 2026, attendance: 2257, lowerBound: false },
] as const;
export const totalHistoricalAttendance = editionHistory.reduce((sum, edition) => sum + edition.attendance, 0);
