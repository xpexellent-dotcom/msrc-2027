import type { PublicMedia } from "@/content/conference-experiences";
import { editionPhotoFocus } from "./edition-photo-framing.ts";

// MED-01–04 / LOC-01 / ARC-01. Organizer-selected Drive collection, 13 October 2026.
// Years follow the supplied filenames; historical photographs do not announce 2027 participants.
// Originals and source provenance stay outside public delivery. No named identities are inferred.
function photo(edition: 2023 | 2024 | 2025 | 2026, number: number, width: number, height: number,
  title: string, titleAr: string, description: string, descriptionAr: string): PublicMedia {
  return {
    slug: `msrc-${edition}-photo-${number}`, publication: "approved", access: "public",
    edition, kind: "photograph", title, titleAr, description, descriptionAr, width, height,
    objectPosition: editionPhotoFocus[`${edition}-${number}`],
    asset: `/media/editions/${edition}/photo-${number}.webp`, poster: null,
    topic: "", speakerNames: [], durationSeconds: null, sessionSlug: null,
  };
}

function video(number: number, durationSeconds: number, title: string, titleAr: string,
  description: string, descriptionAr: string): PublicMedia {
  return {
    slug: `msrc-2026-video-${number}`, publication: "approved", access: "public",
    edition: 2026, kind: "highlight", title, titleAr, description, descriptionAr,
    width: 1764, height: 1174, asset: `/media/editions/2026/video-${number}-silent-v2.mp4`,
    poster: `/media/editions/2026/video-${number}-poster.webp`,
    topic: "", speakerNames: [], durationSeconds, sessionSlug: null,
  };
}

