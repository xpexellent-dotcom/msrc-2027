import type { Locale } from "@/lib/i18n";

export const policyKinds = ["privacy", "terms"] as const;
export type PolicyKind = (typeof policyKinds)[number];
export const currentPolicyVersion = "2026-10-04-draft" as const;

export type PolicySection = {
  id: string;
  title: string;
  status: "organizer-decision" | "placeholder";
  paragraphs: readonly string[];
  links?: readonly { label: string; href: string; direction?: "ltr" }[];
};

type PolicyDocument = {
  title: string;
  metadataDescription: string;
  lead: string;
  sections: readonly PolicySection[];
};

type PolicyCopy = {
  home: string;
  breadcrumb: string;
  eyebrow: string;
  status: string;
  version: string;
  recorded: string;
  recordedDate: string;
  approvalNotice: string;
  decisionStatus: string;
  placeholderStatus: string;
  contents: string;
  versionLink: string;
  latestLink: string;
  related: string;
  contact: string;
  privacy: PolicyDocument;
  terms: PolicyDocument;
};

/**
 * BL-PUB-08 / PRV-01/02/05/07/08 / LOC-01/03: immutable draft, not final legal copy.
 * Only explicit organizer facts dated 4 October 2026 are recorded below. Approval
 * of those facts does not approve these translations, legal bases or publication.
 * Keep this dated snapshot when a later approved version is added.
 */
