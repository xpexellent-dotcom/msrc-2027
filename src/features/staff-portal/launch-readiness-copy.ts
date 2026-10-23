import type { Locale } from "@/lib/i18n";
import type { StaffLaunchCheckKey } from "./ui-contract";

export const launchReadinessCopy = {
  en: {
    intro: "A read-only snapshot for the opening checklist. Green checks do not replace the owner's release approval, inbox test, ticket test or scanner rehearsal.",
    guide: "Open the activation guide", loading: "Loading launch readiness…", checklist: "Database and staffing checks", environment: "Server environment",
    environmentNote: "Only presence and validation results are shown. Values remain on the server. A valid optional setting may use its documented default.",
    status: { green: "Ready", amber: "Review", red: "Not ready" }, present: "Present", missing: "Absent", valid: "Format valid", invalid: "Missing or invalid format", enabled: "Enabled", disabled: "Off",
    checks: {
      migrations: "Required database functions", confirmationSettings: "Seat confirmation settings set", settings: "Registration settings complete", participantAccounts: "Participant accounts enabled", participantPolicy: "Participant privacy policy and email budget",
      retention: "Retention enabled", outboxDelivery: "Outbox delivery enabled", outboxSweeps: "Outbox sweeps enabled", outboxCap: "Outbox daily cap above zero", conferenceDays: "Both conference days set",
      approvers: "At least two registration approvers recommended", checkInStaff: "At least one check-in staff member", earlyAccess: "Early-access list populated", secondSuperAdmin: "Two active Super Admins with verified authenticators", health: "Database health probe", latestDrain: "Latest outbox drain run",
    } satisfies Record<StaffLaunchCheckKey, string>,
    latestDrain: "No drain heartbeat is stored. Check the latest successful invocation in Vercel Cron logs and the private outbox monitor before opening.",
    functionNote: "Checks confirm the required RPC signatures are installed. The migration ledger and CI receipt still need owner review.",
    confirmationLead: "Days before day one", confirmationHours: "Response window (hours)",
    summary: "Entered registration settings · Riyadh time", capacity: "General capacity", earlyStart: "Early access begins", earlyEnd: "Early access ends", generalOpening: "General registration begins", closing: "Registration closes", conferenceDays: "Conference days", unset: "Not entered",
    counts: "Private aggregate counts", staff: "Active edition staff by role", earlyAccess: "Early-access entries", outboxCap: "Database outbox daily cap", participantCap: "Database participant email daily limit", superAdmins: "Super Admins with a verified authenticator",
    registrationSwitch: "Registration switch", closed: "Closed", open: "Open", switchNote: "This is the database registration switch. The environment, account policy and entered opening windows must also permit access. This page cannot change any setting.",
    rpcs: { confirmation: "Seat confirmation", participantAccounts: "Participant accounts", registration: "Registration", registrationSettings: "Registration settings", earlyAccess: "Early access", tickets: "Tickets", checkIn: "Check-in", outbox: "Outbox", health: "Health" },
  },
  ar: {
    intro: "عرض للاطلاع فقط ضمن قائمة التحقق قبل الافتتاح. لا تُغني المؤشرات الخضراء عن اعتماد المالك للإطلاق واختبار البريد والتذكرة وتجربة ماسح الحضور.",
    guide: "فتح دليل التفعيل", loading: "جارٍ تحميل جاهزية الإطلاق…", checklist: "فحوص قاعدة البيانات والفريق", environment: "إعدادات بيئة الخادم",
    environmentNote: "يُعرض وجود الإعداد وصحة صيغته فقط. تبقى القيم على الخادم. قد يستخدم الإعداد الاختياري الصحيح قيمته الافتراضية الموثقة.",
    status: { green: "جاهز", amber: "للمراجعة", red: "غير جاهز" }, present: "موجود", missing: "غير موجود", valid: "الصيغة صحيحة", invalid: "مفقود أو صيغته غير صحيحة", enabled: "مفعّل", disabled: "متوقف",
    checks: {
      confirmationSettings: "إدخال إعدادات تأكيد المقاعد",
      migrations: "دوال قاعدة البيانات المطلوبة", settings: "اكتمال إعدادات التسجيل", participantAccounts: "تفعيل حسابات المشاركين", participantPolicy: "سياسة خصوصية المشاركين وحد البريد",
      retention: "تفعيل سياسة الاحتفاظ", outboxDelivery: "تفعيل إرسال البريد المجدول", outboxSweeps: "تفعيل معالجة مهام البريد المتوقفة", outboxCap: "حد الإرسال اليومي أكبر من صفر", conferenceDays: "تحديد يومَي المؤتمر",
      approvers: "يوصى بوجود مسؤولَي اعتماد تسجيل على الأقل", checkInStaff: "وجود موظف واحد على الأقل لتسجيل الحضور", earlyAccess: "وجود عناوين في قائمة الوصول المبكر", secondSuperAdmin: "مشرفان أعليان نشطان مع تطبيقَي مصادقة موثّقين", health: "فحص سلامة قاعدة البيانات", latestDrain: "آخر تشغيل لإرسال البريد المجدول",
    } satisfies Record<StaffLaunchCheckKey, string>,
    latestDrain: "لا يُحفظ سجل لآخر تشغيل للإرسال. راجع آخر استدعاء ناجح في سجلات Vercel Cron ومراقب البريد الخاص قبل الافتتاح.",
    functionNote: "تتحقق الفحوص من تثبيت دوال RPC المطلوبة بتوقيعاتها. ما زال سجل الترحيلات ونتائج CI يحتاجان إلى مراجعة المالك.",
    confirmationLead: "الأيام قبل اليوم الأول", confirmationHours: "مهلة الرد بالساعات",
    summary: "إعدادات التسجيل المدخلة · بتوقيت الرياض", capacity: "السعة العامة", earlyStart: "بداية الوصول المبكر", earlyEnd: "نهاية الوصول المبكر", generalOpening: "بداية التسجيل العام", closing: "إغلاق التسجيل", conferenceDays: "أيام المؤتمر", unset: "لم يُدخل بعد",
    counts: "أعداد إجمالية خاصة", staff: "أعضاء فريق هذه النسخة النشطون حسب الدور", earlyAccess: "عناوين الوصول المبكر", outboxCap: "الحد اليومي للبريد المجدول في قاعدة البيانات", participantCap: "الحد اليومي لبريد المشاركين في قاعدة البيانات", superAdmins: "المشرفون الأعلى مع تطبيق مصادقة موثّق",
    registrationSwitch: "حالة فتح التسجيل", closed: "مغلق", open: "مفتوح", switchNote: "هذه حالة فتح التسجيل في قاعدة البيانات. يجب أن تسمح إعدادات البيئة وسياسة الحسابات وفترات الافتتاح المدخلة بالوصول أيضًا. لا تغيّر هذه الصفحة أي إعداد.",
    rpcs: { confirmation: "تأكيد المقاعد", participantAccounts: "حسابات المشاركين", registration: "التسجيل", registrationSettings: "إعدادات التسجيل", earlyAccess: "الوصول المبكر", tickets: "التذاكر", checkIn: "تسجيل الحضور", outbox: "البريد المجدول", health: "سلامة الخدمة" },
  },
} satisfies Record<Locale, unknown>;
