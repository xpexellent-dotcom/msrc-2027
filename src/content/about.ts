import type { Locale } from "@/lib/i18n";

type AboutCopy = {
  metadataTitle: string;
  metadataDescription: string;
  breadcrumbLabel: string;
  home: string;
  about: string;
  eyebrow: string;
  title: string;
  lead: string;
  edition: string;
  editionValue: string;
  dates: string;
  host: string;
  hostValue: string;
  organizer: string;
  organizerValue: string;
  purposeEyebrow: string;
  purposeTitle: string;
  purposeBody: string;
  purposes: readonly { title: string; body: string }[];
  communityEyebrow: string;
  communityTitle: string;
  communityBody: string;
  audiences: readonly string[];
  exploreEyebrow: string;
  exploreTitle: string;
  exploreBody: string;
  participation: string;
  program: string;
  closed: string;
};

// SCP-02 / LOC-01/03 / CMS-04 / CFG-12: complete draft copy in both languages.
// Identity/purpose/audience: CONFERENCE_BACKGROUND.md, S3 pp1,4,13,17,33,37.
// Wording is an editorial adaptation for local review, not organizer-approved copy.
export const aboutCopy: Record<Locale, AboutCopy> = {
  en: {
    metadataTitle: "About MSRC 2027",
    metadataDescription:
      "Discover the purpose and community of the fifth Medical Students Research Conference in Jeddah.",
    breadcrumbLabel: "Breadcrumb",
    home: "Home",
    about: "About",
    eyebrow: "About the conference",
    title: "Research begins with a question.",
    lead:
      "The fifth Medical Students Research Conference brings student research, scientific exchange and healthcare innovation into one conversation.",
    edition: "Edition",
    editionValue: "Fifth / 2027",
    dates: "Conference dates",
    host: "Host institution",
    hostValue: "Faculty of Medicine, King Abdulaziz University",
    organizer: "Organizing club",
    organizerValue: "Research Principles Club",
    purposeEyebrow: "1 / Our purpose",
    purposeTitle: "From a first question\nto a shared understanding.",
    purposeBody:
      "Student-led. Research-focused. A space to share ideas and connect with the medical research community.",
    purposes: [
      {
        title: "Make room for research",
        body: "Create space for student questions, research ideas and the work of investigating them.",
      },
      {
        title: "Share what we learn",
        body: "Develop scientific communication through presenting, listening and discussing different perspectives.",
      },
      {
        title: "Connect ideas with care",
        body: "Explore how collaboration and innovation can respond to challenges in healthcare.",
      },
    ],
    communityEyebrow: "2 / Our community",
    communityTitle: "Different stages.\nA shared curiosity.",
    communityBody:
      "Learners, researchers and educators. Connected by an interest in medical research.",
    audiences: [
      "Undergraduate medical students",
      "Interns and residents",
      "Postgraduate students",
      "Faculty and the wider research community",
    ],
    exploreEyebrow: "3 / Explore the conference",
    exploreTitle: "Find your starting point.",
    exploreBody:
      "Discover research, innovation and hands-on learning.",
    participation: "Explore participation pathways",
    program: "Explore the experience",
    closed: "Not open yet",
  },
  ar: {
    metadataTitle: "عن مؤتمر أبحاث طلاب الطب | MSRC 2027",
    metadataDescription:
      "تعرّف إلى هدف المؤتمر الخامس لأبحاث طلاب الطب ومجتمعه في جدة.",
    breadcrumbLabel: "مسار التنقل",
    home: "الرئيسية",
    about: "عن المؤتمر",
    eyebrow: "عن المؤتمر",
    title: "يبدأ البحث بسؤال.",
    lead:
      "يجمع المؤتمر الخامس لأبحاث طلاب الطب البحثَ الطلابي، وتبادل المعرفة العلمية، والابتكار في الرعاية الصحية، في حوار واحد.",
    edition: "النسخة",
    editionValue: "الخامسة / ٢٠٢٧",
    dates: "موعد المؤتمر",
    host: "الجهة المستضيفة",
    hostValue: "كلية الطب، جامعة الملك عبدالعزيز",
    organizer: "النادي المنظّم",
    organizerValue: "نادي مبادئ البحث العلمي",
    purposeEyebrow: "١ / هدفنا",
    purposeTitle: "من سؤال أول،\nإلى معرفة نتشاركها.",
    purposeBody:
      "مؤتمر يقوده الطلاب، ويجمعنا حول البحث العلمي لمشاركة الأفكار والتواصل مع مجتمع البحث الطبي.",
    purposes: [
      {
        title: "مساحة للبحث",
        body: "إتاحة مساحة لأسئلة الطلاب وأفكارهم البحثية وجهودهم في دراستها.",
      },
      {
        // Distinct from the section title "معرفة نتشاركها" above, which it previously repeated.
        title: "نتشارك ما نتعلّمه",
        body: "تطوير مهارات التواصل العلمي عبر العرض والاستماع ومناقشة وجهات النظر المختلفة.",
      },
      {
        title: "ربط الأفكار بالرعاية الصحية",
        body: "استكشاف دور التعاون والابتكار في الاستجابة لتحديات الرعاية الصحية.",
      },
    ],
    communityEyebrow: "٢ / مجتمع المؤتمر",
    communityTitle: "مراحل مختلفة،\nوفضول يجمعنا.",
    communityBody:
      "متعلّمون وباحثون وأعضاء هيئة تدريس، يجمعنا الاهتمام بالبحث الطبي.",
    audiences: [
      "طلاب الطب في مرحلة البكالوريوس",
      "أطباء الامتياز والأطباء المقيمون",
      "طلاب الدراسات العليا",
      "أعضاء هيئة التدريس ومجتمع البحث العلمي",
    ],
    exploreEyebrow: "٣ / استكشف المؤتمر",
    exploreTitle: "اختر نقطة انطلاقك.",
    exploreBody:
      "اكتشف البحث والابتكار والتعلّم بالممارسة.",
    participation: "استكشف مسارات المشاركة",
    program: "اكتشف تجربة المؤتمر",
    closed: "لم تُفتح بعد",
  },
};
