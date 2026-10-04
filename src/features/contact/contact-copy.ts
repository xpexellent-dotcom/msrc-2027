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
  enabledMetadataDescription: string;
  deliveryIntro: string;
  deliveryProcessing: string;
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
    enabledMetadataDescription: "Send a message to the MSRC 2027 organising team or contact us directly by email.",
    deliveryIntro: "Send a message to the organising team. We’ll reply to the email address you provide.",
    deliveryProcessing: "Your message and contact details go through Resend to the organising team’s inbox. The website does not keep a copy of your message.",
    testOnly: "Synthetic delivery test. No real email is sent.",
    noScript: "Please enable JavaScript to use this form, or contact us using the email address above.",
    sending: "Sending your message…",
    preparing: "Preparing the form…",
    sent: "Thanks, we’ll reply by email.",
    invalid: "Please check your message",
    invalidBody: "Please check the details and try again.",
    limited: "Please wait before trying again",
    limitedBody: "Your details are still here. Please wait before another attempt, or email us directly.",
    tooFast: "Please wait a moment",
    tooFastBody: "Your details are still here. Wait a moment, then send your message again.",
    expired: "The form has expired",
    expiredBody: "Start a new attempt to prepare the form again. Your text is kept; nothing is sent until you press Send message.",
    unavailable: "We couldn’t send your message",
    unavailableBody: "Your details are still here. Please try again or use the email address above.",
    unconfirmed: "Delivery isn’t confirmed",
    unconfirmedBody: "We couldn’t confirm whether your message was sent. Your details are still here.",
    duplicateWarning: "Your first message may have been sent. Starting a new attempt could send it twice. You can email the team instead.",
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
    enabledMetadataDescription: "أرسل رسالة إلى الفريق المنظم لمؤتمر أبحاث طلاب الطب ٢٠٢٧ أو تواصل معنا مباشرة عبر البريد الإلكتروني.",
    deliveryIntro: "أرسل رسالة إلى الفريق المنظم. سنرد على عنوان البريد الإلكتروني الذي تقدمه.",
    deliveryProcessing: "تُرسل رسالتك وبيانات التواصل عبر Resend إلى صندوق بريد الفريق المنظم. لا يحتفظ الموقع بنسخة من رسالتك.",
    testOnly: "اختبار ببيانات تجريبية. لا تُرسل رسائل بريد إلكتروني حقيقية.",
    noScript: "يرجى تفعيل JavaScript لاستخدام النموذج، أو التواصل معنا عبر عنوان البريد الإلكتروني أعلاه.",
    sending: "جارٍ إرسال رسالتك…",
    preparing: "جارٍ تجهيز النموذج…",
    sent: "شكرًا، سنرد عليك عبر البريد الإلكتروني.",
    invalid: "يرجى مراجعة رسالتك",
    invalidBody: "يرجى مراجعة البيانات والمحاولة مجددًا.",
    limited: "يرجى الانتظار قبل المحاولة مجددًا",
    limitedBody: "ما زالت بياناتك موجودة في النموذج. يرجى الانتظار قبل محاولة أخرى، أو مراسلتنا مباشرة عبر البريد الإلكتروني.",
    tooFast: "يرجى الانتظار قليلًا",
    tooFastBody: "ما زالت بياناتك موجودة في النموذج. انتظر قليلًا، ثم أرسل رسالتك مجددًا.",
    expired: "انتهت صلاحية النموذج",
    expiredBody: "ابدأ محاولة جديدة لتجهيز النموذج مجددًا. يبقى نصك في النموذج؛ ولا تُرسل الرسالة حتى تضغط على إرسال الرسالة.",
    unavailable: "تعذّر إرسال رسالتك",
    unavailableBody: "ما زالت بياناتك موجودة في النموذج. يرجى المحاولة مجددًا أو استخدام عنوان البريد الإلكتروني أعلاه.",
    unconfirmed: "لم يتأكد إرسال الرسالة",
    unconfirmedBody: "تعذّر التأكد من إرسال رسالتك. ما زالت بياناتك موجودة في النموذج.",
    duplicateWarning: "ربما أُرسلت رسالتك الأولى. قد يؤدي بدء محاولة جديدة إلى إرسالها مرتين. يمكنك مراسلة الفريق عبر البريد الإلكتروني بدلًا من ذلك.",
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
