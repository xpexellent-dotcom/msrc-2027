import { participationJourneyCopy, type JourneyCopy } from "@/content/participation-copy";
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
export type MediaEdition = 2023 | 2024 | 2025 | 2026 | 2027;
export type MediaEditionFilter = "all" | `${MediaEdition}`;
type MediaBase = Readonly<{
  slug: string; publication: "approved" | "draft"; title: string; description: string;
  edition: MediaEdition; kind: "recording" | "highlight" | "photograph";
  /** Archive captions are bilingual; scientific recording titles remain English. */
  titleAr?: string; descriptionAr?: string;
  /** Source dimensions and reviewed focal position for consistent archive frames. */
  width?: number; height?: number;
  objectPosition?: string;
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
  edition: MediaEditionFilter; kind: string; query: string;
}): PublicMedia[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return published(records).filter((record) =>
    (filters.edition === "all" || String(record.edition) === filters.edition) &&
    (filters.kind === "all" || record.kind === filters.kind) &&
    (!query || `${record.title} ${record.titleAr ?? ""} ${record.description} ${record.descriptionAr ?? ""} ${record.topic} ${record.speakerNames.join(" ")}`.toLocaleLowerCase().includes(query)),
  ).sort((a, b) => b.edition - a.edition);
}

export type ExperiencePageId = "program" | "speakers" | "media" | "participate" | "registration" | "submissions" | "hackathon" | "workshops" | "threeMinuteThesis";
type PageIntroCopy = { label: string; eyebrow: string; title: string; lead: string };

type ExperienceCopy = {
  home: string; breadcrumb: string; dates: string; location: string; timezone: string; conferenceDays: string; essentials: string;
  day1: string; day2: string; day1Short: string; day2Short: string; allDays: string; allFormats: string; allRooms: string;
  category: string; room: string; searchSessions: string; searchSessionsPlaceholder: string;
  clear: string; filterNote: string; programPending: string; programPendingBody: string;
  noResults: string; noResultsBody: string; timePending: string;
  sessionDetails: string; programmeLink: string; speakersLink: string; participateLink: string;
  speakersPending: string; speakersPendingBody: string; speakerSessions: string; biography: string;
  objectives: string; format: string; time: string; duration: string;
  recording: string; recordingPending: string; recordingRestricted: string; mediaLink: string;
  searchMedia: string; searchMediaPlaceholder: string; edition: string; allEditions: string;
  mediaKind: string; allMedia: string; recordings: string; highlights: string; photographs: string;
  mediaPending: string; mediaPendingBody: string; selectedMediaPending: string; accessNote: string; previousTitle: string;
  previousBody: string; previousLink: string; workshopsPending: string; workshopsPendingBody: string;
  pathwayLink: string; closedLabel: string; otherPaths: string;
  pages: Record<ExperiencePageId, PageIntroCopy>; journeys: Record<"registration" | "submissions" | "hackathon" | "workshops" | "threeMinuteThesis", JourneyCopy>;
};

