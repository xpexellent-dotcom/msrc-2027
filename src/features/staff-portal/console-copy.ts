import type { Locale } from "@/lib/i18n";
import type { StaffRegistrationStatus } from "./ui-contract";
import type { StaffMenuKey } from "./menu";

type LandingKey = "finance" | "check-in" | "review" | "science" | "judging" | "faculty-judging" | "content" | "sponsorship";

/** ORG-055 console wording. Landing pages describe planned tools; they open no workflow. */
export const consoleCopy = {
  en: {
    overview: "Overview", overviewIntro: "Your areas and what needs attention.", open: "Open",
    cards: { pending: "Seat requests waiting", approved: "Seats approved", offered: "Offers waiting for a reply", remaining: "Seats remaining", capacityUnset: "Capacity not set", participants: "Participant accounts", staff: "Staff members", audit: "Audit events in the last 24 hours", priority: "Organizing-team members marked" },
    registration: {
      intro: "Review seat requests, approve them one at a time or together, and move requests to the waitlist when seats run out.",
      closedNote: "Registration is closed to participants. Requests appear here once it opens.",
      filter: "Show", statuses: { all: "All requests", pending_approval: "Waiting for approval", approved: "Approved", approved_awaiting_payment: "Approved, awaiting payment", waitlisted: "Waitlisted", offered: "Offered a seat", confirmed: "Confirmed", cancelled: "Cancelled", expired: "Expired" } satisfies Record<StaffRegistrationStatus | "all", string>,
      search: "Search name or email", select: "Select", selectAll: "Select all shown", selected: (count: number) => `${count} selected`,
      approve: "Approve", approveSelected: "Approve selected", waitlist: "Move to waitlist", waitlistSelected: "Waitlist selected",
      requested: "Requested", priority: "Organizing team", seats: "Seats", capacity: "Capacity", remaining: "Remaining", pending: "Waiting", approved: "Approved", waitlisted: "Waitlisted",
      capacityUnset: "Capacity is not set yet. Approvals open once the organizers confirm it.",
      decided: (approved: number, waitlisted: number, skipped: number, offered = 0) => [approved ? `${approved} approved` : "", offered ? `${offered} offered a seat` : "", waitlisted ? `${waitlisted} moved to the waitlist` : "", skipped ? `${skipped} unchanged` : ""].filter(Boolean).join(" · ") || "Nothing changed.",
      noneSelected: "Select at least one request.",
      offer: "Offer a seat", offerSelected: "Offer seats to selected", offered: "Offered", expired: "Offers expired", offerEnds: "Offer ends",
      details: "Details", detailTitle: "Request details", history: "Decision history", noHistory: "No decisions yet.", by: "By", automatic: "Automatic", submitted: "Submitted", closeDetails: "Close details",
      exportCsv: "Download CSV", exportNote: "Super Admin only. ID numbers stay masked, and every download is recorded in the audit log.",
    },
    priority: {
      intro: "Mark organizing-team members and volunteers so they can register early and choose workshop seats first. Every change needs a reason and is recorded in the audit log.",
      find: "Find a participant", findHint: "Search by name or email, then mark them.", mark: "Mark as organizing team", remove: "Remove", reason: "Reason", reasonHint: "For example: Logistics committee member.",
      current: "Currently marked", history: "Removed", markedBy: "Marked by", markedOn: "Marked", removedOn: "Removed", none: "No one is marked yet.", reasonRequired: "Add a reason before saving.",
    },
    landing: {
      status: "Not built yet", oversight: "You see this area as a Super Admin. Scoring and decisions stay with the assigned reviewers and judges, so your view will be read-only.",
      areas: {
        finance: { title: "Finance", body: "Match registration orders with the Faculty payment report and track what has been paid.", waiting: "Waits for the decision on free or paid registration and the Faculty's payment details." },
        "check-in": { title: "Check-in", body: "Scan tickets on staff phones at the doors and record attendance for both days and each workshop.", waiting: "Waits for tickets (registration slice 4) and the approved check-in plan." },
        review: { title: "Assigned reviews", body: "Score your assigned abstracts, hackathon entries or 3MT applications against the approved rubric, without seeing author identities.", waiting: "Waits for the abstract submission build and the approved rubric." },
        science: { title: "Scientific administration", body: "Assign reviewers, track progress and prepare decisions for the scientific committee.", waiting: "Waits for abstract submission, the rubric and the named scientific lead." },
        judging: { title: "Judging readiness", body: "Prepare judging categories, judges and materials for presentations, the hackathon and 3MT.", waiting: "Waits for the judging approach and rubrics from the organizers." },
        "faculty-judging": { title: "Faculty judging", body: "Score your assigned presentations on the day using the approved criteria.", waiting: "Waits for the judging approach and rubrics from the organizers." },
        content: { title: "Content and media", body: "Update public pages and approve photos and videos before they appear on the website.", waiting: "Waits for the content-editing decision (O5); content changes are made through pull requests for now." },
        sponsorship: { title: "Sponsorship and PR", body: "Handle sponsorship inquiries and keep partner information up to date.", waiting: "Waits for the sponsorship package and approved partner list." },
      } satisfies Record<LandingKey, { title: string; body: string; waiting: string }>,
    },
  },
  ar: {
    overview: "نظرة عامة", overviewIntro: "مجالات عملك وما يحتاج إلى متابعة.", open: "فتح",
    cards: { pending: "طلبات مقاعد بانتظار الموافقة", approved: "مقاعد معتمدة", offered: "عروض بانتظار الرد", remaining: "مقاعد متبقية", capacityUnset: "لم تُحدَّد السعة", participants: "حسابات المشاركين", staff: "أعضاء الفريق", audit: "أحداث التدقيق خلال ٢٤ ساعة", priority: "أعضاء فريق التنظيم المحددون" },
    registration: {
      intro: "راجع طلبات المقاعد، واعتمدها فرديًا أو مجتمعة، وانقل الطلبات إلى قائمة الانتظار عند نفاد المقاعد.",
      closedNote: "التسجيل مغلق أمام المشاركين. تظهر الطلبات هنا عند فتحه.",
      filter: "عرض", statuses: { all: "جميع الطلبات", pending_approval: "بانتظار الموافقة", approved: "معتمد", approved_awaiting_payment: "معتمد بانتظار الدفع", waitlisted: "في قائمة الانتظار", offered: "عُرض عليه مقعد", confirmed: "مؤكَّد", cancelled: "ملغى", expired: "منتهٍ" } satisfies Record<StaffRegistrationStatus | "all", string>,
      search: "البحث بالاسم أو البريد", select: "تحديد", selectAll: "تحديد كل المعروض", selected: (count: number) => `تم تحديد ${count.toLocaleString("ar-SA")}`,
      approve: "اعتماد", approveSelected: "اعتماد المحدد", waitlist: "نقل إلى قائمة الانتظار", waitlistSelected: "نقل المحدد إلى الانتظار",
      requested: "تاريخ الطلب", priority: "فريق التنظيم", seats: "المقاعد", capacity: "السعة", remaining: "المتبقي", pending: "بانتظار", approved: "معتمد", waitlisted: "في الانتظار",
      capacityUnset: "لم تُحدَّد السعة بعد. تُتاح الموافقات بعد تأكيدها من المنظمين.",
      decided: (approved: number, waitlisted: number, skipped: number, offered = 0) => [approved ? `اعتُمد ${approved.toLocaleString("ar-SA")}` : "", offered ? `عُرض مقعد على ${offered.toLocaleString("ar-SA")}` : "", waitlisted ? `نُقل ${waitlisted.toLocaleString("ar-SA")} إلى الانتظار` : "", skipped ? `لم يتغير ${skipped.toLocaleString("ar-SA")}` : ""].filter(Boolean).join(" · ") || "لم يتغير شيء.",
      noneSelected: "حدّد طلبًا واحدًا على الأقل.",
      offer: "عرض مقعد", offerSelected: "عرض مقاعد على المحدَّدين", offered: "عُرض عليهم مقعد", expired: "عروض منتهية", offerEnds: "ينتهي العرض",
      details: "التفاصيل", detailTitle: "تفاصيل الطلب", history: "سجل القرارات", noHistory: "لا توجد قرارات بعد.", by: "بواسطة", automatic: "تلقائي", submitted: "قُدِّم الطلب", closeDetails: "إغلاق التفاصيل",
      exportCsv: "تنزيل ملف CSV", exportNote: "للمشرف الأعلى فقط. تبقى أرقام الهوية مخفية جزئيًا، وتُسجَّل كل عملية تنزيل في سجل التدقيق.",
    },
    priority: {
      intro: "حدّد أعضاء فريق التنظيم والمتطوعين ليتمكنوا من التسجيل مبكرًا واختيار مقاعد ورش العمل أولًا. يتطلب كل تغيير سببًا ويُسجَّل في سجل التدقيق.",
      find: "البحث عن مشارك", findHint: "ابحث بالاسم أو البريد ثم حدّده.", mark: "تحديده عضوًا في فريق التنظيم", remove: "إزالة", reason: "السبب", reasonHint: "مثال: عضو في لجنة الخدمات اللوجستية.",
      current: "المحددون حاليًا", history: "أُزيلوا", markedBy: "حدّده", markedOn: "تاريخ التحديد", removedOn: "تاريخ الإزالة", none: "لم يُحدَّد أحد بعد.", reasonRequired: "أضف سببًا قبل الحفظ.",
    },
    landing: {
      status: "لم يُبنَ بعد", oversight: "ترى هذا المجال بصفتك مشرفًا أعلى. يبقى التقييم والقرارات للمراجعين والمحكّمين المكلّفين، لذا سيكون عرضك للاطلاع فقط.",
      areas: {
        finance: { title: "المالية", body: "مطابقة طلبات التسجيل مع تقرير المدفوعات في الكلية ومتابعة ما تم دفعه.", waiting: "بانتظار قرار مجانية التسجيل أو رسومه وتفاصيل الدفع لدى الكلية." },
        "check-in": { title: "تسجيل الحضور", body: "مسح التذاكر بهواتف الفريق عند المداخل وتسجيل الحضور لليومين ولكل ورشة.", waiting: "بانتظار التذاكر (المرحلة الرابعة من التسجيل) وخطة تسجيل الحضور المعتمدة." },
        review: { title: "المراجعات المسندة", body: "Score your assigned abstracts, hackathon entries or 3MT applications against the approved rubric, without seeing author identities.", waiting: "Waits for the abstract submission build and the approved rubric." },
        science: { title: "الإدارة العلمية", body: "إسناد المراجعين ومتابعة التقدم وإعداد القرارات للجنة العلمية.", waiting: "بانتظار تقديم الملخصات ومعايير التقييم وتسمية المسؤول العلمي." },
        judging: { title: "جاهزية التحكيم", body: "إعداد فئات التحكيم والمحكّمين والمواد للعروض والهاكاثون و3MT.", waiting: "بانتظار آلية التحكيم ومعاييره من المنظمين." },
        "faculty-judging": { title: "تحكيم أعضاء هيئة التدريس", body: "Score your assigned presentations on the day using the approved criteria.", waiting: "Waits for the judging approach and rubrics from the organizers." },
        content: { title: "المحتوى والوسائط", body: "تحديث الصفحات العامة واعتماد الصور ومقاطع الفيديو قبل ظهورها على الموقع.", waiting: "بانتظار قرار تحرير المحتوى (O5)؛ تُجرى تغييرات المحتوى حاليًا عبر طلبات الدمج." },
        sponsorship: { title: "الرعاية والعلاقات العامة", body: "متابعة استفسارات الرعاية وتحديث معلومات الشركاء.", waiting: "بانتظار باقات الرعاية وقائمة الشركاء المعتمدة." },
      } satisfies Record<LandingKey, { title: string; body: string; waiting: string }>,
    },
  },
} as const;

/** Reviewer and faculty-judge screens are English-only (AGENTS.md); their landing text stays English. */
export const englishOnlyLanding = new Set<StaffMenuKey>(["review", "faculty-judging"]);
export type { LandingKey };
export function isLandingKey(key: string): key is LandingKey {
  return ["finance", "check-in", "review", "science", "judging", "faculty-judging", "content", "sponsorship"].includes(key);
}
export function consoleCopyFor(locale: Locale) { return consoleCopy[locale]; }
