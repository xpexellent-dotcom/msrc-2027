import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";
import type { LocalizedText, PublicSession, PublicSpeaker, PublicWorkshop } from "../src/content/conference-experiences";

/*
 * Organizer content intake for the public catalogue (CMS-03, PRG-01, WKS-01).
 *
 *   node scripts/content-intake.ts template [out.xlsx]   writes the blank organizer workbook
 *   node scripts/content-intake.ts check <filled.xlsx> [--out records.json]
 *
 * The workbook is plain OOXML written and read with node:zlib, so the intake adds no
 * dependency. `check` never edits the catalogue: it validates a returned workbook against
 * PublicSpeaker / PublicSession / PublicWorkshop and, only when nothing blocks the import,
 * writes the typed records as JSON for a reviewed catalogue change.
 */

// ---------------------------------------------------------------------------
// Column contract. The template, the dropdowns and the checker all read this.
// ---------------------------------------------------------------------------

export type Requirement = "required" | "optional" | "conditional";
export type ColumnKind = "id" | "status" | "day" | "text" | "english" | "arabic" | "idList" | "lines" | "time" | "date" | "count" | "url" | "photo";
export type Column = Readonly<{
  key: string; header: string; requirement: Requirement; requirementLabel?: string;
  kind: ColumnKind; hint: string; example: string; width: number;
}>;
export type SheetSpec = Readonly<{ name: "Speakers" | "Sessions" | "Workshops"; columns: readonly Column[] }>;

export const conferenceDays = Object.freeze({ day1: "2027-01-27", day2: "2027-01-28" });
export const statusOptions = Object.freeze({ Approved: "approved", Draft: "draft" } as const);
export const dayOptions = Object.freeze({ "Day 1 - 27 January 2027": "day1", "Day 2 - 28 January 2027": "day2" } as const);
const riyadhOffsetMinutes = 3 * 60; // Asia/Riyadh has no daylight saving; matches src/lib/conference-dates.ts.
const exampleIdPrefix = "example-";
const maxLinks = 3;
const photoExtensions = ["jpg", "jpeg", "png", "webp"];
export const portraitDirectory = "/media/speakers/";

const idHint = "Short unique code: lowercase letters, numbers and hyphens only (for example dr-sara-ahmed). Never reuse or change it once sent.";
const statusHint = "Approved = the organizing committee approved it for the public website. Draft = keep it hidden.";
const timeHint = "24-hour Riyadh time, for example 09:30 or 14:00. Leave blank if not confirmed.";

const statusColumn = (): Column => ({ key: "status", header: "Publication status", requirement: "required", kind: "status", hint: statusHint, example: "Draft", width: 18 });

const speakerColumns: Column[] = [
  { key: "slug", header: "Speaker ID", requirement: "required", kind: "id", hint: idHint, example: "example-speaker", width: 24 },
  statusColumn(),
  { key: "name", header: "Full name", requirement: "required", kind: "english", hint: "Name exactly as it should appear on the website, including any title such as Dr or Prof.", example: "Dr Example Speaker", width: 26 },
  { key: "title", header: "Job title", requirement: "required", kind: "english", hint: "Current position, in English.", example: "Associate Professor of Medicine", width: 30 },
  { key: "institution", header: "Institution", requirement: "required", kind: "english", hint: "University, hospital or organization, in English.", example: "Example University Hospital", width: 30 },
  { key: "biography", header: "Biography (English)", requirement: "required", kind: "english", hint: "A short professional biography in English. No phone numbers or private email addresses.", example: "Dr Example Speaker is a synthetic profile used only to show the format of this row.", width: 50 },
  { key: "photo", header: "Photo file name", requirement: "optional", kind: "photo", hint: "File name of the approved photo you are sending with this sheet (.jpg, .png or .webp). Leave blank if there is no photo.", example: "example-speaker.jpg", width: 24 },
  { key: "photoAltEn", header: "Photo description (English)", requirement: "conditional", requirementLabel: "Required if there is a photo", kind: "english", hint: "One sentence describing the photo for people who cannot see it.", example: "Portrait of Dr Example Speaker smiling, wearing a white coat.", width: 34 },
  { key: "photoAltAr", header: "Photo description (Arabic)", requirement: "conditional", requirementLabel: "Required if there is a photo", kind: "arabic", hint: "The same description in Arabic.", example: "صورة شخصية للدكتور المتحدث النموذجي مبتسمًا ويرتدي معطفًا أبيض.", width: 34 },
  ...Array.from({ length: maxLinks }, (_, index): Column[] => [
    { key: `link${index + 1}Label`, header: `Link ${index + 1} name`, requirement: "optional", kind: "text", hint: "What the link is, for example ORCID or University profile. Fill in both the name and the web address, or neither.", example: index === 0 ? "ORCID" : "", width: 20 },
    { key: `link${index + 1}Href`, header: `Link ${index + 1} web address`, requirement: "optional", kind: "url", hint: "Full public web address starting with https://", example: index === 0 ? "https://orcid.org/0000-0000-0000-0000" : "", width: 34 },
  ]).flat(),
];

const sessionColumns: Column[] = [
  { key: "slug", header: "Session ID", requirement: "required", kind: "id", hint: idHint, example: "example-opening-keynote", width: 26 },
  statusColumn(),
  { key: "day", header: "Conference day", requirement: "required", kind: "day", hint: "Choose the day from the list.", example: "Day 1 - 27 January 2027", width: 24 },
  { key: "title", header: "Session title (English)", requirement: "required", kind: "english", hint: "Scientific sessions are shown in English only.", example: "Example keynote on research methods", width: 36 },
  { key: "description", header: "Session description (English)", requirement: "required", kind: "english", hint: "Two to four sentences in English describing the session.", example: "A synthetic example description used only to show the format of this row.", width: 50 },
  { key: "start", header: "Start time", requirement: "optional", kind: "time", hint: timeHint, example: "09:00", width: 12 },
  { key: "end", header: "End time", requirement: "conditional", requirementLabel: "Required if there is a start time", kind: "time", hint: "24-hour Riyadh time, after the start time.", example: "09:45", width: 12 },
  { key: "formatCode", header: "Session format code", requirement: "required", kind: "id", hint: "Short code for the type of session, used for the website filter (for example keynote or panel). Use the same code every time for the same type.", example: "keynote", width: 20 },
  { key: "formatEn", header: "Session format name (English)", requirement: "required", kind: "english", hint: "How the type of session is shown in English. Must be the same on every row with this code.", example: "Keynote", width: 22 },
  { key: "formatAr", header: "Session format name (Arabic)", requirement: "required", kind: "arabic", hint: "How the type of session is shown in Arabic. Must be the same on every row with this code.", example: "محاضرة رئيسية", width: 22 },
  { key: "topic", header: "Topic", requirement: "required", kind: "english", hint: "The research area in a few English words. Visitors can search by it.", example: "Research methods", width: 24 },
  { key: "room", header: "Room", requirement: "optional", kind: "text", hint: "Room or hall name as signposted at the venue. Leave blank if not confirmed.", example: "", width: 18 },
  { key: "speakers", header: "Speaker IDs", requirement: "optional", kind: "idList", hint: "Speaker IDs from the Speakers sheet, separated by commas.", example: "example-speaker", width: 30 },
  { key: "objectives", header: "Learning objectives", requirement: "optional", kind: "lines", hint: "One objective per line (press Alt+Enter for a new line in Excel).", example: "Describe an example objective", width: 40 },
  { key: "recording", header: "Recording ID", requirement: "optional", kind: "id", hint: "Leave blank unless the web team gave you a recording ID.", example: "", width: 20 },
];

