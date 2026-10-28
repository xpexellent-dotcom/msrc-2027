/**
 * ENG-087 / ORG-067. Ministry of Education directory, accessed 2026-10-28:
 * https://www.moe.gov.sa/ar/education/highereducation/Pages/UniversitiesList.aspx
 * https://www.moe.gov.sa/ar/education/highereducation/DataSources/GovernmentUniversities.aspx
 * https://www.moe.gov.sa/en/education/highereducation/DataSources/GovernmentUniversities.aspx
 * https://www.moe.gov.sa/ar/education/highereducation/DataSources/PrivateUniversities.aspx
 * https://www.moe.gov.sa/en/education/highereducation/DataSources/PrivateUniversities.aspx
 * https://www.moe.gov.sa/ar/education/highereducation/DataSources/PrivateColleges.aspx
 * Health disciplines and Buraidah location confirmed against Ministry tables:
 * https://www.moe.gov.sa/ar/knowledgecenter/dataandstats/edustatdata/DocLib/table9-2.html
 * https://www.moe.gov.sa/ar/knowledgecenter/dataandstats/edustatdata/DocLib/Table9-03_36-37.html
 * Riyadh Elm location: https://studyinsaudi.moe.gov.sa/ShortPrograms/Details/112
 * Northern Border location: https://www.moe.gov.sa/ar/mediacenter/MOEnews/Pages/north-border-un.aspx
 * Arabic directory location takes precedence where the English list contradicts it
 * (Imam Abdulrahman bin Faisal: Dammam). City is the directory's main location;
 * this is a selection aid, not an accreditation or campus-eligibility assertion.
 * Ministry names are retained; duplicate former college names are not separate entries.
 */
export type SaudiUniversity = {
  id: string; nameEn: string; nameAr: string; type: "public" | "private"; city: string;
};

