import type { Locale } from "@/lib/i18n";

export type LocalizedText = Readonly<Record<Locale, string>>;
export type ConferenceDay = "day1" | "day2";
export type PublicSession = Readonly<{
  slug: string; publication: "approved" | "draft"; day: ConferenceDay;
  /** Scientific content is English/LTR (LOC-02). Times are approved UTC instants. */
  title: string; description: string; startAt: string | null; endAt: string | null;
  category: Readonly<{ id: string; label: LocalizedText }>; topic: string;
  room: string | null; speakerSlugs: readonly string[]; objectives: readonly string[];
  recordingSlug: string | null;
}>;
export type PublicSpeaker = Readonly<{
  slug: string; publication: "approved" | "draft"; name: string; title: string;
  institution: string; biography: string; portrait: string | null;
  portraitAlt: LocalizedText; professionalLinks: readonly Readonly<{ label: string; href: string }>[];
}>;
type MediaBase = Readonly<{
  slug: string; publication: "approved" | "draft"; title: string; description: string;
  edition: 2026 | 2027; kind: "recording" | "highlight" | "photograph";
  topic: string; speakerNames: readonly string[]; durationSeconds: number | null;
  sessionSlug: string | null;
}>;
/** Restricted records never carry an asset URL in the public content contract. */
export type PublicMedia = MediaBase & (
  | Readonly<{ access: "public"; asset: string; poster: string | null; captions?: readonly Readonly<{ src: string; language: string; label: string }>[] }>
  | Readonly<{ access: "restricted" | "pending"; asset?: never; poster?: never }>
);
export type PublicWorkshop = Readonly<{
  slug: string; publication: "approved" | "draft"; title: LocalizedText; description: LocalizedText;
  instructorSlugs: readonly string[]; startAt: string | null; endAt: string | null;
  room: string | null; eligibility: LocalizedText | null; priceLabel: LocalizedText | null;
  capacity: number | null; remainingSeats: number | null; bookingDeadline: string | null;
}>;

export function published<T extends { publication: "approved" | "draft" }>(records: readonly T[]): T[] {
  return records.filter((record) => record.publication === "approved");
}

export function filterSessions(records: readonly PublicSession[], filters: {
  day: "all" | ConferenceDay; category: string; room: string; query: string;
}): PublicSession[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return published(records).filter((session) =>
    (filters.day === "all" || session.day === filters.day) &&
    (filters.category === "all" || session.category.id === filters.category) &&
    (filters.room === "all" || session.room === filters.room) &&
    (!query || `${session.title} ${session.description} ${session.topic}`.toLocaleLowerCase().includes(query)),
  ).sort((a, b) => a.day.localeCompare(b.day) || (a.startAt ?? "z").localeCompare(b.startAt ?? "z"));
}

export function filterMedia(records: readonly PublicMedia[], filters: {
  edition: "all" | "2026" | "2027"; kind: string; query: string;
}): PublicMedia[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return published(records).filter((record) =>
    (filters.edition === "all" || String(record.edition) === filters.edition) &&
    (filters.kind === "all" || record.kind === filters.kind) &&
    (!query || `${record.title} ${record.topic} ${record.speakerNames.join(" ")}`.toLocaleLowerCase().includes(query)),
  );
}