const workshopColumns: Column[] = [
  { key: "slug", header: "Workshop ID", requirement: "required", kind: "id", hint: idHint, example: "example-workshop", width: 24 },
  statusColumn(),
  { key: "titleEn", header: "Workshop title (English)", requirement: "required", kind: "english", hint: "Workshop name in English.", example: "Example hands-on workshop", width: 32 },
  { key: "titleAr", header: "Workshop title (Arabic)", requirement: "required", kind: "arabic", hint: "Workshop name in Arabic.", example: "ورشة عمل تطبيقية نموذجية", width: 32 },
  { key: "descriptionEn", header: "Workshop description (English)", requirement: "required", kind: "english", hint: "Two to four sentences in English.", example: "A synthetic example description used only to show the format of this row.", width: 46 },
  { key: "descriptionAr", header: "Workshop description (Arabic)", requirement: "required", kind: "arabic", hint: "The same description in Arabic.", example: "وصف نموذجي يوضح طريقة تعبئة هذا الصف فقط.", width: 46 },
  { key: "instructors", header: "Instructor speaker IDs", requirement: "optional", kind: "idList", hint: "Instructors' IDs from the Speakers sheet, separated by commas.", example: "example-speaker", width: 28 },
  { key: "date", header: "Date", requirement: "conditional", requirementLabel: "Required if there is a start time", kind: "date", hint: "Written as year-month-day, for example 2027-01-26. Leave blank if not confirmed.", example: "2027-01-26", width: 14 },
  { key: "start", header: "Start time", requirement: "optional", kind: "time", hint: timeHint, example: "13:00", width: 12 },
  { key: "end", header: "End time", requirement: "optional", kind: "time", hint: "24-hour Riyadh time, after the start time.", example: "16:00", width: 12 },
  { key: "room", header: "Room", requirement: "optional", kind: "text", hint: "Room or lab name. Leave blank if not confirmed.", example: "", width: 18 },
  { key: "eligibilityEn", header: "Who can attend (English)", requirement: "optional", kind: "english", hint: "Who the workshop is open to. Fill in English and Arabic, or leave both blank.", example: "", width: 30 },
  { key: "eligibilityAr", header: "Who can attend (Arabic)", requirement: "optional", kind: "arabic", hint: "The same in Arabic.", example: "", width: 30 },
  { key: "priceEn", header: "Price (English)", requirement: "optional", kind: "english", hint: "Approved price wording in English. Fill in English and Arabic, or leave both blank until the price is approved.", example: "", width: 20 },
  { key: "priceAr", header: "Price (Arabic)", requirement: "optional", kind: "arabic", hint: "The same in Arabic.", example: "", width: 20 },
  { key: "capacity", header: "Number of seats", requirement: "optional", kind: "count", hint: "Approved total number of seats, as a whole number. Leave blank if not approved.", example: "", width: 16 },
  { key: "remaining", header: "Seats still available", requirement: "optional", kind: "count", hint: "Usually leave blank. Only fill in if asked; it cannot be more than the number of seats.", example: "", width: 18 },
  { key: "deadlineDate", header: "Booking deadline date", requirement: "optional", kind: "date", hint: "Year-month-day, for example 2027-01-20. Leave blank if not confirmed.", example: "", width: 18 },
  { key: "deadlineTime", header: "Booking deadline time", requirement: "conditional", requirementLabel: "Required if there is a deadline date", kind: "time", hint: "24-hour Riyadh time, for example 23:59.", example: "", width: 18 },
];

export const intakeSheets: readonly SheetSpec[] = [
  { name: "Speakers", columns: speakerColumns },
  { name: "Sessions", columns: sessionColumns },
  { name: "Workshops", columns: workshopColumns },
];