const englishPages: ExperienceCopy["pages"] = {
  program: { label: "Program", eyebrow: "Ideas, in good company", title: "A meeting of\ncurious minds.", lead: "Two days of research, practical learning and fresh perspectives." },
  speakers: { label: "Speakers", eyebrow: "The people behind the ideas", title: "Perspectives\nthat move us.", lead: "Discover the people behind the scientific program." },
  media: { label: "Media", eyebrow: "The conversation continues", title: "Moments to revisit.\nIdeas to return to.", lead: "Explore approved conference highlights and recordings as they become available." },
  participate: { label: "Participate", eyebrow: "Find your place at MSRC", title: "Bring a question.\nLeave with possibility.", lead: "Attend, present, build or learn. Find the experience for you." },
  registration: { label: "Attend MSRC", eyebrow: "Join the conversation", title: "Be part of\nwhat comes next.", lead: "Join a community of students, researchers and healthcare professionals." },
  submissions: { label: "Abstract submission", eyebrow: "Share your research", title: "Abstract\nsubmission.", lead: "Bring completed research or work in progress into a conversation with the scientific community." },
  hackathon: { label: "Hackathon", eyebrow: "Research to impact", title: "Turn an idea\ninto a possibility.", lead: "Explore how research can improve healthcare and how medical student research can move forward." },
  workshops: { label: "Workshops", eyebrow: "Learn by doing", title: "New skills.\nFresh perspective.", lead: "Practical learning alongside the scientific program." },
  threeMinuteThesis: { label: "Three Minute Thesis", eyebrow: "Postgraduate research", title: "Make your\nresearch heard.", lead: "Communicate your postgraduate research through Three Minute Thesis (3MT)." },
};
const arabicPages: ExperienceCopy["pages"] = {
  program: { label: "البرنامج", eyebrow: "أفكار تجمعنا", title: "ملتقى\nالعقول الفضولية.", lead: "يومان من البحث والتعلّم العملي ووجهات النظر الجديدة." },
  speakers: { label: "المتحدثون", eyebrow: "أصحاب الأفكار", title: "وجهات نظر\nتفتح آفاقًا.", lead: "تعرّف إلى أصحاب الأفكار وراء البرنامج العلمي." },
  media: { label: "الوسائط", eyebrow: "الحوار مستمر", title: "لحظات نعود إليها.\nوأفكار تبقى معنا.", lead: "استكشف لقطات المؤتمر وتسجيلاته المعتمدة عند إتاحتها." },
  participate: { label: "المشاركة", eyebrow: "اختر مسارك في المؤتمر", title: "ابدأ بسؤال.\nواكتشف إمكانات جديدة.", lead: "احضر، أو اعرض بحثك، أو ابتكر، أو تعلّم. اكتشف التجربة التي تناسبك." },
  registration: { label: "حضور المؤتمر", eyebrow: "انضم إلى الحوار", title: "كن جزءًا\nمن الفصل القادم.", lead: "انضم إلى مجتمع من الطلاب والباحثين والممارسين الصحيين." },
  submissions: { label: "تقديم الملخصات", eyebrow: "شارك بحثك", title: "قدّم\nملخصك البحثي.", lead: "شارك أبحاثك المكتملة أو الجارية في حوار مع المجتمع العلمي." },
  hackathon: { label: "الهاكاثون", eyebrow: "من البحث إلى الأثر", title: "حوّل فكرتك\nإلى إمكانية.", lead: "استكشف كيف تسهم الأبحاث في تحسين الرعاية الصحية وتطوير البحث لدى طلاب الطب." },
  workshops: { label: "ورش العمل", eyebrow: "تعلّم بالممارسة", title: "مهارات جديدة.\nورؤية أوسع.", lead: "تعلّم عملي إلى جانب البرنامج العلمي." },
  threeMinuteThesis: { label: "الأطروحة في ثلاث دقائق", eyebrow: "أبحاث الدراسات العليا", title: "اجعل\nبحثك مسموعًا.", lead: "شارك بحثك في الدراسات العليا ضمن مسابقة الأطروحة في ثلاث دقائق (3MT)." },
};