export type ExperiencePageId = "program" | "speakers" | "media" | "participate" | "registration" | "submissions" | "hackathon" | "workshops" | "threeMinuteThesis";
type PageIntroCopy = { label: string; eyebrow: string; title: string; lead: string };
type JourneyCopy = PageIntroCopy & {
  closed: string; closedBody: string; detailsTitle: string; details: readonly Readonly<{ title: string; body: string }>[];
  stepsTitle: string; steps: readonly string[]; pendingTitle: string; pendingBody: string;
};
type ExperienceCopy = {
  home: string; breadcrumb: string; dates: string; location: string; timezone: string; conferenceDays: string; essentials: string;
  day1: string; day2: string; allDays: string; allFormats: string; allRooms: string;
  category: string; room: string; searchSessions: string; searchSessionsPlaceholder: string;
  clear: string; filterNote: string; programPending: string; programPendingBody: string;
  noResults: string; noResultsBody: string; results: string; timePending: string;
  sessionDetails: string; programmeLink: string; speakersLink: string; participateLink: string;
  speakersPending: string; speakersPendingBody: string; speakerSessions: string; biography: string;
  objectives: string; format: string; time: string; duration: string; minutes: string;
  recording: string; recordingPending: string; recordingRestricted: string; mediaLink: string;
  searchMedia: string; searchMediaPlaceholder: string; edition: string; allEditions: string;
  mediaKind: string; allMedia: string; recordings: string; highlights: string; photographs: string;
  mediaPending: string; mediaPendingBody: string; selectedMediaPending: string; accessNote: string; previousTitle: string;
  previousBody: string; previousLink: string; workshopsPending: string; workshopsPendingBody: string;
  pathwayLink: string; closedLabel: string; otherPaths: string;
  pages: Record<ExperiencePageId, PageIntroCopy>; journeys: Record<"registration" | "submissions" | "hackathon" | "workshops" | "threeMinuteThesis", JourneyCopy>;
};

const englishPages: ExperienceCopy["pages"] = {
  program: { label: "Programme", eyebrow: "Ideas, in good company", title: "A meeting of\ncurious minds.", lead: "Two days of research, practical learning and fresh perspectives." },
  speakers: { label: "Speakers", eyebrow: "The people behind the ideas", title: "Perspectives\nthat move us.", lead: "Discover the people behind the scientific programme." },
  media: { label: "Media", eyebrow: "The conversation continues", title: "Moments to revisit.\nIdeas to return to.", lead: "Explore approved conference highlights and recordings as they become available." },
  participate: { label: "Participate", eyebrow: "Find your place at MSRC", title: "Bring a question.\nLeave with possibility.", lead: "Attend, present, build or learn. Choose your path and review its requirements." },
  registration: { label: "Attend MSRC", eyebrow: "Join the conversation", title: "Be part of\nwhat comes next.", lead: "Join a community of students, researchers and healthcare professionals." },
  submissions: { label: "Research submissions", eyebrow: "Share your research", title: "Your question\nbelongs here.", lead: "Bring completed research or work in progress into a conversation with the scientific community." },
  hackathon: { label: "Hackathon", eyebrow: "Research to impact", title: "Turn an idea\ninto a possibility.", lead: "Explore how research can improve healthcare and how medical student research can move forward." },
  workshops: { label: "Workshops", eyebrow: "Learn by doing", title: "New skills.\nFresh perspective.", lead: "Practical learning alongside the scientific programme." },
  threeMinuteThesis: { label: "Three Minute Thesis", eyebrow: "Postgraduate research", title: "Make your\nresearch heard.", lead: "Communicate your postgraduate research through Three Minute Thesis (3MT)." },
};
const arabicPages: ExperienceCopy["pages"] = {
  program: { label: "البرنامج", eyebrow: "أفكار تجمعنا", title: "ملتقى\nالعقول الفضولية.", lead: "يومان من البحث والتعلّم العملي ووجهات النظر الجديدة." },
  speakers: { label: "المتحدثون", eyebrow: "أصحاب الأفكار", title: "وجهات نظر\nتفتح آفاقًا.", lead: "تعرّف إلى أصحاب الأفكار وراء البرنامج العلمي." },
  media: { label: "الوسائط", eyebrow: "والحوار مستمر", title: "لحظات نعود إليها.\nوأفكار تبقى معنا.", lead: "استكشف لقطات المؤتمر وتسجيلاته المعتمدة عند إتاحتها." },
  participate: { label: "المشاركة", eyebrow: "اختر مسارك في المؤتمر", title: "ابدأ بسؤال.\nواكتشف إمكانات جديدة.", lead: "احضر، أو اعرض بحثك، أو ابتكر، أو تعلّم. اختر مسارك وراجع متطلباته." },
  registration: { label: "حضور المؤتمر", eyebrow: "انضم إلى الحوار", title: "كن جزءًا\nمن الفصل القادم.", lead: "انضم إلى مجتمع من الطلاب والباحثين والممارسين الصحيين." },
  submissions: { label: "تقديم الأبحاث", eyebrow: "شارك بحثك", title: "لسؤالك\nمكان هنا.", lead: "شارك أبحاثك المكتملة أو الجارية في حوار مع المجتمع العلمي." },
  hackathon: { label: "الهاكاثون", eyebrow: "من البحث إلى الأثر", title: "حوّل فكرتك\nإلى إمكانية.", lead: "استكشف كيف تسهم الأبحاث في تحسين الرعاية الصحية وتطوير البحث لدى طلاب الطب." },
  workshops: { label: "ورش العمل", eyebrow: "تعلّم بالممارسة", title: "مهارات جديدة.\nورؤية أوسع.", lead: "تعلّم عملي إلى جانب البرنامج العلمي." },
  threeMinuteThesis: { label: "الأطروحة في ثلاث دقائق", eyebrow: "أبحاث الدراسات العليا", title: "اجعل\nبحثك مسموعًا.", lead: "شارك بحثك في الدراسات العليا ضمن مسابقة الأطروحة في ثلاث دقائق (3MT)." },
};

