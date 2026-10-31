export const submissionWindowCopy = {
  en: {
    title: "Submission window", opens: "Opens at (Asia/Riyadh)", closes: "Closes at (Asia/Riyadh)", enabled: "Accept submissions", save: "Save submission window", saved: "Submission window saved.",
    suggestion: "Use published dates: 23 Nov – 13 Dec 2026", hint: "Enter Asia/Riyadh time (UTC+03:00). Values are stored explicitly in UTC. The opening instant is included; the closing instant is excluded. Suggested times are 00:00 open and 23:59 close. Filling does not save or open submissions.",
    admin: "Only a Super Admin may change the window or switch.", readiness: "Readiness checklist (saved settings)", ready: "Ready", blocked: "Not ready", effective: "Submissions are effectively open.", closed: "Submissions remain closed until every gate is ready.", utc: "Saved UTC", observed: "Last checked", missing: "Window settings are not available. The database migration may not be installed.",
    gates: {
      enabled: ["Accept submissions", "Saved switch is on.", "Saved switch is off."], dates: ["Window dates", "Both dates are saved in order.", "Save both dates with closing after opening."],
      time: ["Current time", "Now is within the saved window.", "The saved window has not started, has ended, or has no dates."],
      similarity: ["Screening similarity threshold", "A threshold is saved. Organizers run the similarity check (ORG-070).", "A Super Admin must save the screening similarity threshold before opening; there is no default (ORG-070)."],
      accounts: ["Participant accounts", "Database account policy is enabled.", "Database participant-account policy is disabled."], privacy: ["Participant privacy notice", "Database privacy version is configured.", "Participant privacy notice configuration is missing."],
      email: ["Participant email", "Database email allowance is configured.", "Participant email allowance is missing or does not match server configuration."], retention: ["Age and retention", "Database retention enforcement is enabled.", "Participant retention enforcement is disabled."],
      deployment: ["Server release gates", "Abstract and participant flags, authentication delivery, privacy and server configuration are ready for this edition.", "Abstract or participant server flags/configuration, authentication email or privacy release gates are closed. Saving this window does not change them."],
    },
  },
  ar: {
    title: "فترة تقديم الملخصات", opens: "موعد الفتح (آسيا/الرياض)", closes: "موعد الإغلاق (آسيا/الرياض)", enabled: "قبول الملخصات", save: "حفظ فترة التقديم", saved: "تم حفظ فترة التقديم.",
    suggestion: "استخدام التواريخ المنشورة: ٢٣ نوفمبر – ١٣ ديسمبر ٢٠٢٦", hint: "أدخل الوقت بتوقيت آسيا/الرياض (UTC+03:00). تُخزَّن القيم صراحةً بتوقيت UTC. تشمل الفترة لحظة الفتح وتستثني لحظة الإغلاق. الوقت المقترح للفتح ٠٠:٠٠ وللإغلاق ٢٣:٥٩. تعبئة الحقول لا تحفظها ولا تفتح التقديم.",
    admin: "يمكن للمشرف العام فقط تغيير الفترة أو مفتاح القبول.", readiness: "قائمة الجاهزية (الإعدادات المحفوظة)", ready: "جاهز", blocked: "غير جاهز", effective: "التقديم مفتوح فعليًا.", closed: "يبقى التقديم مغلقًا حتى تصبح جميع المتطلبات جاهزة.", utc: "القيم المحفوظة بتوقيت UTC", observed: "آخر تحقق", missing: "إعدادات الفترة غير متاحة. قد لا يكون ترحيل قاعدة البيانات مثبتًا.",
    gates: {
      enabled: ["قبول الملخصات", "مفتاح القبول المحفوظ مفعّل.", "مفتاح القبول المحفوظ متوقف."], dates: ["تواريخ الفترة", "تم حفظ التاريخين بالترتيب الصحيح.", "احفظ التاريخين بحيث يكون الإغلاق بعد الفتح."],
      time: ["الوقت الحالي", "الوقت الحالي ضمن الفترة المحفوظة.", "الفترة لم تبدأ أو انتهت أو لم تُحفظ تواريخها."],
      similarity: ["حد التشابه للفحص", "تم حفظ حد التشابه. يتولى المنظمون فحص التشابه (ORG-070).", "يجب أن يحفظ المشرف العام حد التشابه قبل فتح التقديم؛ لا توجد قيمة افتراضية (ORG-070)."],
      accounts: ["حسابات المشاركين", "سياسة الحسابات في قاعدة البيانات مفعّلة.", "سياسة حسابات المشاركين في قاعدة البيانات متوقفة."], privacy: ["إشعار خصوصية المشارك", "إصدار الخصوصية مضبوط في قاعدة البيانات.", "إعداد إشعار خصوصية المشارك مفقود."],
      email: ["بريد المشارك", "حد إرسال البريد مضبوط في قاعدة البيانات.", "حد إرسال بريد المشارك مفقود أو لا يطابق إعداد الخادم."], retention: ["العمر والاحتفاظ", "ضوابط الاحتفاظ مفعّلة في قاعدة البيانات.", "ضوابط الاحتفاظ ببيانات المشاركين متوقفة."],
      deployment: ["متطلبات الإتاحة على الخادم", "مفاتيح الملخصات والمشاركين وإعدادات البريد والخصوصية والخادم جاهزة لهذه الدورة.", "مفاتيح الملخصات أو المشاركين أو إعدادات الخادم أو بريد المصادقة أو متطلبات الخصوصية مغلقة. حفظ الفترة لا يغيّرها."],
    },
  },
};
