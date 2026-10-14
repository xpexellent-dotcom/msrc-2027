import type { Locale } from "@/lib/i18n";

/**
 * ORG-050: the organizer-supplied MSRC 2027 committee roster. Names, roles,
 * descriptions, profile links and photos were submitted by each person for this
 * page; photos are cropped, metadata-free -v1 derivatives in public/media/team.
 * Arabic names and the Arabic renderings of descriptions await organizer review.
 * Removal requests use the "Privacy & data requests" contact topic.
 */
export type TeamPerson = {
  slug: string;
  name: Record<Locale, string>;
  role: Record<Locale, string>;
  description?: Record<Locale, string>;
  profile?: string;
  photo?: string;
  members?: Record<Locale, string>[];
};

export type TeamCommittee = { id: "scientific" | "organization"; title: Record<Locale, string>; lead: TeamPerson; leads: TeamPerson[] };

const photo = (slug: string) => `/media/team/${slug}-v1.jpg`;

export const teamCommittees: TeamCommittee[] = [
  {
    id: "scientific",
    title: { en: "Scientific Committee", ar: "اللجنة العلمية" },
    lead: {
      slug: "abdulrahman-ismail", photo: photo("abdulrahman-ismail"),
      name: { en: "Abdulrahman Ismail Maqbool", ar: "عبدالرحمن إسماعيل مقبول" },
      role: { en: "Head of Scientific", ar: "رئاسة اللجنة العلمية" },
    },
    leads: [
      { slug: "heba-mousa", photo: photo("heba-mousa"), name: { en: "Heba Mousa", ar: "هبة موسى" }, role: { en: "Abstracts Lead", ar: "قيادة الملخصات البحثية" },
        description: { en: "Reading abstracts so you don't have to", ar: "أقرأ الملخصات حتى لا تضطر أنت لذلك" }, profile: "https://www.linkedin.com/in/heba-ahmed-mousa-412154380" },
      { slug: "akram-awan", photo: photo("akram-awan"), name: { en: "Akram Awan", ar: "أكرم عوان" }, role: { en: "Digital & Analytics Lead", ar: "قيادة الحلول الرقمية والتحليلات" } },
      { slug: "mohammad-alsayegh", photo: photo("mohammad-alsayegh"), name: { en: "Mohammad Alsayegh", ar: "محمد الصايغ" }, role: { en: "Scientific Officer", ar: "المسؤولية العلمية" },
        description: { en: "Dealing a hand, across all scientific operations", ar: "يد عون في كل العمليات العلمية" } },
      { slug: "reem-albeladi", name: { en: "Reem Albeladi", ar: "ريم البلادي" }, role: { en: "Judges & Faculty Lead", ar: "قيادة المحكّمين وأعضاء هيئة التدريس" },
        description: { en: "Behind every fair evaluation", ar: "خلف كل تقييم عادل" }, profile: "https://www.linkedin.com/in/reem-albeladi-8964ab347" },
      { slug: "toleen-alhindi", name: { en: "Toleen Alhindi", ar: "تولين الهندي" }, role: { en: "Awards Lead", ar: "قيادة الجوائز" },
        description: { en: "Just here to make things happen.", ar: "هنا لأحوّل الخطط إلى واقع." } },
      { slug: "laura-hamadi", name: { en: "Laura Hamadi", ar: "لورا حمادي" }, role: { en: "Academic Sessions Lead", ar: "قيادة الجلسات العلمية" },
        description: { en: "A shot of espresso", ar: "جرعة إسبريسو" }, profile: "https://www.linkedin.com/in/laura-h-b144913a1" },
      { slug: "aishah-baothman", name: { en: "Aishah Baothman", ar: "عائشة باعثمان" }, role: { en: "Program & Flow Lead", ar: "قيادة البرنامج وسير الفعاليات" },
        description: { en: "Professional disaster coordinator", ar: "تنسيق الكوارث باحتراف" }, profile: "https://www.linkedin.com/in/aishah-baothman-3711aa319" },
      { slug: "omar-alsaggaf", photo: photo("omar-alsaggaf"), name: { en: "Omar Alsaggaf", ar: "عمر السقاف" }, role: { en: "Hackathon Lead", ar: "قيادة الهاكاثون" },
        description: { en: "Can't hack a ton, but can Hackathon", ar: "لا أجيد الاختراق، لكنني أجيد الهاكاثون" }, profile: "https://www.linkedin.com/in/omar-alsaggaf-040865402" },
      { slug: "amal-sayqal", name: { en: "Amal Sayqal", ar: "أمل صيقل" }, role: { en: "3MT Lead", ar: "قيادة مسابقة الأطروحة في ثلاث دقائق" },
        description: { en: "Running on research and a strict 3-minute timer.", ar: "أعمل بالبحث العلمي ومؤقّت صارم من ثلاث دقائق." }, profile: "https://www.linkedin.com/in/amal-sayqal-319344144" },
    ],
  },
  {
    id: "organization",
    title: { en: "Organizing Committee", ar: "اللجنة التنظيمية" },
    lead: {
      slug: "fatima-alfrhah",
      name: { en: "Fatima Salem Alfrhah", ar: "فاطمة سالم الفرحة" },
      role: { en: "Head of Organization", ar: "رئاسة اللجنة التنظيمية" },
      description: { en: "Making MSRC happen, fueled by caffeine and panic.", ar: "نصنع MSRC بوقود من الكافيين والقلق." },
    },
    leads: [
      { slug: "ola-altaib", photo: photo("ola-altaib"), name: { en: "Ola Altaib", ar: "علا الطيب" }, role: { en: "Ambassadors & Outreach Lead", ar: "قيادة السفراء والتواصل" }, profile: "https://www.linkedin.com/in/ola-altaib-440008278" },
      { slug: "noor-alquait", name: { en: "Noor Faisal Alquait", ar: "نور فيصل القعيط" }, role: { en: "Registration Lead", ar: "قيادة التسجيل" },
        description: { en: "The first hello behind every great event", ar: "الترحيب الأول خلف كل فعالية مميزة" } },
      { slug: "majed-aljabri", photo: photo("majed-aljabri"), name: { en: "Majed Aljabri", ar: "ماجد الجابري" }, role: { en: "Logistics & AV Lead", ar: "قيادة الخدمات اللوجستية والصوتيات والمرئيات" },
        description: { en: "Behind the scenes, making it happen", ar: "خلف الكواليس، نصنع الحدث" } },
      { slug: "sara-qadi", photo: photo("sara-qadi"), name: { en: "Sara Qadi", ar: "سارة قاضي" }, role: { en: "VIP & Hospitality Lead", ar: "قيادة كبار الضيوف والضيافة" },
        description: { en: "Making MSRC feel like home, one guest at a time.", ar: "نجعل MSRC بيتًا لكل ضيف، ضيفًا تلو الآخر." }, profile: "https://www.linkedin.com/in/sara-qadi-542453390" },
      { slug: "esraa-metwalli", photo: photo("esraa-metwalli"), name: { en: "Esraa Metwalli", ar: "إسراء متولي" }, role: { en: "PR & Finance Lead", ar: "قيادة العلاقات العامة والمالية" } },
      { slug: "sulaf-alghamdi", photo: photo("sulaf-alghamdi"), name: { en: "Sulaf Alghamdi", ar: "سلاف الغامدي" }, role: { en: "Operation & Workforce Lead", ar: "قيادة العمليات والقوى العاملة" },
        description: { en: "Running operations, not from them", ar: "أدير العمليات ولا أهرب منها" }, profile: "https://www.linkedin.com/in/sulaf-alghamdi-774058219" },
      { slug: "hanadi-orayf", photo: photo("hanadi-orayf"), name: { en: "Hanadi Orayf", ar: "هنادي عريف" }, role: { en: "Media & Design Lead", ar: "قيادة الإعلام والتصميم" },
        description: { en: "Graphic design is my passion", ar: "التصميم الجرافيكي شغفي" }, profile: "https://www.linkedin.com/in/hanady-oraif-6684a62b9" },
      { slug: "sarah-tayeb", name: { en: "Sarah Tayeb", ar: "سارة طيب" }, role: { en: "Décor Lead", ar: "قيادة الديكور" },
        description: { en: "Turning ideas into aesthetics.", ar: "أحوّل الأفكار إلى جمال." } },
      { slug: "areen-youssef", name: { en: "Areen Youssef", ar: "أرين يوسف" }, role: { en: "Media Production Lead", ar: "قيادة الإنتاج الإعلامي" } },
      { slug: "lara-qawas", photo: photo("lara-qawas"), name: { en: "Lara Qawas", ar: "لارا قواص" }, role: { en: "Evaluation Lead", ar: "قيادة التقييم" },
        description: { en: "Looking back, so we can move forward.", ar: "ننظر إلى الوراء لنمضي إلى الأمام." } },
    ],
  },
];

export const teamCopy = {
  en: { leadersTitle: "Conference leaders", leadsLabel: "leads", members: "Members", membersPending: "Members to be announced", profile: "LinkedIn", removal: "Listed here? To update or remove your entry, contact us with the topic \"Privacy & data requests\".", removalLink: "Contact" },
  ar: { leadersTitle: "قيادة المؤتمر", leadsLabel: "قادة", members: "الأعضاء", membersPending: "سيُعلن عن الأعضاء لاحقًا", profile: "لينكدإن", removal: "هل اسمك مدرج هنا؟ لتحديث بياناتك أو حذفها، تواصل معنا باختيار موضوع «الخصوصية وطلبات البيانات».", removalLink: "تواصل معنا" },
} as const;

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
}