export const experienceCopy: Record<Locale, ExperienceCopy> = {
  en: {
    home: "Home", breadcrumb: "Breadcrumb", dates: "27–28 January 2027", location: "Jeddah, Saudi Arabia", timezone: "Saudi local time · Asia/Riyadh (UTC+03:00)", conferenceDays: "Conference days", essentials: "The essentials",
    day1: "Day 1 · 27 January", day2: "Day 2 · 28 January", allDays: "Both days", allFormats: "All formats", allRooms: "All rooms", category: "Session format", room: "Room",
    searchSessions: "Search sessions", searchSessionsPlaceholder: "Search by title or topic", clear: "Clear filters", filterNote: "Formats and rooms will appear with the confirmed programme.",
    programPending: "Programme to be announced", programPendingBody: "Session times, rooms and speakers will appear here once confirmed.", noResults: "No matching results", noResultsBody: "Try another search or clear your filters.", results: "results", timePending: "Time to be announced",
    sessionDetails: "View session", programmeLink: "Explore the programme", speakersLink: "Meet the speakers", participateLink: "Ways to participate",
    speakersPending: "Speakers to be announced", speakersPendingBody: "Profiles and linked sessions will appear here once confirmed.", speakerSessions: "Sessions", biography: "About the speaker", objectives: "Learning objectives", format: "Format", time: "Time", duration: "Duration", minutes: "min",
    recording: "Recording", recordingPending: "Recording to be announced", recordingRestricted: "Access details to be announced", mediaLink: "Explore media",
    searchMedia: "Search media", searchMediaPlaceholder: "Search by session, speaker or topic", edition: "Edition", allEditions: "All editions", mediaKind: "Media type", allMedia: "All media", recordings: "Recordings", highlights: "Highlights", photographs: "Photographs",
    mediaPending: "More to come", mediaPendingBody: "Approved highlights and recordings will appear here. MSRC 2027 recordings are not available yet.", selectedMediaPending: "Approved media from the {edition} edition is not available in the library yet.", accessNote: "Recording availability and access details will be announced before publication.", previousTitle: "A glimpse of MSRC 2026", previousBody: "Return to the opening film for a moment from the previous edition.", previousLink: "Watch the opening film", workshopsPending: "Workshops to be announced", workshopsPendingBody: "The approved catalogue will include instructors, times, rooms, requirements and booking details.",
    pathwayLink: "Explore this path", closedLabel: "Not open yet", otherPaths: "Find another path", pages: englishPages,
    journeys: {
      registration: { ...englishPages.registration, closed: "Registration is not open yet", closedBody: "Registration dates, prices and admission details will be announced before requests open.", detailsTitle: "Before you register", details: [
        { title: "A wider community", body: "General attendance is open to students, faculty, healthcare professionals and other interested attendees, including international participants. Competition eligibility is separate." },
        { title: "Approval comes first", body: "Every registration requires organizer approval, including registrations with a full discount. Email verification and a registration request do not confirm admission." },
        { title: "Your place, confirmed", body: "Admission is confirmed after organizer approval and completed payment or a valid full discount. A ticket follows confirmation." },
      ], stepsTitle: "How registration will work", steps: ["Verify your account by email", "Request attendance", "Receive organizer approval", "Complete payment or an eligible full discount", "Receive your confirmed registration and ticket"], pendingTitle: "A little planning, a clearer visit", pendingBody: "27–28 January 2027 · Jeddah. The venue, registration window and prices are to be announced." },
      submissions: { ...englishPages.submissions, closed: "Research submissions are not open yet", closedBody: "The submission window and final instructions will be published before applications open.", detailsTitle: "Prepare your abstract", details: [
        { title: "Completed or ongoing", body: "Completed studies and work in progress are eligible. Describe your actual results or current progress." },
        { title: "300 body words", body: "Write your scientific content in English. The combined abstract body has a maximum of 300 words, excluding the title, authors, affiliations and keywords." },
        { title: "Two per principal investigator", body: "A principal investigator may have up to two finalized stage-one applications in this edition. Co-authorship alone does not count toward that limit." },
        { title: "Evidence, handled privately", body: "Prepare the applicable ethics or IRB evidence and a similarity report. Do not include patient-identifying information." },
      ], stepsTitle: "Keep your pathways clear", steps: ["Review the submission guidelines", "Prepare an English abstract and required evidence", "Submit when applications open", "Follow the scientific review process"], pendingTitle: "Research and attendance are separate", pendingBody: "An abstract application does not confirm conference attendance. Listing a co-author does not register them. A supervisor is required only after selection as a research award winner." },
      hackathon: { ...englishPages.hackathon, closed: "Hackathon applications are not open yet", closedBody: "Final eligibility, application dates and participation terms will be announced before entries open.", detailsTitle: "Two directions. Your idea.", details: [
        { title: "Translating research into practice", body: "Explore a new idea that connects research with practical healthcare impact." },
        { title: "Advancing medical student research", body: "Explore a new idea that helps medical student research move forward." },
        { title: "Solo or together", body: "Enter independently or as a preformed team of up to five. Cross-university teams are allowed; there is no automatic team matching." },
        { title: "An idea and a pitch", body: "Prepare an English title and a pitch of up to 300 words. New ideas are required. A prototype is encouraged and optional." },
      ], stepsTitle: "From preparation to presentation", steps: ["Preparation and compulsory orientation", "Day-one mentoring", "Day-two pitch and judging"], pendingTitle: "The next details are on their way", pendingBody: "Final eligibility, membership rules, application deadlines, fees, prizes and terms are to be announced. Hackathon participation and conference registration are separate." },
      workshops: { ...englishPages.workshops, closed: "Workshop booking is not open yet", closedBody: "The workshop catalogue, booking dates and prices will be announced before bookings open.", detailsTitle: "Make space for practical learning", details: [
        { title: "Browse before you book", body: "Workshop information will be open to everyone. Review the requirements, instructor, time and room before choosing a workshop." },
        { title: "A separate booking", body: "Each workshop requires manual approval and completed payment or a valid discount. Confirmed conference registration is required to confirm a workshop place." },
        { title: "Choose a workable day", body: "You may attend more than one workshop when their times do not overlap. Availability will be shown for each confirmed workshop." },
      ], stepsTitle: "How booking will work", steps: ["Browse the confirmed workshop catalogue", "Request an eligible workshop", "Receive organizer approval", "Complete payment or a valid discount", "Confirm your place with confirmed conference registration"], pendingTitle: "Know what your certificate requires", pendingBody: "Workshop certificate eligibility requires a confirmed booking, workshop check-in, authorized completion confirmation and the workshop survey. It is separate from the full conference certificate." },
      threeMinuteThesis: { ...englishPages.threeMinuteThesis, closed: "3MT applications are not open yet", closedBody: "Eligibility, entry requirements and the application window will be announced before entries open.", detailsTitle: "A distinct research pathway", details: [{ title: "Postgraduate research", body: "3MT has its own application and assessment process, separate from abstracts and the hackathon." }, { title: "Clear communication", body: "Scientific submission content is in English. Final competition instructions will be published here." }], stepsTitle: "Prepare for the next announcement", steps: ["Review the confirmed competition guidelines when published", "Apply through the separate 3MT pathway when it opens"], pendingTitle: "Details to be announced", pendingBody: "Final eligibility, deadlines, presentation rules and awards require confirmation. Conference attendance has its own registration process." },
    },
  },
  ar: {
    home: "الرئيسية", breadcrumb: "مسار التصفح", dates: "٢٧–٢٨ يناير ٢٠٢٧", location: "جدة، المملكة العربية السعودية", timezone: "بتوقيت السعودية · Asia/Riyadh (UTC+03:00)", conferenceDays: "أيام المؤتمر", essentials: "المتطلبات الأساسية",
    day1: "اليوم الأول · ٢٧ يناير", day2: "اليوم الثاني · ٢٨ يناير", allDays: "كلا اليومين", allFormats: "جميع الأنواع", allRooms: "جميع القاعات", category: "نوع الجلسة", room: "القاعة", searchSessions: "البحث في الجلسات", searchSessionsPlaceholder: "ابحث بعنوان الجلسة أو الموضوع", clear: "مسح عوامل التصفية", filterNote: "ستظهر أنواع الجلسات والقاعات مع البرنامج المعتمد.",
    programPending: "سيُعلن البرنامج لاحقًا", programPendingBody: "ستظهر أوقات الجلسات والقاعات والمتحدثون هنا بعد اعتمادها.", noResults: "لا توجد نتائج مطابقة", noResultsBody: "جرّب بحثًا آخر أو امسح عوامل التصفية.", results: "نتائج", timePending: "سيُعلن الوقت لاحقًا", sessionDetails: "تفاصيل الجلسة", programmeLink: "استكشف البرنامج", speakersLink: "تعرّف إلى المتحدثين", participateLink: "مسارات المشاركة",
    speakersPending: "سيُعلن المتحدثون لاحقًا", speakersPendingBody: "ستظهر الملفات والجلسات المرتبطة بالمتحدثين هنا بعد اعتمادها.", speakerSessions: "الجلسات", biography: "عن المتحدث", objectives: "الأهداف التعليمية", format: "النوع", time: "الوقت", duration: "المدة", minutes: "دقيقة", recording: "التسجيل", recordingPending: "سيُعلن التسجيل لاحقًا", recordingRestricted: "ستُعلن تفاصيل الإتاحة لاحقًا", mediaLink: "استكشف الوسائط",
    searchMedia: "البحث في الوسائط", searchMediaPlaceholder: "ابحث بالجلسة أو المتحدث أو الموضوع", edition: "النسخة", allEditions: "جميع النسخ", mediaKind: "نوع الوسائط", allMedia: "جميع الوسائط", recordings: "التسجيلات", highlights: "اللقطات البارزة", photographs: "الصور", mediaPending: "المزيد قريبًا", mediaPendingBody: "ستظهر هنا اللقطات والتسجيلات المعتمدة. تسجيلات مؤتمر ٢٠٢٧ غير متاحة بعد.", selectedMediaPending: "وسائط نسخة {edition} المعتمدة غير متاحة في المكتبة بعد.", accessNote: "ستُعلن إتاحة التسجيلات وشروط الوصول إليها قبل نشرها.", previousTitle: "لمحة من مؤتمر ٢٠٢٦", previousBody: "عُد إلى الفيلم الافتتاحي لمشاهدة لحظة من النسخة السابقة.", previousLink: "شاهد الفيلم الافتتاحي", workshopsPending: "ستُعلن ورش العمل لاحقًا", workshopsPendingBody: "سيتضمن الدليل المعتمد المدربين والأوقات والقاعات والمتطلبات وتفاصيل الحجز.", pathwayLink: "استكشف هذا المسار", closedLabel: "لم يُفتح بعد", otherPaths: "اكتشف مسارًا آخر", pages: arabicPages,
    journeys: {
      registration: { ...arabicPages.registration, closed: "لم يُفتح التسجيل بعد", closedBody: "ستُعلن مواعيد التسجيل والأسعار وتفاصيل القبول قبل فتح الطلبات.", detailsTitle: "قبل التسجيل", details: [
        { title: "مجتمع أوسع", body: "الحضور العام متاح للطلاب وأعضاء هيئة التدريس والممارسين الصحيين وغيرهم من المهتمين، بما فيهم المشاركون الدوليون. أهلية المسابقات مستقلة." },
        { title: "الموافقة أولًا", body: "كل طلب تسجيل يحتاج إلى موافقة المنظمين، حتى مع الخصم الكامل. التحقق من البريد الإلكتروني أو إرسال الطلب لا يؤكد القبول." },
        { title: "تأكيد مقعدك", body: "يتأكد القبول بعد موافقة المنظمين وإتمام الدفع أو اعتماد خصم كامل صالح. تُصدر التذكرة بعد تأكيد التسجيل." },
      ], stepsTitle: "كيف سيتم التسجيل", steps: ["تحقّق من حسابك عبر البريد الإلكتروني", "قدّم طلب الحضور", "احصل على موافقة المنظمين", "أتمّ الدفع أو خصمًا كاملًا مستحقًا", "استلم تأكيد التسجيل والتذكرة"], pendingTitle: "خطّط لزيارتك", pendingBody: "٢٧–٢٨ يناير ٢٠٢٧ · جدة. سيُعلن المقر وفترة التسجيل والأسعار لاحقًا." },
      submissions: { ...arabicPages.submissions, closed: "لم يُفتح تقديم الأبحاث بعد", closedBody: "ستُنشر فترة التقديم والإرشادات النهائية قبل فتح الطلبات.", detailsTitle: "جهّز ملخصك البحثي", details: [
        { title: "مكتمل أو جارٍ", body: "الأبحاث المكتملة والجارية مؤهلة. صف نتائجك الفعلية أو التقدم الحالي للعمل." },
        { title: "٣٠٠ كلمة للمحتوى", body: "اكتب المحتوى العلمي بالإنجليزية. الحد الأقصى لمجموع محتوى الملخص ٣٠٠ كلمة، دون العنوان والمؤلفين والانتماءات والكلمات المفتاحية." },
        { title: "طلبان لكل باحث رئيسي", body: "لكل باحث رئيسي طلبان نهائيان كحد أقصى في المرحلة الأولى لهذه النسخة. المشاركة كمؤلف فقط لا تُحتسب ضمن هذا الحد." },
        { title: "وثائق محفوظة بسرية", body: "جهّز الأدلة الأخلاقية أو موافقة لجنة أخلاقيات البحث عند انطباقها وتقرير التشابه. لا تُدرج معلومات تكشف هوية المرضى." },
      ], stepsTitle: "مسارات واضحة ومستقلة", steps: ["راجع إرشادات التقديم", "جهّز ملخصًا بالإنجليزية والوثائق المطلوبة", "قدّم عند فتح الطلبات", "تابع إجراءات المراجعة العلمية"], pendingTitle: "البحث والحضور مساران منفصلان", pendingBody: "طلب تقديم الملخص لا يؤكد حضور المؤتمر. إدراج مؤلف مشارك لا يسجّله للحضور. يُطلب المشرف فقط بعد اختيار الفائز بجائزة بحثية." },
      hackathon: { ...arabicPages.hackathon, closed: "لم يُفتح التقديم للهاكاثون بعد", closedBody: "ستُعلن الأهلية النهائية ومواعيد التقديم وشروط المشاركة قبل فتح الطلبات.", detailsTitle: "مساران. وفكرتك.", details: [
        { title: "Translating research into practice", body: "استكشف فكرة جديدة تربط البحث بأثر عملي في الرعاية الصحية." },
        { title: "Advancing medical student research", body: "استكشف فكرة جديدة تسهم في تطوير البحث لدى طلاب الطب." },
        { title: "بمفردك أو ضمن فريق", body: "شارك مستقلًا أو ضمن فريق مُشكّل مسبقًا من خمسة أعضاء كحد أقصى. يمكن تشكيل فرق من جامعات مختلفة؛ لا توجد مطابقة تلقائية للفرق." },
        { title: "فكرة وعرض موجز", body: "جهّز عنوانًا وعرضًا موجزًا بالإنجليزية لا يتجاوز ٣٠٠ كلمة. تُقبل الأفكار الجديدة فقط. النموذج الأولي مشجّع واختياري." },
      ], stepsTitle: "من الإعداد إلى العرض", steps: ["التحضير والتهيئة الإلزامية", "الإرشاد في اليوم الأول", "العرض والتحكيم في اليوم الثاني"], pendingTitle: "التفاصيل القادمة في الطريق", pendingBody: "ستُعلن الأهلية النهائية وقواعد العضوية ومواعيد التقديم والرسوم والجوائز والشروط لاحقًا. الهاكاثون والتسجيل لحضور المؤتمر مساران منفصلان." },
      workshops: { ...arabicPages.workshops, closed: "لم يُفتح حجز ورش العمل بعد", closedBody: "ستُعلن قائمة الورش ومواعيد الحجز والأسعار قبل فتح الحجوزات.", detailsTitle: "مساحة للتعلّم العملي", details: [
        { title: "استكشف قبل الحجز", body: "ستكون معلومات الورش متاحة للجميع. راجع المتطلبات والمدرب والوقت والقاعة قبل اختيار الورشة." },
        { title: "حجز مستقل", body: "تحتاج كل ورشة إلى موافقة يدوية وإتمام الدفع أو خصم صالح. يلزم تأكيد التسجيل في المؤتمر لتأكيد مكانك في الورشة." },
        { title: "اختر يومًا مناسبًا", body: "يمكن حضور أكثر من ورشة عندما لا تتداخل أوقاتها. ستظهر الإتاحة لكل ورشة معتمدة." },
      ], stepsTitle: "كيف سيتم الحجز", steps: ["استكشف قائمة الورش المعتمدة", "اطلب ورشة تستوفي شروطها", "احصل على موافقة المنظمين", "أتمّ الدفع أو خصمًا صالحًا", "أكّد مكانك بعد تأكيد تسجيل المؤتمر"], pendingTitle: "متطلبات شهادة ورشة العمل", pendingBody: "تتطلب أهلية الشهادة حجزًا مؤكدًا وتسجيل حضور الورشة وتأكيد إتمام معتمدًا واستبيان الورشة. وهي مستقلة عن شهادة حضور المؤتمر كاملًا." },
      threeMinuteThesis: { ...arabicPages.threeMinuteThesis, closed: "لم يُفتح التقديم لمسابقة 3MT بعد", closedBody: "ستُعلن الأهلية ومتطلبات المشاركة وفترة التقديم قبل فتح الطلبات.", detailsTitle: "مسار بحثي مستقل", details: [{ title: "أبحاث الدراسات العليا", body: "للمسابقة إجراءات تقديم وتقييم خاصة بها، منفصلة عن الملخصات والهاكاثون." }, { title: "تواصل واضح", body: "يُقدّم المحتوى العلمي بالإنجليزية. ستُنشر الإرشادات النهائية للمسابقة هنا." }], stepsTitle: "استعد للإعلان القادم", steps: ["راجع إرشادات المسابقة المعتمدة عند نشرها", "قدّم عبر مسار 3MT المستقل عند فتحه"], pendingTitle: "تفاصيل ستُعلن لاحقًا", pendingBody: "الأهلية النهائية والمواعيد وقواعد العرض والجوائز بانتظار التأكيد. حضور المؤتمر له إجراءات تسجيل مستقلة." },
    },
  },
};

export const participationPaths = [
  { id: "registration", href: "/registration", number: "01" },
  { id: "submissions", href: "/submissions", number: "02" },
  { id: "hackathon", href: "/hackathon", number: "03" },
  { id: "workshops", href: "/workshops", number: "04" },
  { id: "threeMinuteThesis", href: "/3mt", number: "05" },
] as const;
