import { describe, expect, it } from "vitest";
import { COUNTRIES, COUNTRY_CODES, isCountryCode } from "@/content/countries";
import { isSaudiUniversityId, normalizeUniversitySearch, SAUDI_UNIVERSITIES, searchSaudiUniversities } from "@/content/saudi-universities";

describe("ENG-087 bilingual profile reference data", () => {
  it("uses unique stable Ministry institution IDs with bilingual names and locations", () => {
    expect(SAUDI_UNIVERSITIES).toHaveLength(58);
    expect(SAUDI_UNIVERSITIES.filter(({ type }) => type === "public")).toHaveLength(29);
    expect(new Set(SAUDI_UNIVERSITIES.map(({ id }) => id)).size).toBe(SAUDI_UNIVERSITIES.length);
    for (const institution of SAUDI_UNIVERSITIES) {
      expect(institution.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(institution.nameEn.length).toBeGreaterThan(4);
      expect(institution.nameAr).toMatch(/[\u0621-\u064a]/);
      expect(institution.city.length).toBeGreaterThan(2);
      expect(isSaudiUniversityId(institution.id)).toBe(true);
    }
    expect(isSaudiUniversityId("unapproved-institution")).toBe(false);
  });

  it("matches English, Arabic, mixed queries, accents, tashkeel and optional al prefixes", () => {
    for (const query of ["KING ABDULAZIZ", "kíng abdulaziz", "جَامِعَة المَلِك عَبدالعَزِيز", "جامعة ملك عبدالعزيز", "King عبدالعزيز"]) {
      expect(searchSaudiUniversities(query).map(({ id }) => id)).toContain("king-abdulaziz");
    }
    expect(normalizeUniversitySearch("الإِلِكْتُرُونِيَّة")).toBe(normalizeUniversitySearch("الكترونية"));
    expect(searchSaudiUniversities("qassim").map(({ id }) => id)).toContain("qassim");
    expect(searchSaudiUniversities("رِيَاض العِلْم").map(({ id }) => id)).toEqual(["riyadh-elm"]);
    expect(searchSaudiUniversities("not a Saudi university")).toEqual([]);
    expect(searchSaudiUniversities("  ")).toHaveLength(SAUDI_UNIVERSITIES.length);
  });

  it("offers assigned ISO alpha-2 values with English and Arabic names", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    expect(COUNTRIES.find(({ code }) => code === "SA")).toMatchObject({ nameEn: "Saudi Arabia", nameAr: "المملكة العربية السعودية" });
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.nameEn).not.toBe(country.code);
      expect(country.nameAr).toMatch(/[\u0621-\u064a]/);
      expect(isCountryCode(country.code)).toBe(true);
    }
    for (const value of ["sa", "ZZ", "UK", "SU", "", null, 966]) expect(isCountryCode(value)).toBe(false);
  });
});
