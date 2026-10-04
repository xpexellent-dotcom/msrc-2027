import type { Locale } from "@/lib/i18n";

type ContactCopy = {
  metadataTitle: string;
  metadataDescription: string;
  breadcrumb: string;
  home: string;
  page: string;
  eyebrow: string;
  title: string;
  lead: string;
  emailHeading: string;
  emailBody: string;
  formHeading: string;
  closedHeading: string;
  closedBody: string;
  closedPrivacy: string;
  fieldsLegend: string;
  requiredHint: string;
  topic: string;
  chooseTopic: string;
  name: string;
  email: string;
  relatedReference: string;
  relatedReferenceHint: string;
  message: string;
  send: string;
  website: string;
};

// LOC-01/03, SUP-01/02, BL-PUB-06: interface copy; delivery stays closed.
export const contactCopy: Record<Locale, ContactCopy> = {
  en: {
    metadataTitle: "Contact | MSRC 2027",
    metadataDescription: "Contact the MSRC 2027 organising team by email. The website contact form is not open yet.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Contact",
    eyebrow: "Get in touch",
    title: "Contact the team.",
    lead: "Questions about the conference, participation or your account? Email the organising team.",
    emailHeading: "By email",
    emailBody: "You can contact us directly at:",
    formHeading: "Contact form",
    closedHeading: "The form is not open yet",
    closedBody: "We’re preparing email delivery. For now, please use the email address above.",
    closedPrivacy: "We receive no information from this form. Nothing entered here is sent or stored.",
    fieldsLegend: "Contact form fields",
    requiredHint: "All fields are required except the related reference.",
    topic: "Topic",
    chooseTopic: "Choose a topic",
    name: "Name",
    email: "Email",
    relatedReference: "Related reference (optional)",
    relatedReferenceHint: "Include a reference number if relevant.",
    message: "Message",
    send: "Send message",
    website: "Leave this field empty",
  },
  ar: {
    metadataTitle: "تواصل معنا | MSRC 2027",
    metadataDescription: "تواصل مع الفريق المنظم لمؤتمر أبحاث طلاب الطب ٢٠٢٧ عبر البريد الإلكتروني. نموذج التواصل بالموقع غير متاح حاليًا.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "تواصل معنا",
    eyebrow: "يسعدنا تواصلك",
    title: "تواصل مع فريق المؤتمر.",
    lead: "هل لديك سؤال عن المؤتمر أو المشاركة أو حسابك؟ راسل الفريق المنظم عبر البريد الإلكتروني.",
    emailHeading: "عبر البريد الإلكتروني",
    emailBody: "يمكنك التواصل معنا مباشرة على:",
    formHeading: "نموذج التواصل",
    closedHeading: "النموذج غير متاح حاليًا",
    closedBody: "نعمل على تجهيز إرسال الرسائل. يرجى استخدام عنوان البريد الإلكتروني أعلاه في الوقت الحالي.",
    closedPrivacy: "لا نتلقى أي معلومات من هذا النموذج. لا تُرسل أو تُحفظ أي بيانات تُدخل فيه.",
    fieldsLegend: "حقول نموذج التواصل",
    requiredHint: "جميع الحقول مطلوبة باستثناء الرقم المرجعي ذي الصلة.",
    topic: "الموضوع",
    chooseTopic: "اختر الموضوع",
    name: "الاسم",
    email: "البريد الإلكتروني",
    relatedReference: "الرقم المرجعي ذو الصلة (اختياري)",
    relatedReferenceHint: "أضف رقمًا مرجعيًا إن وُجد.",
    message: "الرسالة",
    send: "إرسال الرسالة",
    website: "اترك هذا الحقل فارغًا",
  },
};
