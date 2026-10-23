export const emailPreviewsCopy = {
  en: {
    synthetic: "SYNTHETIC examples", approved: "ORG-057 approved this wording. Delivery is off.",
    draft: "DRAFT — awaiting owner approval. Delivery is off.",
    intro: "These previews use fixed sample data and the same templates as the email outbox. All transactional emails are in English.",
    sample: "The recipient and deadlines are synthetic examples. Each template shows its wording approval status.",
    recipient: "Sample recipient", subject: "Subject", text: "Plain text", html: "HTML source (escaped)",
    copy: "Copy text", copied: "Text copied.", copyFailed: "Copy was unavailable. Select the plain text and copy it manually.",
    version: "Template version", loading: "Loading email previews…",
  },
  ar: {
    synthetic: "أمثلة تجريبية (SYNTHETIC)", approved: "اعتمد ORG-057 هذه الصياغة. الإرسال متوقف.",
    draft: "مسودة — بانتظار اعتماد المالك. الإرسال متوقف.",
    intro: "تستخدم هذه المعاينات بيانات نموذجية ثابتة والقوالب نفسها المستخدمة في قائمة إرسال الرسائل. جميع رسائل المعاملات باللغة الإنجليزية.",
    sample: "المستلم والمواعيد النهائية أمثلة تجريبية. يظهر كل قالب حالة اعتماد صياغته.",
    recipient: "مستلم تجريبي", subject: "الموضوع", text: "النص العادي", html: "مصدر HTML (معروض كنص)",
    copy: "نسخ النص", copied: "تم نسخ النص.", copyFailed: "تعذّر النسخ. حدّد النص العادي وانسخه يدويًا.",
    version: "إصدار القالب", loading: "جارٍ تحميل معاينات الرسائل…",
  },
} as const;