export const editionMedia: readonly PublicMedia[] = [
  photo(2026, 1, 1673, 1106, "In the auditorium", "في القاعة",
    "An audience facing the stage and MSRC 2026 screens.", "الحضور أمام المسرح والشاشات التي تعرض اسم MSRC 2026."),
  photo(2026, 2, 1675, 1109, "Ready to welcome", "استعدادًا للترحيب",
    "Conference tote bags arranged on a table.", "حقائب المؤتمر مرتبة على طاولة."),
  photo(2026, 3, 1485, 1109, "Between presentations", "بين العروض",
    "Groups of participants gathered around research displays in the foyer.", "مجموعات من المشاركين حول شاشات الأبحاث في البهو."),
  photo(2026, 4, 1733, 1014, "Research in conversation", "حوار حول البحث",
    "A presenter discussing a research display with a group.", "مشارك يناقش عرضًا بحثيًا مع مجموعة من الحضور."),
  photo(2026, 5, 1535, 1012, "A shared occasion", "لقاء يجمعنا",
    "Conference attendees standing together in the auditorium.", "حضور المؤتمر يقفون معًا في القاعة."),
  photo(2026, 6, 1977, 1109, "On the panel", "على منصة الحوار",
    "Four panelists seated on stage, with one speaking into a microphone.", "أربعة مشاركين في جلسة حوارية على المسرح، يتحدث أحدهم عبر ميكروفون."),
  photo(2026, 7, 1646, 1092, "Presenting the findings", "عرض النتائج",
    "A presenter at the lectern beside projected research charts.", "متحدث عند المنصة بجوار رسوم بيانية بحثية معروضة على الشاشات."),
  photo(2026, 8, 1505, 969, "Perspectives on stage", "وجهات نظر على المسرح",
    "An audience watching a panel discussion on the conference stage.", "الحضور يتابعون جلسة حوارية على مسرح المؤتمر."),
  photo(2026, 9, 1663, 1111, "A moment of recognition", "لحظة تكريم",
    "Four people on stage during an award presentation.", "أربعة أشخاص على المسرح خلال تسليم جائزة."),
  // Photos 10–18: further MSRC 2026 photographs selected by the organizers on 23 October 2026.
  photo(2026, 10, 1800, 1012, "Opening the day", "افتتاح اليوم",
    "A full auditorium at the opening, with the screens showing a recitation from the Holy Qur'an.", "قاعة ممتلئة في الافتتاح، والشاشات تعرض تلاوة من القرآن الكريم."),
  photo(2026, 11, 1800, 1012, "The Dean's address", "كلمة العميد",
    "A speaker at the lectern during the Dean's address, shown on the auditorium screens.", "متحدث عند المنصة خلال كلمة العميد المعروضة على شاشات القاعة."),
  photo(2026, 12, 1800, 1012, "Leadership in healthcare", "القيادة في الرعاية الصحية",
    "Two speakers seated on stage for an expert talk on leadership in healthcare.", "متحدثان على المسرح في حوار الخبراء حول القيادة في الرعاية الصحية."),
  photo(2026, 13, 1800, 1012, "The research club", "نادي البحث",
    "A presenter at the lectern giving an overview of the research club.", "متحدثة عند المنصة تقدّم نبذة عن نادي البحث."),
  photo(2026, 14, 1800, 1012, "Overview of the conference", "نبذة عن المؤتمر",
    "Attendees seated in the auditorium as the conference overview begins.", "الحضور في القاعة مع بداية التعريف بالمؤتمر."),
  photo(2026, 15, 1600, 1200, "An expert in conversation", "حوار مع خبير",
    "Two speakers in conversation on stage beneath the expert talk slide.", "متحدثان في حوار على المسرح أسفل شريحة حوار الخبراء."),
  photo(2026, 16, 1600, 1200, "Posters in the foyer", "الملصقات في البهو",
    "Attendees reading research posters on digital screens in the foyer.", "حضور يطّلعون على الملصقات البحثية المعروضة على شاشات رقمية في البهو."),
  photo(2026, 17, 1600, 1200, "Presenting a poster", "عرض ملصق بحثي",
    "A presenter explaining a research poster on a digital screen to attendees.", "مشارك يشرح ملصقًا بحثيًا على شاشة رقمية للحضور."),
  photo(2026, 18, 1600, 1200, "Conversations between sessions", "أحاديث بين الجلسات",
    "Attendees talking in small groups in the foyer between poster screens.", "الحضور يتحدثون في مجموعات صغيرة في البهو بين شاشات الملصقات."),
  video(1, 6.7, "MSRC 2026 · Film 1", "MSRC 2026 · المقطع الأول", "A short film from MSRC 2026.", "مقطع قصير من مؤتمر MSRC 2026."),
  video(2, 4.733333, "MSRC 2026 · Film 2", "MSRC 2026 · المقطع الثاني", "A short film from MSRC 2026.", "مقطع قصير من مؤتمر MSRC 2026."),
  video(3, 4.166667, "MSRC 2026 · Film 3", "MSRC 2026 · المقطع الثالث", "A short film from MSRC 2026.", "مقطع قصير من مؤتمر MSRC 2026."),
  video(4, 2.833333, "MSRC 2026 · Film 4", "MSRC 2026 · المقطع الرابع", "A short film from MSRC 2026.", "مقطع قصير من مؤتمر MSRC 2026."),
  photo(2025, 1, 1346, 904, "Together in the auditorium", "معًا في القاعة",
    "Conference attendees seated in rows in the auditorium.", "حضور المؤتمر يجلسون في صفوف داخل القاعة."),
  photo(2025, 2, 1236, 668, "A welcome in the foyer", "الترحيب في البهو",
    "Participants gathered around the event welcome tables.", "مشاركون حول طاولات الاستقبال في الفعالية."),
  photo(2025, 3, 743, 582, "Discussing the research", "مناقشة البحث",
    "Three participants discussing a research display.", "ثلاثة مشاركين يناقشون عرضًا بحثيًا."),
  photo(2025, 4, 1153, 573, "A panel in conversation", "حوار على المنصة",
    "Four panelists seated on stage during a discussion.", "أربعة مشاركين في جلسة حوارية على المسرح."),
  photo(2024, 1, 1173, 1026, "At the lectern", "عند منصة التحدث",
    "A presenter at the lectern beneath the auditorium screens.", "متحدثة عند المنصة أسفل شاشات القاعة."),
  photo(2024, 2, 1333, 820, "The stage in focus", "حوار على المسرح",
    "A speaker beside a seated panel under the MSRC 2024 screens.", "متحدث بجوار المشاركين في جلسة حوارية تحت شاشات MSRC 2024."),
  photo(2023, 1, 1424, 874, "The research community gathers", "لقاء المجتمع البحثي",
    "A speaker addressing the audience in a tiered auditorium.", "متحدث يخاطب الحضور في قاعة مدرّجة."),
  photo(2023, 2, 753, 633, "Beside the research poster", "بجوار الملصق البحثي",
    "A presenter explaining a research poster to an attendee.", "مشاركة تشرح ملصقًا بحثيًا لأحد الحضور."),
];