export const howToSheetName = "How to fill this in";
/** English and Arabic instructions, paired row by row. The Arabic wording awaits organizer review. */
export const howToRows: readonly (readonly [string, string])[] = [
  ["How to fill in the MSRC 2027 website content sheet", "طريقة تعبئة جدول محتوى موقع المؤتمر MSRC 2027"],
  ["This workbook collects the speakers, sessions and workshops that will appear on the public conference website. Please only include information the organizing committee has approved for publication.", "يجمع هذا الملف بيانات المتحدثين والجلسات وورش العمل التي ستظهر على الموقع الإلكتروني العام للمؤتمر. يُرجى إدخال المعلومات المعتمدة للنشر من اللجنة المنظمة فقط."],
  ["1. Fill in the Speakers sheet first, then Sessions and Workshops. Sessions and workshops refer to speakers by their Speaker ID.", "١. ابدأ بتعبئة صفحة المتحدثين (Speakers)، ثم الجلسات (Sessions) وورش العمل (Workshops). تشير الجلسات وورش العمل إلى المتحدثين من خلال رمز المتحدث (Speaker ID)."],
  ["2. Each sheet has one row per item. Start on the first empty row below the yellow example row. The example row is ignored, so you can leave it or delete it.", "٢. يُخصَّص صف واحد لكل عنصر. ابدأ من أول صف فارغ أسفل الصف النموذجي المظلل بالأصفر. يتم تجاهل الصف النموذجي، ويمكنك إبقاؤه أو حذفه."],
  ["3. Row 2 says whether each column is Required or Optional. Required columns must be filled in for every row. Leave optional columns blank if the information is not confirmed yet.", "٣. يوضّح الصف الثاني ما إذا كان العمود إلزاميًا (Required) أو اختياريًا (Optional). يجب تعبئة الأعمدة الإلزامية في كل صف، واترك الأعمدة الاختيارية فارغة إذا لم تكن المعلومة مؤكدة بعد."],
  ["4. Row 3 explains what to write. Columns with a small arrow have a dropdown list: please choose from the list rather than typing.", "٤. يشرح الصف الثالث المطلوب كتابته في كل عمود. الأعمدة التي تظهر بها قائمة منسدلة يجب الاختيار منها بدلًا من الكتابة."],
  ["5. IDs are short codes made of lowercase English letters, numbers and hyphens, such as dr-sara-ahmed. Each ID must be unique and must not change after you send it.", "٥. الرموز (IDs) هي اختصارات تتكون من حروف إنجليزية صغيرة وأرقام وشرطات فقط، مثل dr-sara-ahmed. يجب أن يكون كل رمز فريدًا وألا يتغير بعد إرساله."],
  ["6. Session titles, descriptions, topics and speaker biographies are shown in English only. Columns marked (Arabic) must be written in Arabic.", "٦. تظهر عناوين الجلسات وأوصافها وموضوعاتها والسير الذاتية للمتحدثين باللغة الإنجليزية فقط. أما الأعمدة المكتوب بجانبها (Arabic) فيجب تعبئتها باللغة العربية."],
  ["7. Write times in 24-hour Riyadh time (for example 14:30) and dates as year-month-day (for example 2027-01-26).", "٧. اكتب الأوقات بنظام ٢٤ ساعة بتوقيت الرياض (مثل 14:30)، والتواريخ بصيغة سنة-شهر-يوم (مثل 2027-01-26)."],
  ["8. Choose Approved only for items the committee has approved for the public website. Choose Draft for anything still being confirmed; drafts are never shown.", "٨. اختر Approved فقط للعناصر التي اعتمدتها اللجنة للنشر على الموقع، واختر Draft لأي عنصر لا يزال قيد التأكيد؛ فالمسودات لا تظهر على الموقع."],
  ["9. Send speaker photos as separate files with this workbook, named exactly as in the Photo file name column. Do not paste photos into the sheet.", "٩. أرسل صور المتحدثين كملفات منفصلة مع هذا الملف، بأسماء مطابقة تمامًا لما هو مكتوب في عمود اسم ملف الصورة (Photo file name). لا تُلصق الصور داخل الجدول."],
  ["10. Do not add personal contact details such as phone numbers or private email addresses. Do not rename the sheets or change the headings in row 1.", "١٠. لا تُضف بيانات تواصل شخصية مثل أرقام الهواتف أو عناوين البريد الإلكتروني الخاصة، ولا تغيّر أسماء الصفحات أو العناوين في الصف الأول."],
  ["The web team will check the returned file and send you a plain-language list of anything that needs correcting before it goes online.", "سيراجع فريق الموقع الملف بعد إعادته، ويرسل إليكم قائمة واضحة بأي ملاحظات تحتاج إلى تصحيح قبل نشرها على الموقع."],
];

// ---------------------------------------------------------------------------
// Minimal OOXML workbook writer and reader.
// ---------------------------------------------------------------------------

type ZipEntry = Readonly<{ name: string; data: Buffer }>;

export function writeZip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  // Fixed 1 January 2027 00:00 DOS timestamp keeps the template byte-for-byte reproducible.
  const dosTime = 0;
  const dosDate = ((2027 - 1980) << 9) | (1 << 5) | 1;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const checksum = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, compressed);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const maxUnzippedBytes = 50 * 1024 * 1024;

export function readZip(file: Buffer): Map<string, Buffer> {
  let end = -1;
  for (let index = file.length - 22; index >= Math.max(0, file.length - 22 - 0xffff); index -= 1) {
    if (file.readUInt32LE(index) === 0x06054b50) { end = index; break; }
  }
  if (end < 0) throw new IntakeFileError("This file is not an Excel workbook (.xlsx). Please save it as an Excel Workbook and try again.");
  const count = file.readUInt16LE(end + 10);
  let position = file.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (file.readUInt32LE(position) !== 0x02014b50) throw new IntakeFileError("The workbook file is damaged. Please save it again from Excel and resend it.");
    const method = file.readUInt16LE(position + 10);
    const compressedSize = file.readUInt32LE(position + 20);
    const nameLength = file.readUInt16LE(position + 28);
    const extraLength = file.readUInt16LE(position + 30);
    const commentLength = file.readUInt16LE(position + 32);
    const localOffset = file.readUInt32LE(position + 42);
    const name = file.toString("utf8", position + 46, position + 46 + nameLength);
    const dataStart = localOffset + 30 + file.readUInt16LE(localOffset + 26) + file.readUInt16LE(localOffset + 28);
    const raw = file.subarray(dataStart, dataStart + compressedSize);
    if (method !== 0 && method !== 8) throw new IntakeFileError("The workbook uses a format this checker cannot read. Please save it as a normal Excel Workbook (.xlsx).");
    const data = method === 8 ? inflateRawSync(raw, { maxOutputLength: maxUnzippedBytes }) : Buffer.from(raw);
    total += data.length;
    if (total > maxUnzippedBytes) throw new IntakeFileError("The workbook is too large to check. Please remove pasted images or extra sheets and resend it.");
    entries.set(name, data);
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export class IntakeFileError extends Error {}

const escapeXml = (value: string) => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  // Control characters other than tab/newline are invalid in XML 1.0.
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

const unescapeXml = (value: string) => value
  .replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-f]+);/gi, (_, entity: string) => {
    const named: Record<string, string> = { lt: "<", gt: ">", quot: "\"", apos: "'", amp: "&" };
    if (entity[0] !== "#") return named[entity.toLowerCase()];
    return String.fromCodePoint(entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
  })
  .replace(/_x([0-9a-f]{4})_/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

export function columnLetter(index: number): string {
  let letters = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) letters = String.fromCharCode(65 + ((value - 1) % 26)) + letters;
  return letters;
}

