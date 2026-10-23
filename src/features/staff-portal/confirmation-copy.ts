import type { Locale } from "@/lib/i18n";

export const confirmationCopy = {
  en: {
    title: "Seat confirmation", start: "Start confirmation round", review: "Review confirmation round", cancel: "Cancel", confirm: "Start and queue emails",
    recipients: (count: number) => `Confirmation emails will be queued for ${count.toLocaleString("en-GB")} approved ${count === 1 ? "participant" : "participants"}.`,
    duration: (hours: number) => `Each participant has ${hours.toLocaleString("en-GB")} hours to respond from the opening of their confirmation window.`,
    laterApprovals: "This count covers currently approved participants. Later approvals receive a confirmation window with this same response period and nonresponse policy.",
    policy: "If someone does not respond by the deadline", release: "Release unconfirmed seats", keep: "Keep unconfirmed seats",
    policyHint: "Choose explicitly for this round. Releasing cancels the registration, revokes the ticket and passes the seat to the waitlist. Keeping leaves the seat approved.",
    delivery: "Queueing emails does not prove delivery. Confirm that the wording and delivery setup are approved before starting.",
    noRecipients: "No approved participants need a new confirmation window.", settings: "Enter the confirmation settings and conference days first.",
    opens: "Confirmation rounds can begin from", notDue: "The confirmation period has not started yet.",
    conflict: "The recipients or settings changed. Review the round again before starting.",
    done: (count: number) => `${count.toLocaleString("en-GB")} confirmation ${count === 1 ? "window" : "windows"} opened; emails queued.`,
    awaiting: "Awaiting confirmation", confirmed: "Seat confirmed", released: "Seat released", kept: "Seat kept after deadline", deadline: "Confirmation deadline",
    filters: { confirmation_awaiting: "Awaiting seat confirmation", confirmation_confirmed: "Seat confirmation received", confirmation_released: "Released during confirmation" },
  },
  ar: {
    title: "تأكيد المقاعد", start: "بدء جولة تأكيد المقاعد", review: "مراجعة جولة تأكيد المقاعد", cancel: "إلغاء", confirm: "البدء وجدولة الرسائل",
    recipients: (count: number) => `ستُجدول رسائل تأكيد المقاعد لـ ${count.toLocaleString("ar-SA")} مشاركًا معتمدًا.`,
    duration: (hours: number) => `تُتاح لكل مشارك مهلة ${hours.toLocaleString("ar-SA")} ساعة للرد من فتح مهلة تأكيد مقعده.`,
    laterApprovals: "يشمل هذا العدد المشاركين المعتمدين حاليًا. وتُتاح للمعتمدين لاحقًا مهلة تأكيد بالمدة نفسها وسياسة عدم الرد نفسها.",
    policy: "عند عدم الرد قبل الموعد النهائي", release: "تحرير المقاعد غير المؤكدة", keep: "الاحتفاظ بالمقاعد غير المؤكدة",
    policyHint: "اختر سياسة هذه الجولة صراحةً. يؤدي التحرير إلى إلغاء التسجيل والتذكرة وتمرير المقعد إلى قائمة الانتظار. ويُبقي الاحتفاظ المقعد معتمدًا.",
    delivery: "جدولة الرسائل لا تعني وصولها. تأكد من اعتماد النص وإعدادات الإرسال قبل البدء.",
    noRecipients: "لا يوجد مشاركون معتمدون يحتاجون إلى مهلة تأكيد جديدة.", settings: "أدخل إعدادات تأكيد المقاعد وأيام المؤتمر أولًا.",
    opens: "يمكن بدء جولات التأكيد اعتبارًا من", notDue: "لم تبدأ فترة تأكيد المقاعد بعد.",
    conflict: "تغيّر المستلمون أو الإعدادات. راجع الجولة مجددًا قبل البدء.",
    done: (count: number) => `فُتحت ${count.toLocaleString("ar-SA")} مهلة تأكيد وجُدولت الرسائل.`,
    awaiting: "بانتظار التأكيد", confirmed: "تم تأكيد المقعد", released: "تم تحرير المقعد", kept: "احتُفظ بالمقعد بعد الموعد", deadline: "الموعد النهائي للتأكيد",
    filters: { confirmation_awaiting: "بانتظار تأكيد المقعد", confirmation_confirmed: "ورد تأكيد المقعد", confirmation_released: "حُرر خلال التأكيد" },
  },
} satisfies Record<Locale, unknown>;
