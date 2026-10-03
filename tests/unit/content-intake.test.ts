import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conferenceConfig } from "@/config/conference";
import {
  buildTemplate, checkWorkbook, conferenceDays, formatReport, howToRows, howToSheetName, intakeSheets, readWorkbook,
  readZip, riyadhInstant, validateIntake, writeZip, type RawCell, type RawSheet,
} from "../../scripts/content-intake";

// Synthetic organizer rows only. Nothing here is an approved speaker, session or workshop.
type Values = Readonly<Record<string, RawCell | undefined>>;
const spec = (name: string) => intakeSheets.find((sheet) => sheet.name === name)!;

function sheet(name: string, rows: readonly Values[], options: { dropColumn?: string } = {}): RawSheet {
  const columns = spec(name).columns.filter((column) => column.key !== options.dropColumn);
  const table = new Map<number, Map<number, RawCell>>([[1, new Map(columns.map((column, index) => [index, column.header]))]]);
  rows.forEach((values, rowIndex) => table.set(5 + rowIndex, new Map(columns.flatMap((column, index): [number, RawCell][] => { const value = values[column.key]; return value === undefined ? [] : [[index, value]]; }))));
  return { name, rows: table };
}

const speaker: Values = {
  slug: "synthetic-speaker", status: "Approved", name: "Dr Synthetic Speaker", title: "Associate Professor", institution: "Synthetic University",
  biography: "A synthetic biography.", photo: "synthetic-speaker.jpg", photoAltEn: "Portrait of a synthetic speaker", photoAltAr: "صورة متحدث تجريبي",
  link1Label: "ORCID", link1Href: "https://orcid.org/0000-0000-0000-0000",
};
const session: Values = {
  slug: "synthetic-keynote", status: "Approved", day: "Day 2 - 28 January 2027", title: "Synthetic keynote", description: "A synthetic description.",
  start: "09:00", end: "09:45", formatCode: "keynote", formatEn: "Keynote", formatAr: "محاضرة رئيسية", topic: "Evidence",
  room: "Synthetic Hall", speakers: "synthetic-speaker", objectives: "1. First objective\n- Second objective",
};
const workshop: Values = {
  slug: "synthetic-workshop", status: "Draft", titleEn: "Synthetic workshop", titleAr: "ورشة تجريبية", descriptionEn: "Synthetic only.",
  descriptionAr: "وصف تجريبي.", instructors: "synthetic-speaker", date: "2027-01-26", start: "13:00", end: "16:00", capacity: 30,
  deadlineDate: "2027-01-20", deadlineTime: "23:59",
};

function check(rows: { speakers?: Values[]; sessions?: Values[]; workshops?: Values[] }) {
  return validateIntake([
    sheet("Speakers", rows.speakers ?? []), sheet("Sessions", rows.sessions ?? []), sheet("Workshops", rows.workshops ?? []),
  ]);
}
const messages = (result: ReturnType<typeof check>, level: "error" | "warning") =>
  result.problems.filter((problem) => problem.level === level).map((problem) => `${problem.sheet}|${problem.row}|${problem.column}|${problem.message}`);

describe("organizer content template (CMS-03)", () => {
  it("keeps the committed organizer workbook identical to the generated template", () => {
    expect(readFileSync("docs/content-intake/MSRC2027-website-content-template.xlsx").equals(buildTemplate())).toBe(true);
  });

  it("writes the how-to sheet and plain-English headers, requirement labels, hints and one example row per sheet", () => {
    const sheets = readWorkbook(buildTemplate());
    expect(sheets.map((item) => item.name)).toEqual([howToSheetName, "Speakers", "Sessions", "Workshops"]);
    const howTo = sheets[0];
    expect([...howTo.rows.get(1)!.values()]).toEqual([...howToRows[0]]);
    for (const [, arabic] of howToRows) expect(arabic).toMatch(/[؀-ۿ]/);
    for (const intake of intakeSheets) {
      const rows = sheets.find((item) => item.name === intake.name)!.rows;
      expect([...rows.get(1)!.values()]).toEqual(intake.columns.map((column) => column.header));
      expect([...rows.get(2)!.values()].every((label) => /^(Required|Optional)/.test(String(label)))).toBe(true);
      expect(rows.get(3)!.size).toBe(intake.columns.length);
      expect(String(rows.get(4)!.get(0))).toMatch(/^example-/);
      expect(intake.columns.filter((column) => column.requirement === "required").map((column) => column.key)).toContain("slug");
    }
  });

  it("adds Approved/Draft and conference-day dropdowns and whole-number seat validation", () => {
    const xml = readZip(buildTemplate());
    const sessions = xml.get("xl/worksheets/sheet3.xml")!.toString("utf8");
    expect(sessions).toContain('<formula1>"Approved,Draft"</formula1>');
    expect(sessions).toContain('<formula1>"Day 1 - 27 January 2027,Day 2 - 28 January 2027"</formula1>');
    expect(sessions).toContain('<pane xSplit="1" ySplit="3"');
    expect(xml.get("xl/worksheets/sheet4.xml")!.toString("utf8")).toMatch(/type="whole"[^>]*sqref="P5:P504"/);
  });

  it("uses the site's confirmed conference days and Riyadh time", () => {
    expect(conferenceDays).toEqual(conferenceConfig.dates);
    expect(conferenceConfig.timeZone).toBe("Asia/Riyadh");
    expect(riyadhInstant("2027-01-27", 9 * 60)).toBe("2027-01-27T06:00:00Z");
    expect(riyadhInstant("2027-01-27", 1)).toBe("2027-01-26T21:01:00Z");
  });

  it("treats the untouched template as empty, skipping guidance and example rows", () => {
    const result = checkWorkbook(buildTemplate());
    expect(result.problems).toEqual([]);
    expect(result.skippedExampleRows).toBe(3);
    expect(formatReport(result)).toContain("No problems found.");
  });
});

