import type { BenefitIcon } from "@/components/benefit-artwork";
import { conferenceExpectations } from "@/content/conference-expectations";
import type { Locale } from "@/lib/i18n";

export type ParticipationJourney = "registration" | "submissions" | "workshops" | "hackathon" | "threeMinuteThesis";
export type JourneyCopy = {
  closed: string; closedBody: string; detailsTitle: string;
  details: readonly { title: string; body: string }[];
  stepsTitle: string; steps: readonly string[];
  goodToKnow?: { title: string; points: readonly string[] };
  /** ORG-054: the hackathon's two tracks, shown before the benefits. */
  tracks?: { label: string; title: string; note: string; items: readonly { label: string; title: string; body: string }[] };
  /** ORG-054: what happens on each conference day. */
  schedule?: { title: string; items: readonly { label: string; title: string; body: string }[] };
};

/** ORG-053: public invitations only. Full form rules live in participation-form-guidance.ts. */
export const participationJourneyCopy: Record<Locale, Record<ParticipationJourney, JourneyCopy>> = {
  en: {
    registration: {
      closed: "Registration is not open yet", closedBody: "Registration dates and attendance details will be announced before registration opens.",
      detailsTitle: "Two days. So much to take away.",
      details: [
        { title: "Your conference certificate", body: "Check in on both days and complete the general survey for your full conference certificate." },
        { title: "Learn from the community", body: "Discover the questions and ideas shaping student research." },
        { title: "Make new connections", body: "Meet researchers, clinicians and speakers." },
        { title: "CME hours", body: conferenceExpectations.en.benefits[0].body },
        { title: "Two days of discovery", body: "Explore talks, sessions and scientific conversations across both days." },
      ],
      stepsTitle: "Simple steps", steps: ["Create your account", "Verify your email", "Reserve your seat", "Receive your confirmation email and ticket"],
    },
    submissions: {
      closed: "Abstract submissions are not open yet", closedBody: "The submission window and final instructions will be published before applications open.",
      detailsTitle: "Give your work a wider conversation.",
      details: [
        { title: "Present your work", body: "Share your work with peers, faculty and judges." },
        { title: "Scientific feedback", body: "Receive feedback that brings new perspectives to your research." },
        { title: "Awards and cash prizes", body: "Compete for awards and cash prizes. Categories and details will be announced." },
        { title: "A research community", body: "Be part of a community that shares your curiosity." },
      ],
      goodToKnow: { title: "Good to know", points: [
        "Completed or ongoing work is welcome.",
        "Each principal investigator (the lead researcher responsible for the study) can have up to two submissions in MSRC 2027. Being a co-author does not count toward this limit.",
        "Write your abstract in English and leave out anything that could identify a patient.",
        "Submitting an abstract does not register you to attend. Every attendee reserves their own seat.",
      ] },
      stepsTitle: "Simple steps", steps: ["Prepare your abstract", "Submit when applications open", "Scientific review", "Decision by email"],
    },
    workshops: {
      closed: "Workshop booking is not open yet", closedBody: "The workshop catalogue, booking dates and prices will be announced before bookings open.",
      detailsTitle: "About the workshops",
      details: [
        { title: "Hands-on learning", body: "Build practical skills through focused, hands-on learning." },
        { title: "Your workshop certificate", body: "A confirmed booking, workshop check-in, completion confirmation and the workshop survey are required for your workshop certificate." },
        { title: "A separate booking", body: "Book each workshop separately with your confirmed conference registration." },
        { title: "Room for more", body: "Attend more than one workshop when their times do not overlap." },
      ],
      stepsTitle: "Simple steps", steps: ["Choose a workshop", "Book it with your confirmed conference registration", "Receive your confirmation email"],
    },
    hackathon: {
      closed: "Hackathon applications are not open yet", closedBody: "Final eligibility, application dates and participation terms will be announced before entries open.",
      tracks: { label: "Two tracks", title: "Choose your track.", note: "Pick one track for your idea.", items: [
        { label: "Track 1", title: "Translating research into practice", body: "A new idea that turns research into real impact on healthcare." },
        { label: "Track 2", title: "Advancing medical student research", body: "A new idea that helps medical students do better research." },
      ] },
      detailsTitle: "Build on a question that matters.",
      details: [
        { title: "Solo or together", body: "Enter on your own or with a team of up to five." },
        { title: "Guidance from mentors", body: "Shape your idea with experienced mentors." },
        { title: "Pitch to the judges", body: "Present your idea and hear what the judges think." },
      ],
      schedule: { title: "Two days, two stages.", items: [
        { label: "Day 1", title: "Mentoring", body: "Work on your idea with your mentors." },
        { label: "Day 2", title: "Pitching and judging", body: "Pitch your idea to the judges." },
      ] },
      goodToKnow: { title: "Good to know", points: [
        "Teams are formed before you apply, up to five members, and can include students from different universities. There is no team matching.",
        "Your idea must be new. Apply with an English title and a pitch of up to 300 words. A prototype is welcome but optional.",
        "Preparation and a compulsory orientation take place before the conference.",
        "Your hackathon entry is separate from your conference seat.",
      ] },
      stepsTitle: "Simple steps", steps: ["Choose your track", "Prepare your idea and pitch", "Apply when entries open", "Join the compulsory orientation"],
    },
    threeMinuteThesis: {
      closed: "3MT applications are not open yet", closedBody: "Eligibility, entry requirements and the application window will be announced before entries open.",
      detailsTitle: "A clearer voice for your research.",
      details: [
        { title: "Share postgraduate research", body: "Communicate your postgraduate research through Three Minute Thesis (3MT)." },
        { title: "Clear communication", body: "Present your scientific content in English through a dedicated competition pathway." },
      ],
      stepsTitle: "Simple steps", steps: ["Review the confirmed guidelines when published", "Prepare your scientific content in English", "Apply through the separate 3MT pathway when it opens"],
    },
  },
  ar: {
    registration: {
      closed: "لم يُفتح التسجيل بعد", closedBody: "ستُعلن مواعيد التسجيل وتفاصيل الحضور قبل فتح التسجيل.",
      detailsTitle: "يومان يفتحان لك آفاقًا.",
      details: [
        { title: "شهادة حضور المؤتمر", body: "سجّل حضورك في اليومين وأكمل الاستبيان العام للحصول على شهادة حضور المؤتمر كاملًا." },
        { title: "تعلّم من المجتمع البحثي", body: "اكتشف الأسئلة والأفكار التي ترسم ملامح أبحاث الطلاب." },
        { title: "علاقات جديدة", body: "تعرّف إلى باحثين وأطباء ومتحدثين." },
        { title: "ساعات تعليم طبي مستمر", body: conferenceExpectations.ar.benefits[0].body },
        { title: "يومان من الاكتشاف", body: "استكشف المحاضرات والجلسات والحوارات العلمية على مدى يومين." },
      ],
      stepsTitle: "خطوات بسيطة", steps: ["أنشئ حسابك", "تحقّق من بريدك الإلكتروني", "احجز مقعدك", "استلم رسالة التأكيد وتذكرتك"],
    },
    submissions: {
      closed: "لم يُفتح تقديم الملخصات بعد", closedBody: "ستُنشر فترة التقديم والتعليمات النهائية قبل فتح الطلبات.",
      detailsTitle: "افتح لبحثك باب الحوار.",
      details: [
        { title: "اعرض بحثك", body: "شارك عملك أمام الزملاء وأعضاء هيئة التدريس والمحكّمين." },
        { title: "ملاحظات علمية", body: "تلقَّ ملاحظات تضيف وجهات نظر جديدة إلى بحثك." },
        { title: "جوائز ومكافآت نقدية", body: "نافس على جوائز ومكافآت نقدية. تُعلن الفئات والتفاصيل لاحقًا." },
        { title: "مجتمع بحثي", body: "كن جزءًا من مجتمع يشاركك الفضول العلمي." },
      ],
      goodToKnow: { title: "معلومات مفيدة", points: [
        "نرحّب بالأبحاث المكتملة والجارية.",
        "يحق لكل باحث رئيسي (الباحث المسؤول عن الدراسة) تقديم ملخصين كحد أقصى في MSRC 2027، ولا تُحتسب المشاركة كمؤلف مشارك ضمن هذا الحد.",
        "اكتب ملخصك بالإنجليزية، ولا تُدرج أي معلومة قد تكشف هوية مريض.",
        "تقديم الملخص لا يعني تسجيلك في المؤتمر؛ يحجز كل حاضر مقعده بنفسه.",
      ] },
      stepsTitle: "خطوات بسيطة", steps: ["جهّز ملخصك", "قدّم عند فتح الطلبات", "المراجعة العلمية", "القرار عبر البريد الإلكتروني"],
    },
    workshops: {
      closed: "لم يُفتح حجز ورش العمل بعد", closedBody: "ستُعلن قائمة الورش ومواعيد الحجز والأسعار قبل فتح الحجوزات.",
      detailsTitle: "عن ورش العمل",
      details: [
        { title: "تعلّم بالممارسة", body: "طوّر مهاراتك العملية من خلال تعلّم مركّز وتطبيقي." },
        { title: "شهادة ورشة العمل", body: "تتطلب شهادة الورشة حجزًا مؤكدًا وتسجيل حضور الورشة وتأكيد إتمامها واستبيان الورشة." },
        { title: "حجز مستقل", body: "احجز كل ورشة على حدة بعد تأكيد تسجيلك في المؤتمر." },
        { title: "مساحة للمزيد", body: "يمكنك حضور أكثر من ورشة عندما لا تتداخل أوقاتها." },
      ],
      stepsTitle: "خطوات بسيطة", steps: ["اختر ورشة عمل", "احجزها بعد تأكيد تسجيلك في المؤتمر", "استلم رسالة تأكيد الحجز"],
    },
    hackathon: {
      closed: "لم يُفتح التقديم للهاكاثون بعد", closedBody: "ستُعلن الأهلية النهائية ومواعيد التقديم وشروط المشاركة قبل فتح الطلبات.",
      tracks: { label: "مساران", title: "اختر مسارك.", note: "اختر مسارًا واحدًا لفكرتك.", items: [
        { label: "المسار الأول", title: "Translating research into practice", body: "فكرة جديدة تحوّل البحث إلى أثر حقيقي في الرعاية الصحية." },
        { label: "المسار الثاني", title: "Advancing medical student research", body: "فكرة جديدة تساعد طلاب الطب على تطوير أبحاثهم." },
      ] },
      detailsTitle: "ابنِ على سؤال يصنع فرقًا.",
      details: [
        { title: "بمفردك أو ضمن فريق", body: "شارك بمفردك أو ضمن فريق من خمسة أعضاء كحد أقصى." },
        { title: "إرشاد من الخبراء", body: "طوّر فكرتك مع مرشدين ذوي خبرة." },
        { title: "اعرض أمام المحكّمين", body: "قدّم فكرتك واستمع إلى آراء المحكّمين." },
      ],
      schedule: { title: "يومان ومرحلتان.", items: [
        { label: "اليوم الأول", title: "الإرشاد", body: "اعمل على فكرتك مع مرشديك." },
        { label: "اليوم الثاني", title: "العرض والتحكيم", body: "اعرض فكرتك أمام المحكّمين." },
      ] },
      goodToKnow: { title: "معلومات مفيدة", points: [
        "تُشكَّل الفرق قبل التقديم، بخمسة أعضاء كحد أقصى، ويمكن أن تضم طلابًا من جامعات مختلفة. لا توجد مطابقة تلقائية بين المشاركين.",
        "يجب أن تكون فكرتك جديدة. قدّم بعنوان وعرض موجز بالإنجليزية لا يتجاوز ٣٠٠ كلمة. النموذج الأولي مرحَّب به وهو اختياري.",
        "يسبق المؤتمرَ تحضيرٌ وتهيئة إلزامية.",
        "التقديم للهاكاثون مستقل عن حجز مقعدك في المؤتمر.",
      ] },
      stepsTitle: "خطوات بسيطة", steps: ["اختر مسارك", "جهّز فكرتك وعرضك", "قدّم عند فتح الطلبات", "احضر التهيئة الإلزامية"],
    },
    threeMinuteThesis: {
      closed: "لم يُفتح التقديم لمسابقة 3MT بعد", closedBody: "ستُعلن الأهلية ومتطلبات المشاركة وفترة التقديم قبل فتح الطلبات.",
      detailsTitle: "صوت أوضح لبحثك.",
      details: [
        { title: "شارك بحثك في الدراسات العليا", body: "عرّف ببحثك في الدراسات العليا ضمن مسابقة الأطروحة في ثلاث دقائق (3MT)." },
        { title: "تواصل واضح", body: "قدّم محتواك العلمي بالإنجليزية ضمن مسار مخصص للمسابقة." },
      ],
      stepsTitle: "خطوات بسيطة", steps: ["راجع إرشادات المسابقة المعتمدة عند نشرها", "جهّز محتواك العلمي بالإنجليزية", "قدّم عبر مسار 3MT المستقل عند فتحه"],
    },
  },
};

export const participationPathDescriptions: Record<Locale, Record<ParticipationJourney, string>> = {
  en: { registration: "Learn and connect.", submissions: "Share your findings.", workshops: "Build practical skills.", hackathon: "Develop a new idea.", threeMinuteThesis: "Make research heard." },
  ar: { registration: "تعلّم وتواصل.", submissions: "شارك نتائجك.", workshops: "طوّر مهاراتك.", hackathon: "طوّر فكرة جديدة.", threeMinuteThesis: "أسمعهم بحثك." },
};

/** Benefit artwork by meaning, not position (shared by EN and AR, which list benefits in the same order). */
export const participationBenefitIcons: Record<ParticipationJourney, readonly BenefitIcon[]> = {
  registration: ["certificate", "community", "network", "cme", "research"],
  submissions: ["research", "community", "award", "network"],
  workshops: ["practice", "certificate", "priority", "community"],
  hackathon: ["network", "community", "research"],
  threeMinuteThesis: ["research", "community"],
};
