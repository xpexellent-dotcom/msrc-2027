import type { OfflineOutcome } from "./check-in-fallback-contract";

type FallbackCopy = {
  title: string; intro: string; rosterTitle: string; rosterHint: string; download: string; downloading: string; downloaded: string;
  importTitle: string; importHint: string; file: string; sheet: string; sheetHint: string; check: string; ready: (rows: number) => string;
  reconcile: string; reconciling: string; replayed: string; resultsTitle: string; row: string; reference: string; outcome: string;
  chooseDay: string; empty: string; tooMany: string; malformed: (line: number) => string;
  states: Record<"denied" | "wrong-day" | "conflict" | "invalid" | "limited" | "unavailable" | "area-not-ready", string>;
  outcomes: Record<OfflineOutcome, string>; review: string;
};

export const checkInFallbackCopy: Record<"en" | "ar", FallbackCopy> = {
  en: {
    title: "Outage fallback", intro: "Super Admin only. Use this when the internet or the portal fails at the door. Online scanning remains the normal method.",
    rosterTitle: "Roster for the selected day", rosterHint: "Download before doors open. It lists reference codes and names only. Keep it on one approved device and delete it after reconciliation.",
    download: "Download roster (CSV)", downloading: "Preparing roster…", downloaded: "Roster downloaded. The export was recorded in the audit log.",
    importTitle: "Reconcile offline records", importHint: "One row per person: reference code, Riyadh time (HH:MM) and the staff name or initials. A header row is optional. Up to 2,000 rows.",
    file: "Open a CSV file", sheet: "Offline records", sheetHint: "Paste rows, for example: A1B2C3D4E5F6, 09:15, AK",
    check: "Check rows", ready: (rows) => `${rows.toLocaleString("en-GB")} rows ready to reconcile.`,
    reconcile: "Reconcile records", reconciling: "Reconciling…", replayed: "These rows were already reconciled. The saved results are shown.",
    resultsTitle: "Reconciliation results", row: "Row", reference: "Reference", outcome: "Outcome",
    chooseDay: "Choose a conference day first.", empty: "Add at least one row.", tooMany: "Too many rows. Split the sheet into batches of 2,000 or fewer.",
    malformed: (line) => `Line ${line} could not be read. Check the reference, time and staff columns.`,
    states: { denied: "This needs a Super Admin session verified with your authenticator.", "wrong-day": "Choose a configured conference day that has started.", conflict: "This batch ID was already used for different rows. Check the rows again and retry.",
      invalid: "The request was not accepted. Check the rows and try again.", limited: "Too many requests. Wait a moment and retry.", unavailable: "The service is unavailable. Try again shortly.", "area-not-ready": "The outage fallback is not ready yet." },
    outcomes: { checked_in: "Recorded offline", already_checked_in: "Already checked in online — unchanged", previously_undone: "Check-in was undone online — review", revoked: "Ticket revoked — review",
      not_found: "Reference not found — review", not_approved: "Not admissible — review", invalid: "Row not valid — review", unavailable: "Busy — retry this row" },
    review: "Rows marked for review were not recorded. Resolve them with the registration team.",
  },
  ar: {
    title: "بديل انقطاع الخدمة", intro: "للمشرف العام فقط. استخدمه عند انقطاع الإنترنت أو تعطل البوابة عند المدخل. يبقى المسح المتصل هو الطريقة المعتادة.",
    rosterTitle: "قائمة اليوم المحدد", rosterHint: "نزّلها قبل فتح الأبواب. تتضمن رموز المرجع والأسماء فقط. احفظها على جهاز معتمد واحد واحذفها بعد المطابقة.",
    download: "تنزيل القائمة (CSV)", downloading: "جارٍ تجهيز القائمة…", downloaded: "تم تنزيل القائمة وتسجيل التصدير في سجل التدقيق.",
    importTitle: "مطابقة السجلات دون اتصال", importHint: "صف لكل شخص: رمز المرجع، ووقت الرياض (HH:MM)، واسم الموظف أو أحرفه الأولى. صف العناوين اختياري. حتى ٢٬٠٠٠ صف.",
    file: "فتح ملف CSV", sheet: "السجلات دون اتصال", sheetHint: "الصق الصفوف، مثل: A1B2C3D4E5F6, 09:15, AK",
    check: "فحص الصفوف", ready: (rows) => `${rows.toLocaleString("ar-SA")} صفًا جاهزًا للمطابقة.`,
    reconcile: "مطابقة السجلات", reconciling: "جارٍ المطابقة…", replayed: "سبقت مطابقة هذه الصفوف. تظهر النتائج المحفوظة.",
    resultsTitle: "نتائج المطابقة", row: "الصف", reference: "المرجع", outcome: "النتيجة",
    chooseDay: "اختر يوم المؤتمر أولًا.", empty: "أضف صفًا واحدًا على الأقل.", tooMany: "عدد الصفوف كبير. قسّم الملف إلى دفعات لا تتجاوز ٢٬٠٠٠ صف.",
    malformed: (line) => `تعذرت قراءة السطر ${line.toLocaleString("ar-SA")}. تحقق من أعمدة المرجع والوقت والموظف.`,
    states: { denied: "يتطلب ذلك جلسة مشرف عام موثقة بتطبيق المصادقة.", "wrong-day": "اختر يوم مؤتمر محددًا وقد بدأ.", conflict: "استُخدم معرّف هذه الدفعة لصفوف مختلفة. افحص الصفوف وأعد المحاولة.",
      invalid: "لم يُقبل الطلب. تحقق من الصفوف وأعد المحاولة.", limited: "طلبات كثيرة. انتظر قليلًا ثم أعد المحاولة.", unavailable: "الخدمة غير متاحة. أعد المحاولة بعد قليل.", "area-not-ready": "بديل انقطاع الخدمة غير جاهز بعد." },
    outcomes: { checked_in: "سُجل دون اتصال", already_checked_in: "مسجل حضوره عبر الاتصال — دون تغيير", previously_undone: "أُلغي تسجيل الحضور سابقًا — للمراجعة", revoked: "تذكرة ملغاة — للمراجعة",
      not_found: "المرجع غير موجود — للمراجعة", not_approved: "غير مؤهل للدخول — للمراجعة", invalid: "صف غير صالح — للمراجعة", unavailable: "مشغول — أعد محاولة هذا الصف" },
    review: "لم تُسجل الصفوف المحددة للمراجعة. عالجها مع فريق التسجيل.",
  },
};
