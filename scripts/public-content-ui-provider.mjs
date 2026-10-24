// Loopback-only synthetic public RPC presentation harness. Never a database seed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { currentSiteImportManifest } from "../src/features/staff-portal/current-site-import.ts";

if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || process.env.VERCEL_TARGET_ENV) throw new Error("Synthetic content provider is local only");
const id = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const image = await sharp({ create: { width: 320, height: 320, channels: 3, background: "#ddd4e8" } }).webp().toBuffer();
const media = { path: `synthetic-content-published/${id(90)}/${id(91)}/image.webp`, altEn: "Synthetic sample image", altAr: "صورة عينة تجريبية", width: 320, height: 320, focalX: 25, focalY: 75 };
const row = (collection, n, fields, photo = null) => ({ id: id(n), collection, version: 2, fields: { sortOrder: n, ...fields }, media: photo });
const collections = {
  speakers: [row("speakers", 1, { nameEn: "Synthetic Speaker One", nameAr: "متحدث تجريبي أول", titleEn: "Synthetic role", titleAr: "صفة تجريبية", affiliationEn: "Synthetic institution", affiliationAr: "مؤسسة تجريبية", bioEn: "Synthetic biography for browser checks.", bioAr: "سيرة تجريبية لاختبارات المتصفح.", links: ["https://example.org/synthetic"] }, media)],
  sessions: [row("sessions", 2, { titleEn: "Synthetic Programme Session", titleAr: "جلسة برنامج تجريبية", descriptionEn: "Synthetic programme description.", descriptionAr: "وصف برنامج تجريبي.", day: "2027-01-27", startTime: "09:15", endTime: "10:00", type: "talk", roomEn: "Synthetic room", roomAr: "قاعة تجريبية", speakerIds: [id(1)] }),
    row("sessions", 6, { titleEn: "Synthetic Parallel Panel", titleAr: "جلسة متوازية تجريبية", descriptionEn: "Synthetic parallel discussion.", descriptionAr: "نقاش متواز تجريبي.", day: "2027-01-27", startTime: "09:15", endTime: "10:00", type: "panel", roomEn: "Synthetic room B", roomAr: "قاعة تجريبية ب", speakerIds: [] }),
    row("sessions", 5, { titleEn: "Synthetic Additional Day", titleAr: "يوم إضافي تجريبي", descriptionEn: "Synthetic additional date.", descriptionAr: "تاريخ إضافي تجريبي.", day: "2027-01-29", startTime: "11:00", endTime: "12:00", type: "panel", speakerIds: [] })],
  partners: [row("partners", 3, { nameEn: "Synthetic Partner", nameAr: "شريك تجريبي", tier: "platinum", url: "https://example.org/partner" }, media)],
  team: [row("team", 4, { nameEn: "Synthetic Team Member", nameAr: "عضو فريق تجريبي", titleEn: "Synthetic committee role", titleAr: "دور لجنة تجريبي", groupEn: "Synthetic Committee", groupAr: "لجنة تجريبية", links: [] }, media)],
};
// Approved current public files are projected through mocked Storage, never uploaded or seeded.
const archiveFiles = new Map();
const manifest = currentSiteImportManifest();
const importedMedia = await Promise.all(manifest.media.map(async (item, index) => {
  const publicPath = `synthetic-content-published/media/${item.sourceKey}/image.webp`;
  archiveFiles.set(publicPath, item.path);
  const dimensions = await sharp(await readFile(new URL(`../public${item.path}`, import.meta.url))).metadata();
  return { id: id(100 + index), slug: item.sourceKey, sourceKey: item.sourceKey, publicPath,
    ...item.fields, width: dimensions.width, height: dimensions.height };
}));
const archive = importedMedia.filter((item) => item.editionYear !== null);
collections.team = manifest.content.filter((item) => item.collection === "team").map((item, index) => {
  const photo = importedMedia.find((asset) => asset.sourceKey === item.photoSourceKey);
  return row("team", 300 + index, item.fields, photo ? { path: photo.publicPath, altEn: photo.altEn, altAr: photo.altAr,
    width: photo.width, height: photo.height, focalX: photo.focalX, focalY: photo.focalY } : null);
});
function send(response, status, body) { response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(body)); }
createServer(async (request, response) => {
  if (request.url === "/health") return send(response, 200, { synthetic: true });
  if (request.url === `/storage/v1/object/public/msrc-published-media/${media.path}`) { response.writeHead(200, { "content-type": "image/webp", "cache-control": "no-store" }); return response.end(image); }
  const storagePrefix = "/storage/v1/object/public/msrc-published-media/";
  if (request.url?.startsWith(storagePrefix)) {
    const sourcePath = request.url.slice(storagePrefix.length);
    const variant = /\.(640|1280|1920)\.webp$/.exec(sourcePath);
    const canonical = sourcePath.replace(/\.(640|1280|1920)\.webp$/, ".webp");
    const source = archiveFiles.get(canonical);
    if (!source) return send(response, 404, {});
    let bytes = await readFile(new URL(`../public${source}`, import.meta.url));
    bytes = await sharp(bytes).resize({ width: variant ? Number(variant[1]) : 2560, withoutEnlargement: true }).webp().toBuffer();
    response.writeHead(200, { "content-type": "image/webp", "cache-control": "no-store" }); return response.end(bytes);
  }
  if (request.method !== "POST" || !["/rest/v1/rpc/msrc_content_published", "/rest/v1/rpc/msrc_media_published"].includes(request.url)) return send(response, 404, {});
  if (request.headers.apikey !== "sb_secret_public_content_mock_only" || request.headers.authorization) return send(response, 403, {});
  let text = ""; for await (const chunk of request) { text += chunk; if (text.length > 4096) return send(response, 413, {}); }
  let body; try { body = JSON.parse(text); } catch { return send(response, 400, {}); }
  if (body.edition_key === "synthetic-content-down") return send(response, 503, { error: "synthetic database unavailable" });
  if (body.edition_key === "synthetic-content-empty") return send(response, 200, { items: [] });
  if (request.url === "/rest/v1/rpc/msrc_media_published") return body.edition_key === "synthetic-content-published" ? send(response, 200, { items: archive }) : send(response, 404, {});
  if (body.edition_key !== "synthetic-content-published" || !Object.hasOwn(collections, body.collection_key)) return send(response, 404, {});
  return send(response, 200, { items: collections[body.collection_key] });
}).listen(3230, "127.0.0.1");
