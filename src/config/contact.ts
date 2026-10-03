/** BL-PUB-06 / SUP-01–03. Fixed organizer routing; delivery is not approved. */
export const contactConfig = Object.freeze({
  deliveryEnabled: false,
  recipient: "contact@msrc2027.com",
  sender: "no-reply@msrc2027.com",
  // Engineering input bounds, not approved production rate/abuse policy.
  inputBounds: Object.freeze({
    name: 120,
    email: 254,
    relatedReference: 120,
    message: 4_000,
    subjectSummary: 80,
  }),
});

export const contactTopics = Object.freeze([
  { id: "general", tag: "[MSRC General]", label: { en: "General", ar: "استفسارات عامة" } },
  { id: "registration", tag: "[MSRC Registration]", label: { en: "Registration", ar: "التسجيل" } },
  { id: "abstracts", tag: "[MSRC Abstracts]", label: { en: "Research & abstracts", ar: "البحوث والملخصات" } },
  { id: "workshops", tag: "[MSRC Workshops]", label: { en: "Workshops", ar: "ورش العمل" } },
  { id: "hackathon", tag: "[MSRC Hackathon]", label: { en: "Hackathon", ar: "الهاكاثون" } },
  { id: "3mt", tag: "[MSRC 3MT]", label: { en: "3MT", ar: "مسابقة الأطروحة في ثلاث دقائق (3MT)" } },
  { id: "sponsors", tag: "[MSRC Sponsors]", label: { en: "Sponsors & partners", ar: "الرعاة والشركاء" } },
  { id: "support", tag: "[MSRC Support]", label: { en: "Website & account support", ar: "دعم الموقع والحساب" } },
  { id: "privacy", tag: "[MSRC Privacy]", label: { en: "Privacy & data requests", ar: "الخصوصية وطلبات البيانات" } },
] as const);

// Prevent an importer from changing routing or labels at runtime.
for (const topic of contactTopics) {
  Object.freeze(topic.label);
  Object.freeze(topic);
}

export type ContactTopicId = (typeof contactTopics)[number]["id"];
