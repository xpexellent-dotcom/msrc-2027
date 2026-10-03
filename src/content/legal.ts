import type { Locale } from "@/lib/i18n";

// SCP-02 / SUP-01–03 / PRV-01–08 / PAY-08 / MED-02 / REL-01 (BL-PUB-06, BL-PUB-08).
// Closed draft scaffolds only. Nothing here is approved legal, privacy or contact wording, and
// no sentence states a controller, legal basis, location, retention period, price or refund rule
// that DR-CFG-02/09/10/11 have not decided. Unknown values are said to be pending, never guessed.

export type LegalSection = { id: string; title: string; body: readonly string[] };

export type LegalPageCopy = {
  metadataTitle: string;
  metadataDescription: string;
  breadcrumb: string;
  home: string;
  page: string;
  eyebrow: string;
  title: string;
  lead: string;
  status: string;
  statusBody: string;
  version: string;
  contents: string;
  sections: readonly LegalSection[];
};

/** No approved version exists yet; BL-PUB-08 later records the approved id against consent. */
const draftVersion: Record<Locale, string> = {
  en: "Version: draft. No effective date.",
  ar: "الإصدار: مسودة، دون تاريخ سريان.",
};

export const privacyCopy: Record<Locale, LegalPageCopy> = {
  en: {
    metadataTitle: "Privacy | MSRC 2027",
    metadataDescription: "Draft privacy notice for MSRC 2027. It is not in effect and is awaiting approval.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Privacy",
    eyebrow: "Privacy notice",
    title: "Your data at MSRC 2027.",
    lead: "How the conference will collect, use and protect personal information.",
    status: "Draft, not in effect",
    statusBody: "This notice has not been approved yet. The site does not collect registrations, submissions or payments until an approved version is published here.",
    version: draftVersion.en,
    contents: "On this page",
    sections: [
      { id: "who-we-are", title: "Who we are", body: [
        "MSRC 2027 is organized by the Research Principles Club at the Faculty of Medicine, King Abdulaziz University.",
        "The organization legally responsible for your personal data will be named here once it is confirmed.",
      ] },
      { id: "what-we-collect", title: "What we will collect", body: [
        "Only what each activity needs: your name, email and account details; registration and workshop choices; abstracts and author details; hackathon and 3MT entries; payment confirmations; attendance check-ins; and survey answers.",
        "We do not collect national ID numbers or patient health records.",
      ] },
      { id: "why", title: "Why we will use it", body: [
        "To run your account, review submissions, manage registration and seats, confirm payments, record attendance, issue certificates and improve the conference.",
        "Survey answers are kept separate from the attendance records used for certificates.",
      ] },
      { id: "legal-bases", title: "Legal bases", body: ["The legal basis for each purpose will be set out here once approved."] },
      { id: "choices", title: "Optional choices", body: [
        "Photography and publicity permission and optional announcements are separate choices. Saying no does not affect your registration.",
      ] },
      { id: "sharing", title: "Who we share it with", body: [
        "Service providers that host the site and send email on our behalf. The full list will be published here once confirmed.",
        "We do not sell your data.",
      ] },
      { id: "locations", title: "Where it is processed", body: [
        "Some providers process data outside Saudi Arabia. The locations for each service will be listed here once confirmed.",
      ] },
      { id: "retention", title: "How long we keep it", body: ["Retention periods will be set out here once approved."] },
      { id: "rights", title: "Your rights", body: [
        "You will be able to ask to see, correct or delete your data, or withdraw a permission you gave. We will confirm your identity before acting.",
        "Withdrawing publicity permission does not delete your account. The address for these requests will be published here.",
      ] },
      { id: "photography", title: "Photography", body: [
        "Photos and video may be taken at the conference. The photography notice and how to ask for removal will be published here before the event.",
      ] },
      { id: "analytics", title: "Site analytics", body: [
        "We count visits to public pages with Vercel Web Analytics and Speed Insights. They use no cookies and store no IP address; visitors are counted with a value that changes daily.",
        "Vercel receives the page address, referrer, country, and device and browser type, and processes them outside Saudi Arabia.",
      ] },
      { id: "changes", title: "Changes to this notice", body: [
        "When this notice changes, we will publish a new version with its effective date and keep earlier versions available.",
      ] },
    ],
  },
  ar: {
    metadataTitle: "الخصوصية | MSRC 2027",
    metadataDescription: "مسودة إشعار الخصوصية لمؤتمر أبحاث طلاب الطب ٢٠٢٧. غير سارية وبانتظار الاعتماد.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "الخصوصية",
    eyebrow: "إشعار الخصوصية",
    title: "بياناتك في المؤتمر.",
    lead: "كيف سيجمع المؤتمر المعلومات الشخصية ويستخدمها ويحميها.",
    status: "مسودة غير سارية",
    statusBody: "لم يُعتمد هذا الإشعار بعد، ولا يجمع الموقع أي تسجيل أو مشاركة أو مدفوعات قبل نشر نسخة معتمدة هنا.",
    version: draftVersion.ar,
    contents: "في هذه الصفحة",
    sections: [
      { id: "who-we-are", title: "من نحن", body: [
        "ينظّم المؤتمر نادي مبادئ البحث العلمي في كلية الطب بجامعة الملك عبدالعزيز.",
        "سنذكر هنا الجهة المسؤولة نظاميًا عن بياناتك الشخصية بعد تأكيدها.",
      ] },
      { id: "what-we-collect", title: "ما سنجمعه", body: [
        "ما تحتاجه كل مشاركة فقط: اسمك وبريدك وبيانات حسابك، واختيارات التسجيل وورش العمل، والملخصات وبيانات المؤلفين، ومشاركات الهاكاثون ومسابقة الأطروحة في ثلاث دقائق، وتأكيدات الدفع، وتسجيل الحضور، وإجابات الاستبيانات.",
        "لا نجمع أرقام الهوية الوطنية أو السجلات الصحية للمرضى.",
      ] },
      { id: "why", title: "لماذا سنستخدمه", body: [
        "لإدارة حسابك، وتحكيم المشاركات، وإدارة التسجيل والمقاعد، وتأكيد الدفع، وتسجيل الحضور، وإصدار الشهادات، وتحسين المؤتمر.",
        "تُحفظ إجابات الاستبيان منفصلة عن سجلات الحضور المستخدمة للشهادات.",
      ] },
      { id: "legal-bases", title: "الأسس النظامية", body: ["سنوضح هنا الأساس النظامي لكل غرض بعد اعتماده."] },
      { id: "choices", title: "اختيارات اختيارية", body: [
        "الإذن بالتصوير والنشر والاشتراك في الإعلانات اختيارات منفصلة، ورفضها لا يؤثر في تسجيلك.",
      ] },
      { id: "sharing", title: "مع من نشاركه", body: [
        "مزوّدو الخدمات الذين يستضيفون الموقع ويرسلون البريد نيابةً عنا. سننشر القائمة الكاملة هنا بعد تأكيدها.",
        "لا نبيع بياناتك.",
      ] },
      { id: "locations", title: "أين تُعالج البيانات", body: [
        "يعالج بعض المزوّدين البيانات خارج المملكة العربية السعودية. سنذكر موقع كل خدمة هنا بعد تأكيده.",
      ] },
      { id: "retention", title: "مدة الاحتفاظ", body: ["سنوضح هنا مدد الاحتفاظ بعد اعتمادها."] },
      { id: "rights", title: "حقوقك", body: [
        "سيكون بإمكانك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها، أو سحب إذن منحته. سنتحقق من هويتك قبل التنفيذ.",
        "سحب إذن النشر لا يعني حذف حسابك. سننشر هنا عنوان تقديم هذه الطلبات.",
      ] },
      { id: "photography", title: "التصوير", body: [
        "قد يتم التصوير الفوتوغرافي والمرئي خلال المؤتمر. سننشر هنا إشعار التصوير وطريقة طلب الإزالة قبل المؤتمر.",
      ] },
      { id: "analytics", title: "تحليلات الموقع", body: [
        "نحصي زيارات الصفحات العامة عبر خدمتي التحليلات وقياس السرعة من Vercel، وهما لا تستخدمان ملفات تعريف الارتباط ولا تحفظان عنوان IP، وتُحصى الزيارات بقيمة تتغيّر يوميًا.",
        "تتلقى Vercel عنوان الصفحة ومصدر الزيارة والدولة ونوع الجهاز والمتصفح، وتعالجها خارج المملكة العربية السعودية.",
      ] },
      { id: "changes", title: "تعديل هذا الإشعار", body: [
        "عند تعديل هذا الإشعار سننشر نسخة جديدة بتاريخ سريانها ونبقي النسخ السابقة متاحة.",
      ] },
    ],
  },
};