const policyDraft20261004: Record<Locale, PolicyCopy> = {
  en: {
    home: "Home",
    breadcrumb: "Breadcrumb",
    eyebrow: "Information & policies",
    status: "Draft — final wording pending",
    version: "Document version",
    recorded: "Decisions recorded",
    recordedDate: "4 October 2026",
    approvalNotice: "This draft records organizer decisions. The final policy and Arabic wording are awaiting review; this draft has no effective date.",
    decisionStatus: "Organizer decision — draft wording",
    placeholderStatus: "Placeholder — wording pending",
    contents: "On this page",
    versionLink: "View this dated draft",
    latestLink: "View the current draft",
    related: "Related pages",
    contact: "Contact",
    privacy: {
      title: "Privacy",
      metadataDescription: "Draft organizer decisions about participant data, retention and privacy requests. Final policy wording is pending.",
      lead: "How participant data will be handled, with the decisions and unfinished sections visible.",
      sections: [
        {
          id: "responsibility",
          title: "Who is responsible",
          status: "organizer-decision",
          paragraphs: ["The Research Principles Club is responsible for participant data.", "The policy framework is Saudi Arabia’s Personal Data Protection Law (PDPL)."],
          links: [{ label: "King Abdulaziz University privacy policy", href: "https://kau.edu.sa/en/page/privacy-policy" }],
        },
        {
          id: "current-site",
          title: "The current website",
          status: "organizer-decision",
          paragraphs: ["Participation forms remain closed. The Contact form accepts information only when email delivery is enabled; otherwise it stays closed.", "When Contact is available, the supplied topic, name, email, optional related reference, message and language are sent through Resend to contact@msrc2027.com for a reply. The application keeps no message copy; Supabase holds only expiring hashed anti-spam counters. Resend and the receiving inbox handle the email.", "The organizer describes current visit analytics as cookieless and anonymous, provided by Vercel. Contact is excluded from website analytics."],
        },
        {
          id: "retention",
          title: "Retention decisions",
          status: "organizer-decision",
          paragraphs: ["Registrations and abstracts are deleted one year after the conference.", "The certificate verification record — name, certificate number and date — is kept for two years so certificates can remain verifiable."],
        },
        {
          id: "data-requests",
          title: "Privacy & data requests",
          status: "organizer-decision",
          paragraphs: ["Email contact@msrc2027.com with the topic “Privacy & data requests”. Our privacy lead responds within 30 days."],
          links: [{ label: "contact@msrc2027.com", href: "mailto:contact@msrc2027.com", direction: "ltr" }],
        },
        {
          id: "photography",
          title: "Photography & recording",
          status: "organizer-decision",
          paragraphs: ["The event is photographed and recorded. The registration page states this clearly."],
        },
        {
          id: "photography-publication",
          title: "Publishing photographs & recordings",
          status: "placeholder",
          paragraphs: ["Placeholder — final wording and publication review pending. The legal basis for publishing identifiable photographs and recordings has not been finalized in this draft."],
        },
        {
          id: "processing",
          title: "Data use & legal bases",
          status: "placeholder",
          paragraphs: ["Placeholder — final wording is pending for account and participation data, authorship, payments, reviews, advisory assessment, attendance, certificates and surveys. Purposes, legal bases and institutional approvals still need review before these workflows open."],
        },
        {
          id: "providers-locations",
          title: "Service providers & data locations",
          status: "placeholder",
          paragraphs: ["Placeholder — service-provider processing, logging, data locations and any transfers await documented review and final wording."],
        },
        {
          id: "retention-details",
          title: "Retention implementation",
          status: "placeholder",
          paragraphs: ["Placeholder — the start of the certificate record’s two-year period, any other retention rules, and deletion across files, exports, logs and backups still need final wording and implementation review."],
        },
        {
          id: "request-process",
          title: "Request handling & rights",
          status: "placeholder",
          paragraphs: ["Placeholder — the verified request procedure, applicable rights, exceptions and removal process await final wording and approval."],
        },
      ],
    },
    terms: {
      title: "Terms",
      metadataDescription: "Placeholder for MSRC 2027 Terms. Final wording is pending.",
      lead: "The Terms have not been approved. This page reserves a versioned place for the final wording.",
      sections: [{
        id: "terms-wording",
        title: "Terms wording",
        status: "placeholder",
        paragraphs: ["Placeholder — final Terms wording and approval are pending."],
      }],
    },
  },
  ar: {
    home: "الرئيسية",
    breadcrumb: "مسار التنقل",
    eyebrow: "المعلومات والسياسات",
    status: "مسودة — بانتظار الصياغة النهائية",
    version: "إصدار الوثيقة",
    recorded: "تاريخ تسجيل القرارات",
    recordedDate: "٤ أكتوبر ٢٠٢٦",
    approvalNotice: "تسجل هذه المسودة قرارات المنظمين. السياسة النهائية والصياغة العربية بانتظار المراجعة؛ وليس لهذه المسودة تاريخ سريان.",
    decisionStatus: "قرار تنظيمي — صياغة مسودة",
    placeholderStatus: "نص مؤقت — بانتظار الصياغة",
    contents: "في هذه الصفحة",
    versionLink: "عرض هذه المسودة المؤرخة",
    latestLink: "عرض المسودة الحالية",
    related: "صفحات ذات صلة",
    contact: "تواصل معنا",
    privacy: {
      title: "الخصوصية",
      metadataDescription: "مسودة لقرارات المنظمين بشأن بيانات المشاركين والاحتفاظ بها وطلبات الخصوصية. الصياغة النهائية للسياسة بانتظار الاعتماد.",
      lead: "كيفية التعامل مع بيانات المشاركين، مع توضيح القرارات والأقسام التي لم تكتمل بعد.",
      sections: [
        {
          id: "responsibility",
          title: "الجهة المسؤولة",
          status: "organizer-decision",
          paragraphs: ["نادي مبادئ البحث العلمي هو المسؤول عن بيانات المشاركين.", "الإطار الذي تتبعه السياسة هو نظام حماية البيانات الشخصية في المملكة العربية السعودية."],
          links: [{ label: "سياسة الخصوصية لجامعة الملك عبدالعزيز", href: "https://kau.edu.sa/ar/page/privacy-policy" }],
        },
        {
          id: "current-site",
          title: "الموقع الحالي",
          status: "organizer-decision",
          paragraphs: ["تبقى نماذج المشاركة مغلقة. يقبل نموذج التواصل المعلومات فقط عند تفعيل إرسال البريد الإلكتروني؛ ويظل مغلقًا في غير ذلك.", "عند إتاحة التواصل، تُرسل البيانات المقدمة — الموضوع والاسم والبريد الإلكتروني والمرجع ذي الصلة إن وجد والرسالة واللغة — عبر Resend إلى contact@msrc2027.com للرد. لا يحتفظ التطبيق بنسخة من الرسالة؛ وتحتفظ Supabase فقط بعدّادات مؤقتة بمفاتيح مجزأة للحد من الرسائل المزعجة. تتعامل Resend وصندوق البريد المستلم مع الرسالة.", "يصف المنظمون تحليلات الزيارات الحالية بأنها مجهولة الهوية ومن دون ملفات تعريف الارتباط، وتقدمها Vercel. تُستثنى صفحة التواصل من تحليلات الموقع."],
        },
        {
          id: "retention",
          title: "قرارات الاحتفاظ بالبيانات",
          status: "organizer-decision",
          paragraphs: ["تُحذف بيانات التسجيل والملخصات البحثية بعد سنة من المؤتمر.", "يُحتفظ بسجل التحقق من الشهادة — الاسم ورقم الشهادة والتاريخ — لمدة سنتين لإتاحة التحقق من الشهادات."],
        },
        {
          id: "data-requests",
          title: "الخصوصية وطلبات البيانات",
          status: "organizer-decision",
          paragraphs: ["راسل contact@msrc2027.com مع اختيار موضوع «الخصوصية وطلبات البيانات». يرد مسؤول الخصوصية لدينا خلال ٣٠ يومًا."],
          links: [{ label: "contact@msrc2027.com", href: "mailto:contact@msrc2027.com", direction: "ltr" }],
        },
        {
          id: "photography",
          title: "التصوير والتسجيل",
          status: "organizer-decision",
          paragraphs: ["يُصوَّر المؤتمر وتُسجَّل فعالياته. توضح صفحة التسجيل ذلك بوضوح."],
        },
        {
          id: "photography-publication",
          title: "نشر الصور والتسجيلات",
          status: "placeholder",
          paragraphs: ["نص مؤقت — الصياغة النهائية ومراجعة النشر بانتظار الاعتماد. لم يُستكمل في هذه المسودة الأساس النظامي لنشر الصور والتسجيلات التي يمكن التعرف فيها على الأشخاص."],
        },
        {
          id: "processing",
          title: "استخدام البيانات والأسس النظامية",
          status: "placeholder",
          paragraphs: ["نص مؤقت — الصياغة النهائية لبيانات الحسابات والمشاركة والتأليف والمدفوعات والمراجعات والتقييم الاستشاري والحضور والشهادات والاستبيانات بانتظار الاعتماد. تحتاج الأغراض والأسس النظامية والموافقات المؤسسية إلى المراجعة قبل فتح هذه الإجراءات."],
        },
        {
          id: "providers-locations",
          title: "مقدمو الخدمات ومواقع البيانات",
          status: "placeholder",
          paragraphs: ["نص مؤقت — معالجة مقدمي الخدمات للبيانات والسجلات ومواقع البيانات وأي نقل لها بانتظار المراجعة الموثقة والصياغة النهائية."],
        },
        {
          id: "retention-details",
          title: "تنفيذ مدد الاحتفاظ",
          status: "placeholder",
          paragraphs: ["نص مؤقت — بداية مدة السنتين لسجل الشهادة وأي مدد أخرى للاحتفاظ والحذف من الملفات والصادرات والسجلات والنسخ الاحتياطية تحتاج إلى صياغة نهائية ومراجعة التنفيذ."],
        },
        {
          id: "request-process",
          title: "إجراءات الطلبات والحقوق",
          status: "placeholder",
          paragraphs: ["نص مؤقت — إجراءات التحقق من الطلبات والحقوق المنطبقة والاستثناءات وإجراءات الإزالة بانتظار الصياغة النهائية والاعتماد."],
        },
      ],
    },
    terms: {
      title: "الشروط",
      metadataDescription: "نص مؤقت لشروط مؤتمر MSRC 2027. الصياغة النهائية بانتظار الاعتماد.",
      lead: "لم تُعتمد الشروط بعد. تتيح هذه الصفحة مكانًا محدد الإصدار للصياغة النهائية.",
      sections: [{
        id: "terms-wording",
        title: "صياغة الشروط",
        status: "placeholder",
        paragraphs: ["نص مؤقت — الصياغة النهائية للشروط واعتمادها بانتظار المراجعة."],
      }],
    },
  },
};

export const policyVersions = {
  [currentPolicyVersion]: {
    version: currentPolicyVersion,
    recordedOn: "2026-10-04",
    status: "draft",
    effectiveOn: null,
    copy: policyDraft20261004,
  },
} as const;

export type PolicyVersion = keyof typeof policyVersions;

export function isPolicyVersion(value: unknown): value is PolicyVersion {
  return typeof value === "string" && Object.hasOwn(policyVersions, value);
}

export function getPolicyDocument(kind: PolicyKind, locale: Locale, version: PolicyVersion = currentPolicyVersion) {
  const snapshot = policyVersions[version];
  return { ...snapshot, labels: snapshot.copy[locale], document: snapshot.copy[locale][kind] };
}
