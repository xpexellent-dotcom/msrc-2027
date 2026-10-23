import { decodeContentFields, emptyContentFields, contentPublishIssue, type ContentCollection, type ContentFields } from "@/features/staff-portal/content-contract";
import type { Locale } from "@/lib/i18n";

/** Public snapshot only. No draft, editor identity, rights evidence or history. */
export type PublishedFields = Omit<ContentFields, "assetId" | "permissionToDisplay">;
export type PublishedContent = {
  id: string; collection: ContentCollection; version: number; fields: PublishedFields;
  media: null | { src: string; altEn: string; altAr: string; width: number; height: number; focalX: number; focalY: number };
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textKeys = ["nameEn", "nameAr", "titleEn", "titleAr", "affiliationEn", "affiliationAr", "bioEn", "bioAr", "descriptionEn", "descriptionAr", "groupEn", "groupAr", "roomEn", "roomAr", "day", "startTime", "endTime", "type", "tier", "url"] as const;
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function boundedText(value: unknown): value is string { return typeof value === "string" && value.length <= 20_000; }
function integer(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value); }
function percent(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100; }

export function safeContentUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && value.length <= 2_000; } catch { return false; }
}

/** Reject the whole result on a malformed row, rather than mixing static and DB people. */
export function decodePublishedContent(value: unknown, collection: ContentCollection, origin: string): PublishedContent[] | null {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > 2_000) return null;
  const rows: PublishedContent[] = [];
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!record(item) || typeof item.id !== "string" || !uuid.test(item.id) || ids.has(item.id)
      || item.collection !== collection || !integer(item.version) || item.version < 1 || !record(item.fields)) return null;
    const sourceFields = item.fields;
    const allowed = Object.fromEntries(textKeys.filter((key) => Object.hasOwn(sourceFields, key)).map((key) => [key, sourceFields[key]]));
    const raw = decodeContentFields({ ...emptyContentFields(), ...allowed,
      links: item.fields.links ?? [], speakerIds: item.fields.speakerIds ?? [], sortOrder: item.fields.sortOrder,
      assetId: null, permissionToDisplay: true });
    if (!raw || contentPublishIssue(collection, raw)) return null;
    // Unknown privileged fields never reach React props, even if a provider returns them.
    const fields = Object.fromEntries(textKeys.map((key) => [key, raw[key]])) as Pick<ContentFields, typeof textKeys[number]>;
    let media: PublishedContent["media"] = null;
    if (item.media !== null) {
      const asset = item.media;
      if (!record(asset) || typeof asset.path !== "string" || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)+\.webp$/.test(asset.path)
        || !boundedText(asset.altEn) || !boundedText(asset.altAr) || !asset.altEn || !asset.altAr
        || !integer(asset.width) || !integer(asset.height) || asset.width <= 0 || asset.height <= 0 || asset.width > 20_000 || asset.height > 20_000
        || !percent(asset.focalX) || !percent(asset.focalY)) return null;
      media = { src: `${origin}/storage/v1/object/public/msrc-published-media/${asset.path}`, altEn: asset.altEn, altAr: asset.altAr,
        width: asset.width, height: asset.height, focalX: asset.focalX, focalY: asset.focalY };
    }
    ids.add(item.id);
    rows.push({ id: item.id, collection, version: item.version, fields: { ...fields, links: [...raw.links],
      speakerIds: [...raw.speakerIds], sortOrder: raw.sortOrder }, media });
  }
  return rows.sort((a, b) => a.fields.sortOrder - b.fields.sortOrder || a.id.localeCompare(b.id));
}

export async function publishedOrFallback<T>(read: () => Promise<readonly T[] | null>, fallback: readonly T[]): Promise<readonly T[]> {
  try { const rows = await read(); return rows?.length ? rows : fallback; } catch { return fallback; }
}
export function localizedContent(fields: PublishedFields, key: "name" | "title" | "affiliation" | "bio" | "description" | "group" | "room", locale: Locale): string {
  return fields[`${key}${locale === "ar" ? "Ar" : "En"}`];
}
