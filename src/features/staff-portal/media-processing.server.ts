import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_WIDTHS = [640, 1280, 1920] as const;
export class MediaInputError extends Error {
  constructor(readonly state: "upload-invalid" | "upload-too-large") { super(state); }
}

/** File names and HTTP Content-Type are deliberately absent from this decision. */
export function mediaMagic(bytes: Uint8Array): "jpeg" | "png" | "webp" | "avif" | null {
  const b = Buffer.from(bytes);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.length >= 16 && b.toString("ascii", 4, 8) === "ftyp") {
    const size = b.readUInt32BE(0);
    if (size < 16 || size > b.length || size > 4096 || size % 4) return null;
    const brands = [b.toString("ascii", 8, 12)];
    for (let i = 16; i < size; i += 4) brands.push(b.toString("ascii", i, i + 4));
    if (brands.includes("avif") && !brands.includes("avis")) return "avif";
  }
  return null;
}

export async function processMedia(bytes: Uint8Array) {
  if (bytes.byteLength > MEDIA_MAX_BYTES) throw new MediaInputError("upload-too-large");
  const detected = mediaMagic(bytes);
  if (!detected) throw new MediaInputError("upload-invalid");
  try {
    const source = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning", animated: true });
    const metadata = await source.metadata();
    if ((metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height || metadata.width > 12000 || metadata.height > 12000
      || metadata.format !== (detected === "avif" ? "heif" : detected)) throw new MediaInputError("upload-invalid");
    // sharp removes EXIF, GPS, XMP, IPTC and ICC by default. Never call keepMetadata/withMetadata.
    const result = await source.autoOrient().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 }).toBuffer({ resolveWithObject: true });
    if (result.data.byteLength > MEDIA_MAX_BYTES) throw new MediaInputError("upload-too-large");
    const variants = [{ suffix: "", bytes: result.data }];
    for (const width of MEDIA_WIDTHS) variants.push({ suffix: `.${width}`, bytes: await sharp(result.data)
      .resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer() });
    return { variants, mime: "image/webp" as const, size: result.data.length, width: result.info.width, height: result.info.height,
      sha256: createHash("sha256").update(result.data).digest("hex") };
  } catch (error) { if (error instanceof MediaInputError) throw error; throw new MediaInputError("upload-invalid"); }
}

export function mediaVariantPaths(path: string) { return [path, ...MEDIA_WIDTHS.map((width) => path.replace(/\.webp$/, `.${width}.webp`))]; }

/** Enforce actual streamed bytes as well as the bucket limit / response header. */
export async function boundedMediaBytes(response: Response): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error("Media storage unavailable");
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MEDIA_MAX_BYTES)) { await response.body.cancel(); throw new MediaInputError("upload-too-large"); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > MEDIA_MAX_BYTES) { await reader.cancel(); throw new MediaInputError("upload-too-large"); } chunks.push(value); }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}
