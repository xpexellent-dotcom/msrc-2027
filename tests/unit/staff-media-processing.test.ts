import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { boundedMediaBytes, MEDIA_MAX_BYTES, mediaMagic, processMedia } from "@/features/staff-portal/media-processing.server";

const source = () => sharp({ create: { width: 48, height: 32, channels: 3, background: "#563480" } });
describe("media image safety", () => {
  it.each(["jpeg", "png", "webp", "avif"] as const)("decodes %s by bytes and generates sanitized WebP", async (format) => {
    const bytes = await source().toFormat(format).toBuffer();
    expect(mediaMagic(bytes)).toBe(format);
    const result = await processMedia(bytes);
    expect(result).toMatchObject({ mime: "image/webp", width: 48, height: 32 });
    expect(result.variants).toHaveLength(4); expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    for (const variant of result.variants) expect((await sharp(variant.bytes).metadata()).format).toBe("webp");
  });
  it("strips real EXIF/GPS and orientation from every derivative", async () => {
    const bytes = await source().jpeg().withExif({ IFD0: { Copyright: "PRIVATE-SYNTHETIC", Orientation: "6" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "21/1 0/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "39/1 0/1 0/1" } }).toBuffer();
    const originalExif = (await sharp(bytes).metadata()).exif!;
    expect(originalExif).toBeDefined();
    // TIFF GPSInfo pointer 0x8825, LONG, one entry: assert this is real GPS EXIF.
    expect(originalExif.includes(Buffer.from([0x25, 0x88, 4, 0, 1, 0, 0, 0]))).toBe(true);
    const result = await processMedia(bytes);
    for (const variant of result.variants) {
      const metadata = await sharp(variant.bytes).metadata();
      expect(metadata.exif).toBeUndefined(); expect(metadata.xmp).toBeUndefined(); expect(metadata.iptc).toBeUndefined();
      expect(metadata.icc).toBeUndefined(); expect(metadata.orientation).toBeUndefined();
      expect(variant.bytes.includes(Buffer.from("PRIVATE-SYNTHETIC"))).toBe(false);
    }
  });
  it.each([Buffer.from("<svg><script>alert(1)</script></svg>"), Buffer.from("GIF89a"), Buffer.from("%PDF-1.7"), Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(0)])("rejects unsafe or truncated content", async (bytes) => {
    await expect(processMedia(bytes)).rejects.toMatchObject({ state: "upload-invalid" });
  });
  it("rejects oversized bytes before decode", async () => {
    await expect(processMedia(Buffer.alloc(MEDIA_MAX_BYTES + 1))).rejects.toMatchObject({ state: "upload-too-large" });
  });
  it("rejects oversized pixel dimensions despite small compressed size", async () => {
    const bytes = await sharp({ create: { width: 12001, height: 1, channels: 3, background: "white" } }).png().toBuffer();
    await expect(processMedia(bytes)).rejects.toMatchObject({ state: "upload-invalid" });
  });
  it("rejects animated WebP instead of silently retaining one frame", async () => {
    const pixels = Buffer.concat([Buffer.alloc(16 * 16 * 3, 0), Buffer.alloc(16 * 16 * 3, 255)]);
    const bytes = await sharp(pixels, { raw: { width: 16, height: 32, channels: 3, pageHeight: 16 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
    expect((await sharp(bytes, { animated: true }).metadata()).pages).toBe(2);
    await expect(processMedia(bytes)).rejects.toMatchObject({ state: "upload-invalid" });
  });
  it("rejects AVIF sequence and misleading brands outside ftyp", () => {
    const sequence = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypavis0000avifmif1")]);
    expect(mediaMagic(sequence)).toBeNull();
    expect(mediaMagic(Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from("ftypheic0000avif")]))).toBeNull();
  });
  it("deduplicates metadata differences using sanitized content", async () => {
    const clean = await source().png().toBuffer();
    const tagged = await source().png().withExif({ IFD0: { Artist: "Synthetic private name" } }).toBuffer();
    expect((await processMedia(clean)).sha256).toBe((await processMedia(tagged)).sha256);
  });
  it("bounds streamed bytes even with a false length header", async () => {
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MEDIA_MAX_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } }), { headers: { "content-length": "1" } });
    await expect(boundedMediaBytes(response)).rejects.toMatchObject({ state: "upload-too-large" });
  });
  it("accepts the exact byte limit and rejects declared overflow", async () => {
    expect((await boundedMediaBytes(new Response(new Uint8Array(MEDIA_MAX_BYTES)))).length).toBe(MEDIA_MAX_BYTES);
    await expect(boundedMediaBytes(new Response("x", { headers: { "content-length": String(MEDIA_MAX_BYTES + 1) } }))).rejects.toMatchObject({ state: "upload-too-large" });
  });
});
