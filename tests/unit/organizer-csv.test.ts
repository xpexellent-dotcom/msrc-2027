import { describe, expect, it } from "vitest";
import { csvCell, csvDocument } from "@/lib/csv";

describe("ADM-03 CSV safety and Arabic Excel encoding", () => {
  it("starts with a UTF-8 BOM and uses quoted columns and CRLF", () => {
    const csv = csvDocument(["name", "value"], [["اسم تجريبي", "سطر, ثانٍ"], [null, true]]);
    expect([...Buffer.from(csv).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv).toBe('\uFEFF"name","value"\r\n"اسم تجريبي","سطر, ثانٍ"\r\n"","true"\r\n');
  });
  it.each(["=1+1", "+cmd", "-1+2", "@SUM(A1)", "  =1+1", "\t=1", "\rformula", "\nformula", "\uFEFF=1"])("neutralizes spreadsheet input %j", (value) => {
    expect(csvCell(value)).toBe('"\'' + value + '"');
  });
  it("escapes quotes, commas and embedded line breaks without losing Arabic", () => {
    expect(csvCell('قيمة "مقتبسة",\r\nثانية')).toBe('"قيمة ""مقتبسة"",\r\nثانية"');
  });
  it("keeps zero/false/null distinct and supports a header-only empty export", () => {
    expect([0, false, null].map(csvCell)).toEqual(['"0"', '"false"', '""']);
    expect(csvDocument(["count"], [])).toBe('\uFEFF"count"\r\n');
  });
});
