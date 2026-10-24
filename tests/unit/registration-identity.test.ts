import { describe, expect, it } from "vitest";
import { normalizeIdentityNumber } from "@/features/registration/identity-number";
describe("ORG-064 identity validation and normalization", () => {
  it.each([
    ["national_id", "١٢٣٤٥٦٧٨٩٠", "1234567890"], ["national_id", "۱۲۳۴۵۶۷۸۹۰", "1234567890"],
    ["iqama", "٢٣٤٥٦٧٨٩٠١", "2345678901"], ["passport", " ab١٢٣ ", "AB123"],
    ["passport", "a".repeat(20), "A".repeat(20)],
  ] as const)("normalizes %s %s", (type, input, expected) => expect(normalizeIdentityNumber(type,input)).toBe(expected));
  it.each([
    ["national_id", "2345678901"], ["iqama", "1234567890"], ["national_id", "123456789"],
    ["iqama", "23456789012"], ["passport", "AB12"], ["passport", "A".repeat(21)],
    ["passport", "AB 123"], ["passport", "AB/123"], ["passport", "أب123"], ["passport", ""],
    ["national_id", null], ["passport", 12345], ["passport", "<script>"],
  ] as const)("rejects %s %s", (type, input) => expect(normalizeIdentityNumber(type,input)).toBeNull());
});