export const SAUDI_UNIVERSITIES: readonly SaudiUniversity[] = [
  { id: "umm-al-qura", nameEn: "Umm Al-Qura University", nameAr: "جامعة أم القرى", type: "public", city: "Makkah" },
  { id: "islamic-university-madinah", nameEn: "Islamic University of Madinah", nameAr: "الجامعة الإسلامية", type: "public", city: "Madinah" },
  { id: "imam-muhammad-bin-saud", nameEn: "Imam Muhammad bin Saud Islamic University", nameAr: "جامعة الإمام محمد بن سعود الإسلامية", type: "public", city: "Riyadh" },
  { id: "king-saud", nameEn: "King Saud University", nameAr: "جامعة الملك سعود", type: "public", city: "Riyadh" },
  { id: "king-abdulaziz", nameEn: "King Abdulaziz University", nameAr: "جامعة الملك عبدالعزيز", type: "public", city: "Jeddah" },
  { id: "king-fahd-petroleum-minerals", nameEn: "King Fahd University of Petroleum and Minerals", nameAr: "جامعة الملك فهد للبترول والمعادن", type: "public", city: "Dhahran" },
  { id: "king-faisal", nameEn: "King Faisal University", nameAr: "جامعة الملك فيصل", type: "public", city: "Al-Ahsa" },
  { id: "king-khalid", nameEn: "King Khalid University", nameAr: "جامعة الملك خالد", type: "public", city: "Abha" },
  { id: "qassim", nameEn: "Qassim University", nameAr: "جامعة القصيم", type: "public", city: "Buraidah" },
  { id: "taibah", nameEn: "Taibah University", nameAr: "جامعة طيبة", type: "public", city: "Madinah" },
  { id: "taif", nameEn: "Taif University", nameAr: "جامعة الطائف", type: "public", city: "Taif" },
  { id: "hail", nameEn: "University of Ha'il", nameAr: "جامعة حائل", type: "public", city: "Hail" },
  { id: "jazan", nameEn: "Jazan University", nameAr: "جامعة جازان", type: "public", city: "Jazan" },
  { id: "jouf", nameEn: "Jouf University", nameAr: "جامعة الجوف", type: "public", city: "Sakaka" },
  { id: "al-baha", nameEn: "Al-Baha University", nameAr: "جامعة الباحة", type: "public", city: "Al-Baha" },
  { id: "tabuk", nameEn: "University of Tabuk", nameAr: "جامعة تبوك", type: "public", city: "Tabuk" },
  { id: "najran", nameEn: "Najran University", nameAr: "جامعة نجران", type: "public", city: "Najran" },
  { id: "northern-border", nameEn: "Northern Border University", nameAr: "جامعة الحدود الشمالية", type: "public", city: "Arar" },
  { id: "princess-nourah", nameEn: "Princess Nourah Bint Abdul Rahman University", nameAr: "جامعة الأميرة نورة بنت عبدالرحمن", type: "public", city: "Riyadh" },
  { id: "king-saud-health-sciences", nameEn: "King Saud bin Abdulaziz University for Health Sciences", nameAr: "جامعة الملك سعود بن عبدالعزيز للعلوم الصحية", type: "public", city: "Riyadh" },
  { id: "imam-abdulrahman-bin-faisal", nameEn: "Imam Abdulrahman bin Faisal University", nameAr: "جامعة الإمام عبدالرحمن بن فيصل", type: "public", city: "Dammam" },
  { id: "prince-sattam", nameEn: "Prince Sattam bin Abdulaziz University", nameAr: "جامعة الأمير سطام بن عبدالعزيز", type: "public", city: "Al-Kharj" },
  { id: "shaqra", nameEn: "Shaqra University", nameAr: "جامعة شقراء", type: "public", city: "Shaqra" },
  { id: "majmaah", nameEn: "Majmaah University", nameAr: "جامعة المجمعة", type: "public", city: "Majmaah" },
  { id: "saudi-electronic", nameEn: "Saudi Electronic University", nameAr: "الجامعة السعودية الإلكترونية", type: "public", city: "Riyadh" },
  { id: "jeddah", nameEn: "University of Jeddah", nameAr: "جامعة جدة", type: "public", city: "Jeddah" },
  { id: "bisha", nameEn: "University of Bisha", nameAr: "جامعة بيشة", type: "public", city: "Bisha" },
  { id: "king-abdullah-science-technology", nameEn: "King Abdullah University of Science and Technology", nameAr: "جامعة الملك عبدالله للعلوم والتقنية", type: "public", city: "Thuwal" },
  { id: "hafr-al-batin", nameEn: "University of Hafr Al Batin", nameAr: "جامعة حفر الباطن", type: "public", city: "Hafr Al Batin" },
  { id: "arab-open", nameEn: "Arab Open University", nameAr: "الجامعة العربية المفتوحة", type: "private", city: "Riyadh" },
  { id: "business-technology", nameEn: "University of Business and Technology", nameAr: "جامعة الأعمال والتكنولوجيا", type: "private", city: "Jeddah" },
  { id: "prince-sultan", nameEn: "Prince Sultan University", nameAr: "جامعة الأمير سلطان", type: "private", city: "Riyadh" },
  { id: "fahad-bin-sultan", nameEn: "Fahad bin Sultan University", nameAr: "جامعة الأمير فهد بن سلطان", type: "private", city: "Tabuk" },
  { id: "prince-mohammad-bin-fahd", nameEn: "Prince Mohammad bin Fahd University", nameAr: "جامعة الأمير محمد بن فهد", type: "private", city: "Al-Khobar" },
  { id: "prince-mugrin", nameEn: "University of Prince Mugrin", nameAr: "جامعة الأمير مقرن بن عبدالعزيز", type: "private", city: "Madinah" },
  { id: "alfaisal", nameEn: "Alfaisal University", nameAr: "جامعة الفيصل", type: "private", city: "Riyadh" },
  { id: "al-yamamah", nameEn: "Al Yamamah University", nameAr: "جامعة اليمامة", type: "private", city: "Riyadh" },
  { id: "dar-al-uloom", nameEn: "Dar Al Uloom University", nameAr: "جامعة دار العلوم", type: "private", city: "Riyadh" },
  { id: "effat", nameEn: "Effat University", nameAr: "جامعة عفت", type: "private", city: "Jeddah" },
  { id: "dar-al-hekma", nameEn: "Dar Al-Hekma University", nameAr: "جامعة دار الحكمة", type: "private", city: "Jeddah" },
  { id: "riyadh-elm", nameEn: "Riyadh Elm University", nameAr: "جامعة رياض العلم", type: "private", city: "Riyadh" },
  { id: "al-maarefa", nameEn: "Al Maarefa University", nameAr: "جامعة المعرفة", type: "private", city: "Diriyah" },
  { id: "mustaqbal", nameEn: "Mustaqbal University", nameAr: "جامعة المستقبل", type: "private", city: "Buraidah" },
  { id: "sulaiman-al-rajhi", nameEn: "Sulaiman Al Rajhi University", nameAr: "جامعة سليمان الراجحي", type: "private", city: "Al-Bukayriyah" },
  { id: "ibn-sina", nameEn: "Ibn Sina National College", nameAr: "كلية ابن سينا الاهلية", type: "private", city: "Jeddah" },
  { id: "batterjee-medical", nameEn: "Batterjee Medical College", nameAr: "كلية البترجي الطبية للعلوم والتكنولوجيا", type: "private", city: "Jeddah" },
  { id: "al-riyada-health", nameEn: "Al-Riyada College for Health Science", nameAr: "كلية الريادة للعلوم الصحية", type: "private", city: "Jeddah" },
  { id: "al-rayan", nameEn: "Al-Rayan College", nameAr: "كليات الريان الأهلية بالمدينة المنورة", type: "private", city: "Madinah" },
  { id: "inaya-medical", nameEn: "Inaya Medical Colleges", nameAr: "كلية العناية الطبية", type: "private", city: "Riyadh" },
  { id: "al-ghad-medical", nameEn: "Al Ghad International College for Applied Medical Science", nameAr: "كلية الغد الدولية للعلوم الطبية التطبيقية", type: "private", city: "Riyadh" },
  { id: "vision-jeddah", nameEn: "Vision Colleges in Jeddah", nameAr: "كلية الرؤية لطب الأسنان والتمريض بجدة", type: "private", city: "Jeddah" },
  { id: "vision-riyadh", nameEn: "Vision Colleges in Riyadh", nameAr: "كلية الرؤية بالرياض", type: "private", city: "Riyadh" },
  { id: "buraydah-colleges", nameEn: "Buraydah College", nameAr: "كليات بريدة الأهلية", type: "private", city: "Buraidah" },
  { id: "saad-nursing-health", nameEn: "Saad College of Nursing and Allied Health Sciences", nameAr: "كلية سعد للتمريض والعلوم الصحية", type: "private", city: "Al-Khobar" },
  { id: "fakeeh-medical", nameEn: "Fakeeh College for Medical Science", nameAr: "كلية فقيه للعلوم الطبية", type: "private", city: "Jeddah" },
  { id: "mohammed-al-mana-medical", nameEn: "Mohammed Al Mana College for Medical Science", nameAr: "كلية محمد المانع للعلوم الطبية", type: "private", city: "Dammam" },
  { id: "northern-nursing", nameEn: "Northern College of Nursing", nameAr: "كلية الشمال للتمريض", type: "private", city: "Arar" },
  { id: "almoosa-health", nameEn: "Almoosa College of Health Science", nameAr: "كلية الموسى للعلوم الصحية", type: "private", city: "Al-Ahsa" },
];

/** Both scripts, tashkeel, tatweel, hamza forms and optional Arabic definite article. */
export function normalizeUniversitySearch(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim().split(/\s+/u).map((word) => word.replace(/^(?:ال)+/u, "")).join(" ");
}

export function searchSaudiUniversities(query: string): SaudiUniversity[] {
  const terms = normalizeUniversitySearch(query).split(" ").filter(Boolean);
  return SAUDI_UNIVERSITIES.filter((university) => {
    const haystack = normalizeUniversitySearch(`${university.nameEn} ${university.nameAr} ${university.city}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export function isSaudiUniversityId(value: unknown): value is string {
  return typeof value === "string" && SAUDI_UNIVERSITIES.some(({ id }) => id === value);
}
