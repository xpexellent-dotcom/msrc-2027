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
  draft: string;
  draftNote: string;
  edition: string;
  editionValue: string;
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
  audienceNote: string;
  exploreEyebrow: string;
  exploreTitle: string;
  exploreBody: string;
  participation: string;
  program: string;
  closed: string;
  closedNote: string;
};

// SCP-02 / LOC-01/03 / CMS-04 / CFG-12: complete draft copy in both languages.
// Identity/purpose/audience: CONFERENCE_BACKGROUND.md, S3 pp1,4,13,17,33,37.
// Wording is an editorial adaptation for local review, not organizer-approved copy.
export const aboutCopy: Record<Locale, AboutCopy> = {
  en: {
    metadataTitle: "About MSRC 2027 | MSRC 2027 preview",
    metadataDescription:
      "Discover the purpose and community of the fifth Medical Students Research Conference. Draft English content for local review.",
    breadcrumbLabel: "Breadcrumb",
    home: "Home",
    about: "About",
    eyebrow: "About the conference",
    title: "Research begins with a question.",
    lead:
      "The fifth Medical Students Research Conference brings student research, scientific exchange and healthcare innovation into one conversation.",
    draft: "Draft for review",
    draftNote: "This introduction and its Arabic translation are awaiting editorial approval.",
    edition: "Edition",
    editionValue: "Fifth / 2027",
    host: "Host institution",
    hostValue: "Faculty of Medicine, King Abdulaziz University",
    organizer: "Organizing club",
    organizerValue: "Research Principles Club",
    purposeEyebrow: "01 / Our purpose",
    purposeTitle: "From a first question\nto a shared understanding.",
    purposeBody:
      "MSRC is a student-led medical conference shaped around research, collaboration and innovation. Its purpose is to help students present their work, exchange knowledge and connect with the wider research community.",
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
    communityEyebrow: "02 / Our community",
    communityTitle: "Different stages.\nA shared curiosity.",
    communityBody:
      "Student research grows through conversations across experience levels. The conference is intended to connect learners with researchers and educators who share an interest in medical research.",
    audiences: [
      "Undergraduate medical students",
      "Interns and residents",
      "Postgraduate students",
      "Faculty and the wider research community",
    ],
    audienceNote:
      "This describes the conference community, not eligibility for an application or competition. Each participation pathway will have its own published requirements.",
    exploreEyebrow: "03 / Explore the preview",
    exploreTitle: "Find your starting point.",
    exploreBody:
      "Read an introduction to the research, hackathon, postgraduate 3MT and workshop pathways, or explore the illustrative program overview.",
    participation: "Explore participation pathways",
    program: "View the program overview",
    closed: "Not open yet",
    closedNote:
      "Registration and applications remain closed. Confirmed dates, venue and participation details will be shared after approval.",
  },
  ar: {
    metadataTitle: "عن مؤتمر أبحاث طلاب الطب | معاينة MSRC 2027",
    metadataDescription:
      "تعرّف إلى هدف المؤتمر الخامس لأبحاث طلاب الطب ومجتمعه. محتوى عربي أولي للمراجعة المحلية.",
    breadcrumbLabel: "مسار التنقل",
    home: "الرئيسية",
    about: "عن المؤتمر",
    eyebrow: "عن المؤتمر",
    title: "يبدأ البحث بسؤال.",
    lead:
      "يجمع المؤتمر الخامس لأبحاث طلاب الطب أبحاث الطلاب وتبادل المعرفة والابتكار في الرعاية الصحية في مساحة واحدة للحوار.",
    draft: "مسودة للمراجعة",
    draftNote: "هذا التعريف بالمؤتمر وصياغته باللغتين العربية والإنجليزية بانتظار المراجعة والاعتماد.",
    edition: "النسخة",
    editionValue: "الخامسة / ٢٠٢٧",
    host: "الجهة المستضيفة",
    hostValue: "كلية الطب، جامعة الملك عبدالعزيز",
    organizer: "النادي المنظّم",
    organizerValue: "نادي مبادئ البحث العلمي",
    purposeEyebrow: "٠١ / هدفنا",
    purposeTitle: "من سؤال أول،\nإلى معرفة نتشاركها.",
    purposeBody:
      "مؤتمر أبحاث طلاب الطب مؤتمر طبي يقوده الطلاب، ويجمع البحث والتعاون والابتكار. يهدف إلى دعم الطلاب في عرض أعمالهم وتبادل المعرفة والتواصل مع مجتمع البحث العلمي.",
    purposes: [
      {
        title: "مساحة للبحث",
        body: "إتاحة مساحة لأسئلة الطلاب وأفكارهم البحثية وجهودهم في دراستها.",
      },
      {
        title: "معرفة نتشاركها",
        body: "تطوير مهارات التواصل العلمي عبر العرض والاستماع ومناقشة وجهات النظر المختلفة.",
      },
      {
        title: "أفكار ترتبط بالرعاية",
        body: "استكشاف دور التعاون والابتكار في الاستجابة لتحديات الرعاية الصحية.",
      },
    ],
    communityEyebrow: "٠٢ / مجتمع المؤتمر",
    communityTitle: "مراحل مختلفة،\nوفضول يجمعنا.",
    communityBody:
      "ينمو البحث الطلابي بالحوار بين أصحاب الخبرات المختلفة. يسعى المؤتمر إلى وصل المتعلّمين بالباحثين وأعضاء هيئة التدريس الذين يجمعهم الاهتمام بالبحث الطبي.",
    audiences: [
      "طلاب الطب في مرحلة البكالوريوس",
      "أطباء الامتياز والأطباء المقيمون",
      "طلاب الدراسات العليا",
      "أعضاء هيئة التدريس ومجتمع البحث العلمي",
    ],
    audienceNote:
      "هذا وصف لمجتمع المؤتمر، وليس تحديدًا لأهلية التقديم أو المشاركة في المسابقات. ستُنشر متطلبات مستقلة لكل مسار مشاركة.",
    exploreEyebrow: "٠٣ / استكشف المعاينة",
    exploreTitle: "ابدأ من اهتمامك.",
    exploreBody:
      "تعرّف إلى مسارات البحث والهاكاثون والأطروحة في ثلاث دقائق لطلاب الدراسات العليا وورش العمل، أو اطّلع على التصوّر التوضيحي للبرنامج.",
    participation: "استكشف مسارات المشاركة",
    program: "اطّلع على تصوّر البرنامج",
    closed: "لم تُفتح بعد",
    closedNote:
      "لم يُفتح التسجيل أو تقديم الطلبات بعد. ستُنشر المواعيد والمقر وتفاصيل المشاركة المؤكدة بعد اعتمادها.",
  },
};