export const termsCopy: Record<Locale, LegalPageCopy> = {
  en: {
    metadataTitle: "Terms | MSRC 2027",
    metadataDescription: "Draft terms for MSRC 2027. They are not in effect and are awaiting approval.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Terms",
    eyebrow: "Terms of participation",
    title: "Terms for MSRC 2027.",
    lead: "The rules for using this website and taking part in the conference.",
    status: "Draft, not in effect",
    statusBody: "These terms have not been approved yet. Registration and payment stay closed until an approved version is published here.",
    version: draftVersion.en,
    contents: "On this page",
    sections: [
      { id: "about", title: "About these terms", body: [
        "These terms will apply to the MSRC 2027 website and to taking part in the conference. The organizer and seller will be named here once confirmed.",
      ] },
      { id: "using-the-site", title: "Using the site", body: [
        "Anyone can browse the public pages. Don't try to access other people's records, disrupt the site or submit false information.",
      ] },
      { id: "accounts", title: "Accounts", body: [
        "You will need a verified email address to create an account. Keep your password private. We contact you by email only.",
      ] },
      { id: "submissions", title: "Submissions", body: [
        "You confirm your submission is your own work and that your co-authors agree to it. Submissions are kept confidential during and after review.",
        "Publication rights for accepted abstracts and hackathon intellectual property terms will be set out here once approved.",
      ] },
      { id: "registration-payment", title: "Registration and payment", body: [
        "Every registration and workshop booking is reviewed and approved manually, including fully discounted ones. A place is confirmed only when you receive an approval email.",
        "Prices, what each includes and how to pay will be published here before registration opens.",
      ] },
      { id: "cancellation-refunds", title: "Cancellation and refunds", body: [
        "Cancellation deadlines, refund conditions and receipt details will be published here before registration opens.",
      ] },
      { id: "certificates", title: "Certificates", body: [
        "A full conference certificate requires check-in on both days and completing the general survey. There is no one-day certificate. Workshop certificates have their own requirements.",
      ] },
      { id: "conduct", title: "Conduct", body: ["The code of conduct will be published here once approved."] },
      { id: "photography", title: "Photography", body: ["Photography at the event is covered by our Privacy notice."] },
      { id: "liability-law", title: "Liability and governing law", body: ["These sections will be published here once approved."] },
      { id: "changes", title: "Changes to these terms", body: [
        "Updated terms will be published with a new version and effective date.",
      ] },
    ],
  },
  ar: {
    metadataTitle: "الشروط | MSRC 2027",
    metadataDescription: "مسودة شروط مؤتمر أبحاث طلاب الطب ٢٠٢٧. غير سارية وبانتظار الاعتماد.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "الشروط",
    eyebrow: "شروط المشاركة",
    title: "شروط المؤتمر.",
    lead: "القواعد التي تنظّم استخدام هذا الموقع والمشاركة في المؤتمر.",
    status: "مسودة غير سارية",
    statusBody: "لم تُعتمد هذه الشروط بعد، ويبقى التسجيل والدفع مغلقين حتى نشر نسخة معتمدة هنا.",
    version: draftVersion.ar,
    contents: "في هذه الصفحة",
    sections: [
      { id: "about", title: "عن هذه الشروط", body: [
        "ستسري هذه الشروط على موقع المؤتمر وعلى المشاركة فيه. سنذكر هنا الجهة المنظّمة والبائعة بعد تأكيدها.",
      ] },
      { id: "using-the-site", title: "استخدام الموقع", body: [
        "يمكن لأي شخص تصفّح الصفحات العامة. يُمنع محاولة الوصول إلى سجلات الآخرين أو تعطيل الموقع أو تقديم معلومات غير صحيحة.",
      ] },
      { id: "accounts", title: "الحسابات", body: [
        "سيلزم بريد إلكتروني مؤكّد لإنشاء حساب. حافظ على سرية كلمة المرور. نتواصل معك عبر البريد الإلكتروني فقط.",
      ] },
      { id: "submissions", title: "المشاركات", body: [
        "تؤكد أن مشاركتك من عملك وأن المؤلفين المشاركين موافقون عليها. تبقى المشاركات سرية أثناء التحكيم وبعده.",
        "سنوضح هنا حقوق نشر الملخصات المقبولة وشروط الملكية الفكرية للهاكاثون بعد اعتمادها.",
      ] },
      { id: "registration-payment", title: "التسجيل والدفع", body: [
        "تخضع كل عمليات التسجيل وحجز ورش العمل للمراجعة والموافقة اليدوية، بما في ذلك المعفاة بالكامل. لا يُؤكد مقعدك إلا بعد وصول بريد الموافقة.",
        "سننشر هنا الأسعار وما تشمله وطريقة الدفع قبل فتح التسجيل.",
      ] },
      { id: "cancellation-refunds", title: "الإلغاء والاسترداد", body: [
        "سننشر هنا مواعيد الإلغاء وشروط الاسترداد وتفاصيل الإيصالات قبل فتح التسجيل.",
      ] },
      { id: "certificates", title: "الشهادات", body: [
        "تتطلب شهادة حضور المؤتمر تسجيل الحضور في اليومين وإكمال الاستبيان العام. لا توجد شهادة ليوم واحد. لشهادات ورش العمل متطلباتها الخاصة.",
      ] },
      { id: "conduct", title: "السلوك", body: ["سننشر هنا مدوّنة السلوك بعد اعتمادها."] },
      { id: "photography", title: "التصوير", body: ["يخضع التصوير في المؤتمر لإشعار الخصوصية."] },
      { id: "liability-law", title: "المسؤولية والنظام الحاكم", body: ["سننشر هذين القسمين هنا بعد اعتمادهما."] },
      { id: "changes", title: "تعديل هذه الشروط", body: [
        "تُنشر الشروط المعدّلة بنسخة جديدة وتاريخ سريان.",
      ] },
    ],
  },
};

