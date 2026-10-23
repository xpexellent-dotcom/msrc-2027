import type { PublicMedia } from "@/content/conference-experiences";
import { editionMedia } from "@/content/edition-media";
import { isMediaVideoPath } from "@/features/staff-portal/media-contract";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const filmDurations = new Map(editionMedia.filter((item) => item.kind === "highlight" && item.access === "public")
  .map((item) => [item.asset, item.durationSeconds]));
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 4_000; }
function integer(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value); }
function percent(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100; }

/** Published fields only: a malformed projection falls back as one complete archive. */
export function decodePublishedMedia(value: unknown, origin: string): PublicMedia[] | null {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > 2_000) return null;
  const ids = new Set<string>(); const slugs = new Set<string>();
  const rows: { order: number; id: string; media: PublicMedia }[] = [];
  for (const item of value.items) {
    if (!record(item) || typeof item.id !== "string" || !uuid.test(item.id) || ids.has(item.id)
      || typeof item.slug !== "string" || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(item.slug) || slugs.has(item.slug)
      || typeof item.publicPath !== "string" || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)+\.webp$/.test(item.publicPath)
      || !text(item.altEn) || !text(item.altAr) || typeof item.captionEn !== "string" || typeof item.captionAr !== "string" || item.captionEn.length > 4_000 || item.captionAr.length > 4_000
      || !integer(item.width) || !integer(item.height) || item.width <= 0 || item.height <= 0 || item.width > 20_000 || item.height > 20_000
      || !percent(item.focalX) || !percent(item.focalY) || !integer(item.editionYear) || item.editionYear < 1900 || item.editionYear > 2200
      || !integer(item.displayOrder) || item.displayOrder < 0
      || (item.kind !== "photograph" && item.kind !== "film")
      || (item.kind === "film" ? !isMediaVideoPath(item.videoPath) : item.videoPath !== null)
      || (item.durationSeconds !== null && (typeof item.durationSeconds !== "number" || !Number.isFinite(item.durationSeconds) || item.durationSeconds <= 0 || item.durationSeconds > 86_400))) return null;
    const image = `${origin}/storage/v1/object/public/msrc-published-media/${item.publicPath}`;
    ids.add(item.id); slugs.add(item.slug);
    rows.push({ id: item.id, order: item.displayOrder, media: {
      slug: item.slug, publication: "approved", access: "public", edition: item.editionYear,
      kind: item.kind === "film" ? "highlight" : "photograph", title: item.altEn, titleAr: item.altAr,
      description: item.captionEn, descriptionAr: item.captionAr, width: item.width, height: item.height,
      objectPosition: `${item.focalX}% ${item.focalY}%`, libraryImage: { altEn: item.altEn, altAr: item.altAr, focalX: item.focalX, focalY: item.focalY },
      asset: item.kind === "film" ? item.videoPath as string : image, poster: item.kind === "film" ? image : null,
      topic: "", speakerNames: [], durationSeconds: item.kind === "film" ? filmDurations.get(item.videoPath as string) ?? item.durationSeconds : null, sessionSlug: null,
    } });
  }
  return rows.sort((a, b) => b.media.edition - a.media.edition || a.order - b.order || a.id.localeCompare(b.id)).map((row) => row.media);
}