function columnIndex(reference: string): number {
  const letters = /^[A-Z]+/i.exec(reference)?.[0].toUpperCase() ?? "";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

// Style indexes into the cellXfs list written by stylesXml().
const style = { default: 0, header: 1, required: 2, optional: 3, hint: 4, example: 5, text: 6, title: 7, body: 8, bodyArabic: 9, titleArabic: 10 } as const;

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><i/><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F4C5C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="2" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1" readingOrder="2"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1" readingOrder="2"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

type Cell = Readonly<{ value: string; style: number }>;

function rowXml(rowNumber: number, cells: readonly Cell[], height?: number): string {
  const content = cells.map((cell, index) => cell.value
    ? `<c r="${columnLetter(index)}${rowNumber}" s="${cell.style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`
    : `<c r="${columnLetter(index)}${rowNumber}" s="${cell.style}"/>`).join("");
  return `<row r="${rowNumber}"${height ? ` ht="${height}" customHeight="1"` : ""}>${content}</row>`;
}

const templateDataRows = 500;
const firstDataRow = 5;

function dropdownValues(column: Column): readonly string[] | null {
  if (column.kind === "status") return Object.keys(statusOptions);
  if (column.kind === "day") return Object.keys(dayOptions);
  return null;
}

function dataSheetXml(spec: SheetSpec): string {
  const columns = spec.columns;
  const last = `${columnLetter(columns.length - 1)}`;
  const rows = [
    rowXml(1, columns.map((column) => ({ value: column.header, style: style.header })), 32),
    rowXml(2, columns.map((column) => ({ value: requirementText(column), style: column.requirement === "optional" ? style.optional : style.required }))),
    rowXml(3, columns.map((column) => ({ value: column.hint, style: style.hint })), 78),
    rowXml(4, columns.map((column) => ({ value: column.example, style: style.example }))),
  ];
  const lastDataRow = firstDataRow + templateDataRows - 1;
  const validations = columns.flatMap((column, index) => {
    const range = `${columnLetter(index)}${firstDataRow}:${columnLetter(index)}${lastDataRow}`;
    const prompt = `promptTitle="${escapeXml(column.header.slice(0, 32))}" prompt="${escapeXml(column.hint.slice(0, 255))}"`;
    const options = dropdownValues(column);
    if (options) return [`<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Please choose from the list" error="${escapeXml(`Choose one of: ${options.join(", ")}`)}" ${prompt} sqref="${range}"><formula1>"${escapeXml(options.join(","))}"</formula1></dataValidation>`];
    if (column.kind === "count") return [`<dataValidation type="whole" operator="greaterThanOrEqual" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Whole number needed" error="Please enter a whole number, such as 30." ${prompt} sqref="${range}"><formula1>0</formula1></dataValidation>`];
    return [`<dataValidation type="none" allowBlank="1" showInputMessage="1" ${prompt} sqref="${range}"/>`];
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:${last}4"/>
<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="3" topLeftCell="B4" activePane="bottomRight" state="frozen"/><selection pane="topRight"/><selection pane="bottomLeft"/><selection pane="bottomRight" activeCell="A${firstDataRow}" sqref="A${firstDataRow}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" style="${style.text}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<dataValidations count="${validations.length}">${validations.join("")}</dataValidations>
<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function howToSheetXml(): string {
  const rows = howToRows.map(([english, arabic], index) => rowXml(index + 1, [
    { value: english, style: index === 0 ? style.title : style.body },
    { value: arabic, style: index === 0 ? style.titleArabic : style.bodyArabic },
  ], index === 0 ? 40 : 62));
  const legend = howToRows.length + 2;
  const legendRows = [
    rowXml(legend, [{ value: "Colour key", style: style.title }, { value: "دليل الألوان", style: style.titleArabic }]),
    rowXml(legend + 1, [{ value: "Required: must be filled in", style: style.required }, { value: "Required: يجب تعبئته", style: style.required }]),
    rowXml(legend + 2, [{ value: "Optional: leave blank if not confirmed", style: style.optional }, { value: "Optional: اتركه فارغًا إذا لم تتأكد المعلومة", style: style.optional }]),
    rowXml(legend + 3, [{ value: "Example row: ignored when the sheet is checked", style: style.example }, { value: "الصف النموذجي: يتم تجاهله عند المراجعة", style: style.example }]),
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:B${legend + 3}"/>
<sheetViews><sheetView tabSelected="1" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="70" customWidth="1"/><col min="2" max="2" width="70" customWidth="1"/></cols>
<sheetData>${[...rows, ...legendRows].join("")}</sheetData>
<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function requirementText(column: Column): string {
  if (column.requirement === "required") return "Required";
  if (column.requirement === "conditional") return column.requirementLabel ?? "Required";
  return "Optional";
}

export function buildTemplate(): Buffer {
  const sheetNames = [howToSheetName, ...intakeSheets.map((sheet) => sheet.name)];
  const sheetXml = [howToSheetXml(), ...intakeSheets.map(dataSheetXml)];
  const text = (value: string) => Buffer.from(value, "utf8");
  const relationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return writeZip([
    { name: "[Content_Types].xml", data: text(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetNames.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`) },
    { name: "_rels/.rels", data: text(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`) },
    { name: "docProps/core.xml", data: text(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>MSRC 2027 website content</dc:title><dc:creator>MSRC 2027 web team</dc:creator></cp:coreProperties>`) },
    { name: "xl/workbook.xml", data: text(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${relationships}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheetNames.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: text(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames.map((_, index) => `<Relationship Id="rId${index + 1}" Type="${relationships}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheetNames.length + 1}" Type="${relationships}/styles" Target="styles.xml"/></Relationships>`) },
    { name: "xl/styles.xml", data: text(stylesXml()) },
    ...sheetXml.map((xml, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: text(xml) })),
  ]);
}

/** A cell as Excel stored it: text, or a number (Excel keeps dates and times as numbers). */
export type RawCell = string | number;
export type RawSheet = Readonly<{ name: string; rows: ReadonlyMap<number, ReadonlyMap<number, RawCell>> }>;

const tagPattern = (tag: string) => `<(?:[A-Za-z_][\\w.-]*:)?${tag}\\b`;
const closePattern = (tag: string) => `</(?:[A-Za-z_][\\w.-]*:)?${tag}>`;
function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`(?:^|\\s)(?:[\\w.-]+:)?${name}="([^"]*)"`).exec(tag)?.[1];
}
function textRuns(xml: string): string {
  // Phonetic runs (<rPh>) are pronunciation hints, not cell text.
  const withoutPhonetic = xml.replace(new RegExp(`${tagPattern("rPh")}[\\s\\S]*?${closePattern("rPh")}`, "g"), "");
  const runs = withoutPhonetic.matchAll(new RegExp(`${tagPattern("t")}[^>]*?(?:/>|>([\\s\\S]*?)${closePattern("t")})`, "g"));
  return [...runs].map((match) => unescapeXml(match[1] ?? "")).join("");
}

export function readWorkbook(file: Buffer): RawSheet[] {
  const entries = readZip(file);
  const read = (name: string) => entries.get(name)?.toString("utf8");
  const workbook = read("xl/workbook.xml");
  if (!workbook) throw new IntakeFileError("This file does not look like an Excel workbook. Please use the MSRC 2027 template.");
  const date1904 = /<(?:\w+:)?workbookPr\b[^>]*date1904="(?:1|true)"/.test(workbook);
  const relationships = new Map<string, string>();
  for (const match of (read("xl/_rels/workbook.xml.rels") ?? "").matchAll(new RegExp(`${tagPattern("Relationship")}[^>]*>`, "g"))) {
    const id = attribute(match[0], "Id");
    const target = attribute(match[0], "Target");
    if (id && target) relationships.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }
  const sharedStrings = [...(read("xl/sharedStrings.xml") ?? "").matchAll(new RegExp(`${tagPattern("si")}[^>]*>([\\s\\S]*?)${closePattern("si")}`, "g"))].map((match) => textRuns(match[1]));
  const sheets: RawSheet[] = [];
  for (const match of workbook.matchAll(new RegExp(`${tagPattern("sheet")}[^>]*>`, "g"))) {
    const name = unescapeXml(attribute(match[0], "name") ?? "");
    const target = relationships.get(attribute(match[0], "id") ?? "");
    const xml = target ? read(target.replace(/\/\.\//g, "/")) : undefined;
    if (!xml) continue;
    sheets.push({ name, rows: parseSheet(xml, sharedStrings, date1904) });
  }
  return sheets;
}

function parseSheet(xml: string, sharedStrings: readonly string[], date1904: boolean): Map<number, Map<number, RawCell>> {
  const rows = new Map<number, Map<number, RawCell>>();
  let nextRow = 1;
  for (const rowMatch of xml.matchAll(new RegExp(`${tagPattern("row")}([^>]*?)(?:/>|>([\\s\\S]*?)${closePattern("row")})`, "g"))) {
    const rowNumber = Number(attribute(rowMatch[1], "r") ?? nextRow);
    nextRow = rowNumber + 1;
    const cells = new Map<number, RawCell>();
    let nextColumn = 0;
    for (const cellMatch of (rowMatch[2] ?? "").matchAll(new RegExp(`${tagPattern("c")}([^>]*?)(?:/>|>([\\s\\S]*?)${closePattern("c")})`, "g"))) {
      const reference = attribute(cellMatch[1], "r");
      const column = reference ? columnIndex(reference) : nextColumn;
      nextColumn = column + 1;
      const type = attribute(cellMatch[1], "t") ?? "n";
      const body = cellMatch[2] ?? "";
      const rawValue = new RegExp(`${tagPattern("v")}[^>]*>([\\s\\S]*?)${closePattern("v")}`).exec(body)?.[1];
      let value: RawCell | undefined;
      if (type === "inlineStr") value = textRuns(body);
      else if (type === "s") value = rawValue === undefined ? undefined : sharedStrings[Number(rawValue)];
      else if (type === "str" || type === "e") value = rawValue === undefined ? undefined : unescapeXml(rawValue);
      else if (type === "b") value = rawValue === "1" ? "TRUE" : "FALSE";
      else if (rawValue !== undefined && rawValue.trim() !== "") value = Number(rawValue) + (date1904 ? 1462 : 0);
      if (value !== undefined && value !== "") cells.set(column, value);
    }
    if (cells.size) rows.set(rowNumber, cells);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Validation: workbook rows -> typed catalogue records + plain-language problems.
// ---------------------------------------------------------------------------

export type Problem = Readonly<{ level: "error" | "warning"; sheet: string; row: number | null; column: string | null; message: string }>;
export type IntakeResult = Readonly<{
  speakers: PublicSpeaker[]; sessions: PublicSession[]; workshops: PublicWorkshop[];
  problems: Problem[]; skippedExampleRows: number;
}>;

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const arabicLetters = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const normalizeHeader = (value: string) => value.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();

type Row = Readonly<{ number: number; values: ReadonlyMap<string, RawCell> }>;

class Reporter {
  readonly problems: Problem[] = [];
  private readonly sheet: string;
  constructor(sheet: string) { this.sheet = sheet; }
  error(row: number | null, column: Column | null, message: string) { this.problems.push({ level: "error", sheet: this.sheet, row, column: column?.header ?? null, message }); }
  warning(row: number | null, column: Column | null, message: string) { this.problems.push({ level: "warning", sheet: this.sheet, row, column: column?.header ?? null, message }); }
}

function readRows(sheet: RawSheet | undefined, spec: SheetSpec, report: Reporter): { rows: Row[]; skippedExamples: number } {
  if (!sheet) {
    report.error(null, null, `The "${spec.name}" sheet is missing. Please use the MSRC 2027 template and do not rename its sheets.`);
    return { rows: [], skippedExamples: 0 };
  }
  const header = sheet.rows.get(1) ?? new Map<number, RawCell>();
  const positions = new Map<string, number>();
  for (const [index, value] of header) {
    const column = spec.columns.find((candidate) => normalizeHeader(candidate.header) === normalizeHeader(String(value)));
    if (column && !positions.has(column.key)) positions.set(column.key, index);
    else if (!column) report.warning(1, null, `The column "${String(value)}" is not part of the template, so it was ignored.`);
  }
  const missing = spec.columns.filter((column) => !positions.has(column.key));
  for (const column of missing) report.error(1, column, `The column "${column.header}" is missing. Please copy your rows into a fresh copy of the template.`);
  if (missing.length) return { rows: [], skippedExamples: 0 };

  const rows: Row[] = [];
  let skippedExamples = 0;
  for (const [number, cells] of [...sheet.rows].sort(([a], [b]) => a - b)) {
    if (number === 1) continue;
    const values = new Map<string, RawCell>();
    for (const column of spec.columns) {
      const raw = cells.get(positions.get(column.key)!);
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (value !== undefined && value !== "") values.set(column.key, value);
    }
    if (!values.size) continue;
    // Rows 2-3 repeat the template's own guidance; skip them wherever they ended up.
    const isGuidance = spec.columns.every((column) => {
      const value = values.get(column.key);
      return value === undefined || value === requirementText(column) || value === column.hint;
    });
    if (isGuidance) continue;
    const slug = values.get("slug");
    if (typeof slug === "string" && slug.toLowerCase().startsWith(exampleIdPrefix)) { skippedExamples += 1; continue; }
    rows.push({ number, values });
  }
  return { rows, skippedExamples };
}

class RowReader {
  private readonly row: Row;
  private readonly spec: SheetSpec;
  private readonly report: Reporter;
  constructor(row: Row, spec: SheetSpec, report: Reporter) { this.row = row; this.spec = spec; this.report = report; }
  column(key: string): Column { return this.spec.columns.find((column) => column.key === key)!; }
  has(key: string): boolean { return this.row.values.has(key); }
  private raw(key: string): RawCell | undefined { return this.row.values.get(key); }
  private error(key: string, message: string) { this.report.error(this.row.number, this.column(key), message); }
  warn(key: string, message: string) { this.report.warning(this.row.number, this.column(key), message); }

  text(key: string): string | null {
    const raw = this.raw(key);
    const column = this.column(key);
    if (raw === undefined) {
      if (column.requirement === "required") this.error(key, "This is required. Please fill it in.");
      return null;
    }
    const value = String(raw).replace(/\r\n?/g, "\n").trim();
    if (column.kind === "english" && arabicLetters.test(value)) this.warn(key, "This contains Arabic text, but it is shown on the website in English. Please check it.");
    if (column.kind === "arabic" && !arabicLetters.test(value)) this.warn(key, "This should be written in Arabic, but no Arabic text was found. Please check it.");
    return value;
  }

  id(key: string): string | null {
    const value = this.text(key);
    if (value === null) return null;
    if (!idPattern.test(value)) {
      this.error(key, `"${value}" is not a valid ID. Use only lowercase English letters, numbers and single hyphens, for example ${this.column(key).example || "dr-sara-ahmed"}.`);
      return null;
    }
    return value;
  }

  idList(key: string): string[] {
    const value = this.text(key);
    if (value === null) return [];
    const ids = value.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean);
    const valid = ids.filter((id) => {
      if (idPattern.test(id)) return true;
      this.error(key, `"${id}" is not a valid speaker ID. Speaker IDs use only lowercase letters, numbers and hyphens, separated by commas.`);
      return false;
    });
    const unique = [...new Set(valid)];
    if (unique.length !== valid.length) this.warn(key, "The same speaker ID is listed more than once; it will only be shown once.");
    return unique;
  }

  choice<T extends string>(key: string, options: Readonly<Record<string, T>>): T | null {
    const value = this.text(key);
    if (value === null) return null;
    const match = Object.entries(options).find(([label]) => normalizeHeader(label) === normalizeHeader(value));
    if (!match) {
      this.error(key, `"${value}" is not one of the allowed choices. Please choose ${Object.keys(options).map((label) => `"${label}"`).join(" or ")} from the list.`);
      return null;
    }
    return match[1];
  }

  /** Minutes after midnight, Riyadh time. */
  time(key: string): number | null {
    const raw = this.raw(key);
    if (raw === undefined) return null;
    if (typeof raw === "number") {
      const fraction = raw - Math.floor(raw);
      return Math.round(fraction * 24 * 60) % (24 * 60);
    }
    const match = /^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/i.exec(raw);
    const hours = match ? Number(match[1]) : NaN;
    const minutes = match ? Number(match[2]) : NaN;
    const meridiem = match?.[3]?.toLowerCase().replace(/\./g, "");
    if (!match || minutes > 59 || (meridiem ? hours < 1 || hours > 12 : hours > 23)) {
      this.error(key, `"${raw}" is not a time this sheet understands. Please write it in 24-hour format, for example 09:30 or 14:00.`);
      return null;
    }
    return ((hours % 12) + (meridiem === "pm" ? 12 : meridiem === "am" ? 0 : hours >= 12 ? 12 : 0)) * 60 + minutes;
  }

  date(key: string): string | null {
    const raw = this.raw(key);
    if (raw === undefined) return null;
    if (typeof raw === "number") {
      if (raw < 1 || raw > 2958465) { this.error(key, `"${raw}" is not a date. Please write it as year-month-day, for example 2027-01-26.`); return null; }
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(raw) * 86_400_000).toISOString().slice(0, 10);
    }
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
    const iso = match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : "";
    if (!match || Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) || new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) {
      this.error(key, `"${raw}" is not a date this sheet understands. Please write it as year-month-day, for example 2027-01-26.`);
      return null;
    }
    return iso;
  }

  count(key: string): number | null {
    const raw = this.raw(key);
    if (raw === undefined) return null;
    const value = typeof raw === "number" ? raw : Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(value) || value < 0) {
      this.error(key, `"${raw}" is not a whole number. Please enter a number such as 30, without words.`);
      return null;
    }
    return value;
  }

  url(key: string): string | null {
    const value = this.text(key);
    if (value === null) return null;
    let parsed: URL | null = null;
    try { parsed = new URL(value); } catch { parsed = null; }
    if (!parsed || parsed.protocol !== "https:" || !parsed.hostname.includes(".")) {
      this.error(key, `"${value}" is not a full secure web address. It must start with https://, for example https://orcid.org/0000-0000-0000-0000.`);
      return null;
    }
    return parsed.href;
  }

  /** Both languages or neither. */
  localized(englishKey: string, arabicKey: string, requiredHint: string): LocalizedText | null {
    const en = this.text(englishKey);
    const ar = this.text(arabicKey);
    if (en === null && ar === null) return null;
    if (en === null || ar === null) {
      const missing = en === null ? englishKey : arabicKey;
      // Required columns were already reported by text().
      if (this.column(missing).requirement !== "required") this.error(missing, `This is blank. ${requiredHint}`);
      return null;
    }
    return { en, ar };
  }
}

/** Riyadh wall-clock date and minutes to the UTC instant format used by the catalogue. */
export function riyadhInstant(date: string, minutes: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, minutes - riyadhOffsetMinutes)).toISOString().replace(".000Z", "Z");
}

const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Records the first row that uses an ID and reports any later reuse. */
function claimId(seen: Map<string, number>, slug: string | null, row: number, report: Reporter, column: Column, label: string) {
  if (!slug) return;
  const first = seen.get(slug);
  if (first !== undefined) report.error(row, column, `The ${label} ID "${slug}" is already used on row ${first}. Each ${label} needs its own ID.`);
  else seen.set(slug, row);
}

export function validateIntake(sheets: readonly RawSheet[]): IntakeResult {
  const problems: Problem[] = [];
  let skippedExampleRows = 0;
  const sheetByName = (name: string) => sheets.find((sheet) => sheet.name.trim().toLowerCase() === name.toLowerCase());
  const [speakerSpec, sessionSpec, workshopSpec] = intakeSheets;

  // Speakers
  const speakerReport = new Reporter(speakerSpec.name);
  const speakerRows = readRows(sheetByName(speakerSpec.name), speakerSpec, speakerReport);
  skippedExampleRows += speakerRows.skippedExamples;
  const speakers: PublicSpeaker[] = [];
  const speakerIds = new Map<string, number>();
  for (const row of speakerRows.rows) {
    const read = new RowReader(row, speakerSpec, speakerReport);
    const before = speakerReport.problems.filter((problem) => problem.level === "error").length;
    const slug = read.id("slug");
    claimId(speakerIds, slug, row.number, speakerReport, speakerSpec.columns[0], "speaker");
    const publication = read.choice("status", statusOptions);
    const name = read.text("name");
    const title = read.text("title");
    const institution = read.text("institution");
    const biography = read.text("biography");
    const photo = read.text("photo");
    let portrait: string | null = null;
    if (photo !== null) {
      const file = photo.split(/[\\/]/).pop()!;
      const extension = file.split(".").pop()?.toLowerCase() ?? "";
      if (!photoExtensions.includes(extension) || !/^[\w.-]+$/.test(file)) {
        read.warn("photo", `"${photo}" should be a photo file name such as dr-sara-ahmed.jpg (letters, numbers, hyphens; .jpg, .png or .webp). The web team will rename it if needed.`);
      }
      portrait = `${portraitDirectory}${encodeURIComponent(file)}`;
    }
    const altEn = read.text("photoAltEn");
    const altAr = read.text("photoAltAr");
    if (portrait && altEn === null) speakerReport.error(row.number, read.column("photoAltEn"), "A photo is listed, so a short English description of the photo is required.");
    if (portrait && altAr === null) speakerReport.error(row.number, read.column("photoAltAr"), "A photo is listed, so a short Arabic description of the photo is required.");
    if (!portrait && (altEn !== null || altAr !== null)) read.warn("photo", "There is a photo description but no photo file name. Add the photo file name or remove the description.");
    const professionalLinks: { label: string; href: string }[] = [];
    for (let index = 1; index <= maxLinks; index += 1) {
      const label = read.text(`link${index}Label`);
      const href = read.url(`link${index}Href`);
      if (label === null && read.has(`link${index}Href`)) speakerReport.error(row.number, read.column(`link${index}Label`), `Link ${index} has a web address but no name. Add a short name such as ORCID.`);
      else if (label !== null && !read.has(`link${index}Href`)) speakerReport.error(row.number, read.column(`link${index}Href`), `Link ${index} has a name but no web address.`);
      else if (label !== null && href !== null) professionalLinks.push({ label, href });
    }
    if (speakerReport.problems.filter((problem) => problem.level === "error").length > before) continue;
    speakers.push({
      slug: slug!, publication: publication!, name: name!, title: title!, institution: institution!, biography: biography!,
      portrait, portraitAlt: { en: altEn ?? "", ar: altAr ?? "" }, professionalLinks,
    });
  }
  problems.push(...speakerReport.problems);
  const speakerById = new Map(speakers.map((speaker) => [speaker.slug, speaker]));
  const checkSpeakers = (read: RowReader, key: string, ids: readonly string[], publication: "approved" | "draft" | null, label: string) => {
    for (const id of ids) {
      const speaker = speakerById.get(id);
      if (!speaker) read.warn(key, `No speaker with the ID "${id}" was found on the Speakers sheet. Check the spelling or add the speaker; until then they will not be shown on this ${label}.`);
      else if (publication === "approved" && speaker.publication !== "approved") read.warn(key, `This ${label} is Approved but the speaker "${id}" is still Draft, so the speaker will not be shown yet.`);
    }
  };

  // Sessions
  const sessionReport = new Reporter(sessionSpec.name);
  const sessionRows = readRows(sheetByName(sessionSpec.name), sessionSpec, sessionReport);
  skippedExampleRows += sessionRows.skippedExamples;
  const sessions: PublicSession[] = [];
  const sessionIds = new Map<string, number>();
  const formats = new Map<string, { label: LocalizedText; row: number }>();
  for (const row of sessionRows.rows) {
    const read = new RowReader(row, sessionSpec, sessionReport);
    const before = sessionReport.problems.filter((problem) => problem.level === "error").length;
    const slug = read.id("slug");
    claimId(sessionIds, slug, row.number, sessionReport, sessionSpec.columns[0], "session");
    const publication = read.choice("status", statusOptions);
    const day = read.choice("day", dayOptions);
    const title = read.text("title");
    const description = read.text("description");
    const start = read.time("start");
    const end = read.time("end");
    if (start === null && end !== null && !read.has("start")) sessionReport.error(row.number, read.column("start"), "There is an end time but no start time. Add the start time or remove the end time.");
    if (start !== null && end === null && !read.has("end")) sessionReport.error(row.number, read.column("end"), "There is a start time but no end time. Please add the end time.");
    if (start !== null && end !== null && end <= start) sessionReport.error(row.number, read.column("end"), `The session ends (${formatTime(end)}) before or when it starts (${formatTime(start)}). Please check both times.`);
    const formatCode = read.id("formatCode");
    const formatEn = read.text("formatEn");
    const formatAr = read.text("formatAr");
    if (formatCode && formatEn && formatAr) {
      const known = formats.get(formatCode);
      if (!known) formats.set(formatCode, { label: { en: formatEn, ar: formatAr }, row: row.number });
      else if (known.label.en !== formatEn || known.label.ar !== formatAr) {
        read.warn("formatEn", `The format code "${formatCode}" is named differently on row ${known.row} ("${known.label.en}" / "${known.label.ar}"). The website filter needs one name per code, so the row ${known.row} names will be used.`);
      }
    }
    const topic = read.text("topic");
    const room = read.text("room");
    const speakerSlugs = read.idList("speakers");
    const objectives = (read.text("objectives") ?? "").split("\n").map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
    const recordingSlug = read.id("recording");
    if (sessionReport.problems.filter((problem) => problem.level === "error").length > before) continue;
    checkSpeakers(read, "speakers", speakerSlugs, publication, "session");
    const date = conferenceDays[day!];
    sessions.push({
      slug: slug!, publication: publication!, day: day!, title: title!, description: description!,
      startAt: start === null ? null : riyadhInstant(date, start), endAt: end === null ? null : riyadhInstant(date, end),
      category: { id: formatCode!, label: formats.get(formatCode!)!.label }, topic: topic!, room,
      speakerSlugs, objectives, recordingSlug,
    });
  }
  problems.push(...sessionReport.problems);

  // Workshops
  const workshopReport = new Reporter(workshopSpec.name);
  const workshopRows = readRows(sheetByName(workshopSpec.name), workshopSpec, workshopReport);
  skippedExampleRows += workshopRows.skippedExamples;
  const workshops: PublicWorkshop[] = [];
  const workshopIds = new Map<string, number>();
  for (const row of workshopRows.rows) {
    const read = new RowReader(row, workshopSpec, workshopReport);
    const before = workshopReport.problems.filter((problem) => problem.level === "error").length;
    const slug = read.id("slug");
    claimId(workshopIds, slug, row.number, workshopReport, workshopSpec.columns[0], "workshop");
    const publication = read.choice("status", statusOptions);
    const title = read.localized("titleEn", "titleAr", "The workshop title is needed in both English and Arabic.");
    const description = read.localized("descriptionEn", "descriptionAr", "The workshop description is needed in both English and Arabic.");
    const instructorSlugs = read.idList("instructors");
    const date = read.date("date");
    const start = read.time("start");
    const end = read.time("end");
    if (!read.has("date") && (read.has("start") || read.has("end"))) workshopReport.error(row.number, read.column("date"), "There is a time but no date. Please add the workshop date.");
    if (!read.has("start") && read.has("end")) workshopReport.error(row.number, read.column("start"), "There is an end time but no start time. Add the start time or remove the end time.");
    if (start !== null && end !== null && end <= start) workshopReport.error(row.number, read.column("end"), `The workshop ends (${formatTime(end)}) before or when it starts (${formatTime(start)}). Please check both times.`);
    const room = read.text("room");
    const eligibility = read.localized("eligibilityEn", "eligibilityAr", "Fill in who can attend in both English and Arabic, or leave both blank.");
    const priceLabel = read.localized("priceEn", "priceAr", "Fill in the price in both English and Arabic, or leave both blank.");
    const capacity = read.count("capacity");
    const remainingSeats = read.count("remaining");
    if (capacity === 0) read.warn("capacity", "The number of seats is 0. Leave it blank if the number is not approved yet.");
    if (capacity !== null && remainingSeats !== null && remainingSeats > capacity) workshopReport.error(row.number, read.column("remaining"), `Seats still available (${remainingSeats}) cannot be more than the number of seats (${capacity}).`);
    if (capacity === null && remainingSeats !== null) read.warn("remaining", "Seats still available is filled in but the number of seats is blank. Please check both.");
    const deadlineDate = read.date("deadlineDate");
    const deadlineTime = read.time("deadlineTime");
    if (read.has("deadlineDate") && !read.has("deadlineTime")) workshopReport.error(row.number, read.column("deadlineTime"), "There is a booking deadline date but no time. Please add the time, for example 23:59.");
    if (!read.has("deadlineDate") && read.has("deadlineTime")) workshopReport.error(row.number, read.column("deadlineDate"), "There is a booking deadline time but no date. Please add the date.");
    if (workshopReport.problems.filter((problem) => problem.level === "error").length > before) continue;
    const startAt = date !== null && start !== null ? riyadhInstant(date, start) : null;
    const endAt = date !== null && end !== null ? riyadhInstant(date, end) : null;
    const bookingDeadline = deadlineDate !== null && deadlineTime !== null ? riyadhInstant(deadlineDate, deadlineTime) : null;
    if (date !== null && start === null) read.warn("start", "There is a date but no start time, so the website will show the time as to be announced.");
    if (bookingDeadline && startAt && Date.parse(bookingDeadline) > Date.parse(startAt)) read.warn("deadlineDate", "The booking deadline is after the workshop starts. Please check it.");
    checkSpeakers(read, "instructors", instructorSlugs, publication, "workshop");
    workshops.push({
      slug: slug!, publication: publication!, title: title!, description: description!, instructorSlugs,
      startAt, endAt, room, eligibility, priceLabel, capacity, remainingSeats, bookingDeadline,
    });
  }
  problems.push(...workshopReport.problems);

  return { speakers, sessions, workshops, problems, skippedExampleRows };
}

export function checkWorkbook(file: Buffer): IntakeResult {
  let sheets: RawSheet[];
  try {
    sheets = readWorkbook(file);
  } catch (error) {
    // Truncated or corrupt archives surface as RangeError/zlib errors; report them plainly.
    const message = error instanceof IntakeFileError ? error.message : "The workbook file is damaged or incomplete. Please save it again from Excel and resend it.";
    return { speakers: [], sessions: [], workshops: [], skippedExampleRows: 0, problems: [{ level: "error", sheet: "Workbook", row: null, column: null, message }] };
  }
  return validateIntake(sheets);
}

export function formatReport(result: IntakeResult): string {
  const errors = result.problems.filter((problem) => problem.level === "error");
  const warnings = result.problems.filter((problem) => problem.level === "warning");
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  const lines = [
    `Checked: ${plural(result.speakers.length, "speaker")}, ${plural(result.sessions.length, "session")} and ${plural(result.workshops.length, "workshop")} are ready.`,
  ];
  if (result.skippedExampleRows) lines.push(`Skipped ${plural(result.skippedExampleRows, "example row")}.`);
  const describe = (problem: Problem) => {
    const where = [problem.sheet, problem.row === null ? null : `row ${problem.row}`, problem.column ? `"${problem.column}"` : null].filter(Boolean).join(", ");
    return `  - ${where}: ${problem.message}`;
  };
  if (errors.length) lines.push("", `${plural(errors.length, "problem")} must be fixed before this sheet can be used:`, ...errors.map(describe));
  if (warnings.length) lines.push("", `${plural(warnings.length, "thing")} to double-check:`, ...warnings.map(describe));
  if (!errors.length && !warnings.length) lines.push("No problems found.");
  return lines.join("\n");
}

function main(argv: readonly string[]): number {
  const [command, ...rest] = argv;
  if (command === "template") {
    const target = resolve(rest[0] ?? "docs/content-intake/MSRC2027-website-content-template.xlsx");
    writeFileSync(target, buildTemplate());
    console.log(`Wrote the organizer template to ${target}`);
    return 0;
  }
  if (command === "check" && rest[0]) {
    const outIndex = rest.indexOf("--out");
    const result = checkWorkbook(readFileSync(resolve(rest[0])));
    console.log(formatReport(result));
    const blocked = result.problems.some((problem) => problem.level === "error");
    if (outIndex >= 0 && rest[outIndex + 1]) {
      if (blocked) console.log("\nNo records file was written because of the problems above.");
      else {
        const { speakers, sessions, workshops } = result;
        writeFileSync(resolve(rest[outIndex + 1]), `${JSON.stringify({ speakers, sessions, workshops }, null, 2)}\n`);
        console.log(`\nWrote the checked records to ${resolve(rest[outIndex + 1])}`);
      }
    }
    return blocked ? 1 : 0;
  }
  console.error("Usage:\n  node scripts/content-intake.ts template [out.xlsx]\n  node scripts/content-intake.ts check <filled.xlsx> [--out records.json]");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));
