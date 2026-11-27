import type { Locale } from "@/lib/i18n";

type ContactCopy = {
  metadataTitle: string;
  metadataDescription: string;
  breadcrumb: string;
  home: string;
  page: string;
  eyebrow: string;
  title: string;
  closedLead: string;
  enabledLead: string;
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
  enabledMetadataDescription: string;
  deliveryIntro: string;
  testOnly: string;
  noScript: string;
  sending: string;
  preparing: string;
  sent: string;
  invalid: string;
  invalidBody: string;
  limited: string;
  limitedBody: string;
  tooFast: string;
  tooFastBody: string;
  expired: string;
  expiredBody: string;
  unavailable: string;
  unavailableBody: string;
  unconfirmed: string;
  unconfirmedBody: string;
  duplicateWarning: string;
  retry: string;
  startNewAttempt: string;
  anotherMessage: string;
  retryTiming: string;
  fieldErrors: Record<"required" | "invalid" | "too_long", string>;
};

// LOC-01/03, SUP-01/02, BL-PUB-06: copy for enabled and closed delivery.
export const contactCopy: Record<Locale, ContactCopy> = {
  en: {
    metadataTitle: "Contact | MSRC 2027",
    metadataDescription: "Contact information for MSRC 2027. The website contact form is not currently available.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Contact",
    eyebrow: "Get in touch",
    title: "Contact the team.",
    closedLead: "Questions about the conference, participation or your account?",
    enabledLead: "Use the form below for questions about the conference, participation or your account.",
    formHeading: "Contact form",
    closedHeading: "The form is not open yet",
    closedBody: "Please check back later or see the frequently asked questions.",
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
    enabledMetadataDescription: "Use the contact form to send a message to the MSRC 2027 organizing team.",
    deliveryIntro: "Send a message to the organizing team. We’ll reply to the email address you provide.",
    testOnly: "Synthetic delivery test. No real email is sent.",
    noScript: "Please enable JavaScript to use this form.",
    sending: "Sending your message…",
    preparing: "Preparing the form…",
    sent: "Thanks, we’ll reply by email.",
    invalid: "Please check your message",
    invalidBody: "Please check the details and try again.",
    limited: "Please wait before trying again",
    limitedBody: "Your details are still here. Please wait before trying again.",
    tooFast: "Please wait a moment",
    tooFastBody: "Your details are still here. Wait a moment, then send your message again.",
    expired: "The form has expired",
    expiredBody: "Start a new attempt to prepare the form again. Your text is kept; nothing is sent until you press Send message.",
    unavailable: "We couldn’t send your message",
    unavailableBody: "Your details are still here. Please try again.",
    unconfirmed: "Delivery isn’t confirmed",
    unconfirmedBody: "We couldn’t confirm whether your message was sent. Your details are still here.",
    duplicateWarning: "Your first message may have been sent. Starting a new attempt could send it twice.",
    retry: "Try again",
    startNewAttempt: "Start a new attempt",
    anotherMessage: "Send another message",
    retryTiming: "Try again",
    fieldErrors: {
      required: "Please complete this field.",
      invalid: "Please check this field.",
      too_long: "Please shorten this field.",
    },
  },
  ar: {
    metadataTitle: "تواصل معنا | MSRC 2027",
    metadataDescription: "معلومات التواصل مع فريق مؤتمر أبحاث طلاب الطب ٢٠٢٧. نموذج التواصل غير متاح حاليًا.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "تواصل معنا",
    eyebrow: "يسعدنا تواصلك",
    title: "تواصل مع فريق المؤتمر.",
    closedLead: "هل لديك سؤال عن المؤتمر أو المشاركة أو حسابك؟",
    enabledLead: "استخدم النموذج أدناه للاستفسار عن المؤتمر أو المشاركة أو حسابك.",
    formHeading: "نموذج التواصل",
    closedHeading: "النموذج غير متاح حاليًا",
    closedBody: "يرجى العودة لاحقًا أو الاطلاع على الأسئلة الشائعة.",
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
    enabledMetadataDescription: "استخدم نموذج التواصل لإرسال رسالة إلى الفريق المنظم لمؤتمر أبحاث طلاب الطب ٢٠٢٧.",
    deliveryIntro: "أرسل رسالة إلى الفريق المنظم. سنرد على عنوان البريد الإلكتروني الذي تقدمه.",
    testOnly: "اختبار ببيانات تجريبية. لا تُرسل رسائل بريد إلكتروني حقيقية.",
    noScript: "يرجى تفعيل JavaScript لاستخدام النموذج.",
    sending: "جارٍ إرسال رسالتك…",
    preparing: "جارٍ تجهيز النموذج…",
    sent: "شكرًا، سنرد عليك عبر البريد الإلكتروني.",
    invalid: "يرجى مراجعة رسالتك",
    invalidBody: "يرجى مراجعة البيانات والمحاولة مجددًا.",
    limited: "يرجى الانتظار قبل المحاولة مجددًا",
    limitedBody: "ما زالت بياناتك في النموذج. يرجى الانتظار قليلًا قبل المحاولة مجددًا.",
    tooFast: "يرجى الانتظار قليلًا",
    tooFastBody: "ما زالت بياناتك موجودة في النموذج. انتظر قليلًا، ثم أرسل رسالتك مجددًا.",
    expired: "انتهت صلاحية النموذج",
    expiredBody: "ابدأ محاولة جديدة لتجهيز النموذج مجددًا. يبقى نصك في النموذج؛ ولا تُرسل الرسالة حتى تضغط على إرسال الرسالة.",
    unavailable: "تعذّر إرسال رسالتك",
    unavailableBody: "ما زالت بياناتك في النموذج. يرجى المحاولة مجددًا.",
    unconfirmed: "لم يتأكد إرسال الرسالة",
    unconfirmedBody: "تعذّر التأكد من إرسال رسالتك. ما زالت بياناتك موجودة في النموذج.",
    duplicateWarning: "ربما أُرسلت رسالتك الأولى. قد يؤدي بدء محاولة جديدة إلى إرسالها مرتين.",
    retry: "حاول مجددًا",
    startNewAttempt: "ابدأ محاولة جديدة",
    anotherMessage: "أرسل رسالة أخرى",
    retryTiming: "أعد المحاولة",
    fieldErrors: {
      required: "يرجى إكمال هذا الحقل.",
      invalid: "يرجى مراجعة هذا الحقل.",
      too_long: "يرجى تقصير النص في هذا الحقل.",
    },
  },
};