type ContactCategory = { id: string; title: string; description: string };
type ContactCopy = {
  metadataTitle: string;
  metadataDescription: string;
  breadcrumb: string;
  home: string;
  page: string;
  eyebrow: string;
  title: string;
  lead: string;
  status: string;
  statusBody: string;
  categoriesTitle: string;
  categories: readonly ContactCategory[];
  beforeTitle: string;
  beforeBody: string;
  privacyTitle: string;
  privacyBody: string;
  privacyLink: string;
};

// SUP-01: the six routed categories. Their destination addresses are form routing, never printed.
export const contactCopy: Record<Locale, ContactCopy> = {
  en: {
    metadataTitle: "Contact | MSRC 2027",
    metadataDescription: "How to contact the MSRC 2027 team. The contact form is not open yet.",
    breadcrumb: "Breadcrumb",
    home: "Home",
    page: "Contact",
    eyebrow: "Get in touch",
    title: "Contact us.",
    lead: "Questions about MSRC 2027? Each topic below will reach the right team.",
    status: "Form not open yet",
    statusBody: "The contact form will appear here once it has been set up and tested.",
    categoriesTitle: "What you can ask about",
    categories: [
      { id: "general", title: "General inquiry", description: "The conference, dates, venue and anything not listed below." },
      { id: "scientific", title: "Scientific inquiry", description: "Abstract submission, review and presentation formats." },
      { id: "hackathon", title: "Hackathon", description: "Eligibility, teams, tracks and the hackathon schedule." },
      { id: "workshop", title: "Workshops", description: "Workshop topics, booking and attendance." },
      { id: "sponsor", title: "Sponsorship", description: "Partnering with or sponsoring MSRC 2027." },
      { id: "technical", title: "Technical support", description: "Problems using this website or your account." },
    ],
    beforeTitle: "Before you write",
    beforeBody: "Please don't send your abstract, manuscript, national ID or any health information through the contact form. Submissions have their own secure route.",
    privacyTitle: "Your message",
    privacyBody: "We will use your message only to answer it.",
    privacyLink: "Read the draft privacy notice",
  },
  ar: {
    metadataTitle: "التواصل | MSRC 2027",
    metadataDescription: "كيفية التواصل مع فريق مؤتمر أبحاث طلاب الطب ٢٠٢٧. نموذج التواصل غير متاح بعد.",
    breadcrumb: "مسار التنقل",
    home: "الرئيسية",
    page: "التواصل",
    eyebrow: "تواصل معنا",
    title: "تواصل معنا.",
    lead: "لديك سؤال عن المؤتمر؟ سيصل كل موضوع أدناه إلى الفريق المعني.",
    status: "النموذج غير متاح بعد",
    statusBody: "سيظهر نموذج التواصل هنا بعد إعداده واختباره.",
    categoriesTitle: "مواضيع التواصل",
    categories: [
      { id: "general", title: "استفسار عام", description: "المؤتمر ومواعيده ومقره، وأي موضوع غير مذكور أدناه." },
      { id: "scientific", title: "استفسار علمي", description: "تقديم الملخصات وتحكيمها وأشكال العرض." },
      { id: "hackathon", title: "الهاكاثون", description: "شروط المشاركة والفرق والمسارات وجدول الهاكاثون." },
      { id: "workshop", title: "ورش العمل", description: "مواضيع ورش العمل وحجزها وحضورها." },
      { id: "sponsor", title: "الرعاية", description: "الشراكة مع المؤتمر أو رعايته." },
      { id: "technical", title: "الدعم التقني", description: "المشكلات التقنية في الموقع أو في حسابك." },
    ],
    beforeTitle: "قبل أن تكتب",
    beforeBody: "يرجى عدم إرسال ملخصك أو بحثك أو رقم هويتك أو أي معلومات صحية عبر نموذج التواصل، فللمشاركات مسار آمن خاص بها.",
    privacyTitle: "رسالتك",
    privacyBody: "سنستخدم رسالتك للرد عليها فقط.",
    privacyLink: "اطّلع على مسودة إشعار الخصوصية",
  },
};