export const experienceCopy: Record<Locale, ExperienceCopy> = {
  en: {
    home: "Home", breadcrumb: "Breadcrumb", dates: "27–28 January 2027", location: "King Faisal Conference Center · King Abdulaziz University, Jeddah", timezone: "Saudi local time · Asia/Riyadh (UTC+03:00)", conferenceDays: "Conference days", essentials: "The essentials",
    day1: "Day 1 · 27 January", day2: "Day 2 · 28 January", day1Short: "Day 1", day2Short: "Day 2", allDays: "Both days", allFormats: "All formats", allRooms: "All rooms", category: "Session format", room: "Room",
    searchSessions: "Search sessions", searchSessionsPlaceholder: "Search by title or topic", clear: "Clear filters", filterNote: "Formats and rooms will appear with the confirmed program.",
    programPending: "Program to be announced", programPendingBody: "Session times, rooms and speakers will appear here once confirmed.", noResults: "No matching results", noResultsBody: "Try another search or clear your filters.", timePending: "Time to be announced",
    sessionDetails: "View session", programmeLink: "Explore the program", speakersLink: "Meet the speakers", participateLink: "Ways to participate",
    speakersPending: "Speakers to be announced", speakersPendingBody: "Profiles and linked sessions will appear here once confirmed.", speakerSessions: "Sessions", biography: "About the speaker", objectives: "Learning objectives", format: "Format", time: "Time", duration: "Duration",
    recording: "Recording", recordingPending: "Recording to be announced", recordingRestricted: "Access details to be announced", mediaLink: "Explore media",
    searchMedia: "Search media", searchMediaPlaceholder: "Search by session, speaker or topic", edition: "Edition", allEditions: "All editions", mediaKind: "Media type", allMedia: "All media", recordings: "Recordings", highlights: "Highlights", photographs: "Photographs",
    mediaPending: "More to come", mediaPendingBody: "Approved highlights and recordings will appear here. MSRC 2027 recordings are not available yet.", selectedMediaPending: "Approved media from the {edition} edition is not available in the library yet.", accessNote: "Recording availability and access details will be announced before publication.", previousTitle: "A glimpse of MSRC 2026", previousBody: "Return to the opening film for a moment from the previous edition.", previousLink: "Watch the opening film", workshopsPending: "Workshops to be announced", workshopsPendingBody: "The catalogue will include instructors, times, rooms, requirements and booking details.",
    pathwayLink: "Explore this path", closedLabel: "Not open yet", otherPaths: "Find another path", pages: englishPages,
    journeys: participationJourneyCopy.en,
  },
  ar: {
    home: "الرئيسية", breadcrumb: "مسار التنقل", dates: "٢٧–٢٨ يناير ٢٠٢٧", location: "مركز الملك فيصل للمؤتمرات · جامعة الملك عبدالعزيز، جدة", timezone: "بتوقيت السعودية · Asia/Riyadh (UTC+03:00)", conferenceDays: "أيام المؤتمر", essentials: "المتطلبات الأساسية",
    day1: "اليوم الأول · ٢٧ يناير", day2: "اليوم الثاني · ٢٨ يناير", day1Short: "اليوم الأول", day2Short: "اليوم الثاني", allDays: "كلا اليومين", allFormats: "جميع الأنواع", allRooms: "جميع القاعات", category: "نوع الجلسة", room: "القاعة", searchSessions: "البحث في الجلسات", searchSessionsPlaceholder: "ابحث بعنوان الجلسة أو الموضوع", clear: "مسح عوامل التصفية", filterNote: "ستظهر أنواع الجلسات والقاعات مع البرنامج المعتمد.",
    programPending: "سيُعلن البرنامج لاحقًا", programPendingBody: "ستظهر أوقات الجلسات والقاعات والمتحدثون هنا بعد اعتمادها.", noResults: "لا توجد نتائج مطابقة", noResultsBody: "جرّب بحثًا آخر أو امسح عوامل التصفية.", timePending: "سيُعلن الوقت لاحقًا", sessionDetails: "تفاصيل الجلسة", programmeLink: "استكشف البرنامج", speakersLink: "تعرّف إلى المتحدثين", participateLink: "مسارات المشاركة",
    speakersPending: "سيُعلن المتحدثون لاحقًا", speakersPendingBody: "ستظهر الملفات والجلسات المرتبطة بالمتحدثين هنا بعد اعتمادها.", speakerSessions: "الجلسات", biography: "عن المتحدث", objectives: "الأهداف التعليمية", format: "النوع", time: "الوقت", duration: "المدة", recording: "التسجيل", recordingPending: "سيُعلن التسجيل لاحقًا", recordingRestricted: "ستُعلن تفاصيل الإتاحة لاحقًا", mediaLink: "استكشف الوسائط",
    searchMedia: "البحث في الوسائط", searchMediaPlaceholder: "ابحث بالجلسة أو المتحدث أو الموضوع", edition: "النسخة", allEditions: "جميع النسخ", mediaKind: "نوع الوسائط", allMedia: "جميع الوسائط", recordings: "التسجيلات", highlights: "اللقطات البارزة", photographs: "الصور", mediaPending: "المزيد قريبًا", mediaPendingBody: "ستظهر هنا اللقطات والتسجيلات المعتمدة. تسجيلات مؤتمر ٢٠٢٧ غير متاحة بعد.", selectedMediaPending: "وسائط نسخة {edition} المعتمدة غير متاحة في المكتبة بعد.", accessNote: "ستُعلن إتاحة التسجيلات وشروط الوصول إليها قبل نشرها.", previousTitle: "لمحة من مؤتمر ٢٠٢٦", previousBody: "عُد إلى الفيلم الافتتاحي لمشاهدة لحظة من النسخة السابقة.", previousLink: "شاهد الفيلم الافتتاحي", workshopsPending: "ستُعلن ورش العمل لاحقًا", workshopsPendingBody: "سيتضمن دليل الورش المدربين والأوقات والقاعات والمتطلبات وتفاصيل الحجز.", pathwayLink: "استكشف هذا المسار", closedLabel: "لم يُفتح بعد", otherPaths: "اكتشف مسارًا آخر", pages: arabicPages,
    journeys: participationJourneyCopy.ar,
  },
};

/** Replace any null icon with an approved local SVG/image path; no component edit needed. */
export const participationPaths: readonly { id: keyof typeof participationJourneyCopy.en; href: string; icon: string | null; glyph: number }[] = [
  { id: "registration", href: "/registration", icon: null, glyph: 0 },
  { id: "submissions", href: "/submissions", icon: null, glyph: 1 },
  { id: "workshops", href: "/workshops", icon: null, glyph: 5 },
  { id: "hackathon", href: "/hackathon", icon: null, glyph: 6 },
  { id: "threeMinuteThesis", href: "/3mt", icon: null, glyph: 7 },
];
