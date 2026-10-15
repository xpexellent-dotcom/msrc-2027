import type { BenefitIcon } from "@/components/benefit-artwork";
import type { Locale } from "@/lib/i18n";

/** Public benefit language, not a session roster or an accreditation approval. The benefits
 * describe joining the MSRC organizing team (owner decision, 15 October 2026): priority access
 * means early registration and first pick of workshop seats. */
export const conferenceExpectations = {
  en: {
    title: "Come with curiosity.\nLeave with possibility.",
    introduction: "Join the team behind MSRC 2027 and leave with experience, recognition and connections that last.",
    link: "Meet the team",
    benefits: [
      { icon: "practice", title: "Hands-on organizing experience.", body: "Help run a two-day medical conference, from first plans to final session." },
      { icon: "certificate", title: "A Dean’s certificate.", body: "Your contribution, formally recognized by the Dean." },
      { icon: "community", title: "Teamwork that lasts.", body: "Plan, coordinate and deliver with a driven team of peers." },
      { icon: "network", title: "Network with experts.", body: "Work side by side with researchers, clinicians and speakers." },
      { icon: "priority", title: "Priority access.", body: "Register early and get first pick of workshop seats." },
      { icon: "research", title: "Research, in the room.", body: "Share your work and join the conversations that move ideas forward." },
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
    introduction: "انضم إلى الفريق الذي يصنع MSRC 2027، واخرج بخبرة وتقدير وعلاقات تدوم.",
    link: "تعرّف على الفريق",
    benefits: [
      { icon: "practice", title: "خبرة تنظيمية عملية.", body: "شارك في تنظيم مؤتمر طبي على مدى يومين، من التخطيط حتى الجلسة الأخيرة." },
      { icon: "certificate", title: "شهادة من العميد.", body: "تقدير رسمي لإسهامك من عميد الكلية." },
      { icon: "community", title: "مهارات عمل جماعي.", body: "خطّط ونسّق ونفّذ مع فريق طموح من زملائك." },
      { icon: "network", title: "تواصل مع الخبراء.", body: "اعمل جنبًا إلى جنب مع باحثين وأطباء ومتحدثين." },
      { icon: "priority", title: "أولوية الوصول.", body: "سجّل مبكرًا واحصل على أولوية اختيار مقاعد ورش العمل." },
      { icon: "research", title: "بحثك في قلب الحوار.", body: "قدّم عملك وشارك في حوارات تدفع الأفكار إلى الأمام." },
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