describe("organizer content import (CMS-03, PRG-01, WKS-01)", () => {
  it("turns valid rows into the site's speaker, session and workshop records", () => {
    const result = check({ speakers: [speaker], sessions: [session], workshops: [workshop] });
    expect(result.problems).toEqual([]);
    expect(result.speakers).toEqual([{
      slug: "synthetic-speaker", publication: "approved", name: "Dr Synthetic Speaker", title: "Associate Professor", institution: "Synthetic University",
      biography: "A synthetic biography.", portrait: "/media/speakers/synthetic-speaker.jpg",
      portraitAlt: { en: "Portrait of a synthetic speaker", ar: "صورة متحدث تجريبي" },
      professionalLinks: [{ label: "ORCID", href: "https://orcid.org/0000-0000-0000-0000" }],
    }]);
    expect(result.sessions).toEqual([{
      slug: "synthetic-keynote", publication: "approved", day: "day2", title: "Synthetic keynote", description: "A synthetic description.",
      startAt: "2027-01-28T06:00:00Z", endAt: "2027-01-28T06:45:00Z", category: { id: "keynote", label: { en: "Keynote", ar: "محاضرة رئيسية" } },
      topic: "Evidence", room: "Synthetic Hall", speakerSlugs: ["synthetic-speaker"], objectives: ["First objective", "Second objective"], recordingSlug: null,
    }]);
    expect(result.workshops).toEqual([{
      slug: "synthetic-workshop", publication: "draft", title: { en: "Synthetic workshop", ar: "ورشة تجريبية" },
      description: { en: "Synthetic only.", ar: "وصف تجريبي." }, instructorSlugs: ["synthetic-speaker"],
      startAt: "2027-01-26T10:00:00Z", endAt: "2027-01-26T13:00:00Z", room: null, eligibility: null, priceLabel: null,
      capacity: 30, remainingSeats: null, bookingDeadline: "2027-01-20T20:59:00Z",
    }]);
  });

  it("keeps optional fields null and a speaker without a photo valid", () => {
    const result = check({
      speakers: [{ ...speaker, photo: undefined, photoAltEn: undefined, photoAltAr: undefined, link1Label: undefined, link1Href: undefined }],
      sessions: [{ slug: "synthetic-untimed", status: "Draft", day: "Day 1 - 27 January 2027", title: "T", description: "D", formatCode: "panel", formatEn: "Panel", formatAr: "حلقة نقاش", topic: "Evidence" }],
    });
    expect(result.problems).toEqual([]);
    expect(result.speakers[0]).toMatchObject({ portrait: null, portraitAlt: { en: "", ar: "" }, professionalLinks: [] });
    expect(result.sessions[0]).toMatchObject({ startAt: null, endAt: null, room: null, speakerSlugs: [], objectives: [], recordingSlug: null });
  });

  it("accepts the ways Excel stores times and dates: fractions, serial numbers and 12-hour text", () => {
    const result = check({
      sessions: [{ ...session, speakers: undefined, start: 0.375, end: 46415.40625 }],
      workshops: [{ ...workshop, instructors: undefined, date: 46413, start: "1:00 pm", end: "4.00 PM", deadlineDate: undefined, deadlineTime: undefined }],
    });
    expect(result.problems).toEqual([]);
    expect(result.sessions[0]).toMatchObject({ startAt: "2027-01-28T06:00:00Z", endAt: "2027-01-28T06:45:00Z" });
    expect(result.workshops[0]).toMatchObject({ startAt: "2027-01-26T10:00:00Z", endAt: "2027-01-26T13:00:00Z" });
  });

  it("reports missing required fields, invalid choices and malformed IDs in plain language and blocks the row", () => {
    const result = check({ sessions: [{ slug: "Bad ID", status: "Maybe", day: "Day 3", start: "25:00" }] });
    expect(result.sessions).toEqual([]);
    expect(messages(result, "error")).toEqual(expect.arrayContaining([
      'Sessions|5|Session ID|"Bad ID" is not a valid ID. Use only lowercase English letters, numbers and single hyphens, for example example-opening-keynote.',
      'Sessions|5|Publication status|"Maybe" is not one of the allowed choices. Please choose "Approved" or "Draft" from the list.',
      'Sessions|5|Conference day|"Day 3" is not one of the allowed choices. Please choose "Day 1 - 27 January 2027" or "Day 2 - 28 January 2027" from the list.',
      "Sessions|5|Session title (English)|This is required. Please fill it in.",
      'Sessions|5|Start time|"25:00" is not a time this sheet understands. Please write it in 24-hour format, for example 09:30 or 14:00.',
    ]));
  });

  it("rejects duplicate IDs, reversed times and half-filled pairs", () => {
    const result = check({
      speakers: [speaker, { ...speaker, name: "Second" }, { ...speaker, slug: "synthetic-no-alt", photoAltAr: undefined, link1Href: undefined }],
      sessions: [{ ...session, start: "10:00", end: "09:30" }, { ...session, slug: "synthetic-open-ended", end: undefined }],
      workshops: [{ ...workshop, titleAr: undefined, priceEn: "Free", remaining: 40, deadlineTime: undefined }],
    });
    expect(result.speakers.map((record) => record.slug)).toEqual(["synthetic-speaker"]);
    expect(result.sessions).toEqual([]);
    expect(result.workshops).toEqual([]);
    expect(messages(result, "error")).toEqual(expect.arrayContaining([
      'Speakers|6|Speaker ID|The speaker ID "synthetic-speaker" is already used on row 5. Each speaker needs its own ID.',
      "Speakers|7|Photo description (Arabic)|A photo is listed, so a short Arabic description of the photo is required.",
      "Speakers|7|Link 1 web address|Link 1 has a name but no web address.",
      "Sessions|5|End time|The session ends (09:30) before or when it starts (10:00). Please check both times.",
      "Sessions|6|End time|There is a start time but no end time. Please add the end time.",
      "Workshops|5|Workshop title (Arabic)|This is required. Please fill it in.",
      "Workshops|5|Price (Arabic)|This is blank. Fill in the price in both English and Arabic, or leave both blank.",
      "Workshops|5|Seats still available|Seats still available (40) cannot be more than the number of seats (30).",
      "Workshops|5|Booking deadline time|There is a booking deadline date but no time. Please add the time, for example 23:59.",
    ]));
  });

  it("only accepts secure public web addresses for speaker links", () => {
    for (const href of ["http://example.org", "javascript:alert(1)", "www.example.org", "https://localhost"]) {
      const result = check({ speakers: [{ ...speaker, link1Href: href }] });
      expect(result.speakers).toEqual([]);
      expect(messages(result, "error")[0]).toContain("is not a full secure web address");
    }
  });

  it("warns about unknown or draft speakers, inconsistent format names and the wrong language", () => {
    const result = check({
      speakers: [{ ...speaker, status: "Draft", biography: "سيرة ذاتية" }],
      sessions: [{ ...session, speakers: "synthetic-speaker, synthetic-missing" }, { ...session, slug: "synthetic-second", formatEn: "Plenary", speakers: undefined }],
      workshops: [{ ...workshop, titleAr: "Synthetic workshop" }],
    });
    expect(messages(result, "error")).toEqual([]);
    expect(messages(result, "warning")).toEqual([
      "Speakers|5|Biography (English)|This contains Arabic text, but it is shown on the website in English. Please check it.",
      'Sessions|5|Speaker IDs|This session is Approved but the speaker "synthetic-speaker" is still Draft, so the speaker will not be shown yet.',
      'Sessions|5|Speaker IDs|No speaker with the ID "synthetic-missing" was found on the Speakers sheet. Check the spelling or add the speaker; until then they will not be shown on this session.',
      'Sessions|6|Session format name (English)|The format code "keynote" is named differently on row 5 ("Keynote" / "محاضرة رئيسية"). The website filter needs one name per code, so the row 5 names will be used.',
      "Workshops|5|Workshop title (Arabic)|This should be written in Arabic, but no Arabic text was found. Please check it.",
    ]);
    expect(result.sessions[1].category.label.en).toBe("Keynote");
  });

  it("explains a missing sheet, a missing column and a file that is not a workbook", () => {
    const missing = validateIntake([sheet("Speakers", []), sheet("Sessions", [], { dropColumn: "topic" })]);
    expect(messages(missing, "error")).toEqual([
      'Sessions|1|Topic|The column "Topic" is missing. Please copy your rows into a fresh copy of the template.',
      'Workshops|null|null|The "Workshops" sheet is missing. Please use the MSRC 2027 template and do not rename its sheets.',
    ]);
    expect(messages(checkWorkbook(Buffer.from("not a spreadsheet")), "error")).toEqual([
      "Workbook|null|null|This file is not an Excel workbook (.xlsx). Please save it as an Excel Workbook and try again.",
    ]);
    expect(checkWorkbook(buildTemplate().subarray(0, 4000)).problems[0].level).toBe("error");
  });

  it("reads shared strings, prefixed XML and reordered columns as other spreadsheet apps save them", () => {
    const headers = spec("Speakers").columns.map((column) => column.header).reverse();
    const values: Values = { ...speaker, photo: undefined, photoAltEn: undefined, photoAltAr: undefined };
    const ordered = spec("Speakers").columns.slice().reverse().map((column) => values[column.key]);
    const strings = [...headers, ...ordered.filter((value): value is string => value !== undefined)];
    const cell = (column: number, row: number, value: RawCell | undefined) => value === undefined ? ""
      : `<x:c r="${String.fromCharCode(65 + column)}${row}" t="s"><x:v>${strings.indexOf(String(value))}</x:v></x:c>`;
    const text = (value: string) => Buffer.from(value, "utf8");
    const file = writeZip([
      { name: "xl/workbook.xml", data: text('<x:workbook xmlns:x="m" xmlns:r="r"><x:sheets><x:sheet name="Speakers" sheetId="1" r:id="rId1"/></x:sheets></x:workbook>') },
      { name: "xl/_rels/workbook.xml.rels", data: text('<Relationships><Relationship Id="rId1" Target="/xl/worksheets/a.xml"/></Relationships>') },
      { name: "xl/sharedStrings.xml", data: text(`<x:sst>${strings.map((value) => `<x:si><x:r><x:t>${value.replace(/&/g, "&amp;")}</x:t></x:r><x:rPh><x:t>ignored</x:t></x:rPh></x:si>`).join("")}</x:sst>`) },
      { name: "xl/worksheets/a.xml", data: text(`<x:worksheet><x:sheetData><x:row r="1">${headers.map((header, index) => cell(index, 1, header)).join("")}</x:row><x:row r="9">${ordered.map((value, index) => cell(index, 9, value)).join("")}</x:row></x:sheetData></x:worksheet>`) },
    ]);
    const result = validateIntake(readWorkbook(file));
    expect(result.speakers).toMatchObject([{ slug: "synthetic-speaker", name: "Dr Synthetic Speaker", portrait: null }]);
    expect(messages(result, "error")).toEqual([
      'Sessions|null|null|The "Sessions" sheet is missing. Please use the MSRC 2027 template and do not rename its sheets.',
      'Workshops|null|null|The "Workshops" sheet is missing. Please use the MSRC 2027 template and do not rename its sheets.',
    ]);
  });

  it("reads a template filled in and saved by a third-party spreadsheet library", () => {
    const result = checkWorkbook(readFileSync("tests/unit/fixtures/content-intake-third-party.xlsx"));
    expect(result.problems).toEqual([]);
    expect(result.skippedExampleRows).toBe(3);
    expect(result.sessions[0]).toMatchObject({ slug: "opening", startAt: "2027-01-27T06:00:00Z", endAt: "2027-01-27T06:45:00Z", objectives: ["Obj one", "Obj two"] });
    expect(result.workshops[0]).toMatchObject({ startAt: "2027-01-26T10:00:00Z", capacity: 30, bookingDeadline: "2027-01-20T20:59:00Z" });
  });
});
