// Loopback-only synthetic public RPC presentation harness. Never a database seed.
import { createServer } from "node:http";
import sharp from "sharp";

if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || process.env.VERCEL_TARGET_ENV) throw new Error("Synthetic content provider is local only");
const id = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const image = await sharp({ create: { width: 320, height: 320, channels: 3, background: "#ddd4e8" } }).webp().toBuffer();
const media = { path: `synthetic-content-published/${id(90)}/${id(91)}/image.webp`, altEn: "Synthetic sample image", altAr: "صورة عينة تجريبية", width: 320, height: 320, focalX: 25, focalY: 75 };
const row = (collection, n, fields, photo = null) => ({ id: id(n), collection, version: 2, fields: { sortOrder: n, ...fields }, media: photo });
const collections = {
  speakers: [row("speakers", 1, { nameEn: "Synthetic Speaker One", nameAr: "متحدث تجريبي أول", titleEn: "Synthetic role", titleAr: "صفة تجريبية", affiliationEn: "Synthetic institution", affiliationAr: "مؤسسة تجريبية", bioEn: "Synthetic biography for browser checks.", bioAr: "سيرة تجريبية لاختبارات المتصفح.", links: ["https://example.org/synthetic"] }, media)],
  sessions: [row("sessions", 2, { titleEn: "Synthetic Programme Session", titleAr: "جلسة برنامج تجريبية", descriptionEn: "Synthetic programme description.", descriptionAr: "وصف برنامج تجريبي.", day: "2027-01-27", startTime: "09:15", endTime: "10:00", type: "talk", roomEn: "Synthetic room", roomAr: "قاعة تجريبية", speakerIds: [id(1)] }),
    row("sessions", 5, { titleEn: "Synthetic Additional Day", titleAr: "يوم إضافي تجريبي", descriptionEn: "Synthetic additional date.", descriptionAr: "تاريخ إضافي تجريبي.", day: "2027-01-29", startTime: "11:00", endTime: "12:00", type: "panel", speakerIds: [] })],
  partners: [row("partners", 3, { nameEn: "Synthetic Partner", nameAr: "شريك تجريبي", tier: "platinum", url: "https://example.org/partner" }, media)],
  team: [row("team", 4, { nameEn: "Synthetic Team Member", nameAr: "عضو فريق تجريبي", titleEn: "Synthetic committee role", titleAr: "دور لجنة تجريبي", groupEn: "Synthetic Committee", groupAr: "لجنة تجريبية", links: [] }, media)],
};
function send(response, status, body) { response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(body)); }
createServer(async (request, response) => {
  if (request.url === "/health") return send(response, 200, { synthetic: true });
  if (request.url === `/storage/v1/object/public/msrc-published-media/${media.path}`) { response.writeHead(200, { "content-type": "image/webp", "cache-control": "no-store" }); return response.end(image); }
  if (request.method !== "POST" || request.url !== "/rest/v1/rpc/msrc_content_published") return send(response, 404, {});
  if (request.headers.apikey !== "sb_secret_public_content_mock_only" || request.headers.authorization) return send(response, 403, {});
  let text = ""; for await (const chunk of request) { text += chunk; if (text.length > 4096) return send(response, 413, {}); }
  let body; try { body = JSON.parse(text); } catch { return send(response, 400, {}); }
  if (body.edition_key === "synthetic-content-down") return send(response, 503, { error: "synthetic database unavailable" });
  if (body.edition_key === "synthetic-content-empty") return send(response, 200, { items: [] });
  if (body.edition_key !== "synthetic-content-published" || !Object.hasOwn(collections, body.collection_key)) return send(response, 404, {});
  return send(response, 200, { items: collections[body.collection_key] });
}).listen(3230, "127.0.0.1");
