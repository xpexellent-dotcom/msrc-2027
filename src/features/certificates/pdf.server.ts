import "server-only";
import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type CertificateArtwork = { recipientName: string; certificateType: string; edition: string; activity: string; code: string; signature: string };
const fields = ["recipientName", "certificateType", "edition", "activity", "code", "signature"] as const;
const arabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/;
/** No external image, HTML, URL or user-selected font can enter this renderer. */
export function validCertificateArtwork(value: unknown): value is CertificateArtwork {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return fields.every((field) => typeof row[field] === "string" && (row[field] as string).trim().length > 0
    && (row[field] as string).length <= (field === "activity" ? 300 : 200)
    && !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(row[field] as string))
    && /^[a-f0-9]{48,64}$/.test(row.code as string);
}

export async function generateCertificatePdf(input: CertificateArtwork): Promise<Buffer> {
  if (!validCertificateArtwork(input)) throw new Error("Invalid certificate artwork");
  const latinPath = join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff");
  const [latin, arabicFont] = await Promise.all([
    readFile(latinPath),
    readFile(join(process.cwd(), "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff")),
  ]);
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0,
    info: { Title: input.certificateType, Author: "MSRC", Subject: "Participation certificate" }, font: latinPath });
  doc.registerFont("Latin", latin); doc.registerFont("Arabic", arabicFont);
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  // Branded placeholder only: no seal, institutional signature image or credit claim.
  const width = doc.page.width, height = doc.page.height;
  doc.rect(0, 0, width, height).fill("#F8F6F0");
  doc.rect(0, 0, width, 122).fill("#3B1E6D");
  doc.rect(0, 122, width, 4).fill("#C9A24A");
  doc.font("Latin").fontSize(24).fillColor("#F8F6F0").text("MSRC", 52, 32);
  doc.fontSize(12).text("Medical Students Research Conference", 52, 67);
  doc.fontSize(10).fillColor("#C9A24A").text("PLACEHOLDER", width - 180, 43, { width: 128, align: "right" });
  function line(value: string, y: number, initialSize: number, color = "#1F1930") {
    // Fontkit shapes Arabic. Split script runs so the Latin subset never loses Arabic glyphs.
    const logical = value.match(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s]+|[^\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s]+/gu) ?? [value];
    const runs = arabic.test(value[0]) ? [...logical].reverse() : logical;
    let size = initialSize;
    const measure = () => runs.reduce((total, run) => total + doc.font(arabic.test(run) ? "Arabic" : "Latin").fontSize(size).widthOfString(run), 0);
    while (measure() > width - 104 && size > 8) size--;
    if (measure() > width - 104) {
      // Long unbroken names/titles must stay inside the artwork at the smallest font.
      const parts: string[] = []; let part = "";
      for (const character of value) {
        const candidate = part + character;
        const segments = candidate.match(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s]+|[^\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s]+/gu) ?? [candidate];
        const candidateWidth = segments.reduce((total, segment) => total + doc.font(arabic.test(segment) ? "Arabic" : "Latin").fontSize(size).widthOfString(segment), 0);
        if (part && candidateWidth > width - 120) { parts.push(part); part = ""; }
        part += character;
      }
      if (part) parts.push(part);
      if (parts.length < 2 || parts.length > 4) throw new Error("Certificate text exceeds artwork bounds");
      parts.forEach((part, index) => line(part, y + index * 17, size, color));
      return;
    }
    let x = (width - measure()) / 2;
    doc.markContent("Span", { actual: value, lang: arabic.test(value) ? "ar" : "en" });
    for (const run of runs) {
      doc.font(arabic.test(run) ? "Arabic" : "Latin").fontSize(size).fillColor(color);
      const span = doc.widthOfString(run);
      doc.text(run, x, y, { lineBreak: false }); x += span;
    }
    doc.endMarkedContent();
  }
  line(input.certificateType, 162, 26, "#3B1E6D");
  line(input.recipientName, 232, 32);
  line(input.edition, 310, 16);
  line(input.activity, 347, 16);
  doc.moveTo(width / 2 - 110, 426).lineTo(width / 2 + 110, 426).strokeColor("#C9A24A").stroke();
  line(input.signature, 440, 14);
  doc.font("Latin").fontSize(9).fillColor("#3B1E6D").text(`Verification code: ${input.code}`, 52, height - 61, { width: width - 104, align: "center", lineBreak: false });
  doc.fontSize(9).fillColor("#1F1930").text("PLACEHOLDER template artwork", 52, height - 40, { width: width - 104, align: "center", lineBreak: false });
  doc.end();
  const pdf = await completed;
  if (pdf.length > 1_000_000) throw new Error("Certificate document exceeds private storage limit");
  return pdf;
}
